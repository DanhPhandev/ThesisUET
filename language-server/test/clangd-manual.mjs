/* Run locally after clangd and ws are installed: node test/clangd-manual.mjs */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import WebSocket from "ws";

const PORT = 6069;
const host = spawn(process.execPath, ["server.mjs"], {
  cwd: new URL("..", import.meta.url).pathname,
  env: { ...process.env, PORT: String(PORT), HOST: "127.0.0.1" },
  stdio: ["ignore", "pipe", "pipe"],
});
host.stderr.on("data", (buf) => console.error(buf.toString()));
let client;
try {
  await delay(600);
  client = new WebSocket(`ws://127.0.0.1:${PORT}/lsp`, {
    origin: "http://localhost:3000",
  });
  await new Promise((resolve, reject) => {
    client.once("open", resolve);
    client.once("error", reject);
  });
  const pending = new Map();
  const notifications = [];
  client.on("message", (raw) => {
    const m = JSON.parse(raw.toString());
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m);
      pending.delete(m.id);
    } else if (m.id && m.method)
      client.send(JSON.stringify({ jsonrpc: "2.0", id: m.id, result: null }));
    else if (m.method) notifications.push(m);
  });
  let next = 1;
  function request(method, params) {
    const id = next++;
    return new Promise((resolve, reject) => {
      pending.set(id, resolve);
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject(new Error(`Timeout ${method}`));
        }
      }, 12000).unref();
      client.send(JSON.stringify({ jsonrpc: "2.0", id, method, params }));
    });
  }
  function notify(method, params) {
    client.send(JSON.stringify({ jsonrpc: "2.0", method, params }));
  }
  const init = await request("initialize", {
    processId: null,
    rootUri: "file:///workspace",
    workspaceFolders: [{ name: "CodeUET", uri: "file:///workspace" }],
    capabilities: {
      workspace: { configuration: true },
      textDocument: {
        completion: { completionItem: { snippetSupport: true } },
        hover: { contentFormat: ["markdown", "plaintext"] },
        publishDiagnostics: {},
      },
    },
    initializationOptions: { fallbackFlags: ["-std=c++17", "-x", "c++"] },
  });
  assert.ok(
    init.result?.capabilities?.completionProvider,
    "clangd initialize failed",
  );
  notify("initialized", {});
  const uri = "file:///workspace/main.cpp";
  notify("textDocument/didOpen", {
    textDocument: {
      uri,
      languageId: "cpp",
      version: 1,
      text: "#include <vector>\nint main() { std::vector<int> vec; vec.pu }\n",
    },
  });
  await delay(900);
  const completion = await request("textDocument/completion", {
    textDocument: { uri },
    position: { line: 1, character: 41 },
    context: { triggerKind: 1 },
  });
  assert.ok(completion.result, "clangd completion missing");
  const items = Array.isArray(completion.result)
    ? completion.result
    : completion.result.items || [];
  console.log(
    "clangd completion suggestions",
    items.slice(0, 12).map((x) => x.label),
  );
  const hover = await request("textDocument/hover", {
    textDocument: { uri },
    position: { line: 1, character: 23 },
  });
  console.log("clangd hover:", JSON.stringify(hover.result).slice(0, 350));
  const diagnostics = notifications.filter(
    (x) => x.method === "textDocument/publishDiagnostics",
  );
  console.log(
    "clangd diagnostics notifications",
    diagnostics.length,
    diagnostics.map((x) => x.params.diagnostics.length),
  );
  console.log(
    "PASS: real clangd LSP WebSocket initialize/completion/hover/diagnostics",
  );
} finally {
  client?.terminate();
  host.kill("SIGTERM");
}
