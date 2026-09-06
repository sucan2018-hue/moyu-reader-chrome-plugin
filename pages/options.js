import { decodeText, detectEncoding } from "../lib/encoding.js";
import { applyI18n, bindLangSwitch, initLocale, t } from "../lib/i18n.js";
import { formatShortcut } from "../lib/shortcut.js";

const fileInput = document.getElementById("file");
const encodingSelect = document.getElementById("encoding");
const preview = document.getElementById("preview");
const status = document.getElementById("status");
const importBtn = document.getElementById("importBtn");
const library = document.getElementById("library");
const pageCharsInput = document.getElementById("pageChars");
const pageCharsValue = document.getElementById("pageCharsValue");
const pageJump = document.getElementById("pageJump");
const progressEl = document.getElementById("progress");
const currentEl = document.getElementById("current");
const chapterNow = document.getElementById("chapterNow");
const chapterQuery = document.getElementById("chapterQuery");
const chapterList = document.getElementById("chapterList");

let pending = null;
let latestState = null;
let layoutTimer = 0;
let jumpTimer = 0;
let layoutReady = false;

function chosenEncoding(buffer) {
  const selected = encodingSelect.value;
  return selected === "auto" ? detectEncoding(buffer) : selected;
}

function setPageCharsUi(value) {
  const chars = String(value || 40);
  pageCharsInput.value = chars;
  pageCharsValue.textContent = chars;
}

function visibleChapters(state, query) {
  const chapters = state.chapters || [];
  const q = String(query || "").trim();
  if (q) return chapters.filter((item) => item.title.includes(q)).slice(0, 80);
  if (!chapters.length) return [];
  const current = Math.max(0, state.currentChapterIndex);
  const start = Math.max(0, current - 8);
  return chapters.slice(start, start + 24);
}

function renderChapters(state) {
  const chapters = state.chapters || [];
  if (!state.hasBook) {
    chapterNow.textContent = t("jumpChapter");
    chapterQuery.disabled = true;
    chapterList.replaceChildren();
    return;
  }
  chapterQuery.disabled = false;
  if (!chapters.length) {
    chapterNow.textContent = t("noChapters");
    chapterList.replaceChildren();
    return;
  }
  const current = chapters[state.currentChapterIndex];
  chapterNow.textContent = current ? `${t("currentPrefix")}${current.title}` : t("toc");
  const rows = visibleChapters(state, chapterQuery.value);
  chapterList.replaceChildren();
  if (!rows.length) {
    const empty = document.createElement("div");
    empty.className = "chapter-item";
    empty.textContent = t("noChapterMatch");
    chapterList.append(empty);
    return;
  }
  for (const chapter of rows) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chapter-item";
    if (chapter.unitIndex === current?.unitIndex) button.classList.add("is-current");
    button.textContent = chapter.title;
    button.addEventListener("click", async () => {
      applyState(await chrome.runtime.sendMessage({ type: "jumpToChapter", unitIndex: chapter.unitIndex }));
    });
    chapterList.append(button);
  }
}

function renderLibrary(state) {
  const books = state?.books || [];
  if (!books.length) {
    library.textContent = t("libraryEmpty");
    return;
  }
  library.replaceChildren();
  for (const book of books) {
    const row = document.createElement("div");
    row.className = "book-row";
    const isCurrent = book.id === state.bookId;
    const page = (book.pageIndex || 0) + 1;
    const info = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = book.name;
    const meta = document.createElement("div");
    meta.className = "hint";
    meta.textContent = t("bookMeta", {
      prefix: isCurrent ? `${t("readingNow")} · ` : "",
      page,
      chapters: book.chapterCount || 0
    });
    info.append(title, meta);
    row.append(info);
    const actions = document.createElement("div");
    actions.className = "row";
    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.textContent = isCurrent ? t("readingNow") : t("continueRead");
    openBtn.disabled = isCurrent;
    openBtn.addEventListener("click", async () => {
      applyState(await chrome.runtime.sendMessage({ type: "switchBook", bookId: book.id }));
    });
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "ghost";
    delBtn.textContent = t("delete");
    delBtn.addEventListener("click", async () => {
      if (!confirm(t("deleteConfirm", { name: book.name }))) return;
      applyState(await chrome.runtime.sendMessage({ type: "removeBook", bookId: book.id }));
    });
    actions.append(openBtn, delBtn);
    row.append(actions);
    library.append(row);
  }
}

function applyState(state) {
  if (!state || state.error) {
    if (state?.error) status.textContent = state.error;
    return;
  }
  latestState = state;
  layoutReady = true;
  setPageCharsUi(state.pageChars);
  pageCharsInput.disabled = false;
  const hasBook = Boolean(state.hasBook);
  progressEl.textContent = hasBook ? `${state.pageIndex + 1} / ${state.total}` : "0 / 0";
  currentEl.textContent = hasBook ? state.currentText : t("linePreviewEmpty");
  pageJump.disabled = !hasBook;
  pageJump.max = String(Math.max(0, (state.total || 1) - 1));
  pageJump.value = String(state.pageIndex || 0);
  renderChapters(state);
  renderLibrary(state);
  if (hasBook) {
    status.textContent = t("statusCurrent", { name: state.bookName, chars: state.pageChars });
  }
}

async function updatePreview() {
  const file = fileInput.files[0];
  if (!file) {
    pending = null;
    preview.textContent = t("filePreviewEmpty");
    return;
  }
  const buffer = await file.arrayBuffer();
  const encoding = chosenEncoding(buffer);
  const text = decodeText(buffer, encoding);
  pending = { name: file.name, text, encoding };
  preview.textContent = `${file.name} · ${encoding}\n\n${text.slice(0, 400)}`;
}

async function loadSavedLayout() {
  const stored = await chrome.storage.local.get({ pageChars: 40 });
  setPageCharsUi(stored.pageChars);
}

async function loadLibrary() {
  const state = await chrome.runtime.sendMessage({ type: "getState" });
  applyState(state);
}

function scheduleLayout(pageChars) {
  pageCharsValue.textContent = String(pageChars);
  clearTimeout(layoutTimer);
  layoutTimer = window.setTimeout(async () => {
    const state = await chrome.runtime.sendMessage({ type: "setLayout", pageChars });
    applyState(state);
  }, 80);
}

pageCharsInput.addEventListener("input", (event) => {
  if (!layoutReady) return;
  scheduleLayout(Number(event.target.value));
});

chapterQuery.addEventListener("input", () => {
  if (latestState) renderChapters(latestState);
});

pageJump.addEventListener("input", (event) => {
  const pageIndex = Number(event.target.value);
  progressEl.textContent = latestState ? `${pageIndex + 1} / ${latestState.total}` : String(pageIndex);
  clearTimeout(jumpTimer);
  jumpTimer = window.setTimeout(async () => {
    applyState(await chrome.runtime.sendMessage({ type: "jumpToPage", pageIndex }));
  }, 50);
});

fileInput.addEventListener("change", () => {
  updatePreview().catch((error) => {
    status.textContent = String(error);
  });
});
encodingSelect.addEventListener("change", () => {
  updatePreview().catch((error) => {
    status.textContent = String(error);
  });
});

importBtn.addEventListener("click", async () => {
  if (!pending) await updatePreview();
  if (!pending?.text?.trim()) {
    status.textContent = t("pickFileFirst");
    return;
  }
  status.textContent = t("importing");
  const state = await chrome.runtime.sendMessage({
    type: "importBook",
    name: pending.name,
    text: pending.text,
    encoding: pending.encoding
  });
  applyState(state);
  if (!state?.error) {
    status.textContent = t("imported", {
      name: state.bookName,
      chapters: state.chapters?.length || 0,
      chars: state.pageChars
    });
  }
});

const shortcutCells = {
  "turn-prev": { win: "keyPrevWin", mac: "keyPrevMac" },
  "turn-next": { win: "keyNextWin", mac: "keyNextMac" },
  "hide-embed": { win: "keyHideWin", mac: "keyHideMac" }
};

function shortcutLabel(shortcut, isMac) {
  const text = formatShortcut(shortcut, { isMac });
  return text === "未设置" ? t("shortcutUnset") : text;
}

async function fillShortcutTable() {
  const isMac = navigator.platform.includes("Mac");
  const commands = await chrome.commands.getAll();
  for (const [name, cells] of Object.entries(shortcutCells)) {
    const command = commands.find((item) => item.name === name);
    const el = document.getElementById(isMac ? cells.mac : cells.win);
    if (el) el.textContent = shortcutLabel(command?.shortcut, isMac);
  }
}

function bindDonateQrs() {
  document.querySelectorAll(".donate-qr img").forEach((img) => {
    const hide = () => img.closest(".donate-qr")?.classList.add("is-missing");
    img.addEventListener("error", hide);
    if (img.complete && img.naturalWidth === 0) hide();
  });
}

async function revealDonateIfNeeded() {
  const stored = await chrome.storage.local.get({ openDonate: false });
  if (!stored.openDonate && location.hash !== "#donate") return;
  await chrome.storage.local.remove("openDonate");
  document.getElementById("donate")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

await initLocale();
applyI18n();
preview.textContent = t("filePreviewEmpty");
currentEl.textContent = t("linePreviewEmpty");
bindDonateQrs();
document.getElementById("editShortcuts").addEventListener("click", () => {
  chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});
bindLangSwitch(() => {
  fillShortcutTable();
  if (!pending) preview.textContent = t("filePreviewEmpty");
  if (latestState) applyState(latestState);
  else {
    currentEl.textContent = t("linePreviewEmpty");
    library.textContent = t("libraryEmpty");
  }
});
loadSavedLayout();
loadLibrary();
fillShortcutTable();
revealDonateIfNeeded();
