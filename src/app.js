import { Store } from './core/store.js';
import { actions } from './core/actions.js';
import { DiceManager } from './core/diceManager.js';
import { Persistence } from './core/persistence.js';
import { SceneRenderer } from './ui/sceneRenderer.js';
import { conditions } from './core/conditions.js';
import scenes from './data/scenes.json' assert { type: 'json' };
import items from './data/items.json' assert { type: 'json' };
import mapData from './data/map.json' assert { type: 'json' };

const initialState = {
  currentScene: 'start',
  location: 'Chalet du Fjord',
  stats: { brosse: 3, buzz: 5, lucidite: 15, tenacite: 10, relation: 2 },
  inventory: [
    { id: 'biere', qty: 6 },
    { id: 'duct_tape', qty: 1 },
    { id: 'chips', qty: 2 },
  ],
  party: [],
  mapZones: ['chalet'],
  journal: ['La brosse a commencé...'],
  playerTile: { row: 1, col: 2, zone: 'chalet' },
};

const store = new Store(initialState);
store.registerActions(actions);

const appContext = {
  addLog(message) {
    if (!message) return;
    const state = store.getState();
    const history = state.journal || [];
    const updated = [...history, message].slice(-100);
    store.commit({ journal: updated });
  },
};

if (typeof window !== 'undefined') {
  window.app = Object.assign({}, window.app, appContext);
}

const dice = new DiceManager(appContext.addLog.bind(appContext));
const persistence = new Persistence(store);

store.subscribe(() => {
  persistence.save();
});

persistence.load();

const renderer = new SceneRenderer(document.getElementById('app-root'), store, {
  scenes,
  items,
  map: mapData,
  dice,
  persistence,
  conditions,
  app: appContext,
});
renderer.start();
