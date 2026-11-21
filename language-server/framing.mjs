/** LSP over stdio uses Content-Length headers and UTF-8 JSON messages. */
const MAX_MESSAGE = 2 * 1024 * 1024;

export function frameLspMessage(value) {
  const body = Buffer.from(JSON.stringify(value), "utf8");
  if (body.byteLength > MAX_MESSAGE) throw new Error("LSP message too large");
  return Buffer.concat([Buffer.from(`Content-Length: ${body.byteLength}\r\n\r\n`, "ascii"), body]);
}

export class LspFrameParser {
  constructor(onMessage) {
    this.onMessage = onMessage;
    this.buffer = Buffer.alloc(0);
    this.expected = null;
  }

  push(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (true) {
      if (this.expected === null) {
        const boundary = this.buffer.indexOf("\r\n\r\n");
        if (boundary === -1) {
          if (this.buffer.byteLength > 8192) throw new Error("Invalid LSP headers");
          return;
        }
        const header = this.buffer.subarray(0, boundary).toString("ascii");
        const length = /^Content-Length:\s*(\d+)\s*$/im.exec(header);
        if (!length || Number(length[1]) > MAX_MESSAGE) throw new Error("Invalid LSP length");
        this.expected = Number(length[1]);
        this.buffer = this.buffer.subarray(boundary + 4);
      }
      if (this.buffer.byteLength < this.expected) return;
      const body = this.buffer.subarray(0, this.expected);
      this.buffer = this.buffer.subarray(this.expected);
      this.expected = null;
      this.onMessage(JSON.parse(body.toString("utf8")));
    }
  }
}
