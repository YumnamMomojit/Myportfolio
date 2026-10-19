// AI Engineer Saga: 12 worlds and 39 levels on the shared saga engine.
import { startSaga } from '../../shared/saga.js';
import { WORLDS, LEVELS } from './data.js';

startSaga({
  title: 'the AI Engineer Saga',
  worlds: WORLDS,
  levels: LEVELS,
  storageKey: 'ai-engineer-saga-v1',
  loadEngine: (name) => (name === 'order' ? import('../../shared/engines/order.js') : import(`./engines/${name}.js`)),
  about: '39 levels follow the AI-engineer roadmap: Python, maths, classical ML, deep learning, LLMs, RAG, agents, serving, cloud and evals. Each level is a playable version of one idea, followed by real code and, for some, a hands-on lab. Progress stays in this browser.',
});
