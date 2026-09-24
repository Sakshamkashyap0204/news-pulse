const { failure, success } = require("../utils/responses");

function createClusterController(clusterService) {
  return {
    list: async (request, response, next) => {
      try { success(response, { clusters: await clusterService.listClusters() }); } catch (error) { next(error); }
    },
    detail: async (request, response, next) => {
      try {
        const cluster = await clusterService.getCluster(request.params.id);
        if (cluster?.invalidId) return failure(response, 400, "INVALID_CLUSTER_ID", "Cluster ID is invalid.");
        if (!cluster) return failure(response, 404, "CLUSTER_NOT_FOUND", "Cluster not found.");
        return success(response, { cluster });
      } catch (error) { return next(error); }
    },
    timeline: async (request, response, next) => {
      try { success(response, { timeline: await clusterService.getTimeline() }); } catch (error) { next(error); }
    },
  };
}

module.exports = { createClusterController };
