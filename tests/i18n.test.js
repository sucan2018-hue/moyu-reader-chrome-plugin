import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { t, useLocale } from "../lib/i18n.js";

describe("i18n", () => {
  it("switches between Chinese and English", () => {
    useLocale("zh");
    assert.equal(t("restore"), "还原");
    useLocale("en");
    assert.equal(t("restore"), "Restore");
  });

  it("fills named placeholders", () => {
    useLocale("en");
    assert.equal(t("deleteConfirm", { name: "Demo.txt" }).includes("Demo.txt"), true);
    useLocale("zh");
    assert.equal(t("statusCurrent", { name: "A", chars: 40 }), "当前：A，每行 40 字");
  });

  it("does not mention workplace slacking terms", () => {
    useLocale("zh");
    const blob = ["help1", "help2", "pickerHint", "extName", "keyRestore", "donateLead"].map((key) => t(key)).join(" ");
    assert.equal(/公文|摸鱼|小说/.test(blob), false);
    useLocale("en");
    const en = ["help1", "help2", "pickerHint", "extName"].map((key) => t(key)).join(" ");
    assert.equal(/slack|novel|office document/i.test(en), false);
  });
});
