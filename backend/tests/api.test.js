const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { ObjectId } = require("mongodb");

const { createApp } = require("../src/app");

// ---------------------------------------------------------------------------
// In-memory collection mock
// ---------------------------------------------------------------------------

function createCollection(records = []) {
  return {
    find(query = {}) {
      const matching = records.filter((record) => {
        if (query.clusterId) return record.clusterId?.toString() === query.clusterId.toString();
        return true;
      });
      return { sort: () => ({ toArray: async () => matching }), toArray: async () => matching };
    },
    async findOne(query) {
      if (query._id === undefined) return null;
      return records.find((record) => record._id.toString() === query._id.toString()) || null;
    },
  };
}

// ---------------------------------------------------------------------------
// Test app factory
// ---------------------------------------------------------------------------

function createTestApp({ jobServiceOverride } = {}) {
  const clusterId = new ObjectId();
  const articleId = new ObjectId();

  const clusterRecords = [
    {
      _id: clusterId,
      label: "Transit Plan",
      articleCount: 1,
      earliestPublishedAt: new Date("2024-03-12T10:30:00Z"),
      latestPublishedAt: new Date("2024-03-12T10:30:00Z"),
      sources: ["Fixture News"],
      representativeKeywords: ["transit", "plan", "council"],
    },
  ];

  const articleRecords = [
    {
      _id: articleId,
      clusterId,
      source: "Fixture News",
      title: "Transit Plan Approved",
      url: "https://example.com",
      publishedAt: new Date("2024-03-12T10:30:00Z"),
      summary: "The council approved the plan.",
      extraction: { status: "succeeded" },
    },
  ];

  const database = {
    collection: (name) => {
      if (name === "clusters") return createCollection(clusterRecords);
      if (name === "articles") return createCollection(articleRecords);
      return createCollection([]);
    },
  };

  const defaultJobService = {
    triggerIngestion: async () => ({ job: { _id: "job-1", status: "queued" } }),
    getJob: async () => null,
  };

  return {
    app: createApp({ database, settings: { corsOrigin: "*" }, jobService: jobServiceOverride || defaultJobService }),
    clusterId,
    articleId,
  };
}

// ---------------------------------------------------------------------------
// Cluster tests
// ---------------------------------------------------------------------------

test("GET /clusters returns cluster summaries", async () => {
  const { app } = createTestApp();
  const response = await request(app).get("/clusters");
  assert.equal(response.status, 200);
  assert.equal(response.body.data.clusters[0].label, "Transit Plan");
  assert.equal(response.body.data.clusters[0].articleCount, 1);
});

test("GET /clusters/:id returns cluster detail for a valid existing ID", async () => {
  const { app, clusterId } = createTestApp();
  const response = await request(app).get(`/clusters/${clusterId.toString()}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.data.cluster.label, "Transit Plan");
  assert.ok(Array.isArray(response.body.data.cluster.articles), "articles should be an array");
  assert.ok(Array.isArray(response.body.data.cluster.keywords), "keywords should be an array");
  assert.equal(response.body.data.cluster.articles[0].source, "Fixture News");
});

test("GET /clusters/:id returns 404 for a valid ObjectId that does not exist", async () => {
  const { app } = createTestApp();
  const missingId = new ObjectId().toString();
  const response = await request(app).get(`/clusters/${missingId}`);
  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, "CLUSTER_NOT_FOUND");
});

test("GET /clusters/:id returns 400 for a malformed ID", async () => {
  const { app } = createTestApp();
  const response = await request(app).get("/clusters/not-an-id");
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "INVALID_CLUSTER_ID");
});

// ---------------------------------------------------------------------------
// Timeline tests
// ---------------------------------------------------------------------------

test("GET /timeline returns plot-ready records with required fields", async () => {
  const { app } = createTestApp();
  const response = await request(app).get("/timeline");
  assert.equal(response.status, 200);
  const cluster = response.body.data.timeline[0];
  assert.equal(cluster.intensity, 1);
  assert.equal(cluster.articles[0].source, "Fixture News");
  assert.ok("start" in cluster, "timeline record must have start");
  assert.ok("end" in cluster, "timeline record must have end");
  assert.ok("label" in cluster, "timeline record must have label");
});

// ---------------------------------------------------------------------------
// Ingestion trigger tests
// ---------------------------------------------------------------------------

test("POST /ingest/trigger returns 202 with a new job", async () => {
  const { app } = createTestApp();
  const response = await request(app).post("/ingest/trigger");
  assert.equal(response.status, 202);
  assert.equal(response.body.data.job.id, "job-1");
  assert.equal(response.body.data.job.status, "queued");
});

test("POST /ingest/trigger returns 409 when a job is already active", async () => {
  const activeJobService = {
    triggerIngestion: async () => ({ activeJob: { _id: "job-existing", status: "running" } }),
    getJob: async () => null,
  };
  const { app } = createTestApp({ jobServiceOverride: activeJobService });
  const response = await request(app).post("/ingest/trigger");
  assert.equal(response.status, 409);
  assert.equal(response.body.error.code, "INGESTION_ALREADY_RUNNING");
});

// ---------------------------------------------------------------------------
// Ingestion status tests
// ---------------------------------------------------------------------------

test("GET /ingest/status/:jobId returns 404 for an unknown job", async () => {
  const { app } = createTestApp();
  const response = await request(app).get("/ingest/status/missing-job");
  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, "JOB_NOT_FOUND");
});

test("GET /ingest/status/:jobId returns job details for a known job", async () => {
  const jobWithStatus = {
    triggerIngestion: async () => ({ job: { _id: "job-2", status: "queued" } }),
    getJob: async () => ({
      _id: "job-2",
      status: "completed",
      startedAt: new Date("2024-03-12T10:00:00Z"),
      completedAt: new Date("2024-03-12T10:05:00Z"),
      stats: { inserted: 12, duplicates: 3 },
      error: null,
    }),
  };
  const { app } = createTestApp({ jobServiceOverride: jobWithStatus });
  const response = await request(app).get("/ingest/status/job-2");
  assert.equal(response.status, 200);
  assert.equal(response.body.data.job.status, "completed");
  assert.equal(response.body.data.job.stats.inserted, 12);
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

test("unhandled service error returns 500 with INTERNAL_ERROR", async () => {
  const brokenJobService = {
    triggerIngestion: async () => { throw new Error("Database exploded"); },
    getJob: async () => null,
  };
  const { app } = createTestApp({ jobServiceOverride: brokenJobService });
  const response = await request(app).post("/ingest/trigger");
  assert.equal(response.status, 500);
  assert.equal(response.body.error.code, "INTERNAL_ERROR");
  // Internal error message must NOT be leaked to the client
  assert.ok(!response.body.error.message.includes("Database exploded"), "internal error must not be exposed");
});

test("GET /health returns ok", async () => {
  const { app } = createTestApp();
  const response = await request(app).get("/health");
  assert.equal(response.status, 200);
  assert.equal(response.body.data.status, "ok");
});
