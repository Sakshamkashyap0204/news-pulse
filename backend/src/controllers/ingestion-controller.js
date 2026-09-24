const { failure, success } = require("../utils/responses");

function formatJob(job) {
  return { id: job._id, status: job.status, startedAt: job.startedAt || null, completedAt: job.completedAt || null, stats: job.stats || {}, error: job.error || null };
}

function createIngestionController(jobService) {
  return {
    trigger: async (request, response, next) => {
      try {
        const result = await jobService.triggerIngestion();
        if (result.activeJob) return failure(response, 409, "INGESTION_ALREADY_RUNNING", "An ingestion job is already running.");
        return success(response, { job: formatJob(result.job) }, 202);
      } catch (error) { return next(error); }
    },
    status: async (request, response, next) => {
      try {
        const job = await jobService.getJob(request.params.jobId);
        if (!job) return failure(response, 404, "JOB_NOT_FOUND", "Ingestion job not found.");
        return success(response, { job: formatJob(job) });
      } catch (error) { return next(error); }
    },
  };
}

module.exports = { createIngestionController };
