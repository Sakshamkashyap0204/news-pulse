const { failure } = require("../utils/responses");

function notFoundHandler(request, response) {
  failure(response, 404, "ROUTE_NOT_FOUND", `No route matches ${request.method} ${request.path}`);
}

function errorHandler(error, request, response, next) { // eslint-disable-line no-unused-vars
  console.error("Unhandled API error:", error);
  failure(response, 500, "INTERNAL_ERROR", "An unexpected server error occurred.");
}

module.exports = { notFoundHandler, errorHandler };
