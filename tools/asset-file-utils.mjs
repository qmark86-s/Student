import { createHash } from "node:crypto";

export function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}

export function pngInfo(buffer) {
  if (buffer.length >= 24 && buffer.slice(1, 4).toString("ascii") === "PNG") {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }
  return {};
}
