import { currentChapterIndex, detectChapters } from "./chapters.js";
import { embedKey } from "./embed.js";
import { initLocale, t } from "./i18n.js";
import { clampPageIndex, paginateIndexed, remapPageIndex, splitIntoUnits } from "./pager.js";
import {
  deleteBookRecord,
  getBook,
  listBooks,
  loadSettings,
  migrateLegacyBook,
  newBookId,
  putBook,
  saveSettings
} from "./store.js";

let screenCache = null;

function pageCharsFrom(value, fallback = 40) {
  return Math.max(20, Math.min(80, Number(value) || fallback));
}

function bookProgress(settings, bookId) {
  const saved = settings.progressByBook?.[bookId] || {};
  const pageChars = pageCharsFrom(settings.pageChars);
  const storedChars = saved.pageChars ? pageCharsFrom(saved.pageChars, pageChars) : pageChars;
  const storedIndex = Number(saved.pageIndex) || 0;
  return {
    pageIndex:
      storedChars === pageChars ? storedIndex : remapPageIndex(storedIndex, storedChars, pageChars),
    pageChars
  };
}

function cachedScreens(book, pageChars) {
  if (
    screenCache &&
    screenCache.id === book.id &&
    screenCache.pageChars === pageChars &&
    screenCache.len === book.text.length
  ) {
    return screenCache;
  }
  const units = book.units || splitIntoUnits(book.text);
  const { screens, screenOfUnit } = paginateIndexed(units, pageChars);
  screenCache = { id: book.id, pageChars, len: book.text.length, units, screens, screenOfUnit };
  return screenCache;
}

function invalidateCache() {
  screenCache = null;
}

function chaptersOf(book, units) {
  if (Array.isArray(book.chapters) && book.chapters.length) return book.chapters;
  return detectChapters(units);
}

async function persistProgress(book, pageIndex, pageChars) {
  const settings = await loadSettings();
  const progressByBook = { ...(settings.progressByBook || {}) };
  progressByBook[book.id] = {
    pageIndex,
    pageChars,
    updatedAt: Date.now()
  };
  await saveSettings({
    currentBookId: book.id,
    bookName: book.name,
    pageIndex,
    pageChars,
    progressByBook
  });
}

async function loadActiveBook() {
  const migrated = await migrateLegacyBook();
  let settings = await loadSettings();
  if (migrated && !settings.currentBookId) {
    await saveSettings({ currentBookId: migrated.id, bookName: migrated.name });
    settings = await loadSettings();
  }
  const books = await listBooks();
  if (!books.length) return { settings, book: null, books };
  let current =
    books.find((item) => item.id === settings.currentBookId) ||
    books.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
  if (current && !settings.progressByBook?.[current.id]) {
    const progressByBook = { ...(settings.progressByBook || {}) };
    progressByBook[current.id] = {
      pageIndex: Number(settings.pageIndex) || 0,
      pageChars: pageCharsFrom(settings.pageChars),
      updatedAt: Date.now()
    };
    await saveSettings({
      currentBookId: current.id,
      bookName: current.name,
      progressByBook
    });
    settings = await loadSettings();
  }
  if (current && !current.chapters?.length && current.text) {
    current = {
      ...current,
      chapters: detectChapters(splitIntoUnits(current.text)),
      updatedAt: Date.now()
    };
    await putBook(current);
  }
  return { settings, book: current, books };
}

function summarize(book, settings, cache) {
  const progress = bookProgress(settings, book.id);
  const pageChars = cache && cache.id === book.id ? cache.pageChars : progress.pageChars;
  const total = cache && cache.id === book.id ? cache.screens.length : undefined;
  return {
    id: book.id,
    name: book.name,
    pageIndex: progress.pageIndex,
    pageChars,
    total,
    chapterCount: book.chapters?.length || 0,
    updatedAt: settings.progressByBook?.[book.id]?.updatedAt || book.updatedAt || 0
  };
}

export async function getState() {
  const { settings, book, books } = await loadActiveBook();
  if (!book) {
    return {
      hasBook: false,
      bookId: "",
      bookName: "",
      pageIndex: 0,
      total: 0,
      currentText: "",
      pageChars: pageCharsFrom(settings.pageChars),
      embedHidden: Boolean(settings.embedHidden),
      embedTargets: settings.embedTargets || {},
      chapters: [],
      currentChapterIndex: -1,
      books: []
    };
  }
  const progress = bookProgress(settings, book.id);
  const cache = cachedScreens(book, progress.pageChars);
  const pageIndex = clampPageIndex(progress.pageIndex, cache.screens.length, 0);
  const chapters = chaptersOf(book, cache.units);
  return {
    hasBook: true,
    bookId: book.id,
    bookName: book.name,
    pageIndex,
    total: cache.screens.length,
    currentText: cache.screens[pageIndex] ?? "",
    pageChars: progress.pageChars,
    embedHidden: Boolean(settings.embedHidden),
    embedTargets: settings.embedTargets || {},
    chapters,
    currentChapterIndex: currentChapterIndex(chapters, cache.screenOfUnit, pageIndex),
    books: books
      .map((item) => summarize(item, settings, item.id === book.id ? cache : null))
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
  };
}

export async function getEmbedPayload(url) {
  await initLocale();
  const state = await getState();
  const key = embedKey(url);
  const selector = key ? state.embedTargets?.[key] : "";
  return {
    enabled: state.hasBook && Boolean(selector),
    hidden: Boolean(state.embedHidden),
    text: state.currentText,
    selector: selector || "",
    pickerHint: t("pickerHint")
  };
}

export async function getPickerHint() {
  await initLocale();
  return { pickerHint: t("pickerHint") };
}

export async function saveEmbedTarget({ url, selector }) {
  const settings = await loadSettings();
  const key = embedKey(url);
  if (!key) return getState();
  const embedTargets = { ...(settings.embedTargets || {}) };
  if (selector) embedTargets[key] = selector;
  else delete embedTargets[key];
  await saveSettings({ embedTargets, embedHidden: false });
  return getState();
}

export async function refreshDisplay() {
  return getState();
}

export async function importBook({ name, text, encoding }) {
  const units = splitIntoUnits(text);
  const chapters = detectChapters(units);
  const books = await listBooks();
  const existing = books.find((item) => item.name === name);
  const book = existing
    ? {
        ...existing,
        text,
        encoding: encoding || existing.encoding,
        chapters,
        updatedAt: Date.now()
      }
    : {
        id: newBookId(),
        name,
        text,
        encoding: encoding || "utf-8",
        chapters,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
  await putBook(book);
  invalidateCache();
  const settings = await loadSettings();
  const progress = bookProgress(settings, book.id);
  const cache = cachedScreens(book, progress.pageChars);
  await persistProgress(
    book,
    clampPageIndex(progress.pageIndex, cache.screens.length, 0),
    progress.pageChars
  );
  return getState();
}

export async function switchBook(bookId) {
  const book = await getBook(bookId);
  if (!book) return getState();
  invalidateCache();
  const settings = await loadSettings();
  const progress = bookProgress(settings, book.id);
  const cache = cachedScreens(book, progress.pageChars);
  await persistProgress(
    book,
    clampPageIndex(progress.pageIndex, cache.screens.length, 0),
    progress.pageChars
  );
  return getState();
}

export async function removeBook(bookId) {
  await deleteBookRecord(bookId);
  invalidateCache();
  const settings = await loadSettings();
  const progressByBook = { ...(settings.progressByBook || {}) };
  delete progressByBook[bookId];
  const remaining = await listBooks();
  if (settings.currentBookId === bookId) {
    const next = remaining[0];
    await saveSettings({ progressByBook, currentBookId: next?.id || "", bookName: next?.name || "" });
    if (next) return switchBook(next.id);
    await saveSettings({ pageIndex: 0, bookName: "" });
    return getState();
  }
  await saveSettings({ progressByBook });
  return getState();
}

export async function turn(delta) {
  const { settings, book } = await loadActiveBook();
  if (!book) return getState();
  const progress = bookProgress(settings, book.id);
  const cache = cachedScreens(book, progress.pageChars);
  const pageIndex = clampPageIndex(progress.pageIndex, cache.screens.length, delta);
  await persistProgress(book, pageIndex, progress.pageChars);
  await saveSettings({ embedHidden: false });
  return getState();
}

export async function jumpToPage(pageIndex) {
  const { settings, book } = await loadActiveBook();
  if (!book) return getState();
  const progress = bookProgress(settings, book.id);
  const cache = cachedScreens(book, progress.pageChars);
  await persistProgress(
    book,
    clampPageIndex(pageIndex, cache.screens.length, 0),
    progress.pageChars
  );
  await saveSettings({ embedHidden: false });
  return getState();
}

export async function jumpToChapter(unitIndex) {
  const { settings, book } = await loadActiveBook();
  if (!book) return getState();
  const progress = bookProgress(settings, book.id);
  const cache = cachedScreens(book, progress.pageChars);
  const pageIndex = cache.screenOfUnit[Math.max(0, Number(unitIndex) || 0)] ?? 0;
  await persistProgress(book, pageIndex, progress.pageChars);
  await saveSettings({ embedHidden: false });
  return getState();
}

export async function toggleHidden() {
  const settings = await loadSettings();
  await saveSettings({ embedHidden: !settings.embedHidden });
  return getState();
}

export async function setLayout({ pageChars }) {
  const { settings, book } = await loadActiveBook();
  const nextChars = pageCharsFrom(pageChars, settings.pageChars);
  if (!book) {
    await saveSettings({ pageChars: nextChars });
    return getState();
  }
  const progress = bookProgress(settings, book.id);
  invalidateCache();
  const cache = cachedScreens(book, nextChars);
  const pageIndex = clampPageIndex(
    remapPageIndex(progress.pageIndex, progress.pageChars, nextChars),
    cache.screens.length,
    0
  );
  await persistProgress(book, pageIndex, nextChars);
  await saveSettings({ embedHidden: false });
  return getState();
}
