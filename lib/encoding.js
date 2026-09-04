export function detectEncoding(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return "utf-8";
  }
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return "utf-8";
  } catch {
    return "gb18030";
  }
}

export function decodeText(buffer, encoding) {
  const bytes = new Uint8Array(buffer);
  const skipBom =
    encoding === "utf-8" &&
    bytes.length >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf;
  return new TextDecoder(encoding).decode(skipBom ? bytes.subarray(3) : bytes);
}
