# SIH 2026 Problem Explorer

A lightweight decision-making tool for exploring and ranking 229 Smart India Hackathon 2026 problem statements.

Choose technical capability tags, add them as priority columns, arrange them from left to right, and press **Sort** to compare problems using stable lexicographical ranking. Search works across titles, statements, themes, domains, and keywords, while each problem opens into a concise recommended MVP approach.

The application is intentionally frontend-only: there is no authentication, backend API, recommendation engine, or runtime AI inference. All problem statements, capability estimates, importance ratings, and solution approaches are packaged locally in [`data/sih-analysis.json`](data/sih-analysis.json).

## Run locally

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
```

The interface is built with React, TypeScript, Tailwind CSS, and shadcn-style UI components.
