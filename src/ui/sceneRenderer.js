export class SceneRenderer {
  constructor(root, store, assets) {
    this.root = root;
    this.store = store;
    const safeAssets = assets || {};
    this.assets = {
      scenes: safeAssets.scenes ?? {},
      items: safeAssets.items ?? {},
      map: safeAssets.map ?? {},
      dice: safeAssets.dice ?? {
        roll: async () => ({ roll: 1, faces: 20, total: 1, ok: null, context: '' }),
      },
      persistence: safeAssets.persistence ?? { save: () => false, load: () => false },
      conditions: safeAssets.conditions ?? {},
      app: safeAssets.app ?? {},
    };
    this.unsubscribe = null;
    this.currentSceneId = null;
    this.selectedItemId = null;
    this.stylesInjected = false;
    this.selectedZoneId = null;
    this.hoveredZoneId = null;
    this.zonesById = {};
    const zoneEntries = (this.assets.map?.zones && Object.values(this.assets.map.zones)) || [];
    zoneEntries.forEach((zone) => {
      if (zone?.id) {
        this.zonesById[zone.id] = zone;
      }
    });
  }

  start() {
    if (!this.root) {
      throw new Error('SceneRenderer requires a valid root element.');
    }
    this.buildShell();
    this.unsubscribe = this.store.subscribe(() => this.render());
    this.render();
  }

  buildShell() {
    if (!this.stylesInjected) {
      const style = document.createElement('style');
      style.textContent = `
        .map-grid { display: grid; grid-template-columns: repeat(10, 1fr); gap: 2px; }
        .map-cell { aspect-ratio: 1; border-radius: 4px; background: rgba(30,41,59,0.7); position: relative; }
        .map-cell[data-zone] { box-shadow: inset 0 0 0 1px rgba(148,163,184,0.3); }
        .map-cell.discovered { filter: saturate(1.2); cursor: pointer; }
        .map-cell.current::after {
          content: '✹';
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
        }
        .map-cell.selected { box-shadow: inset 0 0 0 2px rgba(251,191,36,0.9); }
        .map-cell[data-zone]:focus-visible { outline: 2px solid var(--beer-gold); outline-offset: 1px; }
        .inventory-item { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; border-radius: 6px; transition: background 0.2s; }
        .inventory-item button { margin-left: 0.75rem; }
        .inventory-item.active { background: rgba(148,163,184,0.1); }
        #pause-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.85); display: none; align-items: center; justify-content: center; z-index: 1200; }
        #pause-overlay.active { display: flex; }
        .map-detail { background: rgba(15,23,42,0.6); border-radius: 0.75rem; padding: 0.75rem; color: #e2e8f0; min-height: 88px; }
      `;
      document.head.appendChild(style);
      this.stylesInjected = true;
    }

    this.root.innerHTML = /* html */ `
      <div id="page-jeu" class="game-page active p-4 md:p-8 max-w-7xl mx-auto">
        <div class="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <main class="xl:col-span-3 bg-[color:var(--fjord-light)] p-6 rounded-lg shadow-lg space-y-4">
            <section class="scene">
              <h2 id="scene-titre" class="font-title text-4xl text-white mb-4">...</h2>
              <div class="scene-image-container w-full h-64 bg-gray-700 rounded-lg mb-4 overflow-hidden">
                <img id="scene-image" src="" alt="Plan" class="w-full h-full object-cover">
              </div>
              <p class="text-sm text-slate-400 uppercase tracking-wider">Lieu : <span id="scene-location">-</span></p>
              <div id="scene-texte" class="text-lg text-gray-300 leading-relaxed mb-6"></div>
              <div id="choices-container" class="border-t border-gray-600 pt-4 space-y-3" role="list"></div>
            </section>
          </main>
          <aside class="xl:col-span-1 space-y-6">
            <div class="stats bg-[color:var(--fjord-light)] p-6 rounded-lg shadow-lg">
              <h3 class="font-title text-2xl text-white mb-4 border-b border-gray-600 pb-2">Stats</h3>
              <ul class="space-y-2 text-lg text-gray-200">
                <li>Brosse : <span id="s-brosse" class="font-bold text-[color:var(--beer-gold)]">0</span></li>
                <li>Buzz : <span id="s-buzz" class="font-bold text-green-400">0</span></li>
                <li>Lucidité : <span id="s-lucidite" class="font-bold text-blue-400">0</span></li>
                <li>Ténacité : <span id="s-tenacite" class="font-bold text-orange-300">0</span></li>
                <li>Relation : <span id="s-relation" class="font-bold text-pink-300">0</span></li>
              </ul>
            </div>
            <div class="inventory bg-[color:var(--fjord-light)] p-6 rounded-lg shadow-lg">
              <h3 class="font-title text-2xl text-white mb-4 border-b border-gray-600 pb-2">Inventaire</h3>
              <div id="inventory-list" class="space-y-2" role="listbox" aria-label="Inventaire"></div>
              <div id="inventory-detail" class="mt-4 p-3 bg-gray-800 rounded text-sm text-gray-300 min-h-[90px]">
                Sélectionne un objet pour voir ses détails.
              </div>
            </div>
            <div class="map bg-[color:var(--fjord-light)] p-6 rounded-lg shadow-lg">
              <h3 class="font-title text-2xl text-white mb-4 border-b border-gray-600 pb-2">Carte</h3>
              <div id="map-grid" class="map-grid" role="grid" aria-label="Mini-carte des zones découvertes"></div>
              <div id="map-detail" class="map-detail mt-3 text-sm">
                <p class="text-slate-300">Survole une zone pour en apprendre plus, ou clique sur une zone explorée pour y revenir.</p>
              </div>
              <p class="text-xs text-slate-400 mt-3">Les zones colorées sont celles que tu as découvertes. L’étoile indique ta position actuelle.</p>
            </div>
            <div class="journal bg-[color:var(--fjord-light)] p-6 rounded-lg shadow-lg">
              <h3 class="font-title text-2xl text-white mb-4 border-b border-gray-600 pb-2">Journal</h3>
              <div id="log-box" class="h-60 overflow-y-auto bg-gray-800 p-3 rounded-md text-gray-400 text-sm space-y-2" role="log" aria-live="polite"></div>
            </div>
            <button id="open-pause" class="btn btn-primary w-full">Menu Pause</button>
          </aside>
        </div>
      </div>
      <div id="modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);align-items:center;justify-content:center;">
        <div style="background:var(--fjord-light);padding:20px;border-radius:8px;max-width:480px;width:100%">
          <h3 id="modal-title" class="font-title text-2xl mb-4"></h3>
          <div id="modal-body" class="text-gray-300 mb-4"></div>
          <button id="modal-close" class="btn btn-primary">Fermer</button>
        </div>
      </div>
      <div id="pause-overlay">
        <div class="bg-[color:var(--fjord-light)] p-6 rounded-lg shadow-lg max-w-md w-full text-gray-100">
          <h2 class="font-title text-3xl mb-4">Pause</h2>
          <p class="text-sm text-slate-300 mb-6">Prends une petite gorgée, respire, ajuste tes options.</p>
          <div class="space-y-3">
            <button id="pause-resume" class="btn btn-primary w-full">Reprendre</button>
            <button id="pause-save" class="btn btn-secondary w-full">Sauvegarder maintenant</button>
            <button id="pause-load" class="btn btn-secondary w-full">Charger la dernière sauvegarde</button>
            <button id="pause-access" class="btn btn-secondary w-full">Options d’accessibilité</button>
            <button id="pause-commands" class="btn btn-secondary w-full">Commandes</button>
          </div>
          <div id="pause-extra" class="mt-6 text-sm text-slate-300 hidden" aria-live="polite"></div>
        </div>
      </div>
    `;
    this.bindUI();
  }

  bindUI() {
    const modalClose = this.root.querySelector('#modal-close');
    if (modalClose) {
      modalClose.addEventListener('click', () => this.hideModal());
    }

    const choicesContainer = this.root.querySelector('#choices-container');
    if (choicesContainer) {
      choicesContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const target = btn.dataset.target;
        const action = btn.dataset.action;
        const dice = btn.dataset.dice === 'true';
        if (action) this.store.dispatch(action);
        if (dice) {
          const faces = Number(btn.dataset.faces || 20);
          const threshold = btn.dataset.threshold ? Number(btn.dataset.threshold) : null;
          const onSuccess = btn.dataset.onSuccess;
          const onFailure = btn.dataset.onFailure;
          if (typeof this.assets.dice?.roll === 'function') {
            this.assets
              .dice
              .roll({ faces, threshold, context: btn.dataset.context || '' })
              .then((res) => {
                this.showModal(
                  'Résultat',
                  `D${faces} = ${res.total}${res.ok === null ? '' : res.ok ? ' — Succès' : ' — Échec'}`,
                );
                if (res.ok && onSuccess) this.renderSceneId(onSuccess);
                if (res.ok === false && onFailure) this.renderSceneId(onFailure);
              })
              .catch((error) => {
                console.error('Dice roll failed', error);
              });
          }
        } else if (target) {
          this.renderSceneId(target);
        }
      });
    }

    const inventoryList = this.root.querySelector('#inventory-list');
    if (inventoryList) {
      inventoryList.addEventListener('click', (e) => {
        const row = e.target.closest('[data-item-id]');
        if (!row) return;
        const itemId = row.dataset.itemId;
        if (e.target.closest('button[data-use]')) {
          const def = this.assets.items[itemId];
          if (def?.action) {
            this.store.dispatch(def.action);
          }
        }
        this.selectedItemId = itemId;
        this.renderInventory(this.store.getState());
      });

      inventoryList.addEventListener('mouseover', (e) => {
        const row = e.target.closest('[data-item-id]');
        if (!row) return;
        this.selectedItemId = row.dataset.itemId;
        this.updateInventoryDetail(this.store.getState());
      });
    }

    const mapGrid = this.root.querySelector('#map-grid');
    if (mapGrid) {
      const previewDetail = (zoneId, discovered, preview = false) => {
        this.renderMapDetail(this.store.getState(), zoneId, discovered, preview);
      };

      mapGrid.addEventListener('click', (e) => {
        const cell = e.target.closest('.map-cell');
        if (!cell) return;
        const zoneId = cell.dataset.zone;
        if (!zoneId) return;
        const discovered = cell.dataset.discovered === 'true';
        this.hoveredZoneId = null;
        this.selectedZoneId = zoneId;
        const state = this.store.getState();
        previewDetail(zoneId, discovered);
        if (!discovered) {
          return;
        }
        const zoneDef = this.zonesById[zoneId];
        const fallbackTile = zoneDef?.defaultTile || {};
        const row = fallbackTile.row ?? Number(cell.dataset.row ?? state.playerTile?.row ?? 0);
        const col = fallbackTile.col ?? Number(cell.dataset.col ?? state.playerTile?.col ?? 0);
        this.store.dispatch('majPosition', {
          row,
          col,
          zone: zoneId,
          location: zoneDef?.name || state.location,
        });
        if (zoneDef?.scene && zoneDef.scene !== this.currentSceneId) {
          this.renderSceneId(zoneDef.scene);
        }
        if (this.assets.app?.addLog) {
          this.assets.app.addLog(`Mini-carte : tu consultes ${zoneDef?.name || 'cette zone'}.`);
        }
      });

      const handleHover = (event) => {
        const cell = event.target.closest('.map-cell');
        if (!cell) return;
        const zoneId = cell.dataset.zone;
        if (!zoneId) return;
        const discovered = cell.dataset.discovered === 'true';
        this.hoveredZoneId = zoneId;
        previewDetail(zoneId, discovered, true);
      };

      mapGrid.addEventListener('mouseover', handleHover);
      mapGrid.addEventListener('focusin', handleHover);
      mapGrid.addEventListener('mouseleave', () => {
        this.hoveredZoneId = null;
        previewDetail();
      });
      mapGrid.addEventListener('focusout', () => {
        if (!mapGrid.contains(document.activeElement)) {
          this.hoveredZoneId = null;
          previewDetail();
        }
      });
      mapGrid.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const cell = event.target.closest('.map-cell');
        if (!cell) return;
        event.preventDefault();
        cell.click();
      });
    }

    const openPause = this.root.querySelector('#open-pause');
    if (openPause) openPause.addEventListener('click', () => this.openPause());
    const pauseResume = this.root.querySelector('#pause-resume');
    if (pauseResume) pauseResume.addEventListener('click', () => this.closePause());
    const pauseSave = this.root.querySelector('#pause-save');
    if (pauseSave) {
      pauseSave.addEventListener('click', () => {
        const ok = this.assets.persistence?.save?.() ?? false;
        if (ok && this.assets.app?.addLog) this.assets.app.addLog('Sauvegarde manuelle effectuée.');
        const extra = this.root.querySelector('#pause-extra');
        if (extra) {
          extra.textContent = ok ? 'Sauvegarde réussie.' : 'Impossible de sauvegarder.';
          extra.classList.remove('hidden');
        }
      });
    }
    const pauseLoad = this.root.querySelector('#pause-load');
    if (pauseLoad) {
      pauseLoad.addEventListener('click', () => {
        const ok = this.assets.persistence?.load?.() ?? false;
        if (ok && this.assets.app?.addLog) this.assets.app.addLog('Sauvegarde rechargée depuis le menu pause.');
        const extra = this.root.querySelector('#pause-extra');
        if (extra) {
          extra.textContent = ok ? 'Sauvegarde rechargée.' : 'Aucune sauvegarde trouvée.';
          extra.classList.remove('hidden');
        }
      });
    }
    const pauseAccess = this.root.querySelector('#pause-access');
    if (pauseAccess) {
      pauseAccess.addEventListener('click', () => {
        const extra = this.root.querySelector('#pause-extra');
        if (extra) {
          extra.innerHTML = '<strong>Accessibilité :</strong> Active le mode contraste dans ton navigateur. Un mode lecture est prévu bientôt.';
          extra.classList.remove('hidden');
        }
      });
    }
    const pauseCommands = this.root.querySelector('#pause-commands');
    if (pauseCommands) {
      pauseCommands.addEventListener('click', () => {
        const extra = this.root.querySelector('#pause-extra');
        if (extra) {
          extra.innerHTML = '<strong>Commandes :</strong> Clique sur les choix, utilise l’inventaire ou appuie sur Échap pour revenir au jeu.';
          extra.classList.remove('hidden');
        }
      });
    }

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        const overlay = this.root.querySelector('#pause-overlay');
        if (!overlay) return;
        if (overlay.classList.contains('active')) this.closePause();
        else this.openPause();
      }
    });
  }

  render() {
    const state = this.store.getState();
    if (!state) return;
    if (state.currentScene && state.currentScene !== this.currentSceneId) {
      this.renderSceneId(state.currentScene, state);
    }
    this.renderHUD(state);
    this.renderInventory(state);
    this.renderMap(state);
    this.renderMapDetail(state);
    this.renderJournal(state);
  }

  renderSceneId(id, providedState = null) {
    let state = providedState || this.store.getState();
    const scene = this.assets.scenes[id];
    if (!scene) return;

    const isNewScene = id !== this.currentSceneId;
    if (isNewScene && Array.isArray(scene.enterActions)) {
      scene.enterActions.forEach((actionName) => {
        if (!actionName) return;
        try {
          this.store.dispatch(actionName);
        } catch (err) {
          console.warn('Action de scène introuvable', actionName, err);
        }
      });
      state = this.store.getState();
    }

    if (isNewScene && state.playerTile?.zone) {
      this.selectedZoneId = state.playerTile.zone;
    }

    this.currentSceneId = id;

    const title = this.root.querySelector('#scene-titre');
    const img = this.root.querySelector('#scene-image');
    const text = this.root.querySelector('#scene-texte');
    const locationLabel = this.root.querySelector('#scene-location');
    const choices = this.root.querySelector('#choices-container');
    title.textContent = scene.title || '';
    img.src = scene.image || '';
    text.innerHTML = scene.text || '';
    locationLabel.textContent = scene.location || state.location || '';
    choices.innerHTML = '';

    const conditionFns = this.assets.conditions || {};
    const evaluationState = state;

    (scene.choices || []).forEach((choice) => {
      if (choice.condition) {
        const check = conditionFns[choice.condition];
        if (!check || !check(evaluationState)) return;
      }
      const button = document.createElement('button');
      button.className = 'btn-choice w-full text-left';
      button.textContent = choice.text;
      if (choice.target) button.dataset.target = choice.target;
      if (choice.action) button.dataset.action = choice.action;
      if (choice.dice) {
        button.dataset.dice = 'true';
        button.dataset.faces = choice.dice.faces ?? 20;
        if (choice.dice.threshold != null) button.dataset.threshold = choice.dice.threshold;
        if (choice.dice.onSuccess) button.dataset.onSuccess = choice.dice.onSuccess;
        if (choice.dice.onFailure) button.dataset.onFailure = choice.dice.onFailure;
        if (choice.dice.context) button.dataset.context = choice.dice.context;
      }
      choices.appendChild(button);
    });

    if ((state.currentScene || 'start') !== id) {
      this.store.commit({
        currentScene: id,
        location: scene.location || state.location,
      });
    }
  }

  renderHUD(state) {
    const statMap = [
      ['#s-brosse', state.stats?.brosse ?? 0],
      ['#s-buzz', state.stats?.buzz ?? 0],
      ['#s-lucidite', state.stats?.lucidite ?? 0],
      ['#s-tenacite', state.stats?.tenacite ?? 0],
      ['#s-relation', state.stats?.relation ?? 0],
    ];
    statMap.forEach(([selector, value]) => {
      const el = this.root.querySelector(selector);
      if (el) {
        el.textContent = value;
      }
    });
  }

  renderInventory(state) {
    const list = this.root.querySelector('#inventory-list');
    const detail = this.root.querySelector('#inventory-detail');
    if (!list || !detail) {
      return;
    }
    list.innerHTML = '';

    const inventory = state.inventory || [];
    if (inventory.length === 0) {
      list.innerHTML = '<p class="text-sm text-slate-400">Inventaire vide.</p>';
      detail.textContent = 'Tu n’as plus rien sur toi.';
      this.selectedItemId = null;
      return;
    }

    if (this.selectedItemId && !inventory.some((entry) => entry.id === this.selectedItemId)) {
      this.selectedItemId = null;
    }

    inventory.forEach((entry) => {
      const def = this.assets.items[entry.id] || { name: entry.id };
      const row = document.createElement('div');
      row.className = 'inventory-item bg-gray-800';
      if (entry.id === this.selectedItemId) row.classList.add('active');
      row.dataset.itemId = entry.id;
      row.innerHTML = `
        <div class="flex items-center space-x-3">
          <span class="text-xl">${def.icon || '📦'}</span>
          <div>
            <p class="font-semibold text-gray-200">${def.name || entry.id}</p>
            <p class="text-xs text-slate-400">${def.type || ''}</p>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <span class="text-sm text-slate-300">x${entry.qty}</span>
          ${def.usable ? '<button class="btn btn-secondary btn-xs" data-use>Utiliser</button>' : ''}
        </div>
      `;
      list.appendChild(row);
    });

    if (!this.selectedItemId && inventory[0]) {
      this.selectedItemId = inventory[0].id;
    }

    this.updateInventoryDetail(state);
  }

  updateInventoryDetail(state) {
    const detail = this.root.querySelector('#inventory-detail');
    if (!detail) return;
    if (!this.selectedItemId) {
      detail.textContent = 'Sélectionne un objet pour voir ses détails.';
      return;
    }
    const def = this.assets.items[this.selectedItemId];
    const inventoryEntry = (state.inventory || []).find((entry) => entry.id === this.selectedItemId);
    if (!def || !inventoryEntry) {
      detail.textContent = 'Objet inconnu.';
      return;
    }
    detail.innerHTML = `
      <div class="flex items-start space-x-3">
        <img src="${def.image}" alt="${def.name}" class="w-16 h-16 object-cover rounded border border-slate-700"/>
        <div>
          <p class="font-semibold text-gray-100">${def.name}</p>
          <p class="text-xs text-slate-400 mb-2">${def.type || ''} — Quantité : ${inventoryEntry.qty}</p>
          <p>${def.desc || 'Objet mystérieux.'}</p>
        </div>
      </div>
    `;
  }

  renderMap(state) {
    const grid = this.root.querySelector('#map-grid');
    if (!grid) return;
    const layout = this.assets.map?.layout || [];
    const zones = this.assets.map?.zones || {};
    const discovered = new Set(state.mapZones || []);
    const player = state.playerTile || {};

    if (this.selectedZoneId && !this.zonesById[this.selectedZoneId]) {
      this.selectedZoneId = null;
    }
    const playerZoneId = player.zone || null;
    if (!this.selectedZoneId && playerZoneId && this.zonesById[playerZoneId]) {
      this.selectedZoneId = playerZoneId;
    }

    grid.innerHTML = '';

    layout.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        const div = document.createElement('div');
        div.className = 'map-cell';
        div.dataset.row = String(rowIndex);
        div.dataset.col = String(colIndex);
        const zoneDef = zones[cell];
        if (zoneDef) {
          const zoneId = zoneDef.id;
          const isDiscovered = discovered.has(zoneId);
          div.dataset.zone = zoneId;
          div.dataset.discovered = isDiscovered ? 'true' : 'false';
          div.title = zoneDef.name;
          if (zoneId === this.selectedZoneId) {
            div.classList.add('selected');
          }
          if (isDiscovered) {
            div.classList.add('discovered');
            div.style.background = zoneDef.color;
            div.style.opacity = 0.85;
            div.tabIndex = 0;
            div.setAttribute('role', 'gridcell');
            div.setAttribute('aria-label', `${zoneDef.name} — zone explorée`);
          } else {
            div.style.background = 'rgba(71,85,105,0.6)';
            div.tabIndex = -1;
            div.setAttribute('role', 'gridcell');
            div.setAttribute('aria-label', `${zoneDef.name} — zone inconnue`);
          }
        } else {
          div.style.background = 'rgba(30,41,59,0.3)';
          div.tabIndex = -1;
        }
        if (player.row === rowIndex && player.col === colIndex) {
          div.classList.add('current');
        }
        grid.appendChild(div);
      });
    });
  }

  renderMapDetail(state, zoneId = null, discoveredOverride = null, preview = false) {
    const detail = this.root.querySelector('#map-detail');
    if (!detail) return;
    const discoveredSet = new Set(state.mapZones || []);
    let resolvedId = zoneId || this.selectedZoneId || state.playerTile?.zone || null;
    if (preview && zoneId) {
      resolvedId = zoneId;
    }
    const zone = resolvedId ? this.zonesById[resolvedId] : null;
    if (!zone) {
      detail.innerHTML = '<p class="text-slate-300">Survole une zone pour en apprendre plus.</p>';
      return;
    }
    const discovered = discoveredOverride ?? discoveredSet.has(zone.id);
    if (!preview && zone.id) {
      this.selectedZoneId = zone.id;
    }
    const statusText = discovered ? 'Zone explorée' : 'Zone non découverte';
    const statusColor = discovered ? 'text-emerald-300' : 'text-slate-400';
    const hint = !discovered && zone.unlockHint
      ? `<p class="text-xs text-slate-400 mt-2">${zone.unlockHint}</p>`
      : '';
    const travel = discovered && zone.scene
      ? '<p class="text-xs text-amber-300 mt-2">Clique ou appuie sur Entrée pour rejoindre cette scène.</p>'
      : '';
    detail.innerHTML = `
      <div class="flex items-start space-x-3">
        <span class="text-xl">${zone.icon || '📍'}</span>
        <div>
          <p class="font-semibold text-gray-100">${zone.name}</p>
          <p class="text-xs ${statusColor} uppercase tracking-wide">${statusText}</p>
          <p class="mt-2 text-slate-200">${zone.desc || ''}</p>
          ${hint}
          ${travel}
        </div>
      </div>
    `;
  }

  renderJournal(state) {
    const box = this.root.querySelector('#log-box');
    if (!box) return;
    box.innerHTML = '';
    (state.journal || []).slice(-50).forEach((line) => {
      const p = document.createElement('p');
      p.textContent = `> ${line}`;
      box.appendChild(p);
    });
    box.scrollTop = box.scrollHeight;
  }

  showModal(title, body) {
    const modal = this.root.querySelector('#modal');
    const titleEl = this.root.querySelector('#modal-title');
    const bodyEl = this.root.querySelector('#modal-body');
    if (!modal || !titleEl || !bodyEl) return;
    titleEl.textContent = title;
    bodyEl.textContent = body;
    modal.style.display = 'flex';
  }

  hideModal() {
    const modal = this.root.querySelector('#modal');
    if (modal) modal.style.display = 'none';
  }

  openPause() {
    const overlay = this.root.querySelector('#pause-overlay');
    if (overlay) overlay.classList.add('active');
    const extra = this.root.querySelector('#pause-extra');
    if (extra) {
      extra.classList.add('hidden');
      extra.textContent = '';
    }
  }

  closePause() {
    const overlay = this.root.querySelector('#pause-overlay');
    if (overlay) overlay.classList.remove('active');
  }
}
