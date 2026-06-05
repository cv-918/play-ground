#!/usr/bin/env node
"use strict";

const assert = require("assert");
const { createWorkflowApiHandler } = require("./studioWorkflowApiRoutes");
const { createStudioToolboxService } = require("./studioToolboxService");

function makeParsedUrl(path) {
  return new URL(path, "http://127.0.0.1");
}

function fakeReq(method = "POST") {
  return { method };
}

function createWorkflowHarness() {
  const responses = [];
  let readRequestJsonCalls = 0;
  let importDiscordServiceCalls = 0;
  const handler = createWorkflowApiHandler({
    commitSelectedFiles: async () => { throw new Error("commitSelectedFiles should not be called"); },
    importDiscordService: async () => {
      importDiscordServiceCalls += 1;
      throw new Error("legacy discord-orchestrator service must not be imported");
    },
    pushCurrentBranch: async () => { throw new Error("pushCurrentBranch should not be called"); },
    readRequestJson: async () => {
      readRequestJsonCalls += 1;
      return { text: "hello", task_id: "WF-1", decision: "accept" };
    },
    safeWorkflowId: (value) => value,
    sendJson: (res, status, value) => {
      responses.push({ res, status, value });
      return value;
    },
    studioServiceConfig: () => ({ repoRoot: "repo-root" }),
  });
  return {
    handler,
    responses,
    get readRequestJsonCalls() { return readRequestJsonCalls; },
    get importDiscordServiceCalls() { return importDiscordServiceCalls; },
  };
}

async function testLegacyDiscordWorkflowRoutesReturnRetiredEnvelopeWithoutImportingRemovedServices() {
  const legacyRoutes = [
    "/api/workflow/intake",
    "/api/workflow/finalize",
    "/api/workflow/task/approve-start",
  ];

  for (const route of legacyRoutes) {
    const harness = createWorkflowHarness();
    const result = await harness.handler({
      repoRoot: "repo-root",
      req: fakeReq("POST"),
      res: {},
      parsedUrl: makeParsedUrl(route),
    });

    assert.strictEqual(harness.readRequestJsonCalls, 0, `${route} should not parse a body before retiring the route`);
    assert.strictEqual(harness.importDiscordServiceCalls, 0, `${route} should not import removed discord-orchestrator services`);
    assert.strictEqual(harness.responses.length, 1, `${route} should send exactly one response`);
    assert.strictEqual(harness.responses[0].status, 410, `${route} should be explicitly retired`);
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.status, "retired");
    assert.strictEqual(result.legacy_system, "discord-orchestrator");
    assert.strictEqual(result.replacement, "hermes-discord-gateway");
    assert.match(result.message, /Hermes Discord gateway/);
  }
}

function collectCatalogToolIds(catalog) {
  const ids = new Set();
  for (const tool of catalog.primary_tools || []) ids.add(tool.id);
  for (const category of catalog.categories || []) {
    for (const tool of category.tools || []) ids.add(tool.id);
  }
  return ids;
}

function testToolboxCatalogDoesNotExposeLegacyDiscordBotTools() {
  const service = createStudioToolboxService();
  const catalog = service.buildToolboxCatalog(process.cwd());
  const toolIds = collectCatalogToolIds(catalog);

  assert.strictEqual(toolIds.has("discord_bot_status"), false);
  assert.strictEqual(toolIds.has("discord_bot_restart"), false);
  assert.notStrictEqual(JSON.stringify(catalog).includes("discord-orchestrator"), true);
  assert.notStrictEqual(JSON.stringify(catalog).includes("Discord Orchestrator"), true);
}

async function run() {
  await testLegacyDiscordWorkflowRoutesReturnRetiredEnvelopeWithoutImportingRemovedServices();
  testToolboxCatalogDoesNotExposeLegacyDiscordBotTools();
  console.log("studio legacy Discord cleanup tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
