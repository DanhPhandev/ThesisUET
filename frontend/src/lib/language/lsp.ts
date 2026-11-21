/** Browser JSON-RPC 2.0/LSP transport; no VS Code extension host required. */
export type JsonRpcMessage = {
  jsonrpc?: "2.0";
  id?: number | string;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code: number; message: string };
};

export type LanguageTransport = {
  send(message: JsonRpcMessage): void;
  onMessage(listener: (message: JsonRpcMessage) => void): void;
  onError(listener: (error: Error) => void): void;
  close(): void;
};

type Pending = {
  resolve(value: any): void;
  reject(error: Error): void;
  timer: ReturnType<typeof setTimeout>;
};

export class LspConnection {
  private pending = new Map<number, Pending>();
  private requestId = 1;
  private closed = false;
  private notifications = new Map<string, Set<(params: any) => void>>();
  private onTransportError?: (error: Error) => void;

  constructor(private transport: LanguageTransport) {
    transport.onMessage((message) => this.handleMessage(message));
    transport.onError((error) => this.fail(error));
  }

  onNotification(method: string, fn: (params: any) => void): () => void {
    const handlers = this.notifications.get(method) ?? new Set();
    handlers.add(fn);
    this.notifications.set(method, handlers);
    return () => handlers.delete(fn);
  }

  onError(fn: (error: Error) => void) {
    this.onTransportError = fn;
  }

  notify(method: string, params: unknown): void {
    if (!this.closed) this.transport.send({ jsonrpc: "2.0", method, params });
  }

  request<T = unknown>(
    method: string,
    params: unknown,
    timeout = 12000,
  ): Promise<T> {
    if (this.closed)
      return Promise.reject(new Error("Language server đã ngắt kết nối."));
    const id = this.requestId++;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Language server không phản hồi (${method}).`));
      }, timeout);
      this.pending.set(id, { resolve, reject, timer });
      try {
        this.transport.send({ jsonrpc: "2.0", id, method, params });
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private handleMessage(message: JsonRpcMessage): void {
    if (!message || this.closed) return;
    if (message.id !== undefined && !message.method) {
      const item = this.pending.get(Number(message.id));
      if (!item) return;
      clearTimeout(item.timer);
      this.pending.delete(Number(message.id));
      if (message.error) item.reject(new Error(message.error.message));
      else item.resolve(message.result);
      return;
    }
    if (!message.method) return;
    if (message.id !== undefined) {
      let result: unknown = null;
      if (message.method === "workspace/configuration") {
        const items =
          (message.params as { items?: { section?: string }[] } | undefined)
            ?.items ?? [];
        result = items.map((item) =>
          item.section === "python.analysis" || item.section === "pyright"
            ? {
                typeCheckingMode: "basic",
                diagnosticMode: "openFilesOnly",
                autoImportCompletions: true,
              }
            : item.section === "python"
              ? {}
              : null,
        );
      } else if (message.method === "workspace/workspaceFolders") {
        result = [{ name: "CodeUET", uri: "file:///workspace" }];
      } else if (message.method === "workspace/applyEdit") {
        result = { applied: false };
      }
      // All server-initiated requests must be answered, or clangd/Pyright can stall.
      this.transport.send({ jsonrpc: "2.0", id: message.id, result });
      return;
    }
    this.notifications
      .get(message.method)
      ?.forEach((listener) => listener(message.params));
  }

  private fail(error: Error): void {
    if (this.closed) return;
    this.onTransportError?.(error);
    this.dispose(error);
  }

  dispose(reason = new Error("Language session đã đóng.")): void {
    if (this.closed) return;
    this.closed = true;
    for (const item of this.pending.values()) {
      clearTimeout(item.timer);
      item.reject(reason);
    }
    this.pending.clear();
    this.notifications.clear();
    this.transport.close();
  }
}

export function pythonWorkerTransport(): LanguageTransport {
  const worker = new Worker("/language/python/pyright.worker.js", {
    name: "CodeUET-Pyright",
  });
  let received: (message: JsonRpcMessage) => void = () => {};
  let failed: (error: Error) => void = () => {};
  worker.onmessage = (event: MessageEvent<JsonRpcMessage>) =>
    received(event.data);
  worker.onerror = (event) =>
    failed(new Error(event.message || "Pyright worker lỗi."));
  worker.onmessageerror = () =>
    failed(new Error("Không đọc được dữ liệu từ Pyright."));
  // Bundled Pyright browser worker requires explicit foreground boot.
  worker.postMessage({ type: "browser/boot", mode: "foreground" });
  return {
    send: (message) => worker.postMessage(message),
    onMessage: (handler) => {
      received = handler;
    },
    onError: (handler) => {
      failed = handler;
    },
    close: () => worker.terminate(),
  };
}

export async function clangdWebsocketTransport(): Promise<LanguageTransport> {
  const override = process.env.NEXT_PUBLIC_CLANGD_WS_URL;
  const url =
    override ||
    `${location.protocol === "https:" ? "wss" : "ws"}://${location.hostname}:6061/lsp`;
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const timeout = setTimeout(() => {
      socket.close();
      reject(
        new Error(
          `Không kết nối được clangd tại ${url}. Hãy chạy dịch vụ language-server.`,
        ),
      );
    }, 6000);
    socket.onopen = () => {
      clearTimeout(timeout);
      let received: (message: JsonRpcMessage) => void = () => {};
      let failed: (error: Error) => void = () => {};
      socket.onmessage = (event) => {
        try {
          received(JSON.parse(event.data as string));
        } catch {
          failed(new Error("Clangd trả về JSON không hợp lệ."));
        }
      };
      socket.onerror = () => failed(new Error("Kết nối clangd bị lỗi."));
      socket.onclose = () => failed(new Error("Clangd đã ngắt kết nối."));
      resolve({
        send(message) {
          if (socket.readyState !== WebSocket.OPEN)
            throw new Error("Clangd chưa kết nối.");
          socket.send(JSON.stringify(message));
        },
        onMessage(handler) {
          received = handler;
        },
        onError(handler) {
          failed = handler;
        },
        close() {
          socket.close();
        },
      });
    };
    socket.onerror = () => {
      clearTimeout(timeout);
      reject(new Error(`Không thể mở WebSocket clangd (${url}).`));
    };
    socket.onclose = () => {
      clearTimeout(timeout);
      reject(new Error(`Máy chủ clangd từ chối kết nối (${url}).`));
    };
  });
}

export async function initializeLsp(
  connection: LspConnection,
  language: "python" | "cpp",
): Promise<void> {
  const isPython = language === "python";
  let files: Record<string, string> = {};
  if (isPython) {
    const response = await fetch("/language/python/typeshed.json");
    if (!response.ok) throw new Error("Không tải được Python type stubs.");
    files = (await response.json()) as Record<string, string>;
    // Pyright worker first needs to receive its boot command (extension waits 500 ms).
    await new Promise((resolve) => setTimeout(resolve, 450));
  }
  await connection.request(
    "initialize",
    {
      processId: null,
      clientInfo: { name: "CodeUET Monaco", version: "1.0.0" },
      rootUri: "file:///workspace",
      workspaceFolders: [{ name: "CodeUET", uri: "file:///workspace" }],
      capabilities: {
        workspace: { configuration: true, workspaceFolders: true },
        general: { positionEncodings: ["utf-16"] },
        textDocument: {
          synchronization: { didSave: true },
          completion: {
            completionItem: {
              snippetSupport: true,
              documentationFormat: ["markdown", "plaintext"],
              resolveSupport: { properties: ["documentation", "detail"] },
            },
            contextSupport: true,
          },
          hover: { contentFormat: ["markdown", "plaintext"] },
          signatureHelp: {
            signatureInformation: {
              documentationFormat: ["markdown", "plaintext"],
              parameterInformation: { labelOffsetSupport: true },
            },
          },
          definition: { linkSupport: true },
          publishDiagnostics: {
            relatedInformation: true,
            tagSupport: { valueSet: [1, 2] },
            versionSupport: true,
          },
        },
      },
      initializationOptions: isPython
        ? {
            files,
            python: {},
            pyright: {
              typeCheckingMode: "basic",
              diagnosticMode: "openFilesOnly",
              autoImportCompletions: true,
            },
          }
        : { fallbackFlags: ["-std=c++17", "-x", "c++"] },
    },
    25000,
  );
  connection.notify("initialized", {});
  connection.notify("workspace/didChangeConfiguration", {
    settings: {
      python: {},
      pyright: {
        typeCheckingMode: "basic",
        diagnosticMode: "openFilesOnly",
        autoImportCompletions: true,
      },
      "python.analysis": {
        typeCheckingMode: "basic",
        diagnosticMode: "openFilesOnly",
        autoImportCompletions: true,
      },
    },
  });
}
