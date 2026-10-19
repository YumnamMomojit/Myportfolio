# Courses

Playable courses in the style of Candy Crush levels. Each one has a 3D saga map, levels with moves and stars, and real code after every win. They share one engine in `shared/`.

| Course | Folder | Levels |
| --- | --- | --- |
| 🍬 AI Engineer Saga | `ai-engineer/` | 39 levels in 12 worlds |
| 🤖 Agentic AI Saga | `agentic-ai/` | 40 chapters in 10 parts, 10 part certificates and a verified final project |

Every level works like a Candy Crush level:

- A level card shows the idea and the goal before you play.
- Each action costs a move. You earn ★★★ by finishing in the fewest moves (par) or, on some levels, by doing the job well (cost, mistakes, GPU runs).
- Running out of moves offers +5 moves, but that run can earn only one star.
- Finishing a level unlocks the next one on the map, and the 💡 button gives hints.
- After a win you see what you learned, a short snippet of real code (Python, YAML or a Dockerfile), and for some levels a hands-on lab to run on your own machine.

Progress is saved only in the visitor's browser. **Teacher mode** (⚙️ on the map) unlocks every level for demos and classes, and `#level-12` in the URL opens that level's card when it is unlocked.

## 🍬 AI Engineer Saga (`ai-engineer/`)

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

## 🤖 Agentic AI Saga (`agentic-ai/`)

| Part | Chapters | Certificate |
| --- | --- | --- |
| 🧭 Agent Foundations | What Makes an AI Agent · From Chatbots to Agents · Inside the LLM Brain · 👑 Workflow or Agent? | Agent Foundations |
| ✍️ Prompt Workshop | System Prompts as Job Descriptions · Reasoning Before Acting · Structured Outputs · 👑 Prompt Debugging | Agent Prompt Designer |
| 🧰 Tool Forge | Function Calling Basics · Designing Good Tools · Handling Tool Results and Errors · 👑 The Tool-Use Loop | Tool-Use Builder |
| 🔌 MCP Harbour | Why MCP Exists · Hosts, Clients and Servers · Tools, Resources and Prompts · 👑 Build Your Own MCP Server | MCP Integrator |
| 🗺️ Planning Peaks | ReAct · Plan-and-Execute · Reflection and Self-Correction · 👑 Replanning Under Failure | Agent Planner |
| 🧠 Memory Vault | Managing the Context Window · Short-Term vs Long-Term Memory · Agentic RAG · 👑 A Personal Assistant With Memory | Memory Architect |
| 🤝 Multi-Agent Town | Orchestrator and Workers · Handoffs and Shared State · Debate, Voting and Review · 👑 When Not to Use Many Agents | Multi-Agent Coordinator |
| 💻 Action Towers | Coding Agents · Browser and Computer-Use Agents · Workflow Automation Agents · 👑 Sandboxing and Permissions | Action Agent Engineer |
| 🛡️ Safety Citadel | Prompt Injection and Data Exfiltration · Least Privilege and Human in the Loop · Evaluating Agents · 👑 Red-Team Your Agent | Agent Safety & Evals |
| 🚀 Production Launchpad | Observability and Tracing · Guardrails, Budgets and Fallbacks · Deploying Agents · 👑 Capstone: Ship a Support-Triage Agent | Agent in Production |

**Part certificates:** a part's certificate is earned when every chapter in it has at least ★ and its 👑 boss has ★★ or more. The 🎓 button on the map lists them. Each one can be downloaded, posted on LinkedIn or added to a LinkedIn profile, and has a QR code and a check link to `agentic-ai/verify.html`. Like Cloud Island's certificates, they are generated in the learner's browser.

**Final project:** all ten certificates unlock `agentic-ai/project.html`. The learner builds a support-triage agent in a public GitHub repository, adds the starter files from `agentic-ai/project/starter/` and the workflow `agentic-ai/project/agentic-ai-verify.yml` (unchanged), and pushes. The workflow runs automated checks: the manifest, README sections, an MCP server, a human-approval function, at least 20 eval tasks, the evals themselves (70% pass rate, and every injection and approval task must pass), an example trace, a reflection and a demo link. It then publishes the score as a commit status.

The project page checks the repository from the browser with GitHub's public API, without signing in. The repository must be public, the workflow file must match the course's copy, and the workflow run on the latest commit must have passed. Then it issues the **Certified Agentic AI Engineer** certificate, whose ID covers the repository, commit and run. The check page re-confirms all of that live on GitHub. These checks show that the project has the required parts and that its own evals pass. They don't judge code quality, and they trust the evals the learner writes.

> If you change `agentic-ai-verify.yml`, every learner must copy the new version, and certificates issued with the old one fail the live re-check. Keep the old file alongside if you need both.

## How the code is organised

| File | What it does |
| --- | --- |
| `shared/saga.js` | The saga engine: `startSaga(config)` runs the map, the level HUD, moves, stars, hints and popups |
| `shared/map.js` | The 3D saga map (scenery comes from each world's `prop`) |
| `shared/stage.js` | The 3D stage every level plays on (framing, clicks, effects) |
| `shared/kit.js` | Candy meshes, labels, arrows, tweens, particles and small helpers |
| `shared/progress.js` | Stars, settings and course data saved in the browser |
| `shared/saga.css` | The page, HUD, popups and the gold and green theme |
| `shared/engines/order.js` | The swap-into-order mechanic, used by both courses |
| `<course>/js/data.js` | The worlds and levels: goal, idea, what you learned, code snack, lab, hints and settings |
| `<course>/js/main.js` | Starts the saga with the course's data (and, for Agentic AI, its certificates) |
| `<course>/js/engines/*.js` | The course's own mechanics, loaded only when a level starts |
| `agentic-ai/js/certs.js`, `github.js`, `project.js` | Certificates, the GitHub check, and the final project page |

**Adding a level:** add an entry to the course's `LEVELS` that names an engine and its `params`, or write a new engine. An engine's default export receives `ctx` (stage, `ui` for the control dock, `move()`, `win()`, `fail()`, `goal()`, `status()`, `budget()`) and can return `{ update(dt) }`. Engines that can work out the fewest moves call `ctx.budget({ par, moves })` themselves.

Open a course with `?debug` to get `window.saga.start(i)` in the console for testing a level directly.
