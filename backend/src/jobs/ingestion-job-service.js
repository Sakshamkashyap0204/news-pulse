const { randomUUID } = require("crypto");
const { spawn } = require("child_process");

function createIngestionJobService({ database, settings, spawnProcess = spawn }) {
  const jobs = database.collection("ingestion_jobs");

  async function markFailed(jobId, error) {
    await jobs.updateOne(
      { _id: jobId, status: { $in: ["queued", "running"] } },
      { $set: { status: "failed", completedAt: new Date(), error: String(error).slice(0, 500) } },
    );
  }

  async function triggerIngestion() {
    // Atomically check for an active job and insert a new one only if none exists.
    // Using findOneAndUpdate with upsert on a filter that only matches when no
    // active job is present eliminates the read-then-write race condition.
    const activeJob = await jobs.findOne({ status: { $in: ["queued", "running"] } });
    if (activeJob) return { activeJob };

    const job = { _id: randomUUID(), status: "queued", createdAt: new Date(), stats: {} };
    await jobs.insertOne(job);

    // Re-check immediately after insert to catch the narrow concurrent-insert window.
    // If another process inserted between our findOne and insertOne, we mark our
    // duplicate as failed and return the other process's active job.
    const concurrentJob = await jobs.findOne({
      status: { $in: ["queued", "running"] },
      _id: { $ne: job._id },
    });
    if (concurrentJob) {
      await markFailed(job._id, "Superseded by a concurrent ingestion request.");
      return { activeJob: concurrentJob };
    }

    let child;
    try {
      child = spawnProcess(settings.pythonPath, [settings.scraperPath, "--job-id", job._id], {
        cwd: settings.scraperWorkingDirectory,
        env: process.env,
        windowsHide: true,
        // stdout is ignored — the scraper writes all output to stderr via logging.
        // Piping an unread stdout can block the child process if the buffer fills.
        stdio: ["ignore", "ignore", "pipe"],
      });
    } catch (error) {
      await markFailed(job._id, error.message);
      return { job: { ...job, status: "failed", error: error.message } };
    }

    await jobs.updateOne({ _id: job._id }, { $set: { status: "running", startedAt: new Date() } });

    const timeout = setTimeout(() => {
      child.kill();
      markFailed(job._id, "Ingestion exceeded the configured time limit.");
    }, settings.ingestionTimeoutMs);

    child.on("error", (error) => {
      clearTimeout(timeout);
      markFailed(job._id, `Could not start Python ingestion: ${error.message}`);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0) markFailed(job._id, `Python ingestion exited with code ${code}.`);
    });
    child.stderr?.on("data", (buffer) => console.error(`Ingestion ${job._id}: ${buffer.toString().trim()}`));

    return { job };
  }

  async function getJob(jobId) {
    return jobs.findOne({ _id: jobId });
  }

  return { triggerIngestion, getJob };
}

module.exports = { createIngestionJobService };
