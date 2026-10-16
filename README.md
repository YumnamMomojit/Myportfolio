# Cloud Island — Yumnam Momojit's 3D portfolio

A playable Three.js portfolio. You walk a small robot around a floating island. Each zone is a section of the resume:

| Zone | What's there |
| --- | --- |
| Profile Totem | About, key stats, links |
| The Skill Tree | Skills; its fruits light up as you collect Skill Orbs |
| Career Timeline | One pillar per role. Pillars get taller over time |
| Project Data Center | One server rack per project, plus an archive terminal |
| Hall of Credentials | Degrees and certifications |
| Research Library | Publications and theses |
| Signal Beacon | Contact |
| India Journey Map | A walkable 3D map of India. Thoubal, Manipur (hometown) is marked with a beacon, with pins for every place along the route to Pune. It also has an animated ocean, flowing rivers and snow-capped Himalayan peaks |
| Fun Park | A Ride Station (bicycle and motorbike), a stunt ramp, a basketball court and a trampoline |
| Waterfall Lagoon | A waterfall with a secret cave behind it, a lagoon you can wade into, and a stream that pours off the island's edge |
| Snow Peak Valley | Falling snow, a snowman, a slippery frozen pond, and icy stepping stones up to a summit |
| Brain Arena | Hard maths and programming puzzles (answers are stored as hashes, so they can't be read from the source) and a flying 3×3 Rubik's Cube you can play |
| AI Learning Lab | Five interactive lessons, each ending in a quiz (see below), plus a live AI-agent drone that senses, plans, acts and greets you by name |
| Golden Workshop | Spend the gold that Buddy digs up on a golden kennel, a golden collar for Buddy and a golden statue of you |

**Buddy the dog** follows you everywhere (and waits while you ride the train or cable car). Press `G` or the 🐶 button and he sniffs out the nearest buried gold on the island you're on, digs it up and brings it back. 13 nuggets are hidden across Cloud Island and the outer islands. Press `E` near him to pet him.

The AI Learning Lab lessons:

| Lesson | Hands-on part |
| --- | --- |
| AI Agents | The perceive → think → act → observe loop, with a live readout from the drone; pick the right tools for an agent; a link to try SEM, a live AI companion |
| How this 3D world works | Scene, camera and renderer; switches that change the real island (wireframe, sun, fog, bloom, slow motion); live triangle and draw-call stats |
| Machine Learning | Click to add data points and train a logistic-regression model |
| Neural Networks | A live 2-2-1 network that solves XOR, plus how backpropagation works |
| Convolutional Networks | Draw on a pixel grid and run edge, outline and blur filters to see feature maps |

## The archipelago

Six outer islands float around Cloud Island. Each unlocks at a level (points come from exploring, playing and learning), and each has one purpose: it teaches a topic through a hands-on **trial**, and finishing it earns that island's certificate.

**The rule of the islands:** when you arrive on an island with a trial, the way home seals behind you (the bridge seal closes, the station won't let you board, and the map won't fast-travel you away). Complete the trial and it opens again. A quest card on the HUD shows the steps, **📜 Briefing** explains the island's purpose and what you'll learn, and **💡 Hint** gives up to three hints. Reloading the page doesn't escape a trial: you come back on that island.

| Island | Reached by | Unlocks | Purpose and trial | Certificate |
| --- | --- | --- | --- | --- |
| 🏇 Manipur Island | 🚆 Train from the east station | LV 3 | Manipuri heritage. **The Festival Lanterns**: six festival lanterns are scattered across the island (on the statue's pedestal, in a watch-hut on stilts in the lake, on the stable roof, on the lookout rocks, by the moon). Find them and hang each on its month stone of the 3D Meitei calendar (Meitei Mayek + English). Also: the Sagol Kangjei story at a bronze polo rider and pony polo. | Manipur Heritage |
| 🌲 Forest Island | 🌿 Living root bridge (west) | LV 4 | Machine learning in the field. **The Data Grove**: collect 10 labelled mushroom specimens (up a spiral stair on a giant tree, across a pond, inside a hollow log, onto a boulder via a bouncy mushroom, up a stump climb), grow a decision tree at the Learning Stump, and pass the forest test on 6 mushrooms the model has never seen. The specimens by the path suggest "red cap = poisonous", which fails the test: a built-in lesson on sampling bias and overfitting. | Field Data Scientist |
| 🏜️ Desert Island | 🛣️ Road bridge (north-east) | LV 6 | Algorithms. **The Lost Caravan**: three trial stones, each up something you climb. The Stone of Search (on top of a stepped pyramid): find the caravan's chest under one of 32 numbered mounds in at most 5 probes, each answering higher or lower (binary search: 2⁵ = 32). The Stone of Order (on Camel Rock, up stepping pillars): sort 6 crates by weight with a balance scale that compares neighbours (bubble sort needs at most 15 weighings). The Stone of Paths (up a watchtower): mark the fewest-step trail from the camp to the oasis, then the quickest once the old trail turns to quicksand, which halves your speed and costs 2. Answers are checked against BFS and Dijkstra's algorithm, run in code. | Algorithms Adventurer |
| 🌊 Water Island | 🚡 Cable car (south) | LV 8 | Networking: packets, DNS, the TCP handshake (adventure coming) | Network Navigator |
| 🏙️ City Island | 🚆 Train from the north station | LV 10 | Cloud architecture, learned by building (adventure coming) | Cloud City Architect |
| 🗿 Mysterious Island | 🌫️ Hidden stone bridge from Forest Island | LV 12 + a riddle | Cybersecurity escape (adventure coming) | Cyber Guardian |

The Forest's mushrooms and their rule are invented for the lesson, and the game says so.

**Certificates:** 15 certificates are earned automatically (12 are available now, including Manipur Heritage, Field Data Scientist and Algorithms Adventurer; the rest arrive with each island's adventure). Open them with the 🎓 button or `K`; a gold badge counts new ones. Each certificate shows the visitor's name, the skills practised, the issue date, a certificate ID and a QR code that opens its public check page. Earning 10 unlocks the Grand Certificate.

Each certificate opens in a share sheet with a preview and these buttons:
- **Post on LinkedIn**: copies a ready-made post (editable in the sheet), saves the certificate image and opens LinkedIn's post box, where the visitor attaches the image and posts.
- **Add to profile**: opens LinkedIn's "Add licence or certification" form, already filled in.
- **Download image**, **Copy image** (to paste into a post) and **Copy check link**.
- **Share…**: the phone's own share menu (with the image) where the browser supports it. The check link (also LinkedIn's "credential URL") points to [`verify.html`](verify.html). It shows the certificate itself and confirms the ID matches the name, certificate and date. The visitor reviews and saves everything on LinkedIn themselves. The certificates say clearly that they are interactive-learning awards, not accredited qualifications.

**Explorer snapshot** (📸 button or `P`): a 1600×900 picture of your current view, or a selfie with Buddy. It shows your name, level, points, progress to the next level, challenges, certificates, islands, zones, gold and achievements, plus a QR code back to the island. It opens in the same share sheet.

QR codes are drawn by [`js/qr.js`](js/qr.js), a small dependency-free generator. Certificate definitions live in [`js/certs.js`](js/certs.js) and the image in [`js/cert-image.js`](js/cert-image.js).

**Manipur Island sources:** month and weekday names in Meitei Mayek and the festival days follow Wikipedia's *Meitei calendar* article. The calendar is lunar, so the Gregorian spans shown are approximate and shift each year. The Sagol Kangjei story follows Wikipedia's *Sagol Kangjei* and *Marjing Polo Statue* articles. Meitei Mayek text uses Google's Noto Sans Meetei Mayek font.

Game features:
- An optional explorer name (or Guest) on the start screen. It shows on the HUD, as a tag above the robot, and in messages. It's stored only in the visitor's browser and can be changed in Help (`H`).
- A points counter, levels and titles
- 24 challenges (8 activities, 3 Brain Arena challenges, 5 lessons, 4 on Manipur Island, 1 on Forest Island, 1 on Desert Island and 2 with Buddy the dog), each with a celebration (confetti, fireworks, fanfare) when completed:
  - ride the bicycle 150 m
  - jump the stunt ramp on the motorbike
  - shoot 3 baskets
  - keep jumping for 5 seconds
  - find 6 hidden gems
  - climb Snow Peak
  - wade into the lagoon
  - visit Thoubal
  - solve 3 maths and 3 programming puzzles
  - solve the flying Rubik's Cube
  - finish each of the 5 AI Learning Lab lessons
  - walk all 12 months of the Meitei calendar
  - finish the Sagol Kangjei story and quiz
  - score 3 goals in pony polo
  - Manipur trial: hang the 6 festival lanterns
  - Forest trial: pass the forest test
  - Desert trial: find the lost caravan
  - fetch 10 gold nuggets with Buddy
  - build all 3 golden crafts
- Bonus points pop up for orbs, gems, baskets, stunts and new zones
- Quests: 13 zones and 7 Skill Orbs
- 7 achievements, including "Island Champion" (every challenge) and "Speedcuber" (a full 20-move scramble)
- Kickable "cloud service" crates
- A bounce pad up to a secret sky island
- A minimap, plus a full map with fast travel

Progress is saved in the visitor's browser.

There is also a **Classic view** (📄 button or `C`): a plain scrollable resume for recruiters and screen readers. It also appears if WebGL is unavailable.

## Run locally

The site is plain static files with no build step. Browsers block ES modules on `file://`, so serve the folder:

```bash
python -m http.server 5173
```

Then open http://localhost:5173.

## How the code is organised (and why the page stays light)

The page starts with only what Cloud Island itself needs. Everything else is a separate module, downloaded the first time it's used:

| Loaded | Modules |
| --- | --- |
| At startup | `main.js`, `world.js` and the main island's parts, `player.js`, `ui.js`, `data.js`, `archipelago.js` (island bases, bridges, transports, gates, seals), `islands/manager.js` |
| When you open one | `lessons.js` (the AI Learning Lab lessons), `puzzles.js` (Brain Arena) |
| When you view a certificate or take a snapshot | `cert-image.js`, `qr.js`, `share.js`, `snapshot.js` |
| When an island is unlocked and you come near (or board its transport) | `islands/kit.js` (shared climbing pieces), then that island's own module: `islands/manipur.js`, `islands/forest.js`, `islands/desert.js`, … |

Until an island's module has loaded, the island hides in mist. On a new visitor's first load, our own JavaScript is about 364 KB instead of the 522 KB it would be with everything up front, and Three.js uses its minified build (691 KB instead of 1.3 MB).

**Adding an island adventure:** give the island a `trial`, `task` and `cert` in `ISLANDS` ([`js/archipelago.js`](js/archipelago.js)), add the task to `TASKS` ([`js/data.js`](js/data.js)) and let the certificate check it ([`js/certs.js`](js/certs.js)). Then write `js/islands/<id>.js`: its default export receives a kit (scene, world, a local frame, `data()` save slot, `progress`, `reward`, `solve()`, …) and returns `{ trial, title, mission, hints, quest(), update(), interact(), handleClick() }`. [`js/islands/forest.js`](js/islands/forest.js) is the reference.

## Edit the content

All text lives in [`js/data.js`](js/data.js): profile, experience, projects, skills, education, certifications and publications. The 3D signs, panels, map and classic view are all generated from it.

## Deploy

This is a static site with no build step or server code. Upload the folder as-is to any static host (Hostinger shared hosting, GitHub Pages, Netlify, Vercel, Cloudflare Pages).

### Hostinger shared hosting, deployed from GitHub

1. Push this folder to a GitHub repository. `.gitignore` keeps PDFs and local tooling out.
2. In hPanel, open your website, go to **Advanced → Git**, and add the repository:
   - **Repository:** `https://github.com/<you>/<repo>.git` for a public repo. For a private repo, use the SSH address and add the SSH key shown in hPanel to GitHub (**repo → Settings → Deploy keys**).
   - **Branch:** `main`.
   - **Directory:** leave empty to deploy into `public_html`. The folder must be empty, so remove Hostinger's default files first.
3. Click **Deploy**.
4. Turn on **Auto deployment** and paste the webhook URL hPanel gives you into GitHub (**repo → Settings → Webhooks**). Every push now updates the site.
5. Make sure the free SSL certificate is active.

`.htaccess` handles the rest: it forces HTTPS, serves the JavaScript modules correctly, makes browsers pick up new versions after each deploy, and hides the deployed `.git` folder.

Three.js loads from jsDelivr (pinned to `three@0.170.0`) and fonts from Google Fonts, so the site needs internet access.

## Controls

`WASD`/arrows move · `Shift` sprint · `Space` jump (double jump) · `E` interact · drag to look · wheel to zoom · `M` map · `G` send Buddy for gold · `K` certificates · `P` snapshot · `C` classic view · `H` help · `Esc` close.

Rubik's Cube: `U` `D` `L` `R` `F` `B` turn a face clockwise, `Shift` + letter turns it back, `Ctrl+Z` undo, `Esc` exit. The on-screen buttons do the same.

Riding: `W`/`S` throttle and brake · `A`/`D` steer · `Shift` boost · `E` get off. On the pony, `Space` swings the polo mallet. Basketball: take a ball from the rack, face the hoop, press `E` to shoot.

On phones: a joystick to move, drag to look, and buttons for jump and interact.

## Editing the puzzles

Puzzles live in [`js/puzzles.js`](js/puzzles.js). Each stores `hash: hashAnswer('<answer>')` rather than the answer itself. To add one, compute the hash in the browser console:

```js
(await import('/js/puzzles.js')).hashAnswer('42')
```

## Editing the challenges

Challenges (titles, hints, points, goals) live in `TASKS` in [`js/data.js`](js/data.js). Open the site with `?debug` to get `window.__island` in the browser console (player, world, islands, `step(seconds)`, `shot(view)` to render a 1600×900 frame) for testing.

## Map data

The India outline is DataMeet's [`india-composite`](https://github.com/datameet/maps/tree/master/Country), which follows the official boundary of India as per the Survey of India (CC-0). The Manipur outline is from DataMeet's state boundaries ([MIT](https://github.com/datameet/maps/blob/master/LICENSE)). Both are simplified into [`js/india.js`](js/india.js). The journey stops are in `JOURNEY` in [`js/data.js`](js/data.js).

