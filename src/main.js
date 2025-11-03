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
    console.log("Moteur v2.0... Démarrage des cœurs logiques...");

    // 2. Charger toutes tes données de jeu (depuis le dossier /data !)
    const [scenes, items, map] = await Promise.all([
        fetch('./data/scenes.json').then(res => res.json()),
        fetch('./data/items.json').then(res => res.json()),
        fetch('./data/map.json').then(res => res.json())
    ]);

    const assets = { scenes, items, map, dice };
    console.log("Assets chargés :", assets);

    // 3. Définir l'état initial de ton jeu
    const initialState = {
        currentScene: 'start',
        location: 'Chalet du Fjord',
        stats: { brosse: 3, buzz: 5, lucidite: 15, tenacite: 10, relation: 2 },
        inventory: [{ id: 'biere', qty: 4 }, { id: 'duct_tape', qty: 1 }, { id: 'chips', qty: 2 }],
        mapZones: ['chalet'],
        journal: ['La brosse commence...']
    };

    // 4. Initialiser le Store (Ton cerveau d'état)
    const store = new Store(initialState);
    store.registerActions(actions);
    console.log("Store initialisé.");

    // 5. Initialiser la Persistance (Sauvegarde/Chargement)
    const persistence = new Persistence(store, 'brosseUltimeSave_v2'); // Clé v2 !
    
    // Essaye de charger une sauvegarde
    if (persistence.load()) {
        console.log("Partie sauvegardée chargée !");
    } else {
        console.log("Aucune sauvegarde trouvée, démarrage d'une nouvelle partie.");
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
        assets
    );
    
    // 7. DÉMARRAGE !
    renderer.start();
    console.log("LA BROSSE ULTIME est EN LIGNE ! Bon jeu, légende.");

    // Expose pour le débogage
    window.app = { store, renderer, assets, persistence };
}

// Lance le jeu !
startLegendaryGame().catch(err => {
    console.error("ERREUR DE GÉNIE FATALE :", err);
    document.body.innerHTML = `<div style="color:red; font-size: 24px; padding: 50px;">ERREUR FATALE: ${err.message}. Vérifie la console (F12).</div>`;
});

