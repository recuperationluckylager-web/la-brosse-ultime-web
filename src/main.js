/*
 * MOTEUR : LA BROSSE ULTIME v2.0 (Modulaire)
 * CHEF D'ORCHESTRE par MegaMind Genius
 * * Ce script est le nouveau "cerveau" qui connecte tous tes modules.
 */

// 1. Importe tous tes modules de génie (AVEC LES BONS CHEMINS !)
import { Store } from './core/store.js';
import { Persistence } from './core/persistence.js';
import { SceneRenderer } from './ui/sceneRenderer.js';
import { actions } from './core/actions.js';
import { dice } from './core/diceManager.js'; // On importe ton nouveau module de dés

// Fonction de démarrage asynchrone pour charger les données
async function startLegendaryGame() {
  console.log('Moteur v2.0... Démarrage des cœurs logiques...');

  // 2. Charger toutes tes données de jeu (depuis le dossier /data !)
  const [scenes, items, map, gallery] = await Promise.all([
    fetch('./data/scenes.json').then((res) => res.json()),
    fetch('./data/items.json').then((res) => res.json()),
    fetch('./data/map.json').then((res) => res.json()),
    fetch('./data/gallery.json').then((res) => res.json()),
  ]);

  const conditions = {
    briefingRecu: (state) => (state.flags || []).includes('briefing_recu'),
    aPotion: (state) => (state.inventory || []).some((item) => item.id === 'potion_etoilee' && item.qty > 0),
    aLameArgent: (state) => (state.inventory || []).some((item) => item.id === 'lame_argent' && item.qty > 0),
    aHerbes: (state) => (state.inventory || []).some((item) => item.id === 'herbes_lumineuses' && item.qty > 0),
    visionOracle: (state) => (state.flags || []).includes('vision_recue'),
    herosCouronne: (state) => (state.flags || []).includes('ombre_vaincue'),
  };

  const assets = { scenes, items, map, gallery, dice, conditions };
  console.log('Assets chargés :', assets);

  // 3. Définir l'état initial de ton jeu
  const initialState = {
    currentScene: 'start',
    location: 'Citadelle de Lysandre',
    stats: { courage: 2, esprit: 3, vitalite: 5, renommee: 0 },
    inventory: [{ id: 'carte_royaume', qty: 1 }],
    mapZones: ['lysandre'],
    journal: ["Le souffle de l'aube porte votre nom."],
    flags: [],
  };

  // 4. Initialiser le Store (Ton cerveau d'état)
  const store = new Store(initialState);
  store.registerActions(actions);
  console.log('Store initialisé.');

  // 5. Initialiser la Persistance (Sauvegarde/Chargement)
  const persistence = new Persistence(store, 'brosseUltimeSave_v2'); // Clé v2 !
  const hasSave = typeof persistence.hasSave === 'function' && persistence.hasSave();
  if (hasSave) {
    console.log('Sauvegarde détectée. Invitation à reprendre ou redémarrer.');
  } else {
    console.log("Aucune sauvegarde trouvée, l'aventure commencera fraîchement.");
  }

  // Sauvegarde automatique à chaque changement
  store.subscribe((newState) => {
    console.log("Changement d'état détecté, sauvegarde...");
    persistence.save();
  });

  // 6. Initialiser le Moteur de Rendu
  // On lui donne le 'store' (pour les données) et les 'assets' (pour les scènes/items)
  const renderer = new SceneRenderer(
    document.getElementById('game-root'), // On cible un conteneur
    store,
    assets,
    { persistence, hasSave },
  );

  // 7. DÉMARRAGE !
  renderer.start();
  console.log('LA BROSSE ULTIME est EN LIGNE ! Bon jeu, légende.');

  // Expose pour le débogage
  window.app = { store, renderer, assets, persistence };
}

// Lance le jeu !
startLegendaryGame().catch((err) => {
  console.error('ERREUR DE GÉNIE FATALE :', err);
  document.body.innerHTML = `<div style="color:red; font-size: 24px; padding: 50px;">ERREUR FATALE: ${err.message}. Vérifie la console (F12).</div>`;
});
