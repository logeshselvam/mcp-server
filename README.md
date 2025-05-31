# 🧠 SmartMenu MCP Server

This is the **Model Context Protocol (MCP) server** for [SmartMenu](https://github.com/your-org/smartmenu), an AI-powered assistant that helps customers interact with restaurant menus through natural language.

The MCP server acts as a bridge between large language models (LLMs) like GPT-4 and your structured menu data. It exposes tools and resources that allow the model to reason over real menus and provide grounded, context-aware recommendations.

---

## 📦 Features

- Exposes structured menus as **resources** to the LLM
- Provides a rich set of **tools** for:
  - Finding menus by name or ID
  - Filtering dishes by dietary tags, price, or restrictions
  - Listing all available menus and tags
  - Returning full details for specific menu items
- Connects to a real backend API via REST
- Built with the official [`@modelcontextprotocol/sdk`](https://www.npmjs.com/package/@modelcontextprotocol/sdk)

---

## 🧱 Architecture

```txt
Frontend (React) ←→ Backend (Express + DB)
                          ↓
                    [SmartMenu MCP]
                          ↓
                LLM (ChatGPT, Claude, etc.)
```

🚀 Getting Started

1. Clone the project:

```bash
git clone https://github.com/logeshselvam/mcp-server.git
cd mcp-server
```

2. Install dependencies:

```bash
npm install
```

3. Run the inspector:

```bash
npm run inspect
```

4. Test with Cursor:
   Open Cursor setting and add the following:

```json
"smart-menu": {
      "command": "npm",
      "args": [
        "--silent",
        "--prefix",
        // your project path, you can find it using `pwd` command
        "run",
        "dev"
      ]
  }
```
