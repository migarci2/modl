# MODL Presentation Deck

Interactive presentation for the MODL (Modular On-Chain Dynamic Logic) Uniswap v4 Hook Aggregator.

## Setup

```bash
cd deck
npm install
```

## Development

```bash
npm run dev
```

Open [http://localhost:4321](http://localhost:4321)

## Build

```bash
npm run build
npm run preview
```

## Project Structure

```
deck/
├── src/
│   ├── components/
│   │   ├── ui/              # Reusable UI components
│   │   │   ├── NeoButton.tsx
│   │   │   ├── NeoCard.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── MetricRow.tsx
│   │   ├── ScalabilitySim.tsx  # Interactive simulator
│   │   └── DeckApp.tsx         # Main deck orchestrator
│   ├── slides/              # Individual slides
│   │   ├── SlideIntro.tsx
│   │   ├── SlideProblem.tsx
│   │   ├── SlideArchitecture.tsx
│   │   ├── SlideDeepDive.tsx
│   │   ├── SlideRecipes.tsx
│   │   ├── SlideCLI.tsx
│   │   └── SlideRoadmap.tsx
│   ├── layouts/
│   │   └── Layout.astro
│   ├── pages/
│   │   └── index.astro
│   └── styles/
│       └── global.css
├── public/
│   └── favicon.svg
├── astro.config.mjs
├── tailwind.config.mjs
└── package.json
```

## Navigation

- **Arrow keys**: Navigate between slides
- **Click dots**: Jump to specific slide
- **Mobile menu**: Access slides on mobile

## Tech Stack

- **Astro** - Static site generator
- **React** - Interactive components
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
