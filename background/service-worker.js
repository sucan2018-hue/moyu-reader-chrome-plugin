import {
  getEmbedPayload,
  getPickerHint,
  getState,
  importBook,
  jumpToChapter,
  jumpToPage,
  refreshDisplay,
  removeBook,
  saveEmbedTarget,
  setLayout,
  switchBook,
  toggleHidden,
  turn
} from "../lib/reader.js";

chrome.runtime.onInstalled.addListener(() => {
  refreshDisplay().catch(console.error);
});

chrome.runtime.onStartup.addListener(() => {
  refreshDisplay().catch(console.error);
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "turn-next") {
    turn(1).catch(console.error);
  }
  if (command === "turn-prev") {
    turn(-1).catch(console.error);
  }
  if (command === "hide-embed") {
    toggleHidden().catch(console.error);
  }
});

async function kickPicker(tabId) {
  const run = () =>
    chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: () => {
        if (typeof window.__yozoReaderStartPicker !== "function") return false;
        window.__yozoReaderStartPicker();
        return true;
      }
    });
  try {
    const results = await run();
    if (!results?.some((item) => item.result)) throw new Error("not injected");
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ["content/embed.js"]
    });
    await chrome.scripting.insertCSS({
      target: { tabId, allFrames: true },
      files: ["content/embed.css"]
    });
    await run();
  }
}

async function stopPickers(tabId) {
  if (!tabId) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: () => {
        window.__yozoReaderStopPicker?.();
      }
    });
  } catch {
    // tab may have closed
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
      case "getState":
        return getState();
      case "turn":
        return turn(message.delta ?? 1);
      case "importBook":
        return importBook({
          name: message.name,
          text: message.text,
          encoding: message.encoding
        });
      case "switchBook":
        return switchBook(message.bookId);
      case "removeBook":
        return removeBook(message.bookId);
      case "jumpToPage":
        return jumpToPage(message.pageIndex);
      case "jumpToChapter":
        return jumpToChapter(message.unitIndex);
      case "toggleHidden":
        return toggleHidden();
      case "setLayout":
        return setLayout(message);
      case "refreshDisplay":
        return refreshDisplay();
      case "getEmbedPayload":
        return getEmbedPayload(message.url || sender.url || sender.tab?.url || "");
      case "getPickerHint":
        return getPickerHint();
      case "startPicker": {
        const tabId = message.tabId || sender.tab?.id;
        if (!tabId) return { ok: false };
        await new Promise((resolve) => setTimeout(resolve, 250));
        await kickPicker(tabId);
        return { ok: true };
      }
      case "saveEmbedTarget": {
        const state = await saveEmbedTarget({
          url: message.url || sender.url || sender.tab?.url || "",
          selector: message.selector
        });
        await stopPickers(sender.tab?.id);
        return state;
      }
      default:
        throw new Error(`unknown message: ${message?.type}`);
    }
  })()
    .then(sendResponse)
    .catch((error) => sendResponse({ error: String(error) }));
  return true;
});
