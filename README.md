# Relist — AI Resale Workbench

> Turn a pile of clothes into marketplace-ready listings: photograph, analyze, enhance, organize, and publish.

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" alt="React 18" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" alt="Vite 5" />
  <img src="https://img.shields.io/badge/Zustand-4-443E38" alt="Zustand 4" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-CDN-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/n8n-Workflows-EA4B71?logo=n8n&logoColor=white" alt="n8n" />
  <img src="https://img.shields.io/badge/OpenAI-Vision_%26_Images-412991?logo=openai&logoColor=white" alt="OpenAI" />
  <img src="https://img.shields.io/badge/IndexedDB-Persistence-FFCA28" alt="IndexedDB" />
  <img src="https://img.shields.io/badge/Bootstrap-5-7952B3?logo=bootstrap&logoColor=white" alt="Bootstrap 5" />
  <img src="https://img.shields.io/badge/JavaScript-ES_Modules-F7DF1E?logo=javascript&logoColor=111" alt="JavaScript" />
  <img src="https://img.shields.io/badge/Tests-Node.js-339933?logo=nodedotjs&logoColor=white" alt="Node.js tests" />
</p>

Relist removes the repetitive work from resale listing. A seller captures up to five photos of a garment, receives an AI-generated title, category, condition grade, defect summary, description, and suggested price, then reviews and organizes the result before posting it to a local marketplace experience.

The application works immediately in mock mode. n8n and OpenAI are optional integrations for live garment analysis and studio-style image enhancement.

## Demo flow

1. Start a single listing or a named bundle.
2. Capture one to five garment photos using the device camera or file picker.
3. Generate a structured listing with AI.
4. Review and edit the title, category, condition, defects, description, and price.
5. Save the item while photo enhancement runs in the background.
6. Organize inventory into bundles and normalized category groups.
7. Connect a marketplace and post an item or bundle.
8. Select **View on eBay** to open the completed product listing.

## Features

- **Camera-first capture** — uses the browser `MediaDevices` API with a file-upload fallback.
- **Efficient image handling** — downsizes captures to a maximum width of 1024px and stores JPEG data URIs.
- **AI listing generation** — creates structured listing copy from one to five product photos.
- **Condition intelligence** — grades items from A–D and records visible defects.
- **Suggested resale pricing** — returns a GBP price and short pricing rationale.
- **AI photo enhancement** — processes each image independently and keeps the original as a fallback.
- **Single-item and bundle workflows** — scan one garment or build a complete inventory drop.
- **Automatic category grouping** — normalizes variable AI labels into useful resale categories.
- **Editable listings** — sellers retain control over every generated field.
- **Persistent workbench** — Zustand state is stored in IndexedDB, including image-heavy listings.
- **Resilient offline demo** — mock analysis works without n8n, OpenAI, or environment variables.
- **Marketplace workflow** — tracks connection and posting state for eBay and Vinted.
- **Integrated eBay experience** — shared products appear in selling, browsing, product detail, watchlist, cart, and checkout views.
- **Safe retries** — failed marketplace writes do not mark listings as posted.
- **Mobile-ready HTTPS** — local SSL enables camera access on supported devices.

## Tech stack

| Layer | Technology | Purpose |
|---|---|---|
| UI | React 18 | Component-based application interface |
| Build tooling | Vite 5 | Development server, HMR, and production builds |
| State | Zustand 4 | Listings, bundles, navigation state, and marketplace state |
| Persistence | IndexedDB | Stores listing metadata and base64 images beyond localStorage limits |
| Styling | Tailwind CSS CDN, custom CSS | Responsive mobile-first interface |
| Marketplace UI | HTML5, CSS3, Bootstrap 5, vanilla JavaScript | Integrated storefront pages |
| Camera | MediaDevices, Canvas, FileReader, Blob APIs | Capture, resize, encode, and display product photos |
| Automation | n8n Cloud | Webhook orchestration and response validation |
| AI analysis | OpenAI `gpt-4o-mini` | Multimodal garment analysis and listing generation |
| Image enhancement | OpenAI `gpt-image-1` | Studio-style product photo cleanup |
| Testing | Node.js test runner, `fake-indexeddb` | Unit and IndexedDB integration tests |
| Local security | `@vitejs/plugin-basic-ssl` | HTTPS for camera permissions |
| Typography | Satoshi via Fontshare | Application typeface |

## Architecture

```text
Device camera / photo library
            │
            ▼
      React capture flow
            │
            ├── Mock analyzer (zero-config)
            │
            └── n8n webhook
                    └── OpenAI vision analysis
            │
            ▼
   Editable listing + bundle
            │
            ├── n8n image-enhancement webhook
            │       └── OpenAI image generation
            │
            ▼
  Zustand store persisted to IndexedDB
            │
            ▼
 Marketplace posting → product listing
```

The browser never receives an OpenAI secret. When live AI is enabled, the frontend only communicates with n8n webhooks.

## Quick start

### Prerequisites

- Node.js 18 or newer
- npm
- A modern browser
- A camera-enabled device or image files for upload

### 1. Clone and install

```bash
git clone https://github.com/yakivets/Fleek_Hack.git
cd Fleek_Hack
npm install
```

### 2. Start in mock mode

No API keys or environment variables are required:

```bash
npm run dev
```

Open:

- Main application: <https://localhost:5173>
- eBay home: <https://localhost:5173/ebay/index.html>
- eBay selling page: <https://localhost:5173/ebay/pages/selling.html>

The development certificate is self-signed, so the browser may ask you to accept it once.

### 3. Use a phone on the same network

`npm run dev` exposes Vite to the local network. Open the **Network** URL printed in the terminal from a phone on the same Wi-Fi.

Camera access requires HTTPS. Accept the local development certificate on the device when prompted.

## Live AI setup

The app supports two independent n8n workflows:

1. **Garment analysis** — returns listing data from one to five images.
2. **Image enhancement** — returns a cleaned JPEG for each captured image.

You can enable either workflow independently.

### 1. Create the environment file

```bash
cp .env.example .env.local
```

```dotenv
VITE_N8N_WEBHOOK_URL=
VITE_N8N_ENHANCE_URL=
```

Leave a value empty to keep that feature in local fallback mode.

### 2. Configure garment analysis

1. Create an [n8n Cloud](https://n8n.io/) workspace.
2. Create an [OpenAI API key](https://platform.openai.com/api-keys) with billing enabled.
3. Add the key in **n8n → Credentials → OpenAI API**.
4. Import `docs/FLEEK_N8N_WORKFLOW.json`.
5. Select the OpenAI credential in the **Analyze Garment** node.
6. Save and activate the workflow.
7. Copy the webhook's **Production URL** into `.env.local`:

```dotenv
VITE_N8N_WEBHOOK_URL=https://YOUR-N8N-HOST/webhook/scan-item
```

### 3. Configure image enhancement

1. Import `docs/FLEEK_N8N_ENHANCE_IMAGE_BRANCH.json` into n8n.
2. Select the OpenAI credential in **Clean Product Photo**.
3. Save and activate the workflow.
4. Copy its **Production URL** into `.env.local`:

```dotenv
VITE_N8N_ENHANCE_URL=https://YOUR-N8N-HOST/webhook/enhance-image
```

### 4. Restart Vite

Vite reads environment variables at startup:

```bash
npm run dev
```

For detailed webhook contracts and troubleshooting, see:

- [`docs/BACKEND_N8N.md`](docs/BACKEND_N8N.md)
- [`docs/CONTRACT.md`](docs/CONTRACT.md)

## Available commands

| Command | Description |
|---|---|
| `npm run dev` | Start the HTTPS development server |
| `npm test` | Run the full Node.js test suite |
| `npm run build` | Create a production build in `dist/` |
| `npm run preview` | Preview the production build locally |

## Project structure

```text
Fleek_Hack/
├── public/
│   └── ebay/                  # Marketplace pages and static assets
├── src/
│   ├── capture/               # Camera, analysis, enhancement, listing editor
│   ├── dashboard/             # Inventory, bundles, marketplace workflows
│   ├── home/                  # Entry screen
│   ├── integrations/          # Marketplace mapping, persistence, tests
│   ├── App.jsx                # Screen navigation
│   ├── storage.js             # Zustand IndexedDB adapter
│   ├── store.js               # Application state and actions
│   └── styles.css             # Global design system and motion
├── docs/
│   ├── BACKEND_N8N.md
│   ├── CONTRACT.md
│   ├── FLEEK_N8N_WORKFLOW.json
│   └── FLEEK_N8N_ENHANCE_IMAGE_BRANCH.json
├── .env.example
├── package.json
└── vite.config.js
```

## Data and persistence

- Workbench state is persisted in the browser's IndexedDB database.
- Captured and enhanced photos are stored as data URIs for a self-contained local demo.
- Marketplace listing records use stable IDs, so reposting updates an existing item instead of duplicating it.
- If IndexedDB is unavailable, the main workbench falls back to in-memory storage for the current session.
- Clearing site data removes locally stored listings and marketplace state.

## Testing

Run:

```bash
npm test
```

The suite covers:

- Listing schema mapping
- IndexedDB writes, reads, rollback, and idempotent updates
- Marketplace posting order and retry behavior
- Bundle and category state transitions
- Navigation locks during posting
- Product filtering and currency formatting
- Cart, watchlist, and checkout safety
- Malformed storage recovery

## Troubleshooting

### The camera does not start

- Open the HTTPS URL, not HTTP.
- Accept the local certificate.
- Allow camera access in browser settings.
- Use **Add photos** as the desktop or permission-denied fallback.

### The n8n webhook returns 404

- Activate the workflow.
- Use the Production URL rather than an inactive Test URL.
- Restart Vite after changing `.env.local`.

### Analysis works manually but fails in the browser

- Confirm the n8n webhook allows CORS.
- Verify the request contains real image data.
- Inspect the first failed node in the n8n execution.

### Image enhancement does not run

- Confirm `VITE_N8N_ENHANCE_URL` is set.
- Restart Vite.
- Save a newly scanned item; existing items are not enhanced retroactively.
- Verify that the OpenAI project can access `gpt-image-1`.

### A listing does not appear in the marketplace

- Confirm the item was successfully posted.
- Refresh the marketplace page.
- Ensure the same browser and origin are being used so both views can access the shared IndexedDB database.

## Demo notes

- Mock mode is the fastest path for judging and does not require network services.
- Live AI mode demonstrates the complete n8n and OpenAI pipeline.
- The eBay marketplace experience runs locally and does not require eBay credentials or an external eBay API.
- Vinted connection and posting state are represented in the client-side workflow.

## License

This repository does not currently declare an open-source license. Add a license before redistributing the project outside the team.
