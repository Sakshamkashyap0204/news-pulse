require("dotenv").config();

const { MongoClient } = require("mongodb");

const { createApp } = require("./src/app");
const { createSettings } = require("./src/config/settings");

async function clearStaleJobs(database) {
  const jobs = database.collection("ingestion_jobs");
  const result = await jobs.updateMany(
    { status: { $in: ["queued", "running"] } },
    { $set: { status: "failed", completedAt: new Date(), error: "Backend restarted while job was active." } },
  );
  if (result.modifiedCount > 0) {
    console.log(`Marked ${result.modifiedCount} stale ingestion job(s) as failed.`);
  }
}

async function startServer() {
  const settings = createSettings();
  const client = new MongoClient(settings.mongodbUri, { serverSelectionTimeoutMS: 10_000 });
  await client.connect();
  const database = client.db(settings.mongodbDatabase);

  await clearStaleJobs(database);

  const app = createApp({ database, settings });
  const server = app.listen(settings.port, () => console.log(`News Pulse API listening on port ${settings.port}`));

  async function shutdown() {
    server.close();
    await client.close();
  }
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

startServer().catch((error) => {
  console.error("Could not start News Pulse API:", error.message);
  process.exitCode = 1;
});
