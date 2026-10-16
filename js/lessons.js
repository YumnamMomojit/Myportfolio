// Interactive mini-lessons for the AI Learning Lab:
// AI agents, how this Three.js world works, and machine learning.
import { esc } from './utils.js';

const CODE_SETUP = `const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1400);
const renderer = new THREE.WebGLRenderer({ antialias: true });

// a mesh = geometry (shape) + material (look)
const box = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 'orange' })
);
scene.add(box, new THREE.DirectionalLight('white', 2));

// the game loop: update the world, then draw it (~60× a second)
renderer.setAnimationLoop(() => {
  box.rotation.y += 0.01;
  renderer.render(scene, camera);
});`;

const CODE_PICK = `const raycaster = new THREE.Raycaster();
raycaster.setFromCamera(mouse, camera);        // a ray from the eye through the cursor
const hit = raycaster.intersectObjects(clickables, true)[0];
if (hit) openPanel(hit.object);                 // the first thing the ray touches`;

export function createLessons(ctx) {
  const name = () => esc(ctx.explorer() || 'explorer');
  let cur = null; // { id, step, quiz: {}, cleanup: [] }

  // ------------------------------------------------------------ lesson content
  const LESSONS = {
    'learn:agent': {
      task: 'learn-agent', kicker: 'AI Agents', color: '#22d3ee',
      steps: [
        {
          title: 'What is an AI agent?',
          html: () => `<p class="lead">Hi ${name()}! An <b>AI agent</b> is a program that <b>perceives</b> its environment, <b>decides</b> what to do and <b>acts</b> to reach a goal — again and again, in a loop.</p>
            <p>A chatbot only answers your message. An agent can take <b>several steps on its own</b>: look things up, call tools, check the result and try again until the goal is done.</p>
            <div class="callout">🛸 Look around the lab: the little drone is a real (tiny) agent. Its goal is to collect glowing data cubes.</div>`,
        },
        {
          title: 'The agent loop',
          dock: true,
          html: () => `<div class="loop">
              <div><b>👁 Perceive</b><small>read sensors, messages, files, web pages</small></div><span>→</span>
              <div><b>💭 Think</b><small>reason and plan the next step (often an LLM)</small></div><span>→</span>
              <div><b>⚡ Act</b><small>use a tool: move, search, run code, send email</small></div><span>→</span>
              <div><b>🔁 Observe</b><small>check the result, then loop again</small></div>
            </div>
            <p>Watch the drone right now — this line updates live from the 3D world:</p>
            <p class="live-box" id="agent-live">…</p>
            <p class="muted">Its sensor cone is what it can "see". When it spots a cube it <b>thinks</b> (draws a planned path), then <b>acts</b> (flies there). Walk close and it will even notice <i>you</i>.</p>`,
          mount: (el, done) => {
            const tick = () => {
              const A = ctx.agent();
              const live = el.querySelector('#agent-live');
              if (A && live) live.innerHTML = `<b>${esc(A.state)}</b> — ${esc(A.detail)} · cubes collected: <b>${A.collected}</b>`;
            };
            tick();
            const iv = setInterval(tick, 250);
            done(() => clearInterval(iv));
          },
        },
        {
          title: 'What an LLM agent is made of',
          html: () => `<div class="parts">
              <div><b>🧠 Model</b><small>the "brain" — a large language model that reasons and decides</small></div>
              <div><b>🧰 Tools</b><small>APIs it may call: search, databases, code runners, email, cloud services</small></div>
              <div><b>🗂 Memory</b><small>short-term (the conversation) and long-term (e.g. a vector database for RAG)</small></div>
              <div><b>🗺 Planning</b><small>breaking a big goal into small steps, and re-planning when a step fails</small></div>
              <div><b>🛡 Guardrails</b><small>limits, permissions and human approval for risky actions</small></div>
            </div>
            <p class="muted">Example: "Book a meeting with my team" → read calendars (tool) → find a free slot (think) → send invites (tool) → confirm (observe).</p>
            <div class="callout">🤖 Want to chat with a live AI companion? Try <a href="https://live.semdok.com" target="_blank" rel="noopener noreferrer"><b>SEM — AI Companion</b> by Semdok ↗</a></div>`,
        },
        {
          title: 'Build your own agent',
          html: () => `<p class="lead">Goal: <i>"Every morning, summarise yesterday's AWS bill and email it to me."</i></p>
            <p>Which tools should this agent be allowed to use? Pick only what it needs — giving agents extra tools is a security risk.</p>
            <div class="tools" id="tools">
              ${[['cost', '💰 AWS Cost Explorer API'], ['email', '✉️ Email sender'], ['calc', '🧮 Calculator / code runner'], ['weather', '🌦 Weather API'], ['image', '🎨 Image generator'], ['delete', '🗑 Delete cloud resources']]
                .map(([v, l]) => `<label><input type="checkbox" value="${v}"> ${l}</label>`).join('')}
            </div>
            <button class="btn small primary" data-agent-check>Check my agent</button>
            <p class="feedback" id="agent-feedback" aria-live="polite"></p>`,
        },
      ],
      quiz: [
        { q: 'What makes an AI agent different from a simple chatbot?', options: ['It can take actions with tools over several steps', 'It always uses a bigger model', 'It never makes mistakes'], answer: 0, why: 'Agents loop: perceive → think → act → observe, using tools to change things.' },
        { q: 'In the agent loop, what comes right after "Act"?', options: ['Shut down', 'Observe the result', 'Retrain the model'], answer: 1, why: 'Checking the result lets the agent decide its next step — just like the drone scanning again.' },
        { q: 'Why give an agent only the tools it needs?', options: ['It runs faster with fewer tools', 'To limit what can go wrong (least privilege)', 'Tools cost money per click'], answer: 1, why: 'Least privilege: an agent that cannot delete resources cannot delete them by mistake.' },
      ],
    },

    'learn:three': {
      task: 'learn-three', kicker: 'How this 3D world works', color: '#a78bfa',
      steps: [
        {
          title: 'Three.js in one minute',
          html: () => `<p class="lead">Everything on this island — the robot, waterfall, snow, India map — is drawn by <b>Three.js</b>, a JavaScript library that talks to your graphics card through <b>WebGL</b>.</p>
            <p>There is no game engine and no downloaded 3D models: every tree, cloud and mountain is created in code from simple shapes.</p>
            <div class="stats-live" id="three-stats">…</div>`,
          mount: (el, done) => {
            const tick = () => {
              const s = ctx.world.stats();
              const box = el.querySelector('#three-stats');
              if (box) box.innerHTML = `<div><b>${s.objects.toLocaleString()}</b><small>objects in the scene</small></div><div><b>${s.triangles.toLocaleString()}</b><small>triangles this frame</small></div><div><b>${s.calls}</b><small>draw calls</small></div><div><b>${s.fps}</b><small>frames per second</small></div>`;
            };
            tick();
            const iv = setInterval(tick, 500);
            done(() => clearInterval(iv));
          },
        },
        {
          title: 'Scene, camera, renderer',
          html: () => `<div class="parts three">
              <div><b>🎬 Scene</b><small>the container holding every object, light and effect</small></div>
              <div><b>🎥 Camera</b><small>the viewpoint — here a PerspectiveCamera that follows the robot</small></div>
              <div><b>🖌 Renderer</b><small>draws the scene from the camera into the &lt;canvas&gt;, about 60 times a second</small></div>
            </div>
            <pre class="code"><code>${esc(CODE_SETUP)}</code></pre>`,
        },
        {
          title: 'Play with the real world',
          dock: true,
          html: () => `<p class="lead">A <b>mesh</b> = <b>geometry</b> (the triangles) + <b>material</b> (colour, shine, glow). Lights and shadows make it look solid. Try these switches — they change the island behind this window, live:</p>
            <div class="toggles">
              <button class="toggle" data-toggle="wire" aria-pressed="false">🕸 Wireframe (show the triangles)</button>
              <button class="toggle" data-toggle="sun" aria-pressed="true">☀️ Sun light &amp; shadows</button>
              <button class="toggle" data-toggle="fog" aria-pressed="true">🌫 Fog (depth haze)</button>
              <button class="toggle" data-toggle="bloom" aria-pressed="true">✨ Bloom (glow effect — pauses in wireframe)</button>
              <button class="toggle" data-toggle="slow" aria-pressed="false">🐢 Slow motion (time × 0.2)</button>
            </div>
            <p class="muted">Everything switches back when you close this lesson.</p>`,
          mount: (el, done) => {
            const sync = () => el.querySelectorAll('[data-toggle]').forEach((b) => b.setAttribute('aria-pressed', String(ctx.world.get(b.dataset.toggle))));
            sync();
            done(() => ctx.world.resetAll());
          },
        },
        {
          title: 'The game loop & clicking things',
          html: () => `<p>Every frame the game: <b>reads your keys</b> → <b>moves the robot</b> (gravity, jumping, bumping into colliders) → <b>animates</b> water, snow and the drone → <b>moves the camera</b> → <b>renders</b>.</p>
            <p>When you click an object, a <b>Raycaster</b> shoots an invisible ray from the camera through your cursor and reports the first thing it hits:</p>
            <pre class="code"><code>${esc(CODE_PICK)}</code></pre>
            <p class="muted">The water and waterfalls are small <b>GLSL shaders</b> — programs that run on the graphics card for every pixel.</p>`,
        },
      ],
      quiz: [
        { q: 'Which three things does every Three.js app need?', options: ['HTML, CSS and JSON', 'A scene, a camera and a renderer', 'A mesh, a light and fog'], answer: 1, why: 'The renderer draws the scene as seen from the camera.' },
        { q: 'A mesh is made of…', options: ['geometry + material', 'pixels + sound', 'a camera + a light'], answer: 0, why: 'Geometry is the shape (triangles); material is how its surface looks.' },
        { q: 'How does the game know which object you clicked?', options: ['It guesses from the mouse speed', 'CSS :hover', 'A Raycaster casts a ray through the cursor'], answer: 2, why: 'The first object the ray intersects is the one under your cursor.' },
      ],
    },

    'learn:ml': {
      task: 'learn-ml', kicker: 'Machine Learning', color: '#f472b6',
      steps: [
        {
          title: 'What is machine learning?',
          html: () => `<p class="lead">Normal programs follow rules a person wrote. <b>Machine learning</b> lets a computer <b>learn the rules from examples</b>.</p>
            <p>Show a spam filter thousands of emails marked "spam" or "not spam" and it learns which patterns give spam away — no one writes those rules by hand.</p>
            <div class="parts">
              <div><b>📊 Features</b><small>the inputs — e.g. number of links, certain words</small></div>
              <div><b>🏷 Labels</b><small>the right answers in the examples — spam / not spam</small></div>
              <div><b>🏋️ Training</b><small>adjusting the model's numbers (weights) to make fewer mistakes</small></div>
              <div><b>🔮 Prediction</b><small>using the trained model on new, unseen data</small></div>
            </div>`,
        },
        {
          title: 'Three ways machines learn',
          html: () => `<div class="parts">
              <div><b>👩‍🏫 Supervised</b><small>learn from labelled examples (spam filters, fraud detection, face recognition)</small></div>
              <div><b>🧩 Unsupervised</b><small>find structure without labels (grouping customers into clusters)</small></div>
              <div><b>🎮 Reinforcement</b><small>learn by trial, error and <b>reward</b> — a bit like you earning points on this island!</small></div>
            </div>
            <p class="muted">Yumnam's own ML projects include credit-card fraud detection (precision 86%, recall 78%), drowsiness detection and face-recognition attendance. <b>Precision</b> = how many flagged cases were really fraud; <b>recall</b> = how many real frauds were caught.</p>`,
        },
        {
          title: 'Your turn: train a model',
          html: () => `<p>Each dot is an example with two features (x, y) and a label: <b class="pink">pink</b> or <b class="blue">blue</b>. Click to add dots, then press <b>Train</b> and watch a logistic-regression model learn a line that separates them.</p>
            <div class="ml">
              <canvas id="ml-canvas" width="480" height="300" aria-label="Machine learning playground"></canvas>
              <div class="ml-side">
                <div class="seg"><button class="btn small active" data-ml-class="1">Add pink</button><button class="btn small" data-ml-class="0">Add blue</button></div>
                <button class="btn small primary" data-ml="train">🏋️ Train</button>
                <button class="btn small" data-ml="reset">↺ Reset</button>
                <div class="ml-stats" id="ml-stats">Not trained yet</div>
              </div>
            </div>
            <p class="muted">Tip: put a few pink dots deep inside the blue area and train again — a straight line can't fit every pattern. That's why deeper models (neural networks) exist.</p>`,
          mount: (el, done) => mountPlayground(el, done),
        },
      ],
      quiz: [
        { q: 'During training, a model tries to…', options: ['memorise the source code', 'minimise its error (loss) on the examples', 'collect more points'], answer: 1, why: 'Training nudges the weights so the loss — the size of its mistakes — goes down.' },
        { q: 'A spam filter learning from emails labelled spam / not spam is…', options: ['supervised learning', 'unsupervised learning', 'reinforcement learning'], answer: 0, why: 'It learns from examples that come with the right answers (labels).' },
        { q: 'In your playground, what were x and y?', options: ['labels', 'features', 'rewards'], answer: 1, why: 'x and y are the inputs (features); pink/blue are the labels.' },
      ],
    },
    'learn:nn': {
      task: 'learn-nn', kicker: 'Neural Networks', color: '#fbbf24',
      steps: [
        {
          title: 'From one neuron to a network',
          html: () => `<p class="lead">A <b>neural network</b> is many tiny calculators — <b>neurons</b> — connected in <b>layers</b>.</p>
            <div class="neuron-eq"><span>inputs</span> × <span>weights</span> + <span>bias</span> → <span>activation</span> → output</div>
            <p>Each neuron multiplies its inputs by <b>weights</b> (how much it cares about each one), adds a <b>bias</b>, and passes the sum through an <b>activation function</b> such as ReLU or sigmoid. Its output becomes an input for the next layer.</p>
            <div class="parts three">
              <div><b>🔢 Input layer</b><small>the raw features — pixels, words, sensor readings</small></div>
              <div><b>🕸 Hidden layers</b><small>combine simple patterns into more complex ones</small></div>
              <div><b>🎯 Output layer</b><small>the answer — a class, a number, the next word</small></div>
            </div>
            <p class="muted"><b>Deep learning</b> simply means networks with many hidden layers — the technology behind ChatGPT-style models, image recognition and speech assistants.</p>`,
        },
        {
          title: 'Watch a network think',
          html: () => `<p>This tiny network solves <b>XOR</b> ("one or the other, but not both"). A single straight line — like your ML playground — <i>cannot</i> do this; the hidden layer makes it possible. Flip the inputs:</p>
            <div class="xor">
              <svg id="xor-svg" viewBox="0 0 460 260" role="img" aria-label="A 2-2-1 neural network computing XOR"></svg>
              <div class="xor-side">
                <div class="seg"><button class="btn small" data-xor="a">Input A: 0</button><button class="btn small" data-xor="b">Input B: 0</button></div>
                <table class="truth" id="xor-table"></table>
                <p class="muted">Hidden neuron 1 learned "A <b>or</b> B", hidden neuron 2 learned "<b>not both</b>", and the output combines them with "<b>and</b>".</p>
              </div>
            </div>`,
          mount: (el, done) => mountXor(el, done),
        },
        {
          title: 'How networks learn: backpropagation',
          html: () => `<div class="loop">
              <div><b>➡️ Forward pass</b><small>feed an example through and get a prediction</small></div><span>→</span>
              <div><b>📏 Loss</b><small>measure how wrong it was</small></div><span>→</span>
              <div><b>⬅️ Backpropagation</b><small>work out how much each weight caused the error</small></div><span>→</span>
              <div><b>🔧 Update</b><small>nudge every weight a little (gradient descent), repeat</small></div>
            </div>
            <p>Repeat this over thousands of examples (<b>epochs</b>) and the weights settle into values that work — like the ones in the XOR network you just played with.</p>
            <pre class="code"><code>${esc(`# A small network in Keras (TensorFlow) — tools Yumnam teaches with
model = keras.Sequential([
    keras.layers.Dense(16, activation="relu", input_shape=(2,)),   # hidden layer
    keras.layers.Dense(1, activation="sigmoid"),                   # output: 0..1
])
model.compile(optimizer="adam", loss="binary_crossentropy", metrics=["accuracy"])
model.fit(X, y, epochs=50)   # forward pass + backpropagation, 50 times`)}</code></pre>`,
        },
      ],
      quiz: [
        { q: 'What does a single neuron do with its inputs?', options: ['Stores them in a database', 'Weights them, adds a bias and applies an activation', 'Sorts them alphabetically'], answer: 1, why: 'Weighted sum + bias, then an activation function such as ReLU or sigmoid.' },
        { q: 'Why did XOR need a hidden layer?', options: ['A single straight line cannot separate XOR', 'XOR has too many inputs', 'Hidden layers make training faster'], answer: 0, why: 'Hidden layers let a network build curved / combined decision boundaries.' },
        { q: 'What does backpropagation compute?', options: ['The colour of each neuron', 'How much each weight contributed to the error', 'The number of layers to add'], answer: 1, why: 'Those gradients tell gradient descent which way to nudge each weight.' },
      ],
    },

    'learn:cnn': {
      task: 'learn-cnn', kicker: 'Convolutional Neural Networks', color: '#4ade80',
      steps: [
        {
          title: 'How AI sees images',
          html: () => `<p class="lead">To a computer an image is just a grid of numbers (pixels). A <b>Convolutional Neural Network (CNN)</b> looks at it the way you might with a magnifying glass: a small <b>filter</b> slides across the picture, checking each little patch for a pattern.</p>
            <div class="loop">
              <div><b>🔍 Convolution</b><small>small filters (e.g. 3×3) detect edges, corners and textures</small></div><span>→</span>
              <div><b>⚡ Activation</b><small>ReLU keeps the strong responses</small></div><span>→</span>
              <div><b>🗜 Pooling</b><small>shrinks the map, keeping the strongest signals</small></div><span>→</span>
              <div><b>🎯 Classifier</b><small>dense layers turn the features into an answer: "cat", "face", "7"</small></div>
            </div>
            <p class="muted">Because the same filter is reused everywhere, a CNN finds an edge whether it is in the top-left corner or the middle — with far fewer weights than a normal network.</p>`,
        },
        {
          title: 'Your turn: run a filter',
          html: () => `<p>Draw on the 10×10 image (click or drag), choose a filter, and watch the <b>feature map</b> light up where that pattern appears. The gold square shows the filter sliding over the image.</p>
            <div class="conv">
              <div><small>Input image</small><canvas id="conv-in" width="220" height="220" aria-label="Drawable 10 by 10 pixel image"></canvas></div>
              <div class="conv-mid"><small>3×3 filter</small><table class="kernel" id="conv-kernel"></table>
                <div class="seg col">
                  <button class="btn small active" data-kernel="vertical">Vertical edges</button>
                  <button class="btn small" data-kernel="horizontal">Horizontal edges</button>
                  <button class="btn small" data-kernel="outline">Outline</button>
                  <button class="btn small" data-kernel="blur">Blur</button>
                </div>
                <button class="btn small" data-conv="clear">Clear image</button>
              </div>
              <div><small>Feature map (8×8)</small><canvas id="conv-out" width="176" height="176" aria-label="Convolution output"></canvas></div>
            </div>
            <p class="muted"><span class="pink">Pink</span> = strong positive response, <span class="blue">blue</span> = strong negative response. A real CNN <i>learns</i> its filters during training instead of us choosing them.</p>`,
          mount: (el, done) => mountConv(el, done),
        },
        {
          title: 'Deeper layers, bigger ideas',
          html: () => `<div class="parts three">
              <div><b>Layer 1</b><small>edges and colour blobs</small></div>
              <div><b>Middle layers</b><small>corners, circles, textures, eyes, wheels</small></div>
              <div><b>Deep layers</b><small>whole objects — faces, cars, handwritten digits</small></div>
            </div>
            <p>CNNs power face recognition, medical scans, self-driving cars and photo search. Yumnam has used them in projects such as <b>face-recognition attendance</b>, <b>driver drowsiness detection</b>, <b>video summarisation</b> (CNN + RNN) and <b>text-to-image generation</b>.</p>
            <pre class="code"><code>${esc(`model = keras.Sequential([
    keras.layers.Conv2D(32, (3, 3), activation="relu", input_shape=(28, 28, 1)),
    keras.layers.MaxPooling2D((2, 2)),
    keras.layers.Conv2D(64, (3, 3), activation="relu"),
    keras.layers.MaxPooling2D((2, 2)),
    keras.layers.Flatten(),
    keras.layers.Dense(10, activation="softmax"),   # digits 0-9
])`)}</code></pre>`,
        },
      ],
      quiz: [
        { q: 'What does a convolution filter do?', options: ['Slides over the image looking for a small pattern', 'Changes the image file format', 'Deletes noisy pixels'], answer: 0, why: 'Each filter scans every patch and responds where its pattern appears, producing a feature map.' },
        { q: 'What is pooling for?', options: ['Adding more colours', 'Shrinking feature maps while keeping the strongest signals', 'Training faster on the GPU only'], answer: 1, why: 'Max pooling keeps the biggest value in each small window, making the network smaller and more robust.' },
        { q: 'What do the early layers of a CNN usually detect?', options: ['Whole faces', 'Simple edges and blobs', 'The image caption'], answer: 1, why: 'Simple features first; deeper layers combine them into complex shapes and objects.' },
      ],
    },
    'learn:polo': {
      task: 'polo-story', kicker: 'Manipur heritage · Sagol Kangjei', color: '#fb923c',
      steps: [
        {
          title: 'A game of gods and kings',
          html: () => `<p class="lead"><b>Sagol Kangjei</b> — literally "horse hockey" (<i>sagol</i> = pony, <i>kangjei</i> = stick) — is the traditional polo of the Meitei people of Manipur, and the game that modern polo grew from.</p>
            <div class="parts three">
              <div><b>🌙 Legend</b><small>Meitei tradition says the gods played it first, led by <b>Marjing</b> — the Meitei god of horses and polo — and Thangjing.</small></div>
              <div><b>📜 Chronicle</b><small>The <i>Kangjeirol</i> text says it was played in the time of King <b>Kangba</b>.</small></div>
              <div><b>👑 Rules</b><small>King <b>Khagemba</b> (1597–1652) popularised the game and revised its rules.</small></div>
            </div>
            <p class="muted">The bronze rider in front of you is inspired by the Marjing Polo Statue in Heingang, Imphal East — unveiled in January 2023 as the world's tallest statue of a polo player.</p>`,
        },
        {
          title: 'Pony, mallet and ball',
          html: () => `<div class="parts three">
              <div><b>🐎 The Manipuri pony</b><small>Small (about 11–13 hands), quick and sure-footed — bred for exactly this game.</small></div>
              <div><b>🏑 The kangjei</b><small>A long mallet of seasoned cane with an angled wooden head.</small></div>
              <div><b>⚪ The ball</b><small>Made from bamboo root, roughly 10 cm across.</small></div>
            </div>
            <p>Players traditionally wear short-sleeved jackets, white dhotis and a turban (<i>kokyet</i>). Ponies wear guards and decorations too.</p>`,
        },
        {
          title: 'How the game is played',
          html: () => `<p class="lead"><b>Seven players a side</b> — traditionally a northern and a southern team.</p>
            <div class="loop">
              <div><b>🏇 Ride</b><small>chase the ball at full gallop</small></div><span>→</span>
              <div><b>🏑 Strike</b><small>hit it with the cane mallet</small></div><span>→</span>
              <div><b>🏁 Score</b><small>drive it over the opponents' end line</small></div>
            </div>
            <p>There are <b>no goal posts</b> in Sagol Kangjei: a goal is scored when the ball crosses the end line. That is exactly how the ground here works — ride the pony at the stable, press <b>Space</b> to swing and score 3 goals.</p>`,
        },
        {
          title: 'From Imphal to the world',
          html: () => `<p>The <b>Imphal Polo Ground</b> is often called the oldest polo ground in the world, and there is an inner polo ground inside Kangla Fort.</p>
            <div class="parts three">
              <div><b>1850s</b><small>British officer Joseph Ford Sherer — later called the "father of modern polo" — learnt and played the game in Manipur.</small></div>
              <div><b>1859</b><small>Tea planters who learnt from Manipuri players founded the Silchar (Cachar) polo club.</small></div>
              <div><b>1862</b><small>The Calcutta Polo Club followed — and from there the game spread across the world.</small></div>
            </div>
            <p class="muted">Today Manipur still hosts Sagol Kangjei matches and international polo tournaments, and works to protect the Manipuri pony.</p>`,
        },
      ],
      quiz: [
        { q: 'What does "sagol" mean in Sagol Kangjei?', options: ['Pony', 'Ball', 'Field'], answer: 0, why: 'Sagol is the pony; kangjei is the stick — "horse hockey".' },
        { q: 'How many players does each side have?', options: ['Four', 'Seven', 'Eleven'], answer: 1, why: 'Traditional Sagol Kangjei is played seven a side.' },
        { q: 'How is a goal scored?', options: ['Hitting the ball between two posts', 'Driving the ball over the end line', 'Touching the ball with the pony'], answer: 1, why: 'There are no goal posts: a goal is scored when the ball crosses the end line.' },
      ],
    },
  };

  // ------------------------------------------------------------ ML playground
  let mlTrained = false;
  function mountPlayground(el, done) {
    const cv = el.querySelector('#ml-canvas');
    const g = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    const seed = () => {
      const pts = [];
      for (let i = 0; i < 14; i++) pts.push({ x: -0.75 + Math.random() * 0.6, y: 0.1 + Math.random() * 0.7, c: 1 });
      for (let i = 0; i < 14; i++) pts.push({ x: 0.15 + Math.random() * 0.65, y: -0.8 + Math.random() * 0.7, c: 0 });
      return pts;
    };
    let pts = seed();
    let w1 = 0, w2 = 0, b = 0, epoch = 0, anim = 0, cls = 1;
    const sig = (z) => 1 / (1 + Math.exp(-z));
    const toPx = (x, y) => [((x + 1) / 2) * W, ((1 - y) / 2) * H];
    const metrics = () => {
      let loss = 0, ok = 0;
      for (const p of pts) {
        const q = Math.min(Math.max(sig(w1 * p.x + w2 * p.y + b), 1e-6), 1 - 1e-6);
        loss -= p.c ? Math.log(q) : Math.log(1 - q);
        if ((q > 0.5 ? 1 : 0) === p.c) ok++;
      }
      return { loss: loss / pts.length, acc: Math.round((ok / pts.length) * 100) };
    };
    const draw = () => {
      const cell = 12;
      for (let px = 0; px < W; px += cell) {
        for (let py = 0; py < H; py += cell) {
          const x = ((px + cell / 2) / W) * 2 - 1, y = 1 - ((py + cell / 2) / H) * 2;
          const q = epoch ? sig(w1 * x + w2 * y + b) : 0.5;
          g.fillStyle = `rgba(${Math.round(56 + (244 - 56) * q)},${Math.round(189 + (114 - 189) * q)},${Math.round(248 + (182 - 248) * q)},${epoch ? 0.22 : 0.08})`;
          g.fillRect(px, py, cell, cell);
        }
      }
      g.strokeStyle = 'rgba(148,163,184,0.25)';
      g.beginPath();
      g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.moveTo(0, H / 2); g.lineTo(W, H / 2);
      g.stroke();
      if (epoch && Math.abs(w2) > 1e-6) {
        const [x1, y1] = toPx(-1, (-b + w1) / w2), [x2, y2] = toPx(1, (-b - w1) / w2);
        g.strokeStyle = '#fde68a';
        g.lineWidth = 3;
        g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
        g.lineWidth = 1;
      }
      for (const p of pts) {
        const [x, y] = toPx(p.x, p.y);
        g.fillStyle = p.c ? '#f472b6' : '#38bdf8';
        g.strokeStyle = '#0b1020';
        g.lineWidth = 2;
        g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill(); g.stroke();
      }
      const m = metrics();
      el.querySelector('#ml-stats').innerHTML = epoch
        ? `Epoch <b>${epoch}</b><br>Loss <b>${m.loss.toFixed(3)}</b><br>Accuracy <b>${m.acc}%</b>`
        : `${pts.length} examples · not trained yet`;
    };
    const train = () => {
      cancelAnimationFrame(anim);
      let n = 0;
      const step = () => {
        for (let k = 0; k < 6; k++) {
          let g1 = 0, g2 = 0, gb = 0;
          for (const p of pts) {
            const e = sig(w1 * p.x + w2 * p.y + b) - p.c;
            g1 += e * p.x; g2 += e * p.y; gb += e;
          }
          const lr = 1.2 / pts.length;
          w1 -= lr * g1 * 4; w2 -= lr * g2 * 4; b -= lr * gb * 4;
          epoch++;
        }
        draw();
        if (++n < 60) anim = requestAnimationFrame(step);
        else if (!mlTrained) {
          mlTrained = true;
          ctx.sound('collect');
          const fb = el.querySelector('#ml-stats');
          fb.innerHTML += `<br><span class="good">Model trained! 🎉</span>`;
        }
      };
      step();
    };
    cv.addEventListener('click', (e) => {
      const r = cv.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 2 - 1, y = 1 - ((e.clientY - r.top) / r.height) * 2;
      pts.push({ x, y, c: cls });
      draw();
    });
    el.querySelectorAll('[data-ml-class]').forEach((btn) => btn.addEventListener('click', () => {
      cls = +btn.dataset.mlClass;
      el.querySelectorAll('[data-ml-class]').forEach((x) => x.classList.toggle('active', x === btn));
    }));
    el.querySelector('[data-ml="train"]').addEventListener('click', train);
    el.querySelector('[data-ml="reset"]').addEventListener('click', () => {
      cancelAnimationFrame(anim);
      pts = seed();
      w1 = w2 = b = 0;
      epoch = 0;
      draw();
    });
    draw();
    done(() => cancelAnimationFrame(anim));
  }

  // ------------------------------------------------------------ XOR network
  function mountXor(el, done) {
    const svg = el.querySelector('#xor-svg');
    const sig = (z) => 1 / (1 + Math.exp(-z));
    const inp = { a: 0, b: 0 };
    const N = { a: [60, 70], b: [60, 190], h1: [230, 70], h2: [230, 190], o: [400, 130] };
    const E = [['a', 'h1', 20], ['b', 'h1', 20], ['a', 'h2', -20], ['b', 'h2', -20], ['h1', 'o', 20], ['h2', 'o', 20]];
    const BIAS = { h1: -10, h2: 30, o: -30 };
    const fwd = (a, b) => {
      const h1 = sig(20 * a + 20 * b - 10), h2 = sig(-20 * a - 20 * b + 30);
      return { a, b, h1, h2, o: sig(20 * h1 + 20 * h2 - 30) };
    };
    const draw = () => {
      const v = fwd(inp.a, inp.b);
      const edge = ([f, t, w]) => {
        const [x1, y1] = N[f], [x2, y2] = N[t];
        const strength = v[f];
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${w > 0 ? '#f472b6' : '#38bdf8'}" stroke-width="${2 + strength * 5}" stroke-opacity="${0.25 + strength * 0.7}"/>
          <text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 6}" class="w">${w > 0 ? '+' : ''}${w}</text>`;
      };
      const node = (k, label) => {
        const [x, y] = N[k];
        const a = v[k];
        return `<circle cx="${x}" cy="${y}" r="30" fill="rgba(251,191,36,${0.12 + a * 0.85})" stroke="#fde68a" stroke-width="2"/>
          <text x="${x}" y="${y + 5}" class="val" style="fill:${a > 0.5 ? '#0b1020' : '#e2e8f0'}">${a.toFixed(2)}</text>
          <text x="${x}" y="${y + 50}" class="lbl">${label}${BIAS[k] !== undefined ? ` · bias ${BIAS[k]}` : ''}</text>`;
      };
      svg.innerHTML = E.map(edge).join('') + node('a', 'input A') + node('b', 'input B') + node('h1', 'hidden 1') + node('h2', 'hidden 2') + node('o', 'output');
      el.querySelector('[data-xor="a"]').textContent = `Input A: ${inp.a}`;
      el.querySelector('[data-xor="b"]').textContent = `Input B: ${inp.b}`;
      el.querySelector('#xor-table').innerHTML = '<tr><th>A</th><th>B</th><th>XOR</th><th>network</th></tr>' +
        [[0, 0], [0, 1], [1, 0], [1, 1]].map(([a, b]) => `<tr class="${a === inp.a && b === inp.b ? 'on' : ''}"><td>${a}</td><td>${b}</td><td>${a ^ b}</td><td>${fwd(a, b).o.toFixed(2)}</td></tr>`).join('');
    };
    el.querySelectorAll('[data-xor]').forEach((b) => b.addEventListener('click', () => {
      inp[b.dataset.xor] ^= 1;
      ctx.sound('pickup');
      draw();
    }));
    draw();
    done(() => {});
  }

  // ------------------------------------------------------------ convolution playground
  const KERNELS = {
    vertical: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]],
    horizontal: [[-1, -2, -1], [0, 0, 0], [1, 2, 1]],
    outline: [[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]],
    blur: [[1, 1, 1], [1, 1, 1], [1, 1, 1]].map((r) => r.map((x) => +(x / 9).toFixed(2))),
  };
  function mountConv(el, done) {
    const cin = el.querySelector('#conv-in'), cout = el.querySelector('#conv-out');
    const gi = cin.getContext('2d'), go = cout.getContext('2d');
    const START = ['..........', '.########.', '........#.', '.......#..', '......#...', '.....#....', '....#.....', '....#.....', '....#.....', '..........'];
    let img = START.map((r) => [...r].map((ch) => (ch === '#' ? 1 : 0)));
    let kname = 'vertical', scan = 0, painting = null;
    const conv = () => {
      const k = KERNELS[kname];
      const out = [];
      for (let r = 0; r < 8; r++) {
        out.push([]);
        for (let c = 0; c < 8; c++) {
          let s = 0;
          for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) s += img[r + i][c + j] * k[i][j];
          out[r].push(s);
        }
      }
      return out;
    };
    const draw = () => {
      const out = conv();
      const max = Math.max(1e-6, ...out.flat().map(Math.abs));
      const sr = Math.floor(scan / 8) % 8, sc = scan % 8;
      gi.clearRect(0, 0, 220, 220);
      for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
        gi.fillStyle = img[r][c] ? '#e2e8f0' : '#0f172a';
        gi.fillRect(c * 22 + 1, r * 22 + 1, 20, 20);
      }
      gi.strokeStyle = '#fbbf24';
      gi.lineWidth = 3;
      gi.strokeRect(sc * 22, sr * 22, 66, 66);
      go.clearRect(0, 0, 176, 176);
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const v = out[r][c] / max;
        go.fillStyle = v >= 0 ? `rgba(244,114,182,${0.08 + v * 0.92})` : `rgba(56,189,248,${0.08 - v * 0.92})`;
        go.fillRect(c * 22 + 1, r * 22 + 1, 20, 20);
      }
      go.strokeStyle = '#fbbf24';
      go.lineWidth = 3;
      go.strokeRect(sc * 22, sr * 22, 22, 22);
      el.querySelector('#conv-kernel').innerHTML = KERNELS[kname].map((row) => `<tr>${row.map((x) => `<td class="${x > 0 ? 'p' : x < 0 ? 'n' : ''}">${x}</td>`).join('')}</tr>`).join('');
    };
    const cell = (e) => {
      const r = cin.getBoundingClientRect();
      return [Math.floor(((e.clientY - r.top) / r.height) * 10), Math.floor(((e.clientX - r.left) / r.width) * 10)];
    };
    cin.addEventListener('pointerdown', (e) => {
      const [r, c] = cell(e);
      if (img[r]?.[c] === undefined) return;
      painting = img[r][c] ? 0 : 1;
      img[r][c] = painting;
      try { cin.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      draw();
    });
    cin.addEventListener('pointermove', (e) => {
      if (painting === null) return;
      const [r, c] = cell(e);
      if (img[r]?.[c] === undefined) return;
      img[r][c] = painting;
      draw();
    });
    const stop = () => (painting = null);
    cin.addEventListener('pointerup', stop);
    cin.addEventListener('pointercancel', stop);
    el.querySelectorAll('[data-kernel]').forEach((b) => b.addEventListener('click', () => {
      kname = b.dataset.kernel;
      el.querySelectorAll('[data-kernel]').forEach((x) => x.classList.toggle('active', x === b));
      ctx.sound('pickup');
      draw();
    }));
    el.querySelector('[data-conv="clear"]').addEventListener('click', () => {
      img = img.map((r) => r.map(() => 0));
      draw();
    });
    const iv = setInterval(() => {
      scan = (scan + 1) % 64;
      draw();
    }, 140);
    draw();
    done(() => clearInterval(iv));
  }

  // ------------------------------------------------------------ rendering
  function cleanup() {
    if (!cur) return;
    for (const fn of cur.cleanup) fn();
    cur.cleanup = [];
  }

  function render() {
    cleanup();
    const L = LESSONS[cur.id];
    const total = L.steps.length + 1;
    const onQuiz = cur.step === L.steps.length;
    const finished = ctx.isDone(L.task);
    const dots = Array.from({ length: total }, (_, i) => `<span class="${i === cur.step ? 'on' : i < cur.step ? 'past' : ''}"></span>`).join('');
    let html;
    if (onQuiz) {
      const allRight = L.quiz.every((_, qi) => cur.quiz[qi] === true);
      html = `<p class="lead">Quick quiz, ${name()} — answer all ${L.quiz.length} to finish the lesson${finished ? '' : ' and earn points'}.</p>
        ${L.quiz.map((q, qi) => `<div class="quiz ${cur.quiz[qi] === true ? 'right' : ''}">
          <p><b>${qi + 1}. ${esc(q.q)}</b></p>
          <div class="opts">${q.options.map((o, oi) => `<button class="opt ${cur.picked?.[qi] === oi ? (oi === q.answer ? 'yes' : 'no') : ''}" data-quiz="${qi}:${oi}" ${cur.quiz[qi] === true ? 'disabled' : ''}>${esc(o)}</button>`).join('')}</div>
          ${cur.quiz[qi] === true ? `<p class="why">✔ ${esc(q.why)}</p>` : cur.quiz[qi] === false ? '<p class="why bad">Not quite — try another answer.</p>' : ''}
        </div>`).join('')}
        ${allRight ? `<div class="callout done-callout">🎓 ${finished && !cur.justFinished ? 'You already completed this lesson — nice refresher!' : `Lesson complete, ${name()}!`}</div>` : ''}`;
    } else html = L.steps[cur.step].html();

    const body = ctx.UI.showRawPanel({
      kicker: `🎓 ${L.kicker} · ${onQuiz ? 'Quiz' : `Step ${cur.step + 1} of ${L.steps.length}`}`,
      title: onQuiz ? 'Check what you learned' : L.steps[cur.step].title,
      color: L.color,
      dock: !onQuiz && !!L.steps[cur.step].dock,
      html: `<div class="lesson-dots" aria-hidden="true">${dots}</div>${html}
        <div class="pager">
          ${cur.step > 0 ? '<button class="btn small" data-lesson="prev">← Back</button>' : '<span></span>'}
          ${onQuiz ? '<button class="btn small" data-lesson="close">Close</button>' : `<button class="btn small primary" data-lesson="next">${cur.step === L.steps.length - 1 ? 'Take the quiz →' : 'Next →'}</button>`}
        </div>`,
    });
    const step = L.steps[cur.step];
    if (!onQuiz && step.mount) step.mount(body, (fn) => cur.cleanup.push(fn));
  }

  return {
    has: (id) => id in LESSONS,
    open(id) {
      cleanup();
      cur = { id, step: 0, quiz: {}, picked: {}, cleanup: [] };
      render();
    },
    onClose() {
      cleanup();
      cur = null;
    },
    // handles clicks inside the panel; returns true when consumed
    handleClick(target) {
      if (!cur) return false;
      const L = LESSONS[cur.id];
      const nav = target.closest('[data-lesson]');
      if (nav) {
        const a = nav.dataset.lesson;
        if (a === 'close') { ctx.UI.closeTop(); this.onClose(); return true; }
        cur.step = Math.max(0, Math.min(L.steps.length, cur.step + (a === 'next' ? 1 : -1)));
        ctx.sound('open');
        render();
        return true;
      }
      const qb = target.closest('[data-quiz]');
      if (qb) {
        const [qi, oi] = qb.dataset.quiz.split(':').map(Number);
        const right = L.quiz[qi].answer === oi;
        cur.quiz[qi] = right;
        cur.picked[qi] = oi;
        ctx.sound(right ? 'collect' : 'thud');
        if (L.quiz.every((_, i) => cur.quiz[i] === true) && !ctx.isDone(L.task)) {
          cur.justFinished = true;
          ctx.complete(L.task);
        }
        render();
        return true;
      }
      const tg = target.closest('[data-toggle]');
      if (tg) {
        const on = ctx.world.toggle(tg.dataset.toggle);
        tg.setAttribute('aria-pressed', String(on));
        ctx.sound('pickup');
        return true;
      }
      if (target.closest('[data-agent-check]')) {
        const picked = new Set([...document.querySelectorAll('#tools input:checked')].map((i) => i.value));
        const fb = document.getElementById('agent-feedback');
        const missing = ['cost', 'email'].filter((x) => !picked.has(x));
        const extra = [...picked].filter((x) => !['cost', 'email', 'calc'].includes(x));
        if (!missing.length && !extra.length) {
          fb.className = 'feedback good';
          fb.textContent = `Great agent design, ${ctx.explorer() || 'explorer'}! It can read the bill, do the maths and send the email — and nothing else.${picked.has('calc') ? '' : ' (A calculator would be a nice optional extra.)'}`;
          ctx.sound('collect');
        } else {
          fb.className = 'feedback bad';
          fb.textContent = [
            missing.length ? `Missing: ${missing.map((m) => (m === 'cost' ? 'the cost data' : 'a way to send email')).join(' and ')}.` : '',
            extra.includes('delete') ? '⚠️ Never give a reporting agent permission to delete resources!' : '',
            extra.filter((x) => x !== 'delete').length ? 'Some tools are not needed for this goal — remove them (least privilege).' : '',
          ].filter(Boolean).join(' ');
          ctx.sound('thud');
        }
        return true;
      }
      return false;
    },
  };
}
