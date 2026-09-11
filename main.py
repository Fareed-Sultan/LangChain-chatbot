import os
import time
from flask import Flask, jsonify, request, send_from_directory, render_template_string
from flask_cors import CORS

from core import llm, run_general_llm, run_llm_from_docs
from ingestion import FAISS_INDEX_PATH

FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "frontend", "dist"))

# create the app
app = Flask(__name__, static_folder=os.path.join(FRONTEND_DIST, "assets"), static_url_path="/assets")

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app.config["SECRET_KEY"] = os.environ.get("FLASK_SECRET_KEY", "dev-secret")
CORS(app, resources={r"/*": {"origins": "*"}})


@app.after_request
def after_request(response):
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
    response.headers.add("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    return response


BACKEND_DASHBOARD_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LangChain RAG • Backend Admin & API Console</title>
    <link rel="icon" type="image/svg+xml" href="/langchain_icon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
            --neon-cyan: #00f0ff;
            --neon-pink: #ff007f;
            --neon-green: #00ff88;
            --neon-purple: #a855f7;
            --neon-amber: #ffaa00;
            --bg-dark: #040714;
            --card-bg: rgba(8, 14, 32, 0.85);
            --border-glow: rgba(0, 240, 255, 0.3);
        }
        body {
            background-color: var(--bg-dark);
            color: #f1f5f9;
            font-family: 'Outfit', sans-serif;
            min-height: 100vh;
            padding: 24px;
            background-image: 
                radial-gradient(circle at 10% 0%, rgba(0, 240, 255, 0.12) 0%, transparent 40%),
                radial-gradient(circle at 90% 10%, rgba(255, 0, 127, 0.10) 0%, transparent 40%),
                radial-gradient(circle at 50% 90%, rgba(168, 85, 247, 0.08) 0%, transparent 50%),
                linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
            background-size: 100% 100%, 100% 100%, 100% 100%, 32px 32px, 32px 32px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        /* Top Navigation Header */
        header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 18px 28px;
            background: var(--card-bg);
            border: 1px solid var(--border-glow);
            border-radius: 20px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 25px rgba(0, 240, 255, 0.15);
            margin-bottom: 24px;
            backdrop-filter: blur(16px);
        }
        .brand {
            display: flex;
            align-items: center;
            gap: 14px;
        }
        .logo-box {
            width: 44px;
            height: 44px;
            background: rgba(0, 240, 255, 0.1);
            border: 1px solid var(--neon-cyan);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            box-shadow: 0 0 15px rgba(0, 240, 255, 0.35);
        }
        .brand-title {
            font-size: 20px;
            font-weight: 800;
            font-family: 'Space Grotesk', sans-serif;
            background: linear-gradient(135deg, var(--neon-cyan), #ffffff, var(--neon-pink));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: 0.5px;
        }
        .brand-subtitle {
            font-size: 11px;
            font-family: 'JetBrains Mono', monospace;
            color: #94a3b8;
            letter-spacing: 1px;
        }
        .header-actions {
            display: flex;
            align-items: center;
            gap: 14px;
        }
        .status-pill {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 14px;
            background: rgba(0, 255, 136, 0.12);
            border: 1px solid var(--neon-green);
            color: var(--neon-green);
            border-radius: 999px;
            font-size: 11px;
            font-family: 'JetBrains Mono', monospace;
            font-weight: 700;
            box-shadow: 0 0 12px rgba(0, 255, 136, 0.25);
        }
        .dot {
            width: 8px;
            height: 8px;
            background: var(--neon-green);
            border-radius: 50%;
            box-shadow: 0 0 8px var(--neon-green);
            animation: pulseDot 2s infinite;
        }
        @keyframes pulseDot {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.3); opacity: 0.7; }
        }
        .btn-launch-client {
            padding: 10px 20px;
            background: linear-gradient(135deg, var(--neon-cyan), var(--neon-pink));
            color: #040714;
            border: none;
            border-radius: 12px;
            font-weight: 800;
            font-size: 12px;
            font-family: 'Space Grotesk', sans-serif;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 0 20px rgba(0, 240, 255, 0.4);
            transition: all 0.25s ease;
        }
        .btn-launch-client:hover {
            transform: translateY(-2px);
            box-shadow: 0 0 30px rgba(0, 240, 255, 0.7), 0 0 40px rgba(255, 0, 127, 0.4);
        }

        /* Metric Grid */
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }
        .metric-card {
            background: var(--card-bg);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 18px;
            padding: 20px;
            backdrop-filter: blur(16px);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        .metric-card:hover {
            border-color: var(--neon-cyan);
            box-shadow: 0 0 25px rgba(0, 240, 255, 0.2);
            transform: translateY(-2px);
        }
        .metric-card::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; height: 2px;
            background: linear-gradient(90deg, transparent, var(--neon-cyan), transparent);
            opacity: 0.5;
        }
        .metric-label {
            font-size: 11px;
            font-family: 'JetBrains Mono', monospace;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 1px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .metric-value {
            font-size: 22px;
            font-weight: 800;
            font-family: 'Space Grotesk', sans-serif;
            color: #ffffff;
            margin-top: 8px;
        }
        .metric-desc {
            font-size: 11px;
            color: #64748b;
            margin-top: 4px;
        }

        /* Main Workspace: 2-column layout */
        .main-layout {
            display: grid;
            grid-template-columns: 1.2fr 1fr;
            gap: 20px;
        }
        @media (max-width: 950px) {
            .main-layout { grid-template-columns: 1fr; }
        }

        .panel {
            background: var(--card-bg);
            border: 1px solid var(--border-glow);
            border-radius: 20px;
            padding: 24px;
            backdrop-filter: blur(16px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        }
        .panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 18px;
            padding-bottom: 14px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .panel-title {
            font-size: 15px;
            font-weight: 700;
            font-family: 'Space Grotesk', sans-serif;
            color: var(--neon-cyan);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        /* API Interactive Sandbox Form */
        .form-group {
            margin-bottom: 14px;
        }
        .form-label {
            display: block;
            font-size: 11px;
            font-family: 'JetBrains Mono', monospace;
            color: #94a3b8;
            margin-bottom: 6px;
            text-transform: uppercase;
        }
        .input-text {
            width: 100%;
            padding: 12px 16px;
            background: #030612;
            border: 1px solid rgba(0, 240, 255, 0.3);
            border-radius: 12px;
            color: #ffffff;
            font-family: 'Outfit', sans-serif;
            font-size: 13px;
            outline: none;
            transition: all 0.2s ease;
        }
        .input-text:focus {
            border-color: var(--neon-cyan);
            box-shadow: 0 0 15px rgba(0, 240, 255, 0.3);
        }
        .quick-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 8px;
            margin-bottom: 16px;
        }
        .chip {
            padding: 4px 10px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            font-size: 11px;
            color: #94a3b8;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .chip:hover {
            background: rgba(0, 240, 255, 0.15);
            border-color: var(--neon-cyan);
            color: var(--neon-cyan);
        }
        .btn-test {
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple));
            color: #040714;
            font-weight: 800;
            font-family: 'Space Grotesk', sans-serif;
            border: none;
            border-radius: 12px;
            font-size: 13px;
            cursor: pointer;
            box-shadow: 0 0 20px rgba(0, 240, 255, 0.3);
            transition: all 0.25s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        .btn-test:hover {
            box-shadow: 0 0 30px rgba(0, 240, 255, 0.6);
            transform: translateY(-1px);
        }

        /* JSON Response Box */
        .response-container {
            margin-top: 18px;
            background: #02040b;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 14px;
            overflow: hidden;
        }
        .response-header {
            padding: 8px 14px;
            background: rgba(255, 255, 255, 0.04);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 11px;
            font-family: 'JetBrains Mono', monospace;
            color: #94a3b8;
        }
        .response-pre {
            padding: 14px;
            max-height: 280px;
            overflow-y: auto;
            font-family: 'JetBrains Mono', monospace;
            font-size: 11px;
            color: #a5b4fc;
            line-height: 1.5;
            white-space: pre-wrap;
            word-break: break-word;
        }

        /* Endpoints & System Specs Table */
        .specs-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }
        .specs-table th {
            text-align: left;
            padding: 10px 12px;
            background: rgba(255, 255, 255, 0.03);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            font-family: 'JetBrains Mono', monospace;
            color: #94a3b8;
            font-size: 11px;
            text-transform: uppercase;
        }
        .specs-table td {
            padding: 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            color: #e2e8f0;
        }
        .badge-method {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 6px;
            font-family: 'JetBrains Mono', monospace;
            font-weight: 700;
            font-size: 10px;
        }
        .badge-post { background: rgba(0, 240, 255, 0.15); color: var(--neon-cyan); border: 1px solid var(--neon-cyan); }
        .badge-get { background: rgba(0, 255, 136, 0.15); color: var(--neon-green); border: 1px solid var(--neon-green); }

        /* Loader Spinner */
        .spinner {
            display: inline-block;
            width: 14px;
            height: 14px;
            border: 2px solid rgba(0, 0, 0, 0.3);
            border-radius: 50%;
            border-top-color: #000;
            animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="container">
        
        <!-- Top Navigation Header -->
        <header>
            <div class="brand">
                <div class="logo-box">⚙️</div>
                <div>
                    <h1 class="brand-title">LANGCHAIN RAG BACKEND</h1>
                    <p class="brand-subtitle">CONTROL CENTER • API RUNTIME & MONITORING</p>
                </div>
            </div>

            <div class="header-actions">
                <div class="status-pill">
                    <span class="dot"></span>
                    <span>API LIVE • PORT 5000</span>
                </div>
                <a href="http://localhost:5173/" target="_blank" class="btn-launch-client">
                    <span>🚀 Launch Frontend App</span>
                </a>
            </div>
        </header>

        <!-- Metric Telemetry Cards -->
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-label">
                    <span>Vector Database</span>
                    <span style="color: var(--neon-cyan);">FAISS</span>
                </div>
                <div class="metric-value" style="color: var(--neon-cyan);">Indexed</div>
                <div class="metric-desc">Dense semantic vector store connected</div>
            </div>

            <div class="metric-card">
                <div class="metric-label">
                    <span>LLM Engine</span>
                    <span style="color: var(--neon-purple);">Google Gemini</span>
                </div>
                <div class="metric-value" style="color: var(--neon-purple);">Gemini 3.5 Flash</div>
                <div class="metric-desc">ChatGoogleGenerativeAI with RAG fallback</div>
            </div>

            <div class="metric-card">
                <div class="metric-label">
                    <span>Retrieval Mode</span>
                    <span style="color: var(--neon-green);">Dynamic</span>
                </div>
                <div class="metric-value" style="color: var(--neon-green);">History-Aware</div>
                <div class="metric-desc">Automatic query contextual reformulation</div>
            </div>

            <div class="metric-card">
                <div class="metric-label">
                    <span>Active Port</span>
                    <span style="color: var(--neon-pink);">Flask WSGI</span>
                </div>
                <div class="metric-value" style="color: var(--neon-pink);">0.0.0.0:5000</div>
                <div class="metric-desc">CORS Enabled for localhost:5173</div>
            </div>
        </div>

        <!-- Main Workspace: API Sandbox + System Specs -->
        <div class="main-layout">
            
            <!-- Left Panel: Interactive API Sandbox -->
            <div class="panel">
                <div class="panel-header">
                    <div class="panel-title">
                        <span>🧪</span>
                        <span>Interactive RAG Query Sandbox</span>
                    </div>
                    <span style="font-size: 11px; font-family: 'JetBrains Mono'; color: #64748b;">POST /answer</span>
                </div>

                <div class="form-group">
                    <label class="form-label">Query Prompt:</label>
                    <input type="text" id="queryInput" class="input-text" placeholder="e.g. What is a retriever in LangChain?" value="What is a retriever in LangChain?">
                </div>

                <div class="quick-chips">
                    <span class="chip" onclick="setQuery('What is a retriever in LangChain?')">⚡ What is Retriever?</span>
                    <span class="chip" onclick="setQuery('How does FAISS vector DB work in RAG?')">🌲 FAISS Vector DB</span>
                    <span class="chip" onclick="setQuery('Explain LangChain Agents and tools')">🤖 Agents & Tools</span>
                    <span class="chip" onclick="setQuery('Explain history-aware retrieval')">💾 Memory & History</span>
                </div>

                <button id="sendBtn" class="btn-test" onclick="executeTestQuery()">
                    <span>⚡ Execute API Query</span>
                </button>

                <!-- Live Response Inspector -->
                <div class="response-container">
                    <div class="response-header">
                        <span id="responseStatus">Response Inspector (JSON Payload)</span>
                        <span id="responseTime" style="color: var(--neon-green);"></span>
                    </div>
                    <pre id="jsonOutput" class="response-pre">// Click "Execute API Query" to test the RAG backend endpoint live...</pre>
                </div>
            </div>

            <!-- Right Panel: Backend Architecture & Endpoints -->
            <div class="panel">
                <div class="panel-header">
                    <div class="panel-title">
                        <span>📋</span>
                        <span>API Endpoints & Architecture</span>
                    </div>
                    <span style="font-size: 11px; font-family: 'JetBrains Mono'; color: var(--neon-green);">v2.0 ONLINE</span>
                </div>

                <table class="specs-table">
                    <thead>
                        <tr>
                            <th>Method</th>
                            <th>Endpoint</th>
                            <th>Purpose</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><span class="badge-method badge-post">POST</span></td>
                            <td><code>/answer</code></td>
                            <td>Execute FAISS vector search & Gemini RAG synthesis</td>
                        </tr>
                        <tr>
                            <td><span class="badge-method badge-get">GET</span></td>
                            <td><code>/health</code></td>
                            <td>Health check & system status telemetry</td>
                        </tr>
                        <tr>
                            <td><span class="badge-method badge-get">GET</span></td>
                            <td><code>/</code></td>
                            <td>This Backend Dashboard & API Command Console</td>
                        </tr>
                    </tbody>
                </table>

                <div style="margin-top: 20px; padding: 16px; background: rgba(0, 240, 255, 0.05); border: 1px solid rgba(0, 240, 255, 0.2); border-radius: 12px;">
                    <h4 style="font-size: 12px; font-weight: 700; color: var(--neon-cyan); margin-bottom: 6px; font-family: 'Space Grotesk';">💡 Development Tip:</h4>
                    <p style="font-size: 11px; color: #94a3b8; line-height: 1.5;">
                        The full user-facing chat application with sharp color themes is running on <strong><a href="http://localhost:5173/" target="_blank" style="color: var(--neon-cyan); text-decoration: underline;">http://localhost:5173/</a></strong>. This backend dashboard on port 5000 is dedicated to API testing, diagnostics, and vector store monitoring.
                    </p>
                </div>
            </div>

        </div>

    </div>

    <script>
        function setQuery(text) {
            document.getElementById('queryInput').value = text;
        }

        async function executeTestQuery() {
            const query = document.getElementById('queryInput').value.trim();
            if (!query) return;

            const btn = document.getElementById('sendBtn');
            const output = document.getElementById('jsonOutput');
            const statusLabel = document.getElementById('responseStatus');
            const timeLabel = document.getElementById('responseTime');

            btn.disabled = true;
            btn.innerHTML = '<span class="spinner"></span> Processing Query via RAG...';
            output.textContent = '// Querying FAISS vector database and Google Gemini 3.5...';
            statusLabel.textContent = 'Executing RAG pipeline...';
            timeLabel.textContent = '';

            const startTime = performance.now();

            try {
                const res = await fetch('/answer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: query, chat_history: [] })
                });

                const data = await res.json();
                const duration = ((performance.now() - startTime) / 1000).toFixed(2);

                statusLabel.textContent = `Status: ${res.status} ${res.statusText || 'OK'} (${data.provenance || 'docs'})`;
                timeLabel.textContent = `Latency: ${duration}s`;
                output.textContent = JSON.stringify(data, null, 2);
            } catch (err) {
                statusLabel.textContent = 'Error executing query';
                output.textContent = '// Error: ' + err.message;
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<span>⚡ Execute API Query</span>';
            }
        }
    </script>
</body>
</html>
"""


@app.route("/health", methods=["GET"])
def health():
    faiss_ready = os.path.exists(FAISS_INDEX_PATH)
    return jsonify({
        "status": "ok",
        "service": "LangChain RAG Chat API",
        "vector_store": "FAISS",
        "vector_store_ready": faiss_ready,
        "engine": "Google Gemini 3.5 Flash",
        "endpoints": {
            "answer": "POST /answer",
            "backend_dashboard": "http://localhost:5000/",
            "frontend_client": "http://localhost:5173/"
        }
    })


@app.route("/answer", methods=["GET", "POST", "OPTIONS"])
def answer():
    if request.method == "OPTIONS":
        return "", 200

    if request.method == "GET":
        return jsonify({
            "status": "online",
            "message": "The /answer endpoint accepts POST requests containing query and chat_history.",
            "usage": {
                "method": "POST",
                "headers": {"Content-Type": "application/json"},
                "body": {
                    "query": "What is a retriever in LangChain?",
                    "chat_history": []
                }
            }
        })

    data = request.get_json(silent=True) or {}
    query = data.get("query")
    chat_history = data.get("chat_history", [])

    if not query:
        return jsonify({"error": "Missing query"}), 400

    try:
        # 1) Try docs pipeline
        docs_result = run_llm_from_docs(query, chat_history)
        sources = [doc.metadata.get("source", "") for doc in docs_result.get("context", []) if hasattr(doc, "metadata")]

        if sources:  # Docs mode succeeded
            ans = docs_result.get("answer", "")
            provenance = "docs"
        else:  # Fallback to general LLM
            general_result = run_general_llm(query, chat_history)
            ans = general_result.content
            sources = []
            provenance = "model_only"
        model_name = getattr(llm, "model_name", "Google Gemini 3.5 Flash (FAISS DB)")
    except Exception as e:
        err_msg = str(e)
        if "API key" in err_msg or "Unauthorized" in err_msg or "401" in err_msg or "api_key" in err_msg or "APIKey" in err_msg or "INVALID_ARGUMENT" in err_msg:
            ans = "⚠️ **Google Gemini API Key Configuration Needed**\n\nPlease set your valid credentials in the `.env` file in the project root:\n\n```env\nGOOGLE_API_KEY=your_gemini_api_key_here\nTAVILY_API_KEY=your_tavily_api_key_here\n```"
            provenance = "model_only"
            sources = []
            model_name = "System"
        else:
            return jsonify({"error": f"Backend Error: {err_msg}"}), 500

    # 2) Update history
    updated_history = chat_history + [
        {"role": "human", "content": query},
        {"role": "ai", "content": ans},
    ]

    # 3) Unified response
    return jsonify(
        {
            "answer": ans,
            "chat_history": updated_history,
            "sources": sources,
            "provenance": provenance,
            "model_name": model_name,
        }
    )


@app.route("/")
def backend_dashboard():
    # Dedicated Backend Admin & API Control Dashboard
    return render_template_string(BACKEND_DASHBOARD_HTML)


@app.route("/<path:path>")
def serve_static(path):
    if path and os.path.exists(os.path.join(FRONTEND_DIST, path)):
        return send_from_directory(FRONTEND_DIST, path)
    return backend_dashboard()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", debug=True, port=port)
