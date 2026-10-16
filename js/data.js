// All portfolio content lives here. Edit this file to update the site —
// the 3D world, the panels and the classic view are all generated from it.

export const PROFILE = {
  name: 'Yumnam Momojit Singh',
  displayName: 'Yumnam Momojit',
  initials: 'YM',
  title: 'Assistant Professor & Researcher, Centre of Artificial Intelligence',
  focus: ['Agentic AI', 'Deep Learning & MLOps', 'Cloud & DevOps'],
  location: 'Pune, India',
  hometown: 'Thoubal, Manipur',
  languages: ['English', 'Hindi'],
  nationality: 'Indian',
  summary:
    'Assistant Professor and Researcher at the Centre of Artificial Intelligence, Indira University, Pune, and a PhD Scholar. ' +
    'As an AI Contributor and Agentic AI Builder I design and build intelligent agent systems, while bridging the gap between emerging ' +
    'technology and real-world education. My foundation is cloud and DevOps: as Senior Skill Instructor at Medhavi Skills University I ' +
    'established AWS Academy membership and trained 50+ students (25+ global certifications), and as Jury Member for IndiaSkills 2025 ' +
    '(Cloud Computing) I mentored students to the top 3 state-level ranks. AWS Certified Educator; previously Project Engineer at NIELIT ' +
    'Guwahati, IT Faculty with iNurture at Techno India University, and DevOps Engineer at MrBiologist.',
  stats: [
    { value: '590+', label: 'students trained as lead trainer for the Cloud Solution Architect course' },
    { value: '50+', label: 'students trained through AWS Academy' },
    { value: '25+', label: 'global certifications earned by students' },
    { value: 'Top 3', label: 'state-level ranks for IndiaSkills 2025 mentees' },
  ],
  links: {
    email: 'yumnammomojit7@gmail.com',
    linkedin: 'https://www.linkedin.com/in/yumnam-momojit-singh-60b4aa1a4/',
    github: 'https://github.com/YumnamMomojit',
    stackoverflow: 'https://stackoverflow.com/users/15398659/yumnam-momojit',
  },
  services: ['Cloud Management', 'Cloud Application Development', 'Web Development', 'Web Design', 'WordPress Design', 'Database Development'],
  recommendation: {
    quote: 'I had the pleasure of working with Yumnam sir in the iNurture. Their expertise and dedication were instrumental to our team.',
    name: 'Shubham Banik',
    context: 'colleague at iNurture (LinkedIn recommendation)',
  },
};

// Chronological (oldest first) — this is the order of the pillars on the Career Timeline.
export const EXPERIENCE = [
  {
    role: 'Early Career',
    org: 'Training, internships & outreach',
    short: 'Early Career',
    period: 'Before 2021',
    points: [
      'Project Trainee — NIELIT PMGDisha (Digital India scheme).',
      'Trainer — NECB 2.0, industrial training for BCA / MCA / B.Tech / M.Tech students.',
      'Machine Learning Intern — Suvidha Foundation.',
      'Faculty Development Program — delivered training to 200+ teachers and students on Data Science, ML, Web Design and AWS.',
    ],
    tags: ['Training', 'Machine Learning', 'AWS'],
  },
  {
    role: 'DevOps Engineer',
    org: 'MrBiologist LLC · Guwahati',
    short: 'MrBiologist',
    period: 'Jul 2021 – Jul 2022',
    points: [
      'Designed AWS-based cloud infrastructure using Terraform for bioinformatics research.',
      'Built CI/CD pipelines for automated deployment.',
      'Developed optimised database and server-side code; deployed and secured bioinformatics research websites.',
    ],
    tags: ['AWS', 'Terraform', 'CI/CD', 'Security'],
  },
  {
    role: 'Project Engineer (Cloud Computing)',
    org: 'NIELIT Guwahati',
    short: 'NIELIT Guwahati',
    period: 'Aug 2022 – Oct 2023',
    points: [
      'Designed private cloud infrastructure using Linux and OpenStack; configured AWS (EC2, S3, Lambda, SageMaker, Lightsail).',
      'Implemented Load Balancer, Auto Scaling, VPN, NAT and CI/CD pipelines; maintained Linux and Windows servers.',
      'Lead trainer for the Cloud Solution Architect course under CDAC Chennai / MeitY FutureSkills Prime — trained 590+ students.',
    ],
    tags: ['OpenStack', 'AWS', 'Amazon RDS', 'Linux', 'Networking', 'Teaching'],
  },
  {
    role: 'IT Faculty (Assistant Professor)',
    org: 'iNurture Education Solutions · Techno India University, Kolkata',
    short: 'Techno India Univ.',
    period: 'Oct 2023 – Jun 2024',
    points: [
      "Taught coding and cloud computing to Bachelor's and Master's students.",
      'Mentored students to strengthen their coding skills and cloud understanding; assisted with placements.',
    ],
    tags: ['Teaching', 'Microsoft Azure', 'Cloud', 'Programming', 'Mentorship'],
  },
  {
    role: 'Senior Skill Instructor',
    org: 'Medhavi Skills University · Sikkim',
    short: 'Medhavi Skills Univ.',
    period: 'Jul 2024 – Aug 2026',
    points: [
      'Appointed by the Govt. of Sikkim as Jury Member for the IndiaSkills Competition 2025 (Cloud Computing); orchestrated technical evaluation at district and state levels, and mentored participants to 1st, 2nd and 3rd state-level ranks.',
      'Spearheaded the strategic partnership that made the university an AWS Academy Member Institution, integrating an enterprise-grade cloud curriculum.',
      'Achieved AWS Certified Educator status; trained 50+ students in Cloud Foundations, Machine Learning and Generative AI.',
      'Supports career development and student placements.',
    ],
    tags: ['AWS Academy', 'IndiaSkills Jury', 'GenAI', 'Placements'],
  },
  {
    role: 'Assistant Professor & Researcher',
    org: 'Centre of Artificial Intelligence, Indira University, Pune',
    short: 'Indira University',
    period: 'Sep 2026 – Present',
    current: true,
    points: [
      'Assistant Professor in higher education at the Centre of Artificial Intelligence (on-site, Pune).',
      'AI Contributor & Agentic AI Builder — designing and building intelligent agent systems.',
      'PhD Scholar; presented a research paper at CICON 2026, hosted by Karnavati University.',
      'Bridging the gap between emerging technology and real-world education.',
    ],
    tags: ['Agentic AI', 'AI Research', 'Higher Education', 'PhD Scholar'],
  },
];

// Featured projects — one server rack each in the Project Data Center.
export const PROJECTS = [
  {
    name: 'HR & Employee Management System',
    short: 'HR System',
    client: 'JWS Projects Pvt. Ltd.',
    role: 'Lead Developer & Consultant',
    color: '#60a5fa',
    points: [
      'Full-featured web and mobile app for HR and employee management.',
      'RESTful APIs, authentication, payroll management, leave tracking and an MIS reporting dashboard.',
      'Deployed on AWS with a CI/CD pipeline; delivered across three milestones from setup through technical review to handover.',
    ],
    tech: ['React.js', 'Node.js', 'Express.js', 'MongoDB', 'AWS', 'CI/CD'],
  },
  {
    name: 'MIS Dashboard',
    short: 'MIS Dashboard',
    client: 'Aide et Action (India)',
    color: '#34d399',
    points: [
      'Designed, developed and deployed a Management Information System dashboard for real-time monitoring and data reporting.',
      "Verified by the client's technical team and handed over with user guidelines and one year of maintenance support.",
    ],
    tech: ['Dashboard', 'Data reporting', 'Deployment'],
  },
  {
    name: 'Cloud-Native AI Application Suite',
    short: 'AI Suite',
    client: 'Capstone project lead',
    color: '#a78bfa',
    points: [
      'Architected and mentored a suite of generative-AI tools: AI Suite, AI-PPT-Maker and AI-Summarizer.',
      'Engineered the complete CI/CD pipeline with LangChain/RAG, Docker and AWS ECR/ECS/Fargate, secured inside a custom VPC behind a load balancer.',
    ],
    tech: ['LangChain', 'RAG', 'Docker', 'ECR', 'ECS', 'Fargate', 'VPC'],
    link: { label: 'GitHub', url: 'https://github.com/YumnamMomojit' },
  },
  {
    name: 'JWS Group Corporate Website',
    short: 'JWS Group Web',
    client: 'JWS Projects Pvt. Ltd.',
    color: '#fb923c',
    points: ['Developed and deployed the official corporate website.'],
    tech: ['Web', 'Deployment'],
    link: { label: 'jwsgrp.com', url: 'https://jwsgrp.com/' },
  },
  {
    name: 'NICE DT Website',
    short: 'NICE DT Web',
    client: 'NICE DT',
    color: '#f472b6',
    points: ['Designed and deployed the full website for the NICE DT organisation.'],
    tech: ['Web design', 'Deployment'],
    link: { label: 'nicedt.org', url: 'https://nicedt.org/' },
  },
  {
    name: 'ALGQE Dashboard 2025',
    short: 'ALGQE 2025',
    client: 'ALGQE 2025',
    color: '#22d3ee',
    points: ['Built and deployed an interactive data dashboard for ALGQE 2025.'],
    tech: ['Dashboard', 'Data viz'],
    link: { label: '2025.algqedashboard.in', url: 'https://2025.algqedashboard.in/' },
  },
  {
    name: 'SEM — AI Companion',
    short: 'SEM AI',
    client: 'Semdok',
    color: '#22d3ee',
    points: ['SEM, an AI companion web app by Semdok — live and ready to chat.'],
    tech: ['AI', 'Web app'],
    link: { label: 'live.semdok.com', url: 'https://live.semdok.com' },
  },
  {
    name: 'University Academic Resource Portal',
    short: 'Academic Portal',
    client: 'University students',
    color: '#facc15',
    points: ['A centralised web platform for students to access and manage class notes, slide decks and academic resources.'],
    tech: ['Web', 'Education'],
  },
];

// Smaller / research projects — shown on the Archive terminal.
export const ARCHIVE = [
  { name: 'Credit Card Fraud Detection', desc: 'ML model reaching 86% precision, 78% recall and an F1-score of 82%.', tech: 'Machine Learning' },
  { name: 'Viewpoint Video Summarisation', desc: 'Extracts the important parts of videos.', tech: 'CNN · RNN' },
  { name: 'Text-to-Image Generation', desc: 'Generates images from text descriptions.', tech: 'CNN' },
  { name: 'Face Recognition Attendance System', desc: 'Face recognition and attendance tracking on a Raspberry Pi 4.', tech: 'Computer Vision · Raspberry Pi' },
  { name: 'Drowsiness Detection & Alarm', desc: 'A road-safety system that detects driver drowsiness and raises an alarm.', tech: 'Machine Learning' },
  { name: 'Web Scraping & Sentiment Analysis', desc: 'Scraped web data and analysed sentiment with NLP.', tech: 'NLP · Python' },
  { name: 'Billdesk Payment Gateway Integration', desc: 'Integrated the Billdesk payment gateway under the guidance of a Senior Technical Officer.', tech: 'PHP' },
];

// Each category is one collectible Skill Orb and one fruit on the Skill Tree.
export const SKILLS = [
  { name: 'AWS', color: '#fb923c', items: ['EC2', 'S3', 'Lambda', 'VPC', 'Load Balancer', 'Auto Scaling', 'Redshift', 'RDS', 'CloudWatch', 'ECR', 'ECS', 'Fargate', 'SageMaker', 'Amplify', 'Lightsail'] },
  { name: 'DevOps & CI/CD', color: '#34d399', items: ['Docker', 'Terraform', 'OpenStack', 'CI/CD pipelines'] },
  { name: 'AI / ML', color: '#a78bfa', items: ['Agentic AI', 'Deep Learning', 'MLOps', 'Scikit-Learn', 'TensorFlow', 'Keras', 'LangChain', 'RAG'] },
  { name: 'Programming', color: '#f472b6', items: ['C', 'C++', 'Java', 'Python', 'React.js', 'Node.js'] },
  { name: 'Azure & Google Cloud', color: '#60a5fa', items: ['Microsoft Azure', 'GCP Kubernetes', 'GCP VM Instances'] },
  { name: 'App Development', color: '#22d3ee', items: ['Android', 'Web', 'REST APIs'] },
  { name: 'Systems', color: '#facc15', items: ['Linux / Windows Server Admin', 'Shell Scripting', 'Microcontrollers & Microprocessors'] },
];

export const EDUCATION = [
  { degree: 'Master of Science — Computer Science', school: 'Assam Science and Technology University, Assam', period: '2020 – 2022', score: 'CGPA 8.0' },
  { degree: 'Bachelor of Computer Applications', school: 'Lingayas Vidyapeeth, Haryana', period: '2017 – 2020', score: 'CGPA 7.9' },
];

export const CERTIFICATIONS = [
  { name: 'AWS Certified Educator', issuer: 'Amazon Web Services · AWS Academy Educator, Feb 2025', highlight: true },
  { name: 'Best of Next ’25', issuer: 'Google Cloud Asia Pacific · May 2025', highlight: true },
  { name: 'AWS Certified Cloud Practitioner', issuer: 'Amazon Web Services', highlight: true },
  { name: 'Ultimate AWS Certified Developer Associate 2024 (DVA-C02)', issuer: 'Udemy' },
  { name: 'Machine Learning Engineer Certificate', issuer: 'Suvidha Foundation' },
  { name: 'Faculty Development Program Co-ordinator Certificate (Data Science)', issuer: 'FDP' },
];

export const PUBLICATIONS = [
  {
    title: 'Safe Terrestrial Route Recommendation System using Geographical Information System',
    venue: 'Recent Trends in Engineering, Science and Technology (1st Edition)',
    url: 'https://www.routledge.com/Recent-Trends-in-Engineering-Science-and-Technology/book-series/RTEST',
    spine: 'Safe Route GIS',
  },
  {
    title: 'Dynamic Defenses Against Adversarial Attacks Using Distortion of Gradient',
    venue: 'Springer',
    url: 'https://link.springer.com/search?query=Dynamic+Defenses+Against+Adversarial+Attacks+Using+Distortion+of+Gradient',
    spine: 'Adversarial Defense',
  },
  {
    title: 'Research paper presentation (Paper ID 762)',
    venue: 'CICON 2026, hosted by Karnavati University',
    note: 'Conference presentation',
    spine: 'CICON 2026',
  },
];

export const THESES = [
  { title: 'AI Chatbot for NIELIT Guwahati', spine: 'AI Chatbot' },
  { title: 'Human Activity and Object Interaction Recognition', spine: 'Activity Recognition' },
];

// India Journey Map — every place on the route, in order. `event` stops are side trips.
export const JOURNEY = [
  {
    id: 'thoubal', place: 'Thoubal, Manipur', lat: 24.64, lon: 93.99, when: 'Hometown', home: true, side: 'left', labelY: 3.1,
    title: 'Where it all began',
    text: 'My hometown in the Imphal valley of Manipur, North-East India — the starting point of every road on this map.',
  },
  {
    id: 'faridabad', place: 'Faridabad, Haryana', lat: 28.41, lon: 77.31, when: '2017 – 2020', side: 'right', labelY: 1.8,
    title: 'BCA · Lingaya’s Vidyapeeth',
    text: 'Bachelor of Computer Applications (CGPA 7.9) — my first steps into programming, the web and computer science.',
  },
  {
    id: 'guwahati', place: 'Guwahati, Assam', lat: 26.14, lon: 91.74, when: '2020 – 2023', side: 'left', labelY: 1.8,
    title: 'MSc · DevOps · NIELIT',
    text: 'MSc Computer Science at Assam Science and Technology University; DevOps Engineer at MrBiologist; Project Engineer (Cloud) at NIELIT Guwahati, where I trained 590+ students as lead trainer.',
  },
  {
    id: 'kolkata', place: 'Kolkata, West Bengal', lat: 22.57, lon: 88.36, when: '2023 – 2024', side: 'right', labelY: 1.8,
    title: 'IT Faculty · Techno India University',
    text: "Taught coding and cloud computing to Bachelor's and Master's students with iNurture Education Solutions.",
  },
  {
    id: 'sikkim', place: 'Sikkim', lat: 27.33, lon: 88.55, when: '2024 – 2026', side: 'left', labelY: 2.5,
    title: 'Senior Skill Instructor · Medhavi Skills University',
    text: 'Established AWS Academy membership, trained 50+ students (25+ global certifications) and served as IndiaSkills 2025 jury member for Cloud Computing.',
  },
  {
    id: 'pune', place: 'Pune, Maharashtra', lat: 18.52, lon: 73.86, when: 'Sep 2026 – now', current: true, side: 'right', labelY: 1.9,
    title: 'Assistant Professor · Centre of AI, Indira University',
    text: 'Teaching and researching artificial intelligence, building agentic AI systems, and pursuing my PhD.',
  },
  {
    id: 'gandhinagar', place: 'Gandhinagar, Gujarat', lat: 23.18, lon: 72.62, when: '2026', event: true, side: 'right', labelY: 1.7,
    title: 'CICON 2026 · Karnavati University',
    text: 'Presented a research paper (Paper ID 762) at CICON 2026.',
  },
];

// Challenges that earn points (and a celebration). `goal` is the target count; `unit` labels progress.
export const TASKS = [
  { id: 'bike', icon: '🚲', title: 'Ride the bicycle 150 m', hint: 'Grab the bicycle at the Ride Station in the Fun Park (south of the spawn).', pts: 150, goal: 150, unit: 'm' },
  { id: 'moto', icon: '🏍️', title: 'Jump the stunt ramp on the motorbike', hint: 'Take the motorbike, hold Shift to boost and fly off the orange ramp east of the park.', pts: 200, goal: 1 },
  { id: 'hoops', icon: '🏀', title: 'Shoot 3 baskets', hint: 'Pick up a ball from the rack by the court, face the hoop and press E to throw.', pts: 200, goal: 3 },
  { id: 'jump', icon: '🦘', title: 'Keep jumping for 5 seconds', hint: "Don't let your feet rest on the ground — the trampoline helps!", pts: 100, goal: 5, unit: 's' },
  { id: 'gems', icon: '💎', title: 'Find 6 hidden gems', hint: 'Look behind things… a snowman, a tower, the racks, the books, the Andaman Sea — and behind the waterfall.', pts: 300, goal: 6 },
  { id: 'summit', icon: '🏔️', title: 'Climb to the top of Snow Peak', hint: 'Hop up the icy stepping stones in the Snow Peak Valley (north-west).', pts: 150, goal: 1 },
  { id: 'splash', icon: '💦', title: 'Wade into the Waterfall Lagoon', hint: 'The lagoon is in the south-west, past the Research Library.', pts: 50, goal: 1 },
  { id: 'hometown', icon: '🏠', title: 'Visit my hometown, Thoubal', hint: 'Find the orange beacon on the India Journey Map and open it.', pts: 100, goal: 1 },
  { id: 'puzzle-math', icon: '➗', title: 'Solve 3 maths puzzles', hint: 'Brain Arena (north-east, past the Signal Beacon) — use the Maths terminal.', pts: 250, goal: 3 },
  { id: 'puzzle-code', icon: '💻', title: 'Solve 3 programming puzzles', hint: 'Brain Arena — use the Code terminal. Writing a quick script is allowed!', pts: 250, goal: 3 },
  { id: 'rubik', icon: '🧊', title: "Solve the flying Rubik's Cube", hint: 'Brain Arena — scramble the floating cube, then solve it (an Easy scramble counts).', pts: 300, goal: 1 },
  // Learning challenges — finish a lesson's quiz in the AI Learning Lab (west of the Skill Tree).
  { id: 'learn-agent', icon: '🤖', title: 'Lesson: AI Agents', hint: 'AI Learning Lab — meet the drone and learn the perceive → think → act loop.', pts: 150, goal: 1, learn: true },
  { id: 'learn-three', icon: '🧊', title: 'Lesson: How this 3D world works', hint: 'AI Learning Lab — flip live switches on the real island (wireframe, sun, slow motion).', pts: 150, goal: 1, learn: true },
  { id: 'learn-ml', icon: '📈', title: 'Lesson: Machine Learning', hint: 'AI Learning Lab — train your own classifier and watch it learn.', pts: 150, goal: 1, learn: true },
  { id: 'learn-nn', icon: '🧠', title: 'Lesson: Neural Networks', hint: 'AI Learning Lab — poke a live network that solves XOR.', pts: 150, goal: 1, learn: true },
  { id: 'learn-cnn', icon: '👁️', title: 'Lesson: Convolutional Networks', hint: 'AI Learning Lab — draw an image and run filters over it like a CNN.', pts: 150, goal: 1, learn: true },
  // Manipur Island (LV 3, by train from the east station)
  { id: 'calendar', icon: '🗓️', title: 'Walk the Meitei calendar (12 months)', hint: 'Manipur Island — stand in front of every month stone in the calendar ring.', pts: 200, goal: 12 },
  { id: 'polo-story', icon: '📜', title: 'Lesson: the story of Sagol Kangjei', hint: 'Manipur Island — visit the bronze polo rider and finish the story and quiz.', pts: 150, goal: 1, learn: true },
  { id: 'dog-gold', icon: '🐶', title: 'Fetch 10 gold nuggets with Buddy', hint: 'Press G (or the 🐶 button): Buddy the dog sniffs out buried gold on the island you are on.', pts: 200, goal: 10 },
  { id: 'craft', icon: '🛠️', title: 'Build all 3 golden crafts', hint: 'Bring gold to the Golden Workshop near the Fun Park: kennel, collar and statue.', pts: 250, goal: 3 },
  { id: 'polo', icon: '🏇', title: 'Score 3 goals in Sagol Kangjei', hint: 'Manipur Island — ride the pony, press Space to swing the mallet and drive the ball over an end line.', pts: 250, goal: 3 },
  { id: 'lanterns', icon: '🏮', title: 'Manipur trial: hang the 6 festival lanterns', hint: 'Manipur Island — find the festival lanterns (climb!) and hang each on its month stone. It unseals the way home.', pts: 300, goal: 1 },
  // Forest Island (LV 4, across the living root bridge)
  { id: 'forest-quest', icon: '🌲', title: 'Forest trial: pass the forest test', hint: 'Forest Island — collect mushroom specimens, grow a decision tree at the Learning Stump and pass the test. It unseals the way home.', pts: 400, goal: 1 },
  // Desert Island (LV 6, across the road bridge)
  { id: 'desert-quest', icon: '🏜️', title: 'Desert trial: find the lost caravan', hint: 'Desert Island — find the buried chest in 5 probes, sort the camel crates on a balance scale and mark the shortest trail to the oasis. It unseals the way home.', pts: 400, goal: 1 },
];
