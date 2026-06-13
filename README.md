# 🌌 Smart RAG Vault

Smart RAG Vault is an interactive, browser-based **Retrieval-Augmented Generation (RAG)** educational sandbox and application. It is designed to teach developers, AI enthusiasts, and students how RAG pipelines and Vector Databases work by visualizing the underlying math, workflows, and coordinate structures completely on the client side.

Live deployment configured for **Vercel**.

---

## 🚀 Key Features

*   **💬 AI Agent Chat:** Converse with a grounded AI model (Gemini or OpenAI). Upload files, query them, and receive answers with highlighted source citations. If information is missing, the agent clearly separates context knowledge from general knowledge.
*   **📂 Knowledge Vault:** Upload PDF, TXT, or Markdown documents. Segment pages into overlapping text chunks, visualize how overlaps work in real-time, generate mathematical vector embeddings, and explore raw coordinate weights in IndexedDB.
*   **🎛️ RAG Playground:** Submit queries and watch a step-by-step trace of the entire RAG pipeline—from token filtering and TF-IDF weight generation to vector matching, prompt template injection, and response synthesis.
*   **🎓 RAG Academy:** An interactive classroom offering conceptual guides, closed-book vs. open-book analogies, case studies, and visual simulators. It includes a vector similarity angle calculator and semantic coordinate maps.

---

## 🛠️ Technology Stack

*   **Framework:** [Angular v21 (Standalone Components)](https://angular.dev/)
*   **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
*   **Client Vector Store:** Browser [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) via `VectorDbService`
*   **Local Embedding Mode:** Term Frequency-Inverse Document Frequency (TF-IDF) Vector Space Model (VSM)
*   **Remote AI Embeddings & Chat:** Google Gemini API (`text-embedding-004`, `gemini-3.5-flash`) or OpenAI API (`text-embedding-3-small`, `gpt-4o-mini`)
*   **PDF Parsing:** [PDF.js (pdfjs-dist)](https://mozilla.github.io/pdf.js/) running inside a dynamic web worker CDN
*   **Icons:** [Lucide Angular](https://lucide.dev/)
*   **Testing:** [Vitest](https://vitest.dev/) unit test runner

---

## ⚙️ Setup & Installation

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### Install Dependencies

```bash
npm install
```

### Start Development Server

```bash
npm run start
```

Navigate to `http://localhost:4200/` in your browser.

### Run Tests

To execute unit tests using Vitest:

```bash
npm run test -- --watch=false
```

### Build for Production

To compile the production bundles:

```bash
npm run build
```

The output will be stored in `dist/smart-rag-vault/browser/`.

---

## ☁️ Vercel Deployment

This project contains a [vercel.json](vercel.json) file configured to build and serve the application as a single-page application (SPA):

1.  Connect your GitHub repository to [Vercel](https://vercel.com).
2.  Import the project.
3.  Vercel will detect the `vercel.json` configurations automatically, run `npm run build`, and serve the static files with full client-side route rewrites.

---

## 📖 Learn More

To understand the architecture under the hood and read about how vectors are calculated, please refer to the detailed [APP_OVERVIEW.md](APP_OVERVIEW.md) file.
