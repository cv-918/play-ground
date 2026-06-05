#!/usr/bin/env node
"use strict";

const assert = require("assert");
const net = require("net");
const path = require("path");
const { spawn } = require("child_process");

const HOST = "127.0.0.1";
const BLOCKED_PORTS = 12;

function listen(server, port) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const onListening = () => {
      cleanup();
      resolve();
    };
    const cleanup = () => {
      server.off("error", onError);
      server.off("listening", onListening);
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, HOST);
  });
}

async function reservePortRange() {
  for (let base = 55000; base < 62000; base += 50) {
    const servers = [];
    try {
      for (let index = 0; index < BLOCKED_PORTS; index += 1) {
        const server = net.createServer();
        await listen(server, base + index);
        servers.push(server);
      }
      return { base, servers };
    } catch {
      await Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve))));
    }
  }
  throw new Error("Could not reserve a free test port range.");
}

function closeServers(servers) {
  return Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve))));
}

function runStudioServer(basePort) {
  const entrypoint = path.resolve(__dirname, "..", "studio_director_console_server.js");
  const child = spawn(process.execPath, [entrypoint, "--host", HOST, "--port", String(basePort)], {
    cwd: path.resolve(__dirname, "..", "..", ".."),
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString("utf8");
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`Timed out waiting for Studio server startup. stdout=${stdout} stderr=${stderr}`));
    }, 10000);

    const poll = setInterval(() => {
      if (stdout.includes(`url: http://${HOST}:`)) {
        clearTimeout(timeout);
        clearInterval(poll);
        child.kill();
        resolve({ stdout, stderr });
      }
    }, 50);

    child.on("exit", (code) => {
      if (!stdout.includes(`url: http://${HOST}:`)) {
        clearTimeout(timeout);
        clearInterval(poll);
        reject(new Error(`Studio server exited before startup. code=${code} stdout=${stdout} stderr=${stderr}`));
      }
    });
  });
}

(async () => {
  const { base, servers } = await reservePortRange();
  try {
    const result = await runStudioServer(base);
    assert(result.stdout.includes(`requested_port: ${base}`), result.stdout);
    assert(result.stdout.includes(`url: http://${HOST}:${base + BLOCKED_PORTS}/`), result.stdout);
    assert(!result.stderr.includes("MaxListenersExceededWarning"), result.stderr);
    console.log("studioServerPortFallback tests passed");
  } finally {
    await closeServers(servers);
  }
})().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
