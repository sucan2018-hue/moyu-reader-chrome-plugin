const SENTENCE_RE = /(?<=[。！？；!?;])/;

export function splitIntoUnits(text) {
  const normalized = String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const units = [];
  for (const line of normalized.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    for (const part of trimmed.split(SENTENCE_RE)) {
      const unit = part.trim();
      if (unit) units.push(unit);
    }
  }
  return units;
}

function paginateInternal(units, charsPerScreen) {
  const limit = Math.max(1, Number(charsPerScreen) || 1);
  const screens = [];
  const screenOfUnit = Array(units.length).fill(0);
  let current = "";

  for (let i = 0; i < units.length; i += 1) {
    const unit = units[i];
    if (unit.length > limit) {
      if (current) {
        screens.push(current);
        current = "";
      }
      screenOfUnit[i] = screens.length;
      for (let offset = 0; offset < unit.length; offset += limit) {
        screens.push(unit.slice(offset, offset + limit));
      }
      continue;
    }

    const next = current + unit;
    if (current && next.length > limit) {
      screens.push(current);
      current = unit;
    } else {
      current = next;
    }
    screenOfUnit[i] = screens.length;
  }

  if (current) screens.push(current);
  return { screens, screenOfUnit };
}

export function paginate(units, charsPerScreen) {
  return paginateInternal(units, charsPerScreen).screens;
}

export function paginateIndexed(units, charsPerScreen) {
  return paginateInternal(units, charsPerScreen);
}

export function clampPageIndex(current, total, delta) {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(total - 1, current + delta));
}

export function remapPageIndex(oldIndex, oldChars, newChars) {
  const from = Math.max(1, Number(oldChars) || 1);
  const to = Math.max(1, Number(newChars) || 1);
  const offset = Math.max(0, Number(oldIndex) || 0) * from;
  return Math.floor(offset / to);
}
