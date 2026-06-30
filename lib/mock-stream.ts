import { mockTeaserV2 } from "./mock-v2";

// The two SSE events the streaming proxy replays in local dev (no hive-mind
// creds), mirroring the backend: a `scan` event (no rawText) then a `teaser`
// event carrying the full TeaserV2 (incl. scan) for the lead call.
export function buildMockStreamEvents(
  url: string,
): { event: string; data: string }[] {
  const teaser = mockTeaserV2(url);
  const { rawText: _rawText, ...scanNoRaw } = teaser.scan;
  return [
    { event: "scan", data: JSON.stringify(scanNoRaw) },
    { event: "teaser", data: JSON.stringify(teaser) },
  ];
}
