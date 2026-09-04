import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decodeText, detectEncoding } from "../lib/encoding.js";

describe("detectEncoding", () => {
  it("detects UTF-8 BOM", () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, 0x61]);
    assert.equal(detectEncoding(bytes.buffer), "utf-8");
  });

  it("detects valid UTF-8 without BOM", () => {
    const bytes = new TextEncoder().encode("你好世界");
    assert.equal(detectEncoding(bytes.buffer), "utf-8");
  });

  it("falls back to gb18030 for GBK Chinese bytes", () => {
    // 「你好」 in GBK
    const bytes = new Uint8Array([0xc4, 0xe3, 0xba, 0xc3]);
    assert.equal(detectEncoding(bytes.buffer), "gb18030");
  });
});

describe("decodeText", () => {
  it("decodes UTF-8 text", () => {
    const bytes = new TextEncoder().encode("第一章 序");
    assert.equal(decodeText(bytes.buffer, "utf-8"), "第一章 序");
  });

  it("decodes GBK Chinese with gb18030", () => {
    const bytes = new Uint8Array([0xc4, 0xe3, 0xba, 0xc3]);
    assert.equal(decodeText(bytes.buffer, "gb18030"), "你好");
  });
});
