const DB_NAME = "bookmark-txt-reader";
const DB_VERSION = 2;
const KV = "kv";
const BOOKS = "books";
const LEGACY_BOOK_KEY = "book";

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(KV)) {
        db.createObjectStore(KV);
      }
      if (!db.objectStoreNames.contains(BOOKS)) {
        db.createObjectStore(BOOKS, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function withStore(name, mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(name, mode);
        const result = fn(tx.objectStore(name));
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error);
      })
  );
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function newBookId() {
  return `b_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;
}

export async function putBook(book) {
  await withStore(BOOKS, "readwrite", (store) => {
    store.put(book);
  });
  return book;
}

export async function getBook(id) {
  if (!id) return null;
  const db = await openDb();
  return requestToPromise(db.transaction(BOOKS, "readonly").objectStore(BOOKS).get(id)).then(
    (row) => row ?? null
  );
}

export async function deleteBookRecord(id) {
  await withStore(BOOKS, "readwrite", (store) => {
    store.delete(id);
  });
}

export async function listBooks() {
  const db = await openDb();
  const rows = (await requestToPromise(db.transaction(BOOKS, "readonly").objectStore(BOOKS).getAll())) ?? [];
  return rows;
}

export async function migrateLegacyBook() {
  const db = await openDb();
  if (!db.objectStoreNames.contains(KV)) return null;
  const old = await requestToPromise(db.transaction(KV, "readonly").objectStore(KV).get(LEGACY_BOOK_KEY));
  if (!old?.text) return null;
  const existing = await listBooks();
  if (existing.length) {
    await withStore(KV, "readwrite", (store) => store.delete(LEGACY_BOOK_KEY));
    return existing[0];
  }
  const book = {
    id: newBookId(),
    name: old.name || "未命名",
    text: old.text,
    encoding: old.encoding || "utf-8",
    chapters: old.chapters || [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  await putBook(book);
  await withStore(KV, "readwrite", (store) => store.delete(LEGACY_BOOK_KEY));
  return book;
}

export const DEFAULT_SETTINGS = {
  currentBookId: "",
  pageIndex: 0,
  pageChars: 40,
  bookName: "",
  embedHidden: false,
  embedTargets: {},
  progressByBook: {}
};

export async function loadSettings() {
  const stored = await chrome.storage.local.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(patch) {
  await chrome.storage.local.set(patch);
}
