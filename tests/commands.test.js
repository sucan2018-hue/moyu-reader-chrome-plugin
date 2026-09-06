import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
const manifest = JSON.parse(
  readFileSync(new URL("../manifest.json", import.meta.url), "utf8")
);

function windowsKey(name) {
  const suggested = manifest.commands[name]?.suggested_key || {};
  return suggested.windows || suggested.default;
}

describe("windows command defaults", () => {
  it("uses the Windows keys requested for this build", () => {
    assert.equal(windowsKey("turn-prev"), "Alt+Q");
    assert.equal(windowsKey("turn-next"), "Alt+E");
    assert.equal(windowsKey("hide-embed"), "Alt+C");
  });
});
