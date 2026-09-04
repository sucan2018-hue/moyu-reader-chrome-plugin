import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { paginate, paginateIndexed, splitIntoUnits } from "../lib/pager.js";

describe("splitIntoUnits", () => {
  it("skips empty and whitespace-only lines", () => {
    const units = splitIntoUnits("第一段\n\n  \n第二段");
    assert.deepEqual(units, ["第一段", "第二段"]);
  });

  it("splits on Chinese and ASCII sentence punctuation", () => {
    const units = splitIntoUnits("你好。世界！吗？行；ok!yes?end;");
    assert.deepEqual(units, ["你好。", "世界！", "吗？", "行；", "ok!", "yes?", "end;"]);
  });

  it("keeps a line without punctuation as one unit", () => {
    const units = splitIntoUnits("没有句号的一段话");
    assert.deepEqual(units, ["没有句号的一段话"]);
  });

  it("normalizes Windows and old Mac newlines", () => {
    const units = splitIntoUnits("甲\r\n乙\r丙");
    assert.deepEqual(units, ["甲", "乙", "丙"]);
  });
});

describe("paginate", () => {
  it("packs units until charsPerScreen is reached", () => {
    const screens = paginate(["你好。", "世界。"], 10);
    assert.deepEqual(screens, ["你好。世界。"]);
  });

  it("starts a new screen when the next unit would exceed the limit", () => {
    const screens = paginate(["你好。", "世界。"], 3);
    assert.deepEqual(screens, ["你好。", "世界。"]);
  });

  it("hard-splits a unit longer than charsPerScreen", () => {
    const screens = paginate(["一二三四五六"], 4);
    assert.deepEqual(screens, ["一二三四", "五六"]);
  });

  it("flushes current screen before hard-splitting a long unit", () => {
    const screens = paginate(["短。", "一二三四五六"], 4);
    assert.deepEqual(screens, ["短。", "一二三四", "五六"]);
  });

  it("returns an empty list for no units", () => {
    assert.deepEqual(paginate([], 80), []);
  });
});

describe("paginateIndexed", () => {
  it("maps each unit to the screen that contains it", () => {
    const { screens, screenOfUnit } = paginateIndexed(["你好。", "世界。", "第三章"], 6);
    assert.equal(screens[screenOfUnit[0]].includes("你好。"), true);
    assert.equal(screens[screenOfUnit[2]].includes("第三章"), true);
  });
});
