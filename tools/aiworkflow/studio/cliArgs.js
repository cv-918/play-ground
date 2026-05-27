#!/usr/bin/env node
"use strict";

const path = require("path");

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 47831;

function parseArgs(argv) {
  const result = {
    repoRoot: path.resolve(__dirname, "..", "..", ".."),
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    waitForPid: null,
    once: false,
    json: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--repo-root") {
      i += 1;
      result.repoRoot = path.resolve(argv[i]);
    } else if (arg === "--host") {
      i += 1;
      result.host = argv[i];
    } else if (arg === "--port") {
      i += 1;
      result.port = Number(argv[i]);
    } else if (arg === "--wait-for-pid") {
      i += 1;
      result.waitForPid = Number(argv[i]);
    } else if (arg === "--once") {
      result.once = true;
    } else if (arg === "--json") {
      result.json = true;
    } else if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isInteger(result.port) || result.port < 1 || result.port > 65535) {
    throw new Error(`Invalid --port: ${result.port}`);
  }
  if (result.host !== "127.0.0.1" && result.host !== "localhost") {
    throw new Error("Studio Director Console is local-only. Use --host 127.0.0.1 or --host localhost.");
  }
  if (result.waitForPid !== null && (!Number.isInteger(result.waitForPid) || result.waitForPid < 1)) {
    throw new Error(`Invalid --wait-for-pid: ${result.waitForPid}`);
  }

  return result;
}

module.exports = {
  DEFAULT_HOST,
  DEFAULT_PORT,
  parseArgs,
};
