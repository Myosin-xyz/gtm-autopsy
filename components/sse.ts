export interface SseEvent {
  event: string;
  data: string;
}

// Parse every complete SSE event (terminated by a blank line) in `buffer`.
// Returns the parsed events plus the unparsed remainder — an incomplete
// trailing event the caller carries into the next chunk. Multiple `data:`
// lines in one event are joined with "\n" per the SSE spec.
export function parseSseBuffer(buffer: string): {
  events: SseEvent[];
  rest: string;
} {
  const events: SseEvent[] = [];
  const blocks = buffer.split("\n\n");
  const rest = blocks.pop() ?? "";
  for (const block of blocks) {
    let event = "message";
    const dataLines: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length) events.push({ event, data: dataLines.join("\n") });
  }
  return { events, rest };
}
