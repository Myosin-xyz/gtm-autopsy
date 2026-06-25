import assert from "node:assert";
import { isDisposableEmail } from "./disposable-email";

assert.equal(isDisposableEmail("a@mailinator.com"), true);
assert.equal(isDisposableEmail("a@gmail.com"), false);
assert.equal(isDisposableEmail("founder@acme.io"), false);
assert.equal(isDisposableEmail("garbage"), true);
console.log("disposable: passed");
