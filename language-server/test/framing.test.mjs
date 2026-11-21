import test from "node:test";
import assert from "node:assert/strict";
import { LspFrameParser, frameLspMessage } from "../framing.mjs";

test("LSP parser handles split UTF-8 packets", () => {
  const msgs = [];
  const parser = new LspFrameParser((msg) => msgs.push(msg));
  const encoded = frameLspMessage({ jsonrpc: "2.0", method: "test", params: { msg: "Gợi ý tiếng Việt 🐍" } });
  for (let i = 0; i < encoded.length; i += 5) parser.push(encoded.subarray(i, i + 5));
  assert.deepEqual(msgs, [{ jsonrpc: "2.0", method: "test", params: { msg: "Gợi ý tiếng Việt 🐍" } }]);
});

test("LSP parser handles multiple messages in a single chunk", () => {
  const msgs = [];
  const parser = new LspFrameParser((msg) => msgs.push(msg));
  parser.push(Buffer.concat([frameLspMessage({ id: 1, result: 1 }), frameLspMessage({ id: 2, result: 2 })]));
  assert.equal(msgs.length, 2);
  assert.equal(msgs[1].result, 2);
});

test("LSP parser rejects malformed headers and oversized messages", () => {
  assert.throws(() => new LspFrameParser(() => {}).push(Buffer.from("Content-Length: 9000000\r\n\r\n")));
  assert.throws(() => new LspFrameParser(() => {}).push(Buffer.from("Content-Type: application/json\r\n\r\n")));
});
