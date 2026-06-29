import assert from "node:assert";
import { parseSseBuffer } from "./sse";

// Two complete events parse; named events captured.
const a = parseSseBuffer(
  'event: scan\ndata: {"projectName":"Stripe"}\n\nevent: teaser\ndata: {"overallScore":72}\n\n',
);
assert.deepEqual(
  a.events.map((e) => e.event),
  ["scan", "teaser"],
);
assert.equal(a.events[0].data, '{"projectName":"Stripe"}');
assert.equal(a.rest, "");

// A trailing incomplete event is returned as `rest`, not parsed.
const b = parseSseBuffer(
  'event: scan\ndata: {"a":1}\n\nevent: teaser\ndata: {"over',
);
assert.deepEqual(
  b.events.map((e) => e.event),
  ["scan"],
);
assert.equal(b.rest, 'event: teaser\ndata: {"over');

// Default event name is "message" when only data: is present.
const c = parseSseBuffer("data: hello\n\n");
assert.equal(c.events[0].event, "message");
assert.equal(c.events[0].data, "hello");

// No complete event yet → everything is rest.
const d = parseSseBuffer("event: scan\ndata: {");
assert.deepEqual(d.events, []);
assert.equal(d.rest, "event: scan\ndata: {");

console.log("sse: passed");
