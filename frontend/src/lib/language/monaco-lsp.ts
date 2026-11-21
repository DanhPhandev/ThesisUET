import type * as Monaco from "monaco-editor";
import {
  LspConnection,
  clangdWebsocketTransport,
  initializeLsp,
  pythonWorkerTransport,
} from "./lsp";

export type IntelliSenseStatus = "connecting" | "ready" | "disconnected";
export type SupportedLanguage = "python" | "cpp";

type Pos = { line: number; character: number };
type Range = { start: Pos; end: Pos };
type Markup =
  | string
  | { kind?: "markdown" | "plaintext"; value: string }
  | { language: string; value: string };
type Completion = {
  label: string | { label: string; detail?: string; description?: string };
  kind?: number;
  detail?: string;
  documentation?: Markup;
  insertText?: string;
  insertTextFormat?: number;
  filterText?: string;
  sortText?: string;
  textEdit?: {
    range?: Range;
    insert?: Range;
    replace?: Range;
    newText: string;
  };
  additionalTextEdits?: { range: Range; newText: string }[];
};
type Diagnostic = {
  range: Range;
  message: string;
  severity?: number;
  source?: string;
  code?: string | number;
};
type Hover = { contents: Markup | Markup[]; range?: Range } | null;
type LspSignature = {
  label: string;
  documentation?: Markup;
  parameters?: { label: string | [number, number]; documentation?: Markup }[];
};
type LspSignatureHelp = {
  signatures: LspSignature[];
  activeSignature?: number;
  activeParameter?: number;
} | null;

type Editor = Monaco.editor.IStandaloneCodeEditor;
type MonacoAPI = typeof Monaco;

const toPosition = (pos: Monaco.Position): Pos => ({
  line: pos.lineNumber - 1,
  character: pos.column - 1,
});
const toRange = (range: Range): Monaco.IRange => ({
  startLineNumber: range.start.line + 1,
  startColumn: range.start.character + 1,
  endLineNumber: range.end.line + 1,
  endColumn: range.end.character + 1,
});
const asMarkdown = (content?: Markup): Monaco.IMarkdownString | undefined => {
  if (!content) return undefined;
  if (typeof content === "string")
    return { value: content, isTrusted: false, supportHtml: false };
  if ("language" in content)
    return {
      value: `\`\`\`${content.language}\n${content.value}\n\`\`\``,
      isTrusted: false,
      supportHtml: false,
    };
  return { value: content.value, isTrusted: false, supportHtml: false };
};
const hoverContents = (content: Markup | Markup[]) =>
  (Array.isArray(content) ? content : [content])
    .map(asMarkdown)
    .filter((item): item is Monaco.IMarkdownString => !!item);

function completionKind(
  monaco: MonacoAPI,
  value?: number,
): Monaco.languages.CompletionItemKind {
  const k = monaco.languages.CompletionItemKind;
  const kinds: Record<number, Monaco.languages.CompletionItemKind> = {
    1: k.Text,
    2: k.Method,
    3: k.Function,
    4: k.Constructor,
    5: k.Field,
    6: k.Variable,
    7: k.Class,
    8: k.Interface,
    9: k.Module,
    10: k.Property,
    11: k.Unit,
    12: k.Value,
    13: k.Enum,
    14: k.Keyword,
    15: k.Snippet,
    16: k.Color,
    17: k.File,
    18: k.Reference,
    19: k.Folder,
    20: k.EnumMember,
    21: k.Constant,
    22: k.Struct,
    23: k.Event,
    24: k.Operator,
    25: k.TypeParameter,
  };
  return kinds[value || 0] ?? k.Text;
}

function markersFor(
  monaco: MonacoAPI,
  diagnostics: Diagnostic[],
): Monaco.editor.IMarkerData[] {
  return diagnostics.map((diag) => ({
    ...toRange(diag.range),
    message: diag.message,
    source: diag.source || "Language server",
    code: diag.code === undefined ? undefined : String(diag.code),
    severity:
      diag.severity === 1
        ? monaco.MarkerSeverity.Error
        : diag.severity === 2
          ? monaco.MarkerSeverity.Warning
          : diag.severity === 3
            ? monaco.MarkerSeverity.Info
            : monaco.MarkerSeverity.Hint,
  }));
}

/** Establish a single Monaco/LSP session and register all Monaco providers. */
export async function connectLanguageFeatures(
  editor: Editor,
  monaco: MonacoAPI,
  language: SupportedLanguage,
  signal: AbortSignal,
  status: (state: IntelliSenseStatus, error?: string) => void,
): Promise<() => void> {
  status("connecting");
  const transport =
    language === "python"
      ? pythonWorkerTransport()
      : await clangdWebsocketTransport();
  const connection = new LspConnection(transport);
  const disposables: Monaco.IDisposable[] = [];
  const model = editor.getModel();
  const uri = `file:///workspace/main.${language === "python" ? "py" : "cpp"}`;
  const markerOwner = `codeUET-${language}`;
  let version = 1;
  let open = false;
  let changeTimer: ReturnType<typeof setTimeout> | undefined;

  const cleanup = () => {
    if (changeTimer) clearTimeout(changeTimer);
    if (open)
      connection.notify("textDocument/didClose", { textDocument: { uri } });
    open = false;
    disposables.forEach((item) => item.dispose());
    if (model && !model.isDisposed())
      monaco.editor.setModelMarkers(model, markerOwner, []);
    connection.dispose();
    signal.removeEventListener("abort", cleanup);
  };
  signal.addEventListener("abort", cleanup, { once: true });
  try {
    if (!model) throw new Error("Chưa tạo được Monaco model.");
    if (signal.aborted) throw new Error("Editor đã đóng.");
    connection.onError((err) => {
      if (!signal.aborted) {
        status("disconnected", err.message);
        monaco.editor.setModelMarkers(model, markerOwner, []);
      }
    });
    await initializeLsp(connection, language);
    if (signal.aborted) throw new Error("Editor đã đóng.");

    connection.onNotification(
      "textDocument/publishDiagnostics",
      (payload: {
        uri: string;
        version?: number;
        diagnostics: Diagnostic[];
      }) => {
        if (signal.aborted || payload.uri !== uri || model.isDisposed()) return;
        if (typeof payload.version === "number" && payload.version < version)
          return;
        monaco.editor.setModelMarkers(
          model,
          markerOwner,
          markersFor(monaco, payload.diagnostics || []),
        );
      },
    );
    const doc = () => ({ textDocument: { uri } });
    const syncNow = () => {
      if (!open || signal.aborted || model.isDisposed()) return;
      connection.notify("textDocument/didChange", {
        textDocument: { uri, version: ++version },
        contentChanges: [{ text: model.getValue() }],
      });
    };
    const flush = () => {
      if (changeTimer) clearTimeout(changeTimer);
      changeTimer = undefined;
      syncNow();
    };

    // Completion/hover requests must see the latest text, not a debounced draft.
    const fresh = () => {
      if (changeTimer) flush();
    };
    const valid = (m: Monaco.editor.ITextModel) =>
      m === model && !signal.aborted && open;
    const completion = async (
      m: Monaco.editor.ITextModel,
      pos: Monaco.Position,
      context: Monaco.languages.CompletionContext,
    ) => {
      if (!valid(m)) return { suggestions: [] };
      fresh();
      const result = await connection.request<
        { isIncomplete?: boolean; items: Completion[] } | Completion[] | null
      >("textDocument/completion", {
        ...doc(),
        position: toPosition(pos),
        context: {
          triggerKind: context.triggerKind === 1 ? 1 : 2,
          triggerCharacter: context.triggerCharacter,
        },
      });
      const items = Array.isArray(result) ? result : result?.items || [];
      const word = m.getWordUntilPosition(pos);
      const defaultRange = {
        startLineNumber: pos.lineNumber,
        endLineNumber: pos.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      const suggestions: Monaco.languages.CompletionItem[] = items.map(
        (item) => {
          const edit = item.textEdit;
          const range = edit?.range
            ? toRange(edit.range)
            : edit?.insert && edit.replace
              ? { insert: toRange(edit.insert), replace: toRange(edit.replace) }
              : defaultRange;
          return {
            label: item.label,
            kind: completionKind(monaco, item.kind),
            insertText:
              edit?.newText ??
              item.insertText ??
              (typeof item.label === "string" ? item.label : item.label.label),
            insertTextRules:
              item.insertTextFormat === 2
                ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
                : undefined,
            range,
            detail: item.detail,
            documentation: asMarkdown(item.documentation),
            sortText: item.sortText,
            filterText: item.filterText,
            additionalTextEdits: item.additionalTextEdits?.map((e) => ({
              range: toRange(e.range),
              text: e.newText,
            })),
          };
        },
      );
      return {
        suggestions,
        incomplete: !Array.isArray(result) && !!result?.isIncomplete,
      };
    };
    disposables.push(
      monaco.languages.registerCompletionItemProvider(language, {
        triggerCharacters:
          language === "python"
            ? [".", "(", "[", '"', "'"]
            : [".", ":", ">", "#", "<"],
        provideCompletionItems: async (m, pos, context) => {
          try {
            return await completion(m, pos, context);
          } catch {
            return { suggestions: [] };
          }
        },
      }),
    );

    disposables.push(
      monaco.languages.registerHoverProvider(language, {
        provideHover: async (m, pos) => {
          if (!valid(m)) return undefined;
          fresh();
          try {
            const response = await connection.request<Hover>(
              "textDocument/hover",
              { ...doc(), position: toPosition(pos) },
            );
            if (!response?.contents) return undefined;
            return {
              contents: hoverContents(response.contents),
              range: response.range ? toRange(response.range) : undefined,
            };
          } catch {
            return undefined;
          }
        },
      }),
    );

    disposables.push(
      monaco.languages.registerSignatureHelpProvider(language, {
        signatureHelpTriggerCharacters: ["(", ","],
        signatureHelpRetriggerCharacters: [","],
        provideSignatureHelp: async (m, pos) => {
          if (!valid(m)) return null;
          fresh();
          try {
            const response = await connection.request<LspSignatureHelp>(
              "textDocument/signatureHelp",
              { ...doc(), position: toPosition(pos) },
            );
            if (!response) return null;
            return {
              value: {
                activeSignature: response.activeSignature ?? 0,
                activeParameter: response.activeParameter ?? 0,
                signatures: response.signatures.map((s) => ({
                  label: s.label,
                  documentation: asMarkdown(s.documentation),
                  parameters:
                    s.parameters?.map((p) => ({
                      label: p.label,
                      documentation: asMarkdown(p.documentation),
                    })) || [],
                })),
              },
              dispose() {},
            };
          } catch {
            return null;
          }
        },
      }),
    );

    disposables.push(
      monaco.languages.registerDefinitionProvider(language, {
        provideDefinition: async (m, pos) => {
          if (!valid(m)) return null;
          fresh();
          try {
            const result = await connection.request<
              | Array<{
                  uri?: string;
                  range?: Range;
                  targetUri?: string;
                  targetSelectionRange?: Range;
                }>
              | {
                  uri?: string;
                  range?: Range;
                  targetUri?: string;
                  targetSelectionRange?: Range;
                }
              | null
            >("textDocument/definition", {
              ...doc(),
              position: toPosition(pos),
            });
            const locations = Array.isArray(result)
              ? result
              : result
                ? [result]
                : [];
            return locations
              .filter((loc) => (loc.uri || loc.targetUri) === uri)
              .filter((loc) => !!(loc.range || loc.targetSelectionRange))
              .map((loc) => ({
                uri: m.uri,
                range: toRange((loc.range || loc.targetSelectionRange)!),
              }));
          } catch {
            return null;
          }
        },
      }),
    );

    connection.notify("textDocument/didOpen", {
      textDocument: {
        uri,
        languageId: language,
        version,
        text: model.getValue(),
      },
    });
    open = true;
    disposables.push(
      model.onDidChangeContent(() => {
        if (changeTimer) clearTimeout(changeTimer);
        changeTimer = setTimeout(syncNow, 250);
      }),
    );
    status("ready");
    return cleanup;
  } catch (error) {
    cleanup();
    throw error;
  }
}
