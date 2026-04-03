# <img src="https://raw.githubusercontent.com/your-repo/scrappy/main/scrappy_ascii.txt" alt="Scrappy Logo" width="40" height="40"> Scrappy

**The fully agentic CLI chat assistant that gets things done—fast, smart, and scrappy.**

Scrappy is a **self-orchestrating AI agent** that automates research, file generation, web scraping, and data extraction—all from your terminal. Think of it as your **personal AI intern** that can crawl the web, analyze stocks, generate reports, and even write READMEs—without you micromanaging every step.

---

## ✨ **Key Features**

🔥 **Agentic Workflows** – Scrappy doesn’t just follow commands; it **plans, executes, and iterates** to complete tasks autonomously.

🌐 **Web Scraping & Research** – Extract structured data from websites, APIs, and financial sources (Yahoo Finance, etc.).

📊 **Stock & Market Analysis** – Fetch real-time stock data, generate reports, and export to **Markdown, DOCX, or Excel**.

📝 **Automated File Generation** – Generate **READMEs, research reports, and documentation** with zero manual effort.

🤖 **Interactive CLI Chat** – Natural language conversations with your AI agent—no GUI needed.

🔌 **Plugin System** – Extend Scrappy with custom tools and workflows.

🎨 **Beautiful Terminal UI** – Colorful, animated, and user-friendly.

---

## ⚡ **Quickstart**

### **1. Install Scrappy**

```bash
npm install -g @cosmic/scrappy
# or
yarn global add @cosmic/scrappy
```

### **2. Run the Setup**

```bash
scrappy setup
```
*(Configures API keys and preferences.)*

### **3. Start Chatting with Your Agent**

```bash
scrappy chat
```
**Example Commands:**
- `"Research Tesla's latest earnings report and generate a Markdown summary"`
- `"Fetch AAPL stock data and export to Excel"`
- `"Scrape the top 5 trending GitHub repos for AI and save as a report"`

---

## 🛠 **Tech Stack & Project Structure**

### **Core Dependencies**
| Package | Purpose |
|---------|---------|
| `axios` | HTTP requests |
| `cheerio` | HTML parsing & scraping |
| `exceljs` | Excel file generation |
| `docx` | Word document generation |
| `yahoo-finance2` | Stock market data |
| `inquirer` | Interactive CLI prompts |
| `marked` + `marked-terminal` | Markdown rendering in terminal |
| `ora` | Beautiful spinners |
| `chalk` | Terminal colors |

### **Project Structure**
```
scrappy/
├── src/
│   ├── agent/          # AI agent logic (LLM routing, tools, workflows)
│   ├── bin/            # CLI entry point
│   ├── cli/            # Command-line interfaces (chat, crawl, research, etc.)
│   ├── core/           # Core scraping & file generation logic
│   └── utils/          # Helpers (logging, config, paths)
├── scrappy.config.yaml # User configuration
├── cosmic_ascii.txt    # ASCII art for terminal
└── package.json        # Project metadata
```

---

## 🚀 **Example Workflows**

### **1. Generate a Stock Report**
```bash
scrappy stock --ticker TSLA --output TSLA-Report.md
```
*(Fetches Tesla’s stock data, analyzes trends, and generates a Markdown report.)*

### **2. Scrape a Website**
```bash
scrappy crawl --url "https://news.ycombinator.com" --selector ".titleline > a" --output hn-top-stories.json
```
*(Extracts top Hacker News stories into a structured JSON file.)*

### **3. Automate Research**
```bash
scrappy research --query "latest advancements in AI agents" --depth 3 --output ai-research.md
```
*(Searches the web, summarizes findings, and generates a report.)*

### **4. Generate a README**
```bash
scrappy readme --project "My Awesome Project" --description "A revolutionary tool" --output README.md
```
*(Creates a professional README with minimal input.)*

---

## 🤝 **Contributing**

Scrappy is **open-source** and welcomes contributions! Here’s how you can help:

1. **Fork the repo** and clone it locally.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run in dev mode:
   ```bash
   npm run dev
   ```
4. Submit a **PR** with your improvements!

### **Roadmap**
- [ ] **Multi-agent collaboration** (e.g., researcher + writer agents)
- [ ] **Browser automation** (Puppeteer/Playwright integration)
- [ ] **More file formats** (PDF, CSV, JSON)
- [ ] **Self-hosted LLM support** (Ollama, LM Studio)

---

## 📜 **License**

Scrappy is **MIT licensed**—free for personal and commercial use.

---

**Built with ❤️ by [Cosmic](https://github.com/cosmic)** | **Star ⭐ this repo if you find it useful!**