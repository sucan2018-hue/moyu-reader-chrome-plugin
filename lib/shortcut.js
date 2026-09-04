export function formatShortcut(shortcut, { isMac = false } = {}) {
  if (!shortcut) return "未设置";
  let text = String(shortcut).replaceAll("MacCtrl", "Ctrl").replaceAll("Command", "Cmd");
  if (isMac) {
    text = text.replaceAll("Alt", "Option");
  }
  return text;
}
