# Courses

Course material for the portfolio lives here, one subfolder per course.

## AI Engineer Saga (`ai-engineer/`)

A playable AI-engineer course in the style of Candy Crush levels. A 3D saga map winds through 12 worlds that follow the AI-engineer roadmap. Each of the 39 levels turns one idea into a small puzzle:

| World | Levels |
| --- | --- |
| 🏝️ Python Port | First Function · Big-O Ladder · 👑 FastAPI Endpoint |
| 🔷 Vector Valley | Vector Hop · Matrix Morph · 👑 Eigen Arrows |
| ⛰️ Gradient Mountains | Roll to the Valley · The Ravine · 👑 Momentum Escape |
| 🎲 Probability Casino | Coin Detective · Entropy Jars · 👑 High-Roller Detective |
| 🌲 Classic Forest | Draw the Line · Shepherd K-Means · Overfit Hill · 👑 Regularise! |
| 🧠 Neuron City | One Neuron · The Training Loop · XOR Gate · 👑 Feature Maps |
| 🔦 Attention Tower | Tokenizer Crush · Embedding Galaxy · Attention Beams · 👑 Temperature Dial |
| 📚 Library of Retrieval | RAG Pipeline · Hybrid Search · 👑 Ghost Buster |
| 🤖 Agent Arena | The ReAct Loop · Tool Chest · 👑 Human in the Loop |
| ⚡ The Forge | LoRA Runes · Quantize to Fit · 👑 Batching Diner |
| ☁️ Cloud Citadel | Dockerfile Stack · Autoscale Rush · 👑 Pod Rescue |
| 🛡️ Eval Fortress | Precision vs Recall · Injection Defense · 👑 Ship It |

Every level works like a Candy Crush level:

- A level card shows the idea and the goal before you play.
- Each action costs a move. You earn ★★★ by finishing in the fewest moves (par) or, on some levels, by doing the job well (cost, mistakes, GPU runs).
- Running out of moves offers +5 moves, but that run can earn only one star.
- Finishing a level unlocks the next one on the map, and the 💡 button gives hints.
- After a win you see what you learned, a short snippet of real code (Python, YAML or a Dockerfile), and for some levels a hands-on lab to run on your own machine (FastAPI, Docker, a local Kubernetes cluster with kind).

Progress is saved only in the visitor's browser. **Teacher mode** (⚙️ on the map) unlocks every level for demos and classes, and `#level-12` in the URL opens that level's card when it is unlocked.

### How the code is organised

| File | What it does |
| --- | --- |
| `index.html`, `course.css` | The page, HUD, popups and candy styles |
| `js/data.js` | All 12 worlds and 39 levels: goal, idea, what you learned, code snack, lab, hints and settings |
| `js/main.js` | Moves, stars, popups, hints and the level loop |
| `js/map.js` | The 3D saga map |
| `js/stage.js` | The 3D stage every level plays on (framing, clicks, effects) |
| `js/kit.js` | Candy meshes, labels, arrows, tweens, particles and small helpers |
| `js/engines/*.js` | One file per mechanic (27 in all), loaded only when its level starts |

**Adding a level:** add an entry to `LEVELS` in `js/data.js` that names an existing engine and its `params`, or write a new engine. An engine's default export receives `ctx` (stage, `ui` for the control dock, `move()`, `win()`, `fail()`, `goal()`, `status()`, `budget()`) and can return `{ update(dt) }`. Engines that can work out the fewest moves call `ctx.budget({ par, moves })` themselves.

Open `?debug` to get `window.saga.start(i)` in the console for testing a level directly.
