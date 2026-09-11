import { useState, useEffect, useRef } from "react";
import MarkdownMessage from "@/components/markdown-message";
import {
  Sparkles,
  Send,
  Trash2,
  Cpu,
  Layers,
  ExternalLink,
  BookOpen,
  CheckCircle2,
  Copy,
  Check,
  Zap,
  Activity,
  Compass,
  Database,
  Bot,
  RefreshCw,
  Palette
} from "lucide-react";

export default function HomePage() {
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking"); // checking, online, offline
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem("rag_theme") || "cyber";
  });
  const [activePromptCategory, setActivePromptCategory] = useState("all");
  const [copiedIndex, setCopiedIndex] = useState(null);

  const endRef = useRef(null);
  const inputRef = useRef(null);

  const themes = [
    { id: "cyber", name: "Cyber Neon", dot: "bg-cyan-400", border: "border-cyan-400", gradient: "from-cyan-400 to-pink-500" },
    { id: "sunset", name: "Solar Flare", dot: "bg-red-500", border: "border-red-500", gradient: "from-red-500 to-amber-400" },
    { id: "matrix", name: "Hyper Matrix", dot: "bg-emerald-400", border: "border-emerald-400", gradient: "from-emerald-400 to-teal-300" },
    { id: "synth", name: "Ultra Violet", dot: "bg-purple-500", border: "border-purple-500", gradient: "from-purple-500 to-blue-400" },
  ];

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", currentTheme);
    localStorage.setItem("rag_theme", currentTheme);
  }, [currentTheme]);

  function getApiUrl(path) {
    if (typeof window === "undefined") return path;
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (isLocal && window.location.port === "5173") {
      return `http://127.0.0.1:5000${path}`;
    }
    if (isLocal) {
      return path;
    }
    const base = import.meta.env.VITE_API_BASE_URL || "";
    return base ? `${base.replace(/\/$/, "")}${path}` : path;
  }

  // Check Backend Health
  useEffect(() => {
    async function checkHealth() {
      try {
        const url = getApiUrl("/health?format=json");
        const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          setBackendStatus("online");
        } else {
          setBackendStatus("offline");
        }
      } catch {
        setBackendStatus("offline");
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const promptCategories = [
    { id: "all", label: "🔥 All Prompts" },
    { id: "rag", label: "⚡ Core RAG" },
    { id: "vectors", label: "🌲 FAISS & Vectors" },
    { id: "agents", label: "🤖 Agents & Tools" },
    { id: "memory", label: "💾 Memory & Chains" },
  ];

  const quickPrompts = [
    {
      category: "rag",
      icon: "⚡",
      title: "What is a Retriever in LangChain?",
      desc: "Understand document loaders, vector stores, and retriever interfaces.",
      query: "What is a Retriever in LangChain and how does it retrieve context?"
    },
    {
      category: "vectors",
      icon: "🌲",
      title: "How does FAISS Vector DB work in RAG?",
      desc: "High-speed dense vector similarity search & embedding indexing.",
      query: "How does FAISS vector database index and search documents in LangChain RAG?"
    },
    {
      category: "agents",
      icon: "🧠",
      title: "LangChain Agents & Custom Tools",
      desc: "Agent executors, ReAct reasoning loops, and function calling.",
      query: "Explain LangChain Agents, tools, and how agent decision loops work."
    },
    {
      category: "memory",
      icon: "📚",
      title: "History-Aware Conversational Retrieval",
      desc: "Rephrasing follow-up questions using multi-turn chat history context.",
      query: "Explain history-aware retrieval in LangChain and why query reformulation is important."
    },
    {
      category: "rag",
      icon: "🔍",
      title: "Recursive Character Text Splitter",
      desc: "Chunking strategies with chunk size and overlap parameters.",
      query: "How does RecursiveCharacterTextSplitter work and why is chunk overlap used?"
    },
    {
      category: "agents",
      icon: "🛠️",
      title: "Google Gemini 3.5 Integration",
      desc: "Using ChatGoogleGenerativeAI with structured prompts.",
      query: "How to configure ChatGoogleGenerativeAI with LangChain prompt templates?"
    }
  ];

  const filteredPrompts = activePromptCategory === "all"
    ? quickPrompts
    : quickPrompts.filter((p) => p.category === activePromptCategory);

  const canSend = query.trim().length >= 2 && !loading;

  async function sendQuery(textToQuery) {
    if (!textToQuery || loading) return;
    const text = textToQuery.trim();
    setQuery("");
    setLoading(true);

    try {
      const url = getApiUrl("/answer");
      
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: text,
          chat_history: messages,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || res.statusText);

      const uiHistory = Array.isArray(data.chat_history)
        ? [...data.chat_history]
        : [];
      const cites = Array.isArray(data.sources)
        ? [...new Set(data.sources)]
        : [];
      const modelName = data.model_name ?? "Google Gemini 3.5 Flash";

      for (let i = uiHistory.length - 1; i >= 0; i--) {
        if (uiHistory[i].role === "ai") {
          uiHistory[i] = {
            ...uiHistory[i],
            citations: cites,
            provenance: data.provenance,
            model_name: modelName,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          break;
        }
      }

      setMessages(uiHistory);
      setBackendStatus("online");
    } catch (err) {
      console.error(err);
      let errorMsg = err.message || "Failed to reach backend server.";
      if (err.name === "TypeError" || err.message.includes("fetch")) {
        errorMsg = "⚠️ **Connection Error**: Unable to reach backend server.\n\nMake sure your Flask backend is running on `http://127.0.0.1:5000` or that your Render service is awake.";
      }

      setMessages((m) => [
        ...m,
        {
          role: "human",
          content: text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
        {
          role: "ai",
          content: errorMsg,
          provenance: "model_only",
          model_name: "System",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
      ]);
      setBackendStatus("offline");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (canSend) {
      sendQuery(query);
    }
  }

  function handleClearChat() {
    setMessages([]);
  }

  function copyMessageContent(content, index) {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  return (
    <div className="relative min-h-screen cyber-grid text-slate-100 flex flex-col justify-between selection:bg-[var(--theme-primary)] selection:text-black">
      {/* Dynamic Ambient Mesh Glows */}
      <div className="fixed top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-[radial-gradient(circle,var(--theme-bg-mesh-1)_0%,transparent_70%)] blur-[100px] pointer-events-none z-0 animate-neon-pulse" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-[radial-gradient(circle,var(--theme-bg-mesh-2)_0%,transparent_70%)] blur-[120px] pointer-events-none z-0 animate-neon-pulse" />

      {/* ========================================================
          HEADER NAVIGATION
         ======================================================== */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-2xl bg-[#040715]/80 border-b border-[var(--theme-border)] shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-[rgba(var(--theme-primary-rgb),0.1)] border border-[var(--theme-primary)] shadow-[var(--theme-glow)] transition-all">
              <img
                src="/langchain_icon.png"
                alt="LangChain logo"
                className="w-6 h-6 object-contain filter drop-shadow-[0_0_8px_var(--theme-primary)]"
              />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-[#040715] shadow-[0_0_10px_#00ff88]" />
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold tracking-wider font-['Space_Grotesk'] sharp-gradient-text uppercase">
                  LANGCHAIN RAG
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-md bg-[rgba(var(--theme-primary-rgb),0.15)] text-[var(--theme-primary)] border border-[var(--theme-border)]">
                  V2.0 HYPER
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono tracking-wide hidden sm:block">
                DOCUMENTATION GROUNDED REASONING ENGINE
              </p>
            </div>
          </div>

          {/* Center / Right Control Panel */}
          <div className="flex items-center gap-3">
            
            {/* Backend Health Pill */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-[#070d22]/90 border border-[rgba(255,255,255,0.1)] text-xs font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  backendStatus === "online"
                    ? "bg-emerald-400 shadow-[0_0_8px_#00ff88] animate-pulse"
                    : backendStatus === "checking"
                    ? "bg-amber-400 shadow-[0_0_8px_#ffaa00] animate-ping"
                    : "bg-rose-500 shadow-[0_0_8px_#ff2e63]"
                }`}
              />
              <span className="text-[11px] text-slate-300">
                {backendStatus === "online" ? "BACKEND ONLINE" : backendStatus === "checking" ? "CONNECTING..." : "BACKEND STANDBY"}
              </span>
            </div>

            {/* Sharp Theme Selector */}
            <div className="flex items-center bg-[#070d22] border border-[rgba(255,255,255,0.12)] p-1 rounded-xl shadow-inner">
              <div className="hidden sm:flex items-center gap-1.5 px-2 text-[11px] font-mono text-slate-400 border-r border-white/10 mr-1">
                <Palette className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
                <span>THEME</span>
              </div>
              <div className="flex items-center gap-1">
                {themes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setCurrentTheme(t.id)}
                    title={t.name}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium font-['Space_Grotesk'] transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                      currentTheme === t.id
                        ? "bg-[rgba(var(--theme-primary-rgb),0.2)] text-[var(--theme-primary)] border border-[var(--theme-primary)] shadow-[0_0_12px_rgba(var(--theme-primary-rgb),0.3)] font-bold"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${t.dot}`} />
                    <span className="hidden lg:inline">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Clear Chat Button */}
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/40 text-xs font-semibold transition-all duration-200 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] cursor-pointer"
                title="Clear current conversation"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear Chat</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================
          MAIN CHAT & HERO WORKSPACE
         ======================================================== */}
      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col justify-between">
        
        {/* Welcome State: Hero & Quick Prompts */}
        {messages.length === 0 && (
          <div className="my-auto py-6 space-y-8 animate-fade-in">
            
            {/* Top Sharp Badge */}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[rgba(var(--theme-primary-rgb),0.1)] border border-[var(--theme-primary)] text-[var(--theme-primary)] text-xs font-mono tracking-wider shadow-[var(--theme-glow)] uppercase font-semibold">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Next-Gen RAG Intelligence Matrix</span>
              </div>
              
              <h2 className="text-3xl sm:text-5xl font-black font-['Space_Grotesk'] tracking-tight max-w-2xl mx-auto leading-tight">
                Ask anything about{" "}
                <span className="sharp-gradient-text">LangChain Ecosystem</span>
              </h2>

              <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
                Empowered by <span className="text-[var(--theme-primary)] font-semibold">FAISS Vector Database</span> and <span className="text-[var(--theme-secondary)] font-semibold">Google Gemini 3.5 Flash</span>. Direct links and verified documentation groundings.
              </p>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto">
              {[
                { icon: Database, title: "FAISS Storage", desc: "Embeddings Indexed" },
                { icon: Cpu, title: "Gemini 3.5", desc: "Fast Reasoning" },
                { icon: BookOpen, title: "Docs Grounding", desc: "Direct Citations" },
                { icon: Layers, title: "Chat Memory", desc: "Multi-turn Aware" },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl sharp-card flex flex-col items-center text-center gap-1.5 border border-[rgba(255,255,255,0.08)] group hover:-translate-y-1"
                >
                  <div className="p-2 rounded-xl bg-[rgba(var(--theme-primary-rgb),0.12)] text-[var(--theme-primary)] border border-[rgba(var(--theme-primary-rgb),0.3)] shadow-[0_0_10px_rgba(var(--theme-primary-rgb),0.2)] group-hover:scale-110 transition-transform">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold font-['Space_Grotesk'] text-slate-100">{item.title}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{item.desc}</span>
                </div>
              ))}
            </div>

            {/* Quick Prompts Category Tabs */}
            <div className="max-w-4xl mx-auto pt-2">
              <div className="flex items-center justify-center gap-2 overflow-x-auto pb-3 scrollbar-none">
                {promptCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActivePromptCategory(cat.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                      activePromptCategory === cat.id
                        ? "bg-[rgba(var(--theme-primary-rgb),0.2)] text-[var(--theme-primary)] border border-[var(--theme-primary)] shadow-[var(--theme-glow)]"
                        : "bg-[#080e22] text-slate-400 border border-white/5 hover:border-white/20 hover:text-slate-200"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Quick Prompts Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                {filteredPrompts.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendQuery(item.query)}
                    className="p-4 rounded-2xl sharp-card text-left text-slate-200 hover:text-white border border-[rgba(var(--theme-primary-rgb),0.2)] hover:border-[var(--theme-primary)] transition-all duration-300 hover:shadow-[var(--theme-glow)] hover:-translate-y-0.5 group cursor-pointer flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl p-1.5 rounded-lg bg-[rgba(var(--theme-primary-rgb),0.1)] border border-[rgba(var(--theme-primary-rgb),0.25)]">
                          {item.icon}
                        </span>
                        <h3 className="text-sm font-bold font-['Space_Grotesk'] group-hover:text-[var(--theme-primary)] transition-colors">
                          {item.title}
                        </h3>
                      </div>
                      <span className="text-[var(--theme-primary)] opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1 font-bold">
                        ➔
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-light leading-relaxed pl-10">
                      {item.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Message Stream */}
        {messages.length > 0 && (
          <div className="space-y-6 pb-6 pt-2">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex flex-col ${
                  m.role === "human" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-5 transition-all duration-300 ${
                    m.role === "human"
                      ? "bg-gradient-to-r from-[rgba(var(--theme-primary-rgb),0.15)] to-[rgba(var(--theme-secondary-rgb),0.15)] border border-[var(--theme-primary)] text-slate-100 shadow-[var(--theme-glow)] rounded-br-none"
                      : "sharp-card border-[rgba(var(--theme-secondary-rgb),0.35)] text-slate-100 shadow-[var(--theme-glow-secondary)] rounded-bl-none"
                  }`}
                >
                  {/* Sender Header Badge */}
                  <div className="flex items-center justify-between gap-3 mb-3 border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      {m.role === "human" ? (
                        <span className="text-[var(--theme-primary)] font-bold flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-md bg-[rgba(var(--theme-primary-rgb),0.2)] border border-[var(--theme-primary)] flex items-center justify-center text-[10px]">
                            👤
                          </span>
                          YOU
                        </span>
                      ) : (
                        <span className="text-[var(--theme-secondary)] font-bold flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-md bg-[rgba(var(--theme-secondary-rgb),0.2)] border border-[var(--theme-secondary)] flex items-center justify-center text-[10px]">
                            ⚡
                          </span>
                          LANGCHAIN RAG AI
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {m.timestamp && (
                        <span className="text-[10px] font-mono text-slate-400">
                          {m.timestamp}
                        </span>
                      )}
                      {m.role === "ai" && (
                        <button
                          onClick={() => copyMessageContent(m.content, i)}
                          className="p-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                          title="Copy whole answer"
                        >
                          {copiedIndex === i ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Message Content */}
                  <div className="text-sm leading-relaxed">
                    <MarkdownMessage content={m.content} />
                  </div>

                  {/* Provenance & Model Telemetry for AI */}
                  {m.role === "ai" && (
                    <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono uppercase">
                      {m.provenance === "docs" ? (
                        <span
                          title="Verified answer retrieved from LangChain official documentation."
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/60 shadow-[0_0_12px_rgba(0,255,136,0.3)] font-bold"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          GROUNDED IN DOCS
                        </span>
                      ) : (
                        <span
                          title={`Generated by ${m.model_name ?? "General Model"}.`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(var(--theme-secondary-rgb),0.15)] text-[var(--theme-secondary)] border border-[var(--theme-secondary)] shadow-[var(--theme-glow-secondary)] font-bold"
                        >
                          <Zap className="w-3 h-3" />
                          GENERAL LLM ANSWER
                        </span>
                      )}

                      <span className="text-slate-400 flex items-center gap-1">
                        ENGINE: <span className="text-[var(--theme-primary)] font-semibold">{m.model_name ?? "Google Gemini"}</span>
                      </span>
                    </div>
                  )}

                  {/* Sources Citations Accordion */}
                  {m.role === "ai" &&
                    Array.isArray(m.citations) &&
                    m.citations.length > 0 && (
                      <details className="mt-3.5 group rounded-xl bg-[#040816] border border-[rgba(var(--theme-primary-rgb),0.35)] overflow-hidden">
                        <summary className="px-3.5 py-2.5 text-xs font-mono font-bold text-[var(--theme-primary)] cursor-pointer select-none flex items-center justify-between hover:bg-[rgba(var(--theme-primary-rgb),0.1)] transition-colors">
                          <span className="flex items-center gap-2">
                            <BookOpen className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
                            DOCUMENTATION SOURCES & CITATIONS ({m.citations.length})
                          </span>
                          <span className="text-[10px] opacity-70 group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <ul className="px-4 py-3 space-y-2 text-xs font-mono border-t border-[rgba(var(--theme-primary-rgb),0.2)] bg-[#030611]">
                          {m.citations.map((src, j) => (
                            <li key={j} className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                              <a
                                href={src}
                                className="text-[var(--theme-primary)] hover:text-[var(--theme-secondary)] truncate flex-1 underline underline-offset-2 font-medium transition-colors"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {j + 1}. {src}
                              </a>
                              <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                </div>
              </div>
            ))}

            {/* Glowing Thinking Wave Animation */}
            {loading && (
              <div className="flex items-center gap-3.5 p-4 rounded-2xl sharp-card border-[var(--theme-primary)] w-fit shadow-[var(--theme-glow)] animate-pulse">
                <div className="relative flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-[var(--theme-primary)] border-t-transparent rounded-full animate-spin" />
                  <Sparkles className="w-3 h-3 text-[var(--theme-primary)] absolute" />
                </div>
                <div>
                  <div className="text-xs font-mono text-[var(--theme-primary)] font-bold tracking-wider uppercase">
                    NEURAL RAG PIPELINE EXECUTING...
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Searching FAISS vector space & synthesizing with Gemini 3.5
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}

        {/* ========================================================
            INTERACTIVE FLOATING INPUT CONSOLE
           ======================================================== */}
        <div className="sticky bottom-4 mt-auto pt-3 z-30">
          
          {/* Context Quick Follow-ups if chat active */}
          {messages.length > 0 && !loading && (
            <div className="mb-2 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1 uppercase tracking-wider shrink-0 pl-1">
                <Compass className="w-3 h-3 text-[var(--theme-primary)]" />
                Follow-ups:
              </span>
              {[
                "Give me a complete Python code example",
                "How does this compare with other retrievers?",
                "What are the best practices for production?"
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => sendQuery(suggestion)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#070d22]/90 hover:bg-[rgba(var(--theme-primary-rgb),0.2)] text-slate-300 hover:text-[var(--theme-primary)] border border-white/10 hover:border-[var(--theme-primary)] transition-all whitespace-nowrap cursor-pointer"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Main Input Bar */}
          <form
            onSubmit={handleSubmit}
            className="relative flex items-center gap-2 p-2 rounded-2xl bg-[#060b1e]/90 backdrop-blur-2xl border border-[rgba(var(--theme-primary-rgb),0.35)] shadow-[0_8px_32px_rgba(0,0,0,0.6)] focus-within:border-[var(--theme-primary)] focus-within:shadow-[var(--theme-glow)] transition-all duration-300"
          >
            <div className="pl-3 text-slate-400">
              <Bot className="w-5 h-5 text-[var(--theme-primary)]" />
            </div>

            <input
              ref={inputRef}
              type="text"
              placeholder="Ask anything about LangChain docs, FAISS, Agents, Tools..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
              className="flex-1 bg-transparent px-2 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-medium"
            />

            {/* Clear Input Button */}
            {query.length > 0 && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
                title="Clear text"
              >
                ✕
              </button>
            )}

            {/* Sharp Neon Send Button */}
            <button
              type="submit"
              disabled={!canSend}
              className={`px-5 py-2.5 rounded-xl font-mono text-xs font-extrabold uppercase tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                canSend
                  ? "sharp-btn-primary"
                  : "bg-slate-800/60 text-slate-500 border border-slate-700/50 cursor-not-allowed"
              }`}
            >
              <span>SEND</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Footer Status & Keyboard hints */}
          <div className="mt-2 flex items-center justify-between px-2 text-[10px] font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[var(--theme-primary)] font-semibold">
                <Database className="w-3 h-3" /> FAISS RAG
              </span>
              <span>•</span>
              <span>GOOGLE GEMINI 3.5</span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px]">Enter ↵</kbd>
              <span>to send</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px]">Shift + Enter</kbd>
              <span>for newline</span>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
