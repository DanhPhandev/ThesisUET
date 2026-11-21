import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { WebSocketServer, WebSocket } from "ws";
import { frameLspMessage, LspFrameParser } from "./framing.mjs";

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 6061);
const clangd = process.env.CLANGD_PATH || "clangd";
const allowed = new Set(
  (process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://127.0.0.1:3000")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean),
);
const maxSessions = Math.min(
  Math.max(Number(process.env.MAX_SESSIONS || 8), 1),
  64,
);
const connections = new Set();

const http = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, {
      "content-type": "application/json",
      "cache-control": "no-store",
    });
    res.end(
      JSON.stringify({
        status: "ok",
        service: "codeUET-clangd",
        sessions: connections.size,
      }),
    );
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});
const wsServer = new WebSocketServer({
  noServer: true,
  maxPayload: 2 * 1024 * 1024,
  perMessageDeflate: false,
});
http.on("upgrade", (request, socket, head) => {
  const origin = request.headers.origin;
  if (
    request.url !== "/lsp" ||
    !origin ||
    !allowed.has(origin) ||
    connections.size >= maxSessions
  ) {
    socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
    socket.destroy();
    return;
  }
  wsServer.handleUpgrade(request, socket, head, (ws) =>
    wsServer.emit("connection", ws),
  );
});

wsServer.on("connection", (ws) => {
  connections.add(ws);
  const processArgs = ["--log=error", "--background-index=false"];
  const proc = spawn(clangd, processArgs, {
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
  let closed = false;
  let stderr = "";
  const parser = new LspFrameParser((message) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
  });
  const cleanup = () => {
    if (closed) return;
    closed = true;
    connections.delete(ws);
    proc.stdin.destroy();
    if (!proc.killed) proc.kill();
    if (ws.readyState === WebSocket.OPEN) ws.close();
  };
  proc.on("error", (error) => {
    console.error(`Cannot start clangd: ${error.message}`);
    if (ws.readyState === WebSocket.OPEN)
      ws.close(1011, "clangd not installed");
    cleanup();
  });
  proc.on("exit", (code) => {
    if (!closed) {
      console.error(`clangd exited (${code}): ${stderr.slice(-300)}`);
      if (ws.readyState === WebSocket.OPEN) ws.close(1011, "clangd exited");
    }
    cleanup();
  });
  proc.stdout.on("data", (data) => {
    try {
      parser.push(data);
    } catch (error) {
      console.error(`Invalid response from clangd: ${error.message}`);
      if (ws.readyState === WebSocket.OPEN)
        ws.close(1011, "invalid clangd response");
      cleanup();
    }
  });
  proc.stderr.on("data", (bytes) => {
    stderr = (stderr + bytes.toString("utf8")).slice(-512);
  });
  ws.on("message", (raw, isBinary) => {
    if (closed || isBinary) return;
    try {
      const message = JSON.parse(raw.toString("utf8"));
      if (!message || typeof message !== "object" || Array.isArray(message))
        return;
      const data = frameLspMessage(message);
      if (proc.stdin.writable) proc.stdin.write(data);
    } catch (error) {
      console.error(`Invalid WebSocket/LSP request: ${error.message}`);
      ws.close(1003, "invalid LSP JSON");
    }
  });
  ws.on("error", cleanup);
  ws.on("close", cleanup);
});

http.listen(port, host, () => {
  console.log(`Clangd LSP WebSocket listening on ws://${host}:${port}/lsp`);
  console.log(`Accepted browser origins: ${[...allowed].join(", ")}`);
});

function shutdown() {
  for (const ws of connections) ws.terminate();
  http.close();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
