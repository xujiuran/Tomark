# Tomark — 收藏不吃灰

<p align="center">
  <b>收藏不吃灰 · 本地优先、具备 AI 智能洞察的现代化个人知识与书签管理工具</b><br/>
  <i>Local-first, offline-capable personal knowledge management & AI-curated bookmark manager.</i>
</p>

---

## 🌟 核心特色 (Features)

- **本地优先 & 离线存储**：基于纯 Go 实现的 SQLite（`modernc.org/sqlite`），免除外部数据库依赖与云端锁定，数据 100% 掌握在自己手中。
- **AI 智能深度洞察**：支持对接 OpenAI 兼容格式模型（DeepSeek、GPT-4o、Ollama 等），一键生成核心摘要、关键要点与智能推荐标签，让每一条收藏都能真正发挥价值。
- **全文正文提取 (Readability)**：内置高效解析器，自动剔除广告、页面杂乱元素与导航栏，本地还原纯净阅读视图与 OpenGraph 元数据。
- **系统级安全密钥链**：API Key 等敏感凭据直接安全存储在操作系统原生钥匙串（macOS Keychain / Windows 凭据管理器）中。
- **原生极速三栏桌面 UI**：基于 Wails v2 + React 18 + Vite + TypeScript + Tailwind CSS 构建，支持深浅色视觉风格与丝滑的拖拽排版体验。
- **主流浏览器无缝迁移**：一键导入 Chrome、Edge、Arc 等浏览器的 HTML 书签与固定工作区。

---

## 🛠️ 技术栈 (Tech Stack)

- **桌面运行时**：[Wails v2](https://wails.io/) (Go 1.22+)
- **前端技术栈**：React 18 + Vite + TypeScript + Tailwind CSS + Lucide Icons
- **数据库**：SQLite (纯 Go 驱动 `modernc.org/sqlite`，零 CGO 依赖)
- **网页提取**：`go-shiori/go-readability` + Go HTML parser
- **凭据安全**：`zalando/go-keyring`

---

## 🚀 快速上手 (Quick Start)

### 环境依赖
- [Go](https://golang.org/) (>= 1.22)
- [Node.js](https://nodejs.org/) (>= 18)
- [Wails CLI](https://wails.io/docs/gettingstarted/installation):
  ```bash
  go install github.com/wailsapp/wails/v2/cmd/wails@latest
  ```

### 获取代码
```bash
git clone git@github.com:xujiuran/tomark.git
cd tomark
```

### 开发模式 (Live Development)
启动前端热重载与本地桌面调试：
```bash
wails dev
```

### 生产打包 (Production Build)
打包原生桌面应用：
```bash
# macOS 打包 (.app 位于 build/bin/)
wails build

# Windows 打包 (包含 NSIS 安装包)
wails build -clean -nsis
```

---

## 📂 项目结构 (Project Structure)

```
tomark/
├── app.go                 # Wails IPC 后端方法与生命周期绑定
├── main.go                # 桌面主窗口配置与启动入口
├── pkg/
│   ├── ai/                # OpenAI/DeepSeek LLM 接口与结构化 JSON 解析
│   ├── db/                # SQLite 初始化、迁移与 CRUD 操作
│   ├── keychain/          # OS 原生钥匙串与凭据安全管理
│   ├── models/            # 核心数据模型定义
│   └── scraper/           # HTML 元数据与 Readability 正文提取器
├── frontend/              # React 18 + Vite + Tailwind CSS 前端项目
│   ├── src/
│   │   ├── App.tsx        # 三栏布局、AI 阅读器面板与弹窗交互
│   │   └── style.css      # 全局样式与自定义滚动条
│   └── wailsjs/           # Wails 自动生成的 Go 方法 TypeScript 绑定
```

---

## 📄 开源许可 (License)

[MIT License](LICENSE)
