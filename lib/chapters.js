import { paginateIndexed } from "./pager.js";

const HEADING_RE =
  /^(第[零〇一二三四五六七八九十百千万两0-9]{1,12}[章节回卷部集幕]|楔子|序章|序言|前言|引子|引言|后记|尾声|番外|终章|Chapter\s+\d+)/i;

export function isChapterHeading(text) {
  const t = String(text).trim();
  if (!t || t.length > 60) return false;
  return HEADING_RE.test(t);
}

export function detectChapters(units) {
  const chapters = [];
  for (let i = 0; i < units.length; i += 1) {
    if (!isChapterHeading(units[i])) continue;
    chapters.push({
      title: String(units[i]).trim().slice(0, 40),
      unitIndex: i
    });
  }
  return chapters;
}

export function screenIndexForUnit(units, pageChars, unitIndex) {
  const { screenOfUnit } = paginateIndexed(units, pageChars);
  return screenOfUnit[Math.max(0, Number(unitIndex) || 0)] ?? 0;
}

export function currentChapterIndex(chapters, screenOfUnit, pageIndex) {
  if (!chapters.length) return -1;
  let current = 0;
  for (let i = 0; i < chapters.length; i += 1) {
    const screen = screenOfUnit[chapters[i].unitIndex] ?? 0;
    if (screen <= pageIndex) current = i;
    else break;
  }
  return current;
}
