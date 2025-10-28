import { Store } from './core/store.js';
import { actions } from './core/actions.js';
import { DiceManager } from './core/diceManager.js';
import { Persistence } from './core/persistence.js';
import { SceneRenderer } from './ui/sceneRenderer.js';
import scenes from './data/scenes.json' assert { type: 'json' };
import items from './data/items.json' assert { type: 'json' };
import mapData from './data/map.json' assert { type: 'json' };

const initialState = {
  currentScene: 'start',
  location: 'Chalet du Fjord',
  stats:{ brosse:3, buzz:5, lucidite:15, tenacite:10, relation:2 },
  inventory:[{id:'biere',qty:6},{id:'duct_tape',qty:1},{id:'chips',qty:2}],
  party:[],
  mapZones:['chalet'],
  journal:['La brosse a commencé...'],
  playerTile: null
};

const store = new Store(initialState);
store.registerActions(actions);

const dice = new DiceManager();
const persistence = new Persistence(store);
persistence.load();

const renderer = new SceneRenderer(document.getElementById('app-root'), store, { scenes, items, map: mapData, dice, persistence });
renderer.start();