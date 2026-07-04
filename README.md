# SurrendaSoft Tools

Acceptance criteria for every tool are documented in [`docs/ACCEPTANCE_CRITERIA.md`](docs/ACCEPTANCE_CRITERIA.md). Run the complete automated suite with `npm test`.

Free, privacy-conscious browser utilities from SurrendaSoft. The app includes text, business, developer, image, and PDF tools that run locally where possible.

## Development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

The `main` branch deploys automatically to GitHub Pages.

## Project structure

```text
src/
├── main.jsx                 # React entry point
├── App.jsx                  # Shell, home directory, and tool page
├── components/              # Shared UI primitives and file inputs
├── data/tools.js            # Tool metadata, categories, and visibility flags
├── tools/                   # One lazy-loaded component per tool
│   ├── CalendarScheduleTool.jsx
│   ├── EmojiTool.jsx
│   ├── GstTool.jsx
│   ├── ImageToPdfTool.jsx
│   ├── PdfToImageTool.jsx
│   └── ...
└── utils/                   # Calendar and formatting helpers
```

New tools are registered in `src/data/tools.js` and lazy-loaded through `src/tools/index.jsx`. Shared behavior belongs in `src/components` or `src/utils`, keeping each tool independently maintainable.
