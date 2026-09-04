import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatShortcut } from "../lib/shortcut.js";

describe("formatShortcut", () => {
  it("says unset when Chrome did not bind a key", () => {
    assert.equal(formatShortcut(""), "未设置");
    assert.equal(formatShortcut(undefined), "未设置");
  });

  it("shows MacCtrl as Ctrl for Windows keyboards on Mac", () => {
    assert.equal(formatShortcut("MacCtrl+1", { isMac: true }), "Ctrl+1");
  });

  it("keeps Alt on non-Mac and maps Alt to Option on Mac", () => {
    assert.equal(formatShortcut("Alt+1", { isMac: false }), "Alt+1");
    assert.equal(formatShortcut("Alt+1", { isMac: true }), "Option+1");
  });
});
