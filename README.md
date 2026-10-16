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

Six outer islands float around Cloud Island. Each unlocks at a level (points come from exploring, playing and learning):

| Island | Reached by | Unlocks | Adventure |
| --- | --- | --- | --- |
| 🏇 Manipur Island | 🚆 Train from the east station | LV 3 | A 3D Meitei calendar ring (month names in Meitei Mayek + English, festivals, a moon cycling through its phases), the story of Sagol Kangjei at a bronze polo rider, a playable pony-polo ground, and a Loktak-style lake with phumdis and a Sangai |
| 🌲 Forest Island | 🌿 Living root bridge (west) | LV 4 | Machine learning in the field (coming) |
| 🏜️ Desert Island | 🛣️ Road bridge (north-east) | LV 6 | Algorithms (coming) |
| 🌊 Water Island | 🚡 Cable car (south) | LV 8 | Networking (coming) |
| 🏙️ City Island | 🚆 Train from the north station | LV 10 | Learn by building a cloud city (coming) |
| 🗿 Mysterious Island | 🌫️ Hidden stone bridge from Forest Island | LV 12 + a riddle | Cybersecurity escape (coming) |

**Micro-certifications:** 15 certifications are earned automatically (10 are available now, including Manipur Heritage; the rest arrive with each island's adventure). Open them with the 🎓 button or `K`. Each one downloads as a PNG certificate with the visitor's name, date and a certificate ID. Earning 10 unlocks the Grand Certificate. Each one also has an **in** button that opens LinkedIn's "Add licence or certification" form already filled in (name, issuer, issue date, credential ID and credential URL), and a ↗ button to share it in a LinkedIn post. The credential URL points to [`verify.html`](verify.html), a public page that checks the certificate ID matches the name, certificate and date. The visitor reviews and saves everything on LinkedIn themselves. The certificates state clearly that they are interactive-learning awards, not accredited qualifications. Definitions live in [`js/certs.js`](js/certs.js), the islands in [`js/archipelago.js`](js/archipelago.js), and Manipur Island in [`js/manipur.js`](js/manipur.js).

**Manipur Island sources:** month and weekday names in Meitei Mayek and the festival days follow Wikipedia's *Meitei calendar* article. The calendar is lunar, so the Gregorian spans shown are approximate and shift each year. The Sagol Kangjei story follows Wikipedia's *Sagol Kangjei* and *Marjing Polo Statue* articles. Meitei Mayek text uses Google's Noto Sans Meetei Mayek font.

Game features:
- An optional explorer name (or Guest) on the start screen. It shows on the HUD, as a tag above the robot, and in messages. It's stored only in the visitor's browser and can be changed in Help (`H`).
- A points counter, levels and titles
- 21 challenges (8 activities, 3 Brain Arena challenges, 5 lessons, 3 on Manipur Island and 2 with Buddy the dog), each with a celebration (confetti, fireworks, fanfare) when completed:
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

`WASD`/arrows move · `Shift` sprint · `Space` jump (double jump) · `E` interact · drag to look · wheel to zoom · `M` map · `G` send Buddy for gold · `K` certificates · `C` classic view · `H` help · `Esc` close.

Rubik's Cube: `U` `D` `L` `R` `F` `B` turn a face clockwise, `Shift` + letter turns it back, `Ctrl+Z` undo, `Esc` exit. The on-screen buttons do the same.

Riding: `W`/`S` throttle and brake · `A`/`D` steer · `Shift` boost · `E` get off. On the pony, `Space` swings the polo mallet. Basketball: take a ball from the rack, face the hoop, press `E` to shoot.

On phones: a joystick to move, drag to look, and buttons for jump and interact.

## Editing the puzzles

Puzzles live in [`js/puzzles.js`](js/puzzles.js). Each stores `hash: hashAnswer('<answer>')` rather than the answer itself. To add one, compute the hash in the browser console:

```js
(await import('/js/puzzles.js')).hashAnswer('42')
```

## Editing the challenges

Challenges (titles, hints, points, goals) live in `TASKS` in [`js/data.js`](js/data.js). Open the site with `?debug` to get `window.__island` in the browser console (player, world, `step(seconds)`) for testing.

## Map data

The India outline is DataMeet's [`india-composite`](https://github.com/datameet/maps/tree/master/Country), which follows the official boundary of India as per the Survey of India (CC-0). The Manipur outline is from DataMeet's state boundaries ([MIT](https://github.com/datameet/maps/blob/master/LICENSE)). Both are simplified into [`js/india.js`](js/india.js). The journey stops are in `JOURNEY` in [`js/data.js`](js/data.js).

