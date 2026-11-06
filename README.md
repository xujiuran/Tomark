# Linkit — AI-Powered Desktop Bookmark & PKM Manager

<p align="center">
  <b>Local-first, offline-capable personal knowledge management and AI-curated bookmark manager.</b>
</p>

---

## 🌟 Features

- **Local-First & Offline Storage**: Built with pure Go SQLite (`modernc.org/sqlite`), no external database services or cloud lock-in required.
- **AI Knowledge Insights**: Automatic article summaries, key takeaways, and auto-tag suggestions powered by OpenAI-compatible models (DeepSeek, GPT-4o, Ollama, etc.).
- **Readability Content Extraction**: Strips web clutter, ads, and navigation to extract clean article text and OpenGraph metadata locally.
- **OS Keychain Security**: API keys are securely stored directly in your OS Keyring (macOS Keychain / Windows Credential Manager).
- **Fast Desktop Native UI**: Three-column dashboard layout built with React 18, Vite, TypeScript, and Tailwind CSS on top of Wails v2.

---

## 🛠️ Tech Stack

- **Desktop Framework**: [Wails v2](https://wails.io/) (Go 1.22+)
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + Lucide Icons
- **Database**: SQLite (via `modernc.org/sqlite`, zero CGO dependency)
- **Scraper / Parser**: `go-shiori/go-readability` + Go HTML parser
- **Security**: `zalando/go-keyring`

---

## 🚀 Quick Start

### Prerequisites
- [Go](https://golang.org/) (>= 1.22)
- [Node.js](https://nodejs.org/) (>= 18)
- [Wails CLI](https://wails.io/docs/gettingstarted/installation):
  ```bash
  go install github.com/wailsapp/wails/v2/cmd/wails@latest
  ```

### Development Mode
To run the app live in development mode with hot-reloading:

```bash
# Run from project root
wails dev
```

### Production Build
To package a native binary/app:

```bash
# For macOS (.app in build/bin/)
wails build

# Or with package installer
wails build -clean -nsis
```

---

## 📂 Project Structure

```
linkit/
├── app.go                 # Wails IPC methods exposed to frontend
├── main.go                # Native application window configuration
├── pkg/
│   ├── ai/                # OpenAI/DeepSeek LLM client & structured JSON parsing
│   ├── db/                # SQLite initialization, migrations & CRUD operations
│   ├── keychain/          # OS Keychain / Credential manager integration
│   ├── models/            # Shared data structures
│   └── scraper/           # HTML metadata & Readability article extractor
├── frontend/              # React 18 + Vite + Tailwind CSS frontend application
│   ├── src/
│   │   ├── App.tsx        # Main 3-column dashboard, AI reader & modals
│   │   └── style.css      # Tailwind & custom scrollbar styling
│   └── wailsjs/           # Auto-generated TypeScript bindings for Go methods
```

---

## 📄 License

MIT License.
