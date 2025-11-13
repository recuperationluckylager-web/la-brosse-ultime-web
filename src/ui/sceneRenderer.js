export class SceneRenderer {
  constructor(root, store, assets) {
    this.root = root;
    this.store = store;
    this.assets = assets;
    this.unsubscribe = null;
    this.currentSceneId = null;
  }
  start() {
    this.buildShell();
    this.unsubscribe = this.store.subscribe(() => this.render());
    this.render();
  }
  buildShell() {
    this.root.innerHTML = /*html*/`
      <div id="page-jeu" class="game-page active p-4 md:p-8 max-w-7xl mx-auto">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <main class="lg:col-span-2 bg-[color:var(--fjord-light)] p-6 rounded-lg shadow-lg">
            <section class="scene">
              <h2 id="scene-titre" class="font-title text-4xl text-white mb-2">...</h2>
              <p id="scene-lieu" class="uppercase tracking-widest text-xs text-gray-400 mb-4"></p>
              <div class="scene-image-container w-full h-64 bg-gray-700 rounded-lg mb-4 overflow-hidden">
                <img id="scene-image" src="" alt="Plan" class="w-full h-full object-cover">
              </div>
              <div id="scene-texte" class="text-lg text-gray-300 leading-relaxed mb-6"></div>
              <div id="choices-container" class="border-t border-gray-600 pt-4" role="list"></div>
            </section>
          </main>
          <aside class="lg:col-span-1 space-y-6">
            <div class="stats bg-[color:var(--fjord-light)] p-6 rounded-lg shadow-lg">
              <h3 class="font-title text-2xl text-white mb-4 border-b border-gray-600 pb-2">Fiche du party</h3>
              <ul class="space-y-2 text-lg">
                <li>Brosse : <span id="s-brosse" class="font-bold text-[color:var(--beer-gold)]">0</span></li>
                <li>Buzz : <span id="s-buzz" class="font-bold text-sky-300">0</span></li>
                <li>Lucidité : <span id="s-lucidite" class="font-bold text-emerald-300">0</span></li>
                <li>Ténacité : <span id="s-tenacite" class="font-bold text-rose-300">0</span></li>
                <li>Relation : <span id="s-relation" class="font-bold text-purple-300">0</span></li>
              </ul>
            </div>
            <div class="inventory bg-[color:var(--fjord-light)] p-6 rounded-lg shadow-lg">
              <h3 class="font-title text-2xl text-white mb-4 border-b border-gray-600 pb-2">Inventaire</h3>
              <div id="inventory-grid" class="inventory-grid" aria-live="polite"></div>
            </div>
            <div class="map bg-[color:var(--fjord-light)] p-6 rounded-lg shadow-lg">
              <h3 class="font-title text-2xl text-white mb-3 border-b border-gray-600 pb-2">Carte du quartier</h3>
              <p class="text-sm text-gray-400 mb-3">Localisation actuelle : <span id="map-location" class="text-gray-200 font-semibold">???</span></p>
              <div id="map-grid" class="map-grid" role="grid" aria-label="Carte des zones découvertes"></div>
              <div id="map-legend" class="mt-3 text-sm text-gray-400 space-y-1"></div>
            </div>
            <div class="journal bg-[color:var(--fjord-light)] p-6 rounded-lg shadow-lg">
              <h3 class="font-title text-2xl text-white mb-4 border-b border-gray-600 pb-2">Journal</h3>
              <div id="log-box" class="h-64 overflow-y-auto bg-gray-800 p-3 rounded-md text-gray-400 text-sm space-y-2" role="log" aria-live="polite"></div>
            </div>
            <button id="open-pause" class="btn btn-primary w-full">Menu Pause</button>
          </aside>
        </div>
      </div>
      <div id="modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);align-items:center;justify-content:center;">
        <div style="background:var(--fjord-light);padding:20px;border-radius:8px;max-width:480px;width:100%">
          <h3 id="modal-title" class="font-title text-2xl mb-4"></h3>
          <div id="modal-body" class="text-gray-300 mb-4"></div>
          <button id="modal-close" class="btn btn-primary w-full">Fermer</button>
        </div>
      </div>
      <div id="dice-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.62);align-items:center;justify-content:center;">
        <div id="dice-card">
          <h3 id="dice-modal-title" class="font-title text-2xl text-white">Lancer</h3>
          <div style="position:relative;width:100%;display:flex;justify-content:center;">
            <svg id="dice-svg" viewBox="0 0 100 100" width="180" height="180">
              <rect x="10" y="10" width="80" height="80" rx="18" fill="#1f2937" stroke="#f59e0b" stroke-width="4" />
              <g id="dice-dots"></g>
            </svg>
            <div id="dice-overlay">0</div>
          </div>
          <p class="text-gray-300 text-lg mt-3">Résultat : <span id="dice-count" class="font-bold text-white">…</span></p>
          <button id="dice-close" class="btn btn-secondary w-full mt-4">Fermer</button>
        </div>
      </div>
      <canvas id="dice-confetti"></canvas>
    `;
    this.bindUI();
  }
  bindUI() {
    const modal = this.root.querySelector('#modal');
    const modalClose = this.root.querySelector('#modal-close');
    modalClose.addEventListener('click', () => this.hideModal());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.hideModal();
    });
    const pauseBtn = this.root.querySelector('#open-pause');
    if (pauseBtn) pauseBtn.addEventListener('click', () => this.showPauseMenu());
    const diceModal = this.root.querySelector('#dice-modal');
    const diceClose = this.root.querySelector('#dice-close');
    if (diceClose) diceClose.addEventListener('click', () => this.hideDiceModal());
    if (diceModal)
      diceModal.addEventListener('click', (e) => {
        if (e.target === diceModal) this.hideDiceModal();
      });
    this.root.querySelector('#choices-container').addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const target = btn.dataset.target;
      const action = btn.dataset.action;
      const dice = btn.dataset.dice === 'true';
      if (action) this.store.dispatch(action);
      if (dice && this.assets.dice && typeof this.assets.dice.roll === 'function') {
        const faces = Number(btn.dataset.faces || 20);
        const threshold = btn.dataset.threshold ? Number(btn.dataset.threshold) : null;
        const onSuccess = btn.dataset.onSuccess;
        const onFailure = btn.dataset.onFailure;
        this.assets.dice.roll({ faces, threshold }).then((res) => {
          this.showModal('Résultat', `D${faces} = ${res.roll} => ${res.ok ? 'Succès' : 'Échec'}`);
          if (res.ok && onSuccess) this.renderSceneId(onSuccess);
          if (!res.ok && onFailure) this.renderSceneId(onFailure);
        });
      } else if (dice) {
        console.warn('Gestionnaire de dés non disponible.');
      } else if (target) {
        this.renderSceneId(target);
      }
    });
  }
  render() {
    const state = this.store.getState();
    this.renderSceneId(state.currentScene || 'start');
    this.renderHUD(state);
    this.renderInventory(state);
    this.renderJournal(state);
    this.renderMap(state);
  }
  renderSceneId(id) {
    const scene = this.assets.scenes[id];
    if (!scene) return;
    const isNewScene = this.currentSceneId !== id;
    if (isNewScene) {
      this.currentSceneId = id;
      if (Array.isArray(scene.entryActions)) {
        scene.entryActions.forEach((actionName) => {
          if (actionName) this.store.dispatch(actionName);
        });
      }
    } else {
      this.currentSceneId = id;
    }
    let snapshot = this.store.getState();
    const updates = {};
    if ((snapshot.currentScene || 'start') !== id) updates.currentScene = id;
    if (scene.location && snapshot.location !== scene.location) updates.location = scene.location;
    if (scene.zone) {
      const discovered = new Set(snapshot.mapZones || []);
      if (!discovered.has(scene.zone)) {
        discovered.add(scene.zone);
        updates.mapZones = [...discovered];
      }
      if (snapshot.playerZone !== scene.zone) updates.playerZone = scene.zone;
    }
    if (Object.keys(updates).length > 0) {
      this.store.commit(updates);
      snapshot = this.store.getState();
    }
    const title = this.root.querySelector('#scene-titre');
    const lieu = this.root.querySelector('#scene-lieu');
    const img = this.root.querySelector('#scene-image');
    const text = this.root.querySelector('#scene-texte');
    const choices = this.root.querySelector('#choices-container');
    title.textContent = scene.title || '';
    lieu.textContent = scene.location || '';
    img.src = scene.image || '';
    img.alt = scene.imageAlt || scene.title || 'Illustration';
    text.innerHTML = scene.text || '';
    choices.innerHTML = '';
    (scene.choices || []).forEach((c) => {
      if (
        c.condition &&
        !(
          this.assets.conditions &&
          this.assets.conditions[c.condition] &&
          this.assets.conditions[c.condition](snapshot)
        )
      )
        return;
      const b = document.createElement('button');
      b.className = 'btn-choice';
      b.textContent = c.text;
      if (c.target) b.dataset.target = c.target;
      if (c.action) b.dataset.action = c.action;
      if (c.dice) {
        b.dataset.dice = 'true';
        b.dataset.faces = c.dice.faces;
        b.dataset.threshold = c.dice.threshold;
        if (c.dice.onSuccess) b.dataset.onSuccess = c.dice.onSuccess;
        if (c.dice.onFailure) b.dataset.onFailure = c.dice.onFailure;
      }
      choices.appendChild(b);
    });
    this.currentSceneId = id;
  }
  renderHUD(state) {
    const stats = state.stats || {};
    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };
    setText('s-brosse', stats.brosse ?? 0);
    setText('s-buzz', stats.buzz ?? 0);
    setText('s-lucidite', stats.lucidite ?? 0);
    setText('s-tenacite', stats.tenacite ?? 0);
    setText('s-relation', stats.relation ?? 0);
  }
  renderInventory(state) {
    const grid = document.getElementById('inventory-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const inventory = state.inventory || [];
    if (!inventory.length) {
      const empty = document.createElement('p');
      empty.className = 'text-sm text-gray-400';
      empty.textContent = 'Sacoche vide.';
      grid.appendChild(empty);
      return;
    }
    inventory.forEach((slot) => {
      const meta = this.assets.items[slot.id] || {};
      const cell = document.createElement('div');
      cell.className = 'inventory-slot';
      cell.title = `${meta.name || slot.id} — ${meta.desc || 'Objet mystérieux.'}`;
      cell.innerHTML = `
        <span class="text-2xl">${meta.icon || '🎒'}</span>
        <span class="item-qty">${slot.qty}</span>
      `;
      grid.appendChild(cell);
    });
  }
  renderJournal(state) {
    const box = document.getElementById('log-box');
    if (!box) return;
    box.innerHTML = '';
    (state.journal || []).forEach((l) => {
      const p = document.createElement('p');
      p.textContent = `> ${l}`;
      box.appendChild(p);
    });
    box.scrollTop = box.scrollHeight;
  }
  renderMap(state) {
    const grid = document.getElementById('map-grid');
    const legend = document.getElementById('map-legend');
    const locationEl = document.getElementById('map-location');
    if (!grid || !this.assets.map) return;
    const layout = this.assets.map.layout || [];
    const zonesMeta = this.assets.map.zones || {};
    const discovered = new Set(state.mapZones || []);
    const playerZone = state.playerZone;
    grid.innerHTML = '';
    if (layout[0]) {
      grid.style.gridTemplateColumns = `repeat(${layout[0].length}, 1fr)`;
    }
    layout.forEach((row) => {
      row.forEach((cell) => {
        const tile = document.createElement('div');
        tile.className = 'map-cell';
        if (!cell) {
          tile.style.opacity = '0.15';
          grid.appendChild(tile);
          return;
        }
        const zone = zonesMeta[String(cell)];
        if (zone) {
          const isDiscovered = discovered.has(zone.id) || zone.id === playerZone;
          if (isDiscovered) {
            tile.classList.add('discovered');
            tile.style.backgroundColor = zone.color || '#4a5568';
            tile.textContent = zone.name
              .split(' ')
              .map((word) => word[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();
          } else {
            tile.textContent = '?';
          }
          if (zone.id === playerZone) {
            tile.classList.add('player-location');
          }
          tile.dataset.zone = zone.id;
          tile.setAttribute('aria-label', zone.name);
        }
        grid.appendChild(tile);
      });
    });
    if (legend) {
      legend.innerHTML = '';
      Object.values(zonesMeta).forEach((zone) => {
        const row = document.createElement('div');
        row.className = 'flex items-center gap-2';
        const swatch = document.createElement('span');
        swatch.className = 'inline-block w-3 h-3 rounded';
        swatch.style.backgroundColor = zone.color || '#4a5568';
        const label = document.createElement('span');
        label.textContent = zone.name;
        row.appendChild(swatch);
        row.appendChild(label);
        legend.appendChild(row);
      });
    }
    if (locationEl) {
      locationEl.textContent = state.location || '???';
    }
  }
  showModal(title, body) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    modalTitle.textContent = title;
    modalBody.innerHTML = '';
    if (body instanceof Node) {
      modalBody.appendChild(body);
    } else if (typeof body === 'string') {
      modalBody.innerHTML = body;
    }
    modal.style.display = 'flex';
  }
  hideModal() {
    const modal = document.getElementById('modal');
    if (modal) modal.style.display = 'none';
  }
  hideDiceModal() {
    const modal = document.getElementById('dice-modal');
    if (modal) modal.style.display = 'none';
  }
  showPauseMenu() {
    const body = document.createElement('div');
    body.className = 'space-y-3';
    const resumeBtn = document.createElement('button');
    resumeBtn.className = 'btn btn-secondary w-full';
    resumeBtn.textContent = 'Reprendre la veillée';
    resumeBtn.addEventListener('click', () => this.hideModal());
    const newGameBtn = document.createElement('button');
    newGameBtn.className = 'btn btn-primary w-full';
    newGameBtn.textContent = 'Nouvelle partie';
    newGameBtn.addEventListener('click', () => {
      const confirmReset = typeof window === 'undefined' ? true : window.confirm('Recommencer la brosse depuis le début?');
      if (!confirmReset) return;
      this.resetGame();
      this.hideModal();
    });
    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn btn-secondary w-full';
    clearBtn.textContent = 'Effacer la sauvegarde';
    const status = document.createElement('p');
    status.className = 'text-sm text-gray-400 pt-2';
    clearBtn.addEventListener('click', () => {
      if (this.assets.persistence && typeof this.assets.persistence.clear === 'function') {
        const ok = this.assets.persistence.clear();
        status.textContent = ok
          ? 'Sauvegarde effacée. À toi de rejouer!'
          : "Impossible d'effacer la sauvegarde.";
      } else {
        status.textContent = "Pas de sauvegarde à effacer.";
      }
    });
    body.append(resumeBtn, newGameBtn, clearBtn, status);
    this.showModal('Menu Pause', body);
  }
  resetGame() {
    if (!this.assets.initialState) return;
    const fresh = structuredClone(this.assets.initialState);
    this.store.commit(fresh);
    this.currentSceneId = null;
    if (this.assets.persistence && typeof this.assets.persistence.clear === 'function') {
      this.assets.persistence.clear();
    }
  }
}
