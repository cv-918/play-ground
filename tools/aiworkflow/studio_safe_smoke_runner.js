#!/usr/bin/env node
"use strict";

const { main } = require("./studio/studioWorkerDispatchSafeSmokeRunner");

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exitCode = 1;
});
