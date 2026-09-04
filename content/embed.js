if (window.__yozoReaderInjected) {
  // already running
} else {
  window.__yozoReaderInjected = true;

  const originals = new WeakMap();
  let currentEl = null;
  let picking = false;
  let hoverEl = null;
  let pickerGen = 0;

  function cssPath(el) {
    if (!(el instanceof Element)) return "";
    const parts = [];
    let node = el;
    while (node && node.nodeType === Node.ELEMENT_NODE && node !== document.documentElement) {
      if (node.id) {
        parts.unshift(`#${CSS.escape(node.id)}`);
        break;
      }
      const tag = node.nodeName.toLowerCase();
      const parent = node.parentElement;
      if (!parent) {
        parts.unshift(tag);
        break;
      }
      const sameTag = [...parent.children].filter((child) => child.nodeName === node.nodeName);
      const piece = sameTag.length > 1 ? `${tag}:nth-of-type(${sameTag.indexOf(node) + 1})` : tag;
      parts.unshift(piece);
      node = parent;
    }
    return parts.join(" > ");
  }

  function pickTarget(start) {
    let el = start instanceof Element ? start : start?.parentElement;
    while (el && el !== document.body) {
      if (el.closest(".yozo-reader-ignore")) {
        el = el.parentElement;
        continue;
      }
      const text = (el.innerText || "").trim();
      if (el.matches("p, li, td, th, h1, h2, h3, h4, h5, h6, blockquote")) {
        return el;
      }
      if (text.length >= 4 && el.childElementCount <= 2) {
        return el;
      }
      el = el.parentElement;
    }
    return start instanceof Element ? start : null;
  }

  function isTinyFrame() {
    try {
      return window.self !== window.top && (window.innerWidth < 240 || window.innerHeight < 80);
    } catch {
      return false;
    }
  }

  function showOriginal(el) {
    if (!el || !originals.has(el)) return;
    el.innerHTML = originals.get(el);
  }

  function restore(el) {
    if (!el || !originals.has(el)) return;
    el.innerHTML = originals.get(el);
    originals.delete(el);
  }

  function applyText(el, text) {
    if (!el) return;
    if (!originals.has(el)) {
      originals.set(el, el.innerHTML);
    }
    el.textContent = text;
  }

  async function refresh() {
    if (isTinyFrame()) return;
    const payload = await chrome.runtime.sendMessage({
      type: "getEmbedPayload",
      url: location.href
    });
    if (!payload || payload.error) {
      restore(currentEl);
      currentEl = null;
      return;
    }
    if (!payload.enabled || !payload.selector) {
      restore(currentEl);
      currentEl = null;
      return;
    }
    const next = document.querySelector(payload.selector);
    if (currentEl && currentEl !== next) {
      restore(currentEl);
    }
    currentEl = next;
    if (!currentEl) return;
    if (payload.hidden) {
      showOriginal(currentEl);
      return;
    }
    if (payload.text) {
      applyText(currentEl, payload.text);
    }
  }

  function stopPicker() {
    pickerGen += 1;
    picking = false;
    document.body?.classList.remove("yozo-reader-picking");
    hoverEl?.classList.remove("yozo-reader-hover");
    hoverEl = null;
    banner()?.remove();
  }

  function banner() {
    return document.querySelector(".yozo-reader-banner");
  }

  function startPicker() {
    if (isTinyFrame()) return;
    picking = true;
    const gen = (pickerGen += 1);
    document.body.classList.add("yozo-reader-picking");
    const bar = banner() || document.createElement("div");
    bar.className = "yozo-reader-banner yozo-reader-ignore";
    if (!bar.isConnected) document.documentElement.appendChild(bar);
    chrome.runtime.sendMessage({ type: "getPickerHint" }).then((payload) => {
      if (gen !== pickerGen || !picking || !bar.isConnected) return;
      bar.textContent = payload?.pickerHint || "";
    });
  }

  document.addEventListener(
    "mouseover",
    (event) => {
      if (!picking) return;
      const target = pickTarget(event.target);
      if (!target || target === hoverEl) return;
      hoverEl?.classList.remove("yozo-reader-hover");
      hoverEl = target;
      hoverEl.classList.add("yozo-reader-hover");
    },
    true
  );

  document.addEventListener(
    "click",
    async (event) => {
      if (!picking) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const target = pickTarget(event.target);
      stopPicker();
      if (!target) return;
      const selector = cssPath(target);
      await chrome.runtime.sendMessage({
        type: "saveEmbedTarget",
        url: location.href,
        selector
      });
      await refresh();
    },
    true
  );

  document.addEventListener("keydown", (event) => {
    if (picking && event.key === "Escape") {
      event.preventDefault();
      stopPicker();
    }
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "startPicker") {
      startPicker();
      sendResponse({ ok: true });
      return;
    }
    if (message?.type === "refreshEmbed") {
      refresh().then(() => sendResponse({ ok: true }));
      return true;
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.locale && picking) {
      chrome.runtime.sendMessage({ type: "getPickerHint" }).then((payload) => {
        const bar = banner();
        if (bar && picking && payload?.pickerHint) bar.textContent = payload.pickerHint;
      });
    }
    if (changes.embedTargets) {
      stopPicker();
    }
    if (changes.pageIndex || changes.embedTargets || changes.pageChars || changes.bookName || changes.embedHidden || changes.currentBookId) {
      refresh();
    }
  });

  const observer = new MutationObserver(() => {
    if (currentEl && !document.contains(currentEl)) {
      currentEl = null;
      refresh();
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.__yozoReaderStartPicker = startPicker;
  window.__yozoReaderStopPicker = stopPicker;
  refresh();
}
