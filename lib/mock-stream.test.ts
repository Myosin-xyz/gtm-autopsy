import assert from "node:assert";
import { buildMockStreamEvents } from "./mock-stream";

const evs = buildMockStreamEvents("stripe.com");
assert.deepEqual(
  evs.map((e) => e.event),
  ["scan", "teaser"],
);

// scan event omits rawText; teaser event is the full TeaserV2.
const scan = JSON.parse(evs[0].data);
assert.ok(!("rawText" in scan), "mock scan event omits rawText");
assert.ok(typeof scan.projectName === "string" && scan.projectName.length > 0);

const teaser = JSON.parse(evs[1].data);
assert.equal(typeof teaser.overallScore, "number");
assert.ok(Array.isArray(teaser.whatsBroken));
assert.ok(teaser.scan, "teaser event carries scan for the lead call");

console.log("mock-stream: passed");
