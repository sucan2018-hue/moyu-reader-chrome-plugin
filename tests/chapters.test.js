import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { currentChapterIndex, detectChapters, isChapterHeading, screenIndexForUnit } from "../lib/chapters.js";
import { paginate } from "../lib/pager.js";

describe("isChapterHeading", () => {
  it("accepts common Chinese chapter titles", () => {
    assert.equal(isChapterHeading("第一章 风起"), true);
    assert.equal(isChapterHeading("第10章"), true);
    assert.equal(isChapterHeading("第四章---人类群星闪耀时"), true);
    assert.equal(isChapterHeading("楔子"), true);
    assert.equal(isChapterHeading("后记"), true);
  });

  it("rejects ordinary sentences", () => {
    assert.equal(isChapterHeading("第一个人走进了房间。"), false);
    assert.equal(isChapterHeading("他说第一章就这样结束了。"), false);
  });
});

describe("detectChapters", () => {
  it("records the unit index of each heading", () => {
    const chapters = detectChapters(["前言", "正文开始。", "第二章 夜", "又一段。"]);
    assert.deepEqual(
      chapters.map((item) => [item.title, item.unitIndex]),
      [
        ["前言", 0],
        ["第二章 夜", 2]
      ]
    );
  });
});

describe("screenIndexForUnit", () => {
  it("maps a unit to the screen that contains it", () => {
    const units = ["第一章", "短。", "第二章", "也短。"];
    const screens = paginate(units, 10);
    assert.equal(screens.length > 0, true);
    assert.equal(screenIndexForUnit(units, 10, 2) >= screenIndexForUnit(units, 10, 0), true);
  });
});

describe("currentChapterIndex", () => {
  it("picks the last chapter whose screen is at or before the current page", () => {
    const chapters = detectChapters(["第一章", "aaa。", "第二章", "bbb。"]);
    const screenOfUnit = [0, 0, 2, 2];
    assert.equal(currentChapterIndex(chapters, screenOfUnit, 0), 0);
    assert.equal(currentChapterIndex(chapters, screenOfUnit, 2), 1);
  });
});
