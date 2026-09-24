const path = require("path");

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be configured.`);
  return value;
}

function createSettings() {
  const workingDirectory = process.cwd();
  return {
    port: Number(process.env.PORT || 4000),
    corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
    mongodbUri: requiredEnvironment("MONGODB_URI"),
    mongodbDatabase: process.env.MONGODB_DATABASE || "news_pulse",
    pythonPath: process.env.PYTHON_PATH || "python",
    scraperPath: path.resolve(workingDirectory, process.env.SCRAPER_PATH || "../scraper/main.py"),
    scraperWorkingDirectory: path.resolve(workingDirectory, process.env.SCRAPER_WORKING_DIRECTORY || "../scraper"),
    ingestionTimeoutMs: Number(process.env.INGESTION_TIMEOUT_MS || 300000),
  };
}

module.exports = { createSettings };
