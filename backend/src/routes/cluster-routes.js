const express = require("express");

function createClusterRouter(controller) {
  const router = express.Router();
  router.get("/clusters", controller.list);
  router.get("/clusters/:id", controller.detail);
  router.get("/timeline", controller.timeline);
  return router;
}

module.exports = { createClusterRouter };
