import assert from "node:assert";
import { normalizeDomain, companyNameFromDomain } from "./domain";

assert.equal(normalizeDomain("https://www.Vaultline.xyz/p?q=1"), "vaultline.xyz");
assert.equal(normalizeDomain("vaultline.xyz"), "vaultline.xyz");
assert.equal(normalizeDomain("garbage"), null);
assert.equal(companyNameFromDomain("vaultline.xyz"), "Vaultline");
assert.equal(companyNameFromDomain("agent-frame.ai"), "Agent Frame");
console.log("domain: passed");
