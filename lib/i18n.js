const STRINGS = {
  zh: {
    extName: "行内阅读",
    popupTitle: "行内阅读",
    optionsTitle: "行内阅读 · 设置",
    helpTitle: "使用说明",
    help1: "导入文本后，打开任意网页，点扩展图标里的「定位」，再点页面上一行即可嵌入。",
    help2: "弹窗可切换文档、搜索章节；每行字数和进度在本页下方。",
    keyAction: "操作",
    keyWindows: "Windows",
    keyMac: "Mac",
    keyPrev: "上一页",
    keyNext: "下一页",
    keyRestore: "还原原文",
    shortcutHint: "可在 chrome://extensions/shortcuts 改键。Mac 请用 Ctrl，不是 Command。",
    importTitle: "导入",
    chooseFile: "选择文本文件",
    encoding: "编码",
    encodingAuto: "自动识别",
    importBtn: "加入列表",
    filePreview: "文件预览",
    filePreviewEmpty: "选择文件后显示开头一段。",
    libraryTitle: "文档列表",
    libraryLead: "同一文件名再导入会更新正文，进度自动保留。",
    libraryEmpty: "还没有文档。从上面导入即可。",
    charsTitle: "每行字数",
    charsLead: "改完后按新字数重排，阅读位置尽量对齐。",
    charsCurrent: "当前：",
    progressTitle: "进度与目录",
    jumpProgress: "跳到进度",
    noToc: "未识别到目录",
    chapterSearch: "搜索章节",
    linePreview: "预览当前行",
    linePreviewEmpty: "导入文本后显示当前这一行。",
    jumpChapter: "导入后可在这里跳转章节",
    noChapters: "没识别到目录，可用上面的进度条跳转",
    toc: "目录",
    currentPrefix: "当前：",
    noChapterMatch: "没有匹配的章节",
    readingNow: "正在读",
    continueRead: "继续读",
    delete: "删除",
    deleteConfirm: "删除「{name}」？进度也会清除。",
    bookMeta: "{prefix}第 {page} 页 · {chapters} 章",
    statusCurrent: "当前：{name}，每行 {chars} 字",
    pickFileFirst: "请先选择一个有内容的文本文件。",
    importing: "正在导入…",
    imported: "已保存 {name}，识别到 {chapters} 章。每行 {chars} 字会记住。",
    noFile: "未导入",
    prev: "上",
    next: "下",
    restore: "还原",
    show: "显示",
    pick: "定位",
    settings: "设置",
    chapterJump: "跳转章节",
    pickerHint: "点页面上的一行文字来嵌入文本。按 Esc 取消。",
    shortcutUnset: "未设置",
    unnamed: "未命名"
  },
  en: {
    extName: "Inline Reader",
    popupTitle: "Inline Reader",
    optionsTitle: "Inline Reader · Settings",
    helpTitle: "How to use",
    help1: "Import a text file, open any webpage, click Select in the extension popup, then click a line to embed it.",
    help2: "Switch files and search chapters in the popup. Line length and progress are further down this page.",
    keyAction: "Action",
    keyWindows: "Windows",
    keyMac: "Mac",
    keyPrev: "Previous",
    keyNext: "Next",
    keyRestore: "Restore original",
    shortcutHint: "Change keys at chrome://extensions/shortcuts. On a Mac, use Control, not Command.",
    importTitle: "Import",
    chooseFile: "Choose a text file",
    encoding: "Encoding",
    encodingAuto: "Auto detect",
    importBtn: "Add to list",
    filePreview: "File preview",
    filePreviewEmpty: "The beginning of the file will appear here.",
    libraryTitle: "Library",
    libraryLead: "Importing the same file name updates the text and keeps your place.",
    libraryEmpty: "No files yet. Import one above.",
    charsTitle: "Characters per line",
    charsLead: "The layout is rebuilt to the new width, keeping your place as close as possible.",
    charsCurrent: "Current:",
    progressTitle: "Progress and chapters",
    jumpProgress: "Jump to progress",
    noToc: "No table of contents found",
    chapterSearch: "Search chapters",
    linePreview: "Current line preview",
    linePreviewEmpty: "The current line will appear here after you import a file.",
    jumpChapter: "Jump to a chapter here after importing",
    noChapters: "No chapters detected. Use the progress slider above.",
    toc: "Contents",
    currentPrefix: "Now:",
    noChapterMatch: "No matching chapters",
    readingNow: "Reading",
    continueRead: "Open",
    delete: "Delete",
    deleteConfirm: "Delete “{name}”? Progress will also be removed.",
    bookMeta: "{prefix}Page {page} · {chapters} chapters",
    statusCurrent: "Current: {name}, {chars} characters per line",
    pickFileFirst: "Choose a text file that has content first.",
    importing: "Importing…",
    imported: "Saved {name}. Found {chapters} chapters. {chars} characters per line will be remembered.",
    noFile: "No file",
    prev: "Prev",
    next: "Next",
    restore: "Restore",
    show: "Show",
    pick: "Select",
    settings: "Settings",
    chapterJump: "Jump to chapter",
    pickerHint: "Click a line of text to embed. Press Esc to cancel.",
    shortcutUnset: "Not set",
    unnamed: "Untitled"
  }
};

let locale = "zh";

export function getLocale() {
  return locale;
}

export function useLocale(next) {
  locale = next === "en" ? "en" : "zh";
  return locale;
}

export function t(key, params = {}) {
  const pack = STRINGS[locale] || STRINGS.zh;
  const text = pack[key] ?? STRINGS.zh[key] ?? key;
  return String(text).replace(/\{(\w+)\}/g, (_, name) =>
    params[name] == null ? "" : String(params[name])
  );
}

export async function initLocale() {
  const stored = await chrome.storage.local.get({ locale: "" });
  if (stored.locale === "zh" || stored.locale === "en") {
    locale = stored.locale;
    return locale;
  }
  const ui = chrome.i18n?.getUILanguage?.() || navigator.language || "zh";
  locale = String(ui).toLowerCase().startsWith("zh") ? "zh" : "en";
  return locale;
}

export async function setLocale(next) {
  useLocale(next);
  await chrome.storage.local.set({ locale });
  return locale;
}

export function applyI18n(root = document) {
  document.documentElement.lang = locale === "en" ? "en" : "zh-CN";
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  root.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAria));
  });
  document.title = document.body?.classList.contains("popup") ? t("popupTitle") : t("optionsTitle");
  syncLangSwitch(root);
}

export function syncLangSwitch(root = document) {
  root.querySelectorAll("[data-locale]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.locale === locale);
  });
}

export function bindLangSwitch(onChange, root = document) {
  root.querySelectorAll("[data-locale]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await setLocale(btn.dataset.locale);
      applyI18n(document);
      onChange?.();
    });
  });
}
