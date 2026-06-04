#!/usr/bin/env node
"use strict";

const assert = require("assert");
const { directorConsoleHtml } = require("./directorConsolePage");

const html = directorConsoleHtml();

assert(
  html.includes("function directorViewItems"),
  "director console should define a helper that reads director_views first"
);
assert(
  html.includes('directorViewItems("conversation_records")'),
  "conversation page should consume director_views.conversation_records"
);
assert(
  html.includes('directorViewItems("decision_items")'),
  "decision page should consume director_views.decision_items"
);
assert(
  html.includes('directorViewItems("execution_requests")'),
  "execution request page should consume director_views.execution_requests"
);
assert(
  html.includes('directorViewItems("result_review_items")'),
  "result review page should consume director_views.result_review_items"
);
assert(
  html.includes('directorViewItems("record_items")'),
  "record keeping page should consume director_views.record_items"
);
assert(
  html.includes("renderDirectorViewCard"),
  "director console should render normalized director view cards"
);

console.log("director console director_views consumption test passed");
