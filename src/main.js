/*
 * LA BROSSE ULTIME — ÉDITION JOUAL
 * Moteur modulaire pour un RPG de veillée québécoeurant.
 */

import { Store } from './core/store.js';
import { Persistence } from './core/persistence.js';
import { SceneRenderer } from './ui/sceneRenderer.js';
import { actions } from './core/actions.js';
import { dice } from './core/diceManager.js';

function hasItem(state, id) {
  return (state.inventory || []).some((item) => item.id === id && item.qty > 0);
}

async function startLegendaryGame() {
  console.log('La Brosse Ultime — boot du moteur');

  const [scenes, items, map] = await Promise.all([
    fetch('./data/scenes.json').then((res) => res.json()),
    fetch('./data/items.json').then((res) => res.json()),
    fetch('./data/map.json').then((res) => res.json()),
  ]);

  const conditions = {
    aBiere: (state) => hasItem(state, 'biere'),
    aPoutine: (state) => hasItem(state, 'poutine'),
    aDuctTape: (state) => hasItem(state, 'duct_tape'),
    billetMetro: (state) => hasItem(state, 'billet_metro'),
    casquePret: (state) => (state.flags || []).includes('casque_bricole'),
    amiClerk: (state) => (state.flags || []).includes('clerk_ami'),
    bandPompe: (state) => (state.flags || []).includes('band_pompe'),
    victoire: (state) => (state.flags || []).includes('bagarre_gagnee'),
  };

  const assets = { scenes, items, map, dice, conditions };
  console.log('Assets chargés :', assets);

  const initialState = {
    currentScene: 'start',
    location: 'Chalet du Fjord',
    stats: { brosse: 3, buzz: 2, lucidite: 8, tenacite: 6, relation: 1 },
    inventory: [{ id: 'biere', qty: 2 }],
    mapZones: ['chalet'],
    journal: ['La gang se chauffe pour la veillée.'],
    flags: [],
  };

  const store = new Store(initialState);
  store.registerActions(actions);
  console.log('Store initialisé.');

  const persistence = new Persistence(store, 'brosseUltimeSave_v3');

  if (persistence.load()) {
    console.log('Partie sauvegardée chargée !');
  } else {
    console.log("Nouvelle partie, attache ta tuque.");
  }

  store.subscribe(() => {
    persistence.save();
  });

  const renderer = new SceneRenderer(
    document.getElementById('game-root'),
    store,
    assets,
  );

  renderer.start();
  console.log('La Brosse Ultime est live. Have fun!');

  window.app = { store, renderer, assets, persistence };
}

startLegendaryGame().catch((err) => {
  console.error('ERREUR FATALE :', err);
  document.body.innerHTML = `<div style="color:red; font-size: 24px; padding: 50px;">ERREUR FATALE: ${err.message}. Vérifie la console (F12).</div>`;
});
