const express = require("express");

function createIngestionRouter(controller) {
  const router = express.Router();
  router.post("/ingest/trigger", controller.trigger);
  router.get("/ingest/status/:jobId", controller.status);
  return router;
}

module.exports = { createIngestionRouter };
