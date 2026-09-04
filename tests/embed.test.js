import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { embedKey } from "../lib/embed.js";

describe("embedKey", () => {
  it("keys a page by host and path so different documents can have different slots", () => {
    assert.equal(
      embedKey("https://oa.company.com/doc/123?x=1"),
      "oa.company.com/doc/123"
    );
  });

  it("includes hash so SPA documents do not share one slot", () => {
    assert.equal(
      embedKey("https://oa.company.com/app#/doc/123"),
      "oa.company.com/app#/doc/123"
    );
  });

  it("returns empty string for invalid urls", () => {
    assert.equal(embedKey("not a url"), "");
  });
});
