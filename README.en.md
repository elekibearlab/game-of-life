English | [日本語](README.md)

# Game of Life — 2D / 3D

Conway's Game of Life built with Three.js, then extended to three dimensions.\
The menu at the top switches between 2D and 3D.\
Featured on the YouTube channel "Elekibear Digital Lab".

- **Try it in your browser**: [lab.elekibear.com/en/demos/game-of-life/](https://lab.elekibear.com/en/demos/game-of-life/)

| | |
|---|---|
| ![2D](docs/images/2d-plain.png) | ![3D](docs/images/3d-crystal.png) |
| **2D** — Conway's Game of Life, with a catalog of 35 patterns | **3D** — The Game of Life extended to three dimensions |

## Features

- **2D**
  - Choose the board size (48×27 to 256×144)
  - Fill the board at random (choose the density)
  - Place one of 35 patterns (still lifes, oscillators, spaceships, guns, methuselahs and infinite growth)
  - A catalog mode that shows every pattern in motion
  - Drag to draw cells
- **3D**
  - Choose the board size (16³ to 96³)
  - Fill the board at random (choose the density and extent)
  - Choose one of 11 rule presets (including Generations rules with dying stages)
- **Effects**
  - Add colour changes, afterglow, growing/shrinking, fog and glow
  - All start off, so at first you see only cells living and dying by the rules

## Tech stack

- React 19
- TypeScript
- Vite
- Three.js
- Vitest
- Prettier

## Getting started

**Requirements**

- [Node.js](https://nodejs.org/) 22.12 or later

Run these commands in the repository folder:

```bash
npm install
npm run dev
```

Open the URL it prints (usually `http://localhost:5173/`) in your browser.

Click “JA | EN” at the top right, or add `?lang=en` to the URL, for the English UI. End the URL with `#3d` to open the 3D screen (they work together, as in `?lang=en#3d`).

## Folder structure

```
src/
  core/      The Game of Life logic. Start reading here
  data/      35 patterns for 2D, 11 rules for 3D
  view2d/    The 2D screen
  view3d/    The 3D screen
  ui/        Parts shared by 2D and 3D
  shared/    Keyboard controls, language
tests/       Tests
```

## Where to start reading

The Game of Life logic lives in the three files in `src/core/`, and the patterns and rules it runs live in the two files in `src/data/`. None of them use React or Three.js, so reading these five files covers the main implementation.

1. **[`src/core/life2d.ts`](src/core/life2d.ts)** — the board, counting the 8 surrounding cells, and advancing one generation
2. **[`src/core/life3d.ts`](src/core/life3d.ts)** — the 3D version, laid out in the same order. The neighbourhood grows to 26 cells
3. **[`src/core/rule.ts`](src/core/rule.ts)** — how rules such as "B3/S23" are written. Shared by 2D and 3D
4. **[`src/data/patterns.ts`](src/data/patterns.ts)** — the 35 2D patterns
5. **[`src/data/presets.ts`](src/data/presets.ts)** — the 11 3D rules

At the heart of it is this function, which advances one generation:

```ts
export function step(grid: Grid, rule: Rule = CONWAY): Grid {
  const next = createGrid(grid.width, grid.height);
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const i = y * grid.width + x;
      const count = countNeighbors(grid, x, y);
      const alive = grid.cells[i] === ALIVE;
      const lives = alive ? rule.survive.includes(count) : rule.birth.includes(count);
      next.cells[i] = lives ? ALIVE : DEAD;
    }
  }
  return next;
}
```

The 2D and 3D files are laid out in the same order, so putting them side by side shows exactly what changes in 3D.\
The screens (`src/view2d/`, `src/view3d/`) only draw what `core` computes, using Three.js.

## Sources of the 3D rules

The 3D presets come from rules found in Carter Bays's research and rules named and shared by Jason Rampe of Softology. See the references for details.

| Preset | Rule in this sample | Source | Kind |
|---|---|---|---|
| Bays 4555 | B5/S4-5 | Carter Bays (1987) [1] | 2 states |
| Bays 5766 | B6/S5-7 | Carter Bays (1987) [1] | 2 states |
| 445 | B4/S4 | Jason Rampe / Softology (2019) [2] | 2 states (the original is `4/4/5/M`, with 5 states) |
| Clouds | B13-14,17-19/S13-26 | Same (named Clouds 1 there) | 2 states |
| Crystal | B1,3/S0-6 | Same (named Crystal Growth 1 there) | 2 states (the original counts the 6 face neighbours; this sample counts all 26) |
| Architecture | B3/S4-6 | Same | 2 states |
| Pyroclastic | B6-8/S4-7/C10 | Same | Generations (10 states) |
| Coral | B6-7,9,12/S5-8/C4 | Same | Generations (4 states) |
| Amoeba | B5-7,12-13,15/S9-26/C5 | Same | Generations (5 states) |
| Pulse Waves | B1-3/S3/C10 | Same | Generations (10 states) |
| Builder | B4,6,8-9/S2,6,9/C10 | Same (named Builder 1 there) | Generations (10 states) |

**References**

1. Carter Bays, "Candidates for the Game of Life in Three Dimensions", *Complex Systems* 1 (1987)
2. Jason Rampe (Softology), "3D Cellular Automata" (2019) — <https://softologyblog.wordpress.com/2019/12/28/3d-cellular-automata-3/>
3. Carter Bays, "A Note About the Discovery of Many New Rules for the Game of Three-Dimensional Life", *Complex Systems* 16 (2006)

## Documentation

- [Implementation guide](docs/implementation-guide.en.md) — the rules, the 2D implementation, extending to 3D, and drawing techniques, step by step
- The code guide ([docs/code_guide.md](docs/code_guide.md)) is in Japanese
