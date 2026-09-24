const cors = require("cors");
const express = require("express");

const { createClusterController } = require("./controllers/cluster-controller");
const { createIngestionController } = require("./controllers/ingestion-controller");
const { errorHandler, notFoundHandler } = require("./middleware/error-handler");
const { createIngestionJobService } = require("./jobs/ingestion-job-service");
const { createClusterRouter } = require("./routes/cluster-routes");
const { createIngestionRouter } = require("./routes/ingestion-routes");
const { createClusterService } = require("./services/cluster-service");
const { success } = require("./utils/responses");

function createApp({ database, settings, jobService }) {
  const app = express();
  app.use(cors({ origin: settings.corsOrigin }));
  app.use(express.json({ limit: "100kb" }));

  const clusterService = createClusterService(database);
  const resolvedJobService = jobService || createIngestionJobService({ database, settings });
  app.get("/health", (request, response) => success(response, { status: "ok" }));
  app.use(createClusterRouter(createClusterController(clusterService)));
  app.use(createIngestionRouter(createIngestionController(resolvedJobService)));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
