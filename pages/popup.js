import { applyI18n, bindLangSwitch, initLocale, t } from "../lib/i18n.js";
import { formatShortcut } from "../lib/shortcut.js";

let latestState = null;

function shortcutLabel(shortcut, isMac) {
  const text = formatShortcut(shortcut, { isMac });
  return text === "未设置" ? t("shortcutUnset") : text;
}

function renderBooks(state) {
  const select = document.getElementById("bookSelect");
  const books = state.books || [];
  const currentId = state.bookId || "";
  select.replaceChildren();
  if (!books.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = t("noFile");
    select.append(option);
    select.disabled = true;
    return;
  }
  select.disabled = false;
  for (const book of books) {
    const option = document.createElement("option");
    option.value = book.id;
    option.textContent = book.name.replace(/\.txt$/i, "");
    if (book.id === currentId) option.selected = true;
    select.append(option);
  }
}

function matchedChapters(state, query) {
  const q = String(query || "").trim();
  if (!q) return [];
  return (state.chapters || []).filter((item) => item.title.includes(q)).slice(0, 12);
}

function renderChapters(state) {
  const now = document.getElementById("chapterNow");
  const list = document.getElementById("chapterList");
  const query = document.getElementById("chapterQuery");
  if (!state.hasBook) {
    now.textContent = "";
    query.disabled = true;
    list.replaceChildren();
    return;
  }
  query.disabled = false;
  const chapters = state.chapters || [];
  const current = chapters[state.currentChapterIndex];
  now.textContent = current ? current.title : "";
  const rows = matchedChapters(state, query.value);
  list.replaceChildren();
  for (const chapter of rows) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chapter-item";
    if (chapter.unitIndex === current?.unitIndex) button.classList.add("is-current");
    button.textContent = chapter.title;
    button.addEventListener("click", async () => {
      render(await chrome.runtime.sendMessage({ type: "jumpToChapter", unitIndex: chapter.unitIndex }));
      query.value = "";
      renderChapters(latestState);
    });
    list.append(button);
  }
}

function render(state) {
  latestState = state;
  const hasBook = Boolean(state?.hasBook);
  renderBooks(state);
  renderChapters(state);
  document.getElementById("prev").disabled = !hasBook || state.pageIndex <= 0;
  document.getElementById("next").disabled = !hasBook || state.pageIndex >= state.total - 1;
  document.getElementById("pick").disabled = !hasBook;
  document.getElementById("hide").disabled = !hasBook;
  document.getElementById("hideLabel").textContent = state?.embedHidden ? t("show") : t("restore");
}

async function loadShortcuts() {
  const isMac = navigator.platform.includes("Mac");
  const commands = await chrome.commands.getAll();
  const prev = commands.find((item) => item.name === "turn-prev");
  const next = commands.find((item) => item.name === "turn-next");
  const hide = commands.find((item) => item.name === "hide-embed");
  document.getElementById("prevKey").textContent = shortcutLabel(prev?.shortcut, isMac);
  document.getElementById("nextKey").textContent = shortcutLabel(next?.shortcut, isMac);
  document.getElementById("hideKey").textContent = shortcutLabel(hide?.shortcut, isMac);
}

async function refresh() {
  const state = await chrome.runtime.sendMessage({ type: "getState" });
  if (state?.error) {
    document.getElementById("chapterNow").textContent = state.error;
    return;
  }
  render(state);
}

async function startPicker() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !/^https?:/.test(tab.url || "")) return;
  chrome.runtime.sendMessage({ type: "startPicker", tabId: tab.id });
  window.close();
}

document.getElementById("bookSelect").addEventListener("change", async (event) => {
  const bookId = event.target.value;
  if (!bookId) return;
  render(await chrome.runtime.sendMessage({ type: "switchBook", bookId }));
});

document.getElementById("chapterQuery").addEventListener("input", () => {
  if (latestState) renderChapters(latestState);
});

document.getElementById("prev").addEventListener("click", async () => {
  render(await chrome.runtime.sendMessage({ type: "turn", delta: -1 }));
});
document.getElementById("next").addEventListener("click", async () => {
  render(await chrome.runtime.sendMessage({ type: "turn", delta: 1 }));
});
document.getElementById("hide").addEventListener("click", async () => {
  render(await chrome.runtime.sendMessage({ type: "toggleHidden" }));
});
document.getElementById("pick").addEventListener("click", () => {
  startPicker().catch(() => {});
});
document.getElementById("openOptions").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
document.getElementById("openDonate").addEventListener("click", async () => {
  await chrome.storage.local.set({ openDonate: true });
  chrome.runtime.openOptionsPage();
});

await initLocale();
applyI18n();
bindLangSwitch(() => {
  loadShortcuts();
  if (latestState) render(latestState);
});
loadShortcuts();
refresh();
