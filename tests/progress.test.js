import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clampPageIndex, remapPageIndex } from "../lib/pager.js";

describe("clampPageIndex", () => {
  it("moves forward and backward within range", () => {
    assert.equal(clampPageIndex(2, 10, 1), 3);
    assert.equal(clampPageIndex(2, 10, -1), 1);
  });

  it("does not go below 0 or past the last page", () => {
    assert.equal(clampPageIndex(0, 10, -1), 0);
    assert.equal(clampPageIndex(9, 10, 1), 9);
  });

  it("returns 0 when there are no pages", () => {
    assert.equal(clampPageIndex(3, 0, 1), 0);
  });
});

describe("remapPageIndex", () => {
  it("keeps the approximate reading offset when line length changes", () => {
    assert.equal(remapPageIndex(10, 40, 20), 20);
    assert.equal(remapPageIndex(10, 40, 80), 5);
  });
});
