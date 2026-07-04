import { Component, useState, useRef, useEffect, useCallback, type KeyboardEvent, type ReactNode } from "react";
import { executeCommand, type OutputLine } from "../lib/terminal";
import MatrixRain from "./MatrixRain";

const BOOT_LINES: OutputLine[] = [
  { text: "", kind: "system" },
  { text: "  ╔══════════════════════════════════════════════════╗", kind: "system" },
  { text: "  ║            GITSHELL v1.5                   ║", kind: "system" },
  { text: "  ║    Cyberpunk Terminal for GitHub Management    ║", kind: "system" },
  { text: "  ╚══════════════════════════════════════════════════╝", kind: "system" },
  { text: "", kind: "system" },
  { text: "  Initializing shell...", kind: "stdout" },
  { text: "  System ready.", kind: "stdout" },
  { text: "", kind: "stdout" },
  { text: "  Type 'help' for available commands.", kind: "stdout" },
  { text: "  Type 'auth <token>' to set your GitHub token.", kind: "stdout" },
  { text: "", kind: "system" },
];

const INTRO_LINES: OutputLine[] = [
  { text: "  ╔══════════════════════════════════════════════════╗", kind: "system" },
  { text: "  ║            GITSHELL v1.5                   ║", kind: "system" },
  { text: "  ║    Cyberpunk Terminal for GitHub Management    ║", kind: "system" },
  { text: "  ╚══════════════════════════════════════════════════╝", kind: "system" },
  { text: "", kind: "system" },
];

function queueFocus(el: HTMLInputElement | null) {
  if (!el) return;
  if (document.activeElement === el) return;
  setTimeout(() => {
    if (document.activeElement !== el) el.focus();
  }, 0);
}

function hasSelection(): boolean {
  try {
    return (window.getSelection()?.toString() ?? "").length > 0;
  } catch {
    return false;
  }
}

function TerminalInner() {
  const [lines, setLines] = useState<OutputLine[]>(BOOT_LINES);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [executing, setExecuting] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines]);

  const tryFocus = useCallback(() => {
    if (hasSelection()) return;
    if (!inputRef.current) return;
    queueFocus(inputRef.current);
  }, []);

  useEffect(() => {
    if (!executing) tryFocus();
  }, [executing, tryFocus]);

  useEffect(() => {
    tryFocus();
  }, [tryFocus]);

  const handleContainerClick = () => {
    if (hasSelection()) return;
    queueFocus(inputRef.current);
  };

  async function handleSubmit() {
    const cmd = input.trim();
    if (!cmd) return;
    setInput("");
    setHistory((h) => [...h, cmd]);
    setHistoryIndex(-1);
    setExecuting(true);

    const result = await executeCommand(cmd);

    if (result.length === 1 && result[0].text === "__CLEAR__") {
      setLines(INTRO_LINES);
    } else {
      setLines((prev) => [...prev, ...result]);
    }
    setExecuting(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const newIdx = historyIndex < 0 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(newIdx);
      setInput(history[newIdx]);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex < 0) return;
      const newIdx = historyIndex + 1;
      if (newIdx >= history.length) {
        setHistoryIndex(-1);
        setInput("");
      } else {
        setHistoryIndex(newIdx);
        setInput(history[newIdx]);
      }
      return;
    }
  }

  const lineClass = (kind: string) => {
    switch (kind) {
      case "stderr": return "text-[#ff5555]";
      case "system": return "text-[#00f0ff]";
      case "divider": return "text-[#bf00ff] opacity-50";
      case "help": return "text-[#bf00ff]";
      default: return "text-[#00ff41]";
    }
  };

  return (
    <div className="relative min-h-dvh w-full flex items-center justify-center bg-[#050505] p-4 overflow-hidden">
      <MatrixRain />
      <div className="pointer-events-none fixed inset-0 z-10 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,255,65,0.03)_2px,rgba(0,255,65,0.03)_4px)]" />
      <div className="pointer-events-none fixed inset-0 z-10 bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(0,0,0,0.7)_100%)]" />

      <div
        onClick={handleContainerClick}
        className="relative z-20 w-full max-w-[920px] h-[85dvh] max-h-[800px] flex flex-col rounded-xl overflow-hidden"
        style={{
          background: "rgba(5,5,5,0.92)",
          border: "1px solid rgba(0,255,65,0.25)",
          boxShadow:
            "0 0 20px rgba(0,255,65,0.12), 0 0 60px rgba(0,255,65,0.05), inset 0 0 20px rgba(0,255,65,0.03)",
        }}
      >
        <div
          className="flex items-center gap-2 px-4 py-2 shrink-0"
          style={{
            background: "rgba(0,255,65,0.04)",
            borderBottom: "1px solid rgba(0,255,65,0.12)",
          }}
        >
          <span className="size-2.5 rounded-full bg-[#ff5555]" />
          <span className="size-2.5 rounded-full bg-[#ffb347]" />
          <span className="size-2.5 rounded-full bg-[#00ff41]" />
          <span className="ml-3 text-xs font-mono text-[#00ff41]/60 tracking-widest uppercase">
            gitshell v1.5 - github terminal
          </span>
        </div>

        <div
          ref={outputRef}
          className="flex-1 overflow-y-auto px-4 py-3 font-mono text-sm leading-relaxed whitespace-pre-wrap break-all select-text"
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,255,65,0.2) transparent" }}
        >
          {lines.map((line, i) => (
            <div key={i} className={`${lineClass(line.kind)} select-text`}>
              {line.text || "\u00A0"}
            </div>
          ))}
          {executing && (
            <div className="text-[#00ff41] animate-pulse">Processing...</div>
          )}
        </div>

        <div
          className="flex items-center gap-2 px-4 py-2.5 shrink-0"
          style={{
            borderTop: "1px solid rgba(0,255,65,0.12)",
            background: "rgba(0,255,65,0.02)",
          }}
        >
          <span className="text-[#00f0ff] font-mono text-sm shrink-0">❯</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={executing}
            className="flex-1 bg-transparent border-none outline-none font-mono text-sm text-[#00ff41] placeholder-[#00ff41]/30 caret-[#00ff41]"
            placeholder="type a command..."
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
          />
        </div>
      </div>
    </div>
  );
}

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-dvh w-full flex items-center justify-center bg-[#050505] p-8">
          <div className="max-w-lg font-mono text-sm">
            <div className="text-[#ff5555] mb-4 font-bold">┌─[ FATAL ERROR ]──────────────────────────┐</div>
            <div className="text-[#ff5555] mb-2 whitespace-pre-wrap break-all">
              {this.state.error.message}
            </div>
            <div className="text-[#00f0ff]/60 text-xs mt-4">
              Reload the page to restart the terminal.
            </div>
            <div className="text-[#ff5555] mt-4 font-bold">└──────────────────────────────────────────┘</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Terminal() {
  return (
    <ErrorBoundary>
      <TerminalInner />
    </ErrorBoundary>
  );
}
