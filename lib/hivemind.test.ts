import assert from "node:assert";
import { runTeaser, runFullReport, inputFromUrl } from "./hivemind";

async function main() {
  const input = inputFromUrl("https://vaultline.xyz", "vaultline");
  assert.ok(input, "derives input from url");
  assert.equal(input!.companyName, "Vaultline");

  // No HIVEMIND_API_KEY in test env → deterministic mock.
  const teaser = await runTeaser(input!);
  assert.equal(typeof teaser.overallScore, "number");
  assert.equal(teaser.whatsBroken.length >= 1, true);
  assert.ok(teaser.verdict);

  const full = await runFullReport(input!, teaser);
  assert.equal(full.overallScore, teaser.overallScore, "full report keeps teaser score");
  assert.equal(full.ghostwriter.xPosts.length >= 1, true);
  assert.ok(full.beforeAfter.homepageHeroAfter);
  console.log("hivemind split: passed");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
