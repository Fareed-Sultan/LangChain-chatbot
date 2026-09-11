import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Highlight, themes } from "prism-react-renderer";
import { Check, Copy, Terminal } from "lucide-react";

function CodeBlock({ inline, className, children }) {
  const [copied, setCopied] = useState(false);
  const raw = String(children ?? "");
  const code = raw.replace(/^\n+|\n+$/g, "");
  const langRaw = (className || "").replace("language-", "").trim();
  const lang = langRaw || "text";

  const isSingleLine = !code.includes("\n");
  const isPlainLang = ["", "text", "plain", "plaintext"].includes(lang.toLowerCase());
  const isTrivial = isSingleLine && code.trim().length <= 40 && isPlainLang;

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (inline || isTrivial) {
    return (
      <code className="px-2 py-0.5 rounded-md bg-[rgba(var(--theme-primary-rgb),0.12)] text-[var(--theme-primary)] font-mono text-[0.88em] border border-[rgba(var(--theme-primary-rgb),0.3)] shadow-[0_0_8px_rgba(var(--theme-primary-rgb),0.15)] font-semibold">
        {code}
      </code>
    );
  }

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-[rgba(var(--theme-primary-rgb),0.35)] bg-[#050916] text-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[rgba(var(--theme-primary-rgb),0.2)] bg-[rgba(var(--theme-primary-rgb),0.06)] backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[var(--theme-primary)]">
            {lang}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-[rgba(var(--theme-primary-rgb),0.12)] hover:bg-[rgba(var(--theme-primary-rgb),0.25)] text-[var(--theme-primary)] border border-[rgba(var(--theme-primary-rgb),0.35)] transition-all duration-200 cursor-pointer"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-0 overflow-x-auto">
        <Highlight theme={themes.nightOwl} code={code} language={lang}>
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className={`${className} m-0 w-full p-4 text-xs font-mono leading-relaxed`}
              style={{ ...style, background: "transparent" }}
            >
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })} className="table-row">
                  <span className="table-cell pr-4 select-none opacity-30 text-right text-[10px] w-6">
                    {i + 1}
                  </span>
                  <span className="table-cell">
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token })} />
                    ))}
                  </span>
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  );
}

export default function MarkdownMessage({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code: CodeBlock,
        pre: ({ children }) => <>{children}</>,
        h1: ({ children }) => (
          <h1 className="text-xl font-bold font-['Space_Grotesk'] text-[var(--theme-primary)] mt-4 mb-2 pb-1 border-b border-[rgba(var(--theme-primary-rgb),0.2)]">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-lg font-bold font-['Space_Grotesk'] text-[var(--theme-primary)] mt-3 mb-2">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-base font-semibold text-[var(--theme-secondary)] mt-2 mb-1">
            {children}
          </h3>
        ),
        p: ({ children }) => <p className="mb-2.5 last:mb-0 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="my-2 space-y-1 pl-5 list-disc marker:text-[var(--theme-primary)]">{children}</ul>,
        ol: ({ children }) => <ol className="my-2 space-y-1 pl-5 list-decimal marker:text-[var(--theme-secondary)]">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="my-3 pl-4 border-l-4 border-[var(--theme-primary)] bg-[rgba(var(--theme-primary-rgb),0.06)] py-2 rounded-r-lg text-slate-300 italic">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="my-3 overflow-x-auto rounded-lg border border-[rgba(var(--theme-primary-rgb),0.25)]">
            <table className="w-full text-left text-xs border-collapse">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-[rgba(var(--theme-primary-rgb),0.15)] text-[var(--theme-primary)] font-mono uppercase tracking-wider">
            {children}
          </thead>
        ),
        th: ({ children }) => <th className="p-2.5 border-b border-[rgba(var(--theme-primary-rgb),0.25)] font-bold">{children}</th>,
        td: ({ children }) => <td className="p-2.5 border-b border-white/5 hover:bg-white/5">{children}</td>,
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-[var(--theme-primary)] hover:text-[var(--theme-secondary)] underline underline-offset-4 decoration-[var(--theme-primary)]/50 hover:decoration-[var(--theme-secondary)] font-medium transition-all duration-200"
          >
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
