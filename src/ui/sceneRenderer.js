export class SceneRenderer {
  constructor(root, store, assets, options = {}) {
    this.root = root;
    this.store = store;
    this.assets = assets;
    this.persistence = options.persistence || null;
    this.unsubscribe = null;
    this.currentSceneId = null;
    this.pauseOverlay = null;
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
              <p id="scene-credit" class="text-xs text-gray-500 italic mb-4"></p>
              <div id="scene-texte" class="text-lg text-gray-300 leading-relaxed mb-6"></div>
              <div id="choices-container" class="border-t border-gray-600 pt-4" role="list"></div>
            </section>
          </main>
          <aside class="lg:col-span-1 space-y-6">
            <div class="stats bg-[color:var(--fjord-light)] p-6 rounded-lg shadow-lg">
              <h3 class="font-title text-2xl text-white mb-4 border-b border-gray-600 pb-2">Profil</h3>
              <ul class="space-y-2 text-lg">
                <li>Courage : <span id="s-courage" class="font-bold text-[color:var(--beer-gold)]">0</span></li>
                <li>Esprit : <span id="s-esprit" class="font-bold text-sky-300">0</span></li>
                <li>Vitalité : <span id="s-vitalite" class="font-bold text-emerald-300">0</span></li>
                <li>Renommée : <span id="s-renommee" class="font-bold text-purple-300">0</span></li>
              </ul>
            </div>
            <div class="inventory bg-[color:var(--fjord-light)] p-6 rounded-lg shadow-lg">
              <h3 class="font-title text-2xl text-white mb-4 border-b border-gray-600 pb-2">Inventaire</h3>
              <div id="inventory-grid" class="inventory-grid" aria-live="polite"></div>
            </div>
            <div class="journal bg-[color:var(--fjord-light)] p-6 rounded-lg shadow-lg">
              <h3 class="font-title text-2xl text-white mb-4 border-b border-gray-600 pb-2">Journal</h3>
              <div id="log-box" class="h-64 overflow-y-auto bg-gray-800 p-3 rounded-md text-gray-400 text-sm space-y-2" role="log" aria-live="polite"></div>
            </div>
            <button id="open-pause" class="btn btn-primary w-full">Menu Pause</button>
          </aside>
        </div>
      </div>
      <div id="modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);align-items:center;justify-content:center;display:flex;">
        <div style="background:var(--fjord-light);padding:20px;border-radius:8px;max-width:480px;width:100%">
          <h3 id="modal-title" class="font-title text-2xl mb-4"></h3>
          <div id="modal-body" class="text-gray-300 mb-4"></div>
          <button id="modal-close" class="btn btn-primary">Fermer</button>
        </div>
      </div>
      <div id="pause-overlay" class="pause-overlay" aria-hidden="true">
        <div class="pause-card" role="dialog" aria-modal="true" aria-labelledby="pause-title">
          <h3 id="pause-title" class="font-title text-3xl text-white mb-4">Menu de l'aventure</h3>
          <p class="text-gray-300 mb-6">Mettre l'expédition en pause ou repartir du début.</p>
          <div class="space-y-3">
            <button id="pause-resume" class="btn btn-primary w-full">Reprendre l'aventure</button>
            <button id="pause-restart" class="btn btn-secondary w-full">Revenir au lever du soleil</button>
          </div>
        </div>
      </div>
    `;
    this.bindUI();
  }
  bindUI() {
    this.root.querySelector('#modal-close').addEventListener('click', () => this.hideModal());
    this.pauseOverlay = this.root.querySelector('#pause-overlay');
    const pauseButton = this.root.querySelector('#open-pause');
    const resumeButton = this.root.querySelector('#pause-resume');
    const restartButton = this.root.querySelector('#pause-restart');
    if (pauseButton) pauseButton.addEventListener('click', () => this.showPause());
    if (resumeButton) resumeButton.addEventListener('click', () => this.hidePause());
    if (restartButton) restartButton.addEventListener('click', () => this.handleRestart());
    if (this.pauseOverlay) {
      this.pauseOverlay.addEventListener('click', (event) => {
        if (event.target === this.pauseOverlay) this.hidePause();
      });
    }
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.pauseOverlay?.classList.contains('active')) {
        this.hidePause();
      }
    });
    this.root.querySelector('#choices-container').addEventListener('click', (e) => {
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
        this.assets.dice.roll({ faces, threshold }).then((res) => {
          this.showModal('Résultat', `D${faces} = ${res.roll} => ${res.ok ? 'Succès' : 'Échec'}`);
          if (res.ok && onSuccess) this.renderSceneId(onSuccess);
          if (!res.ok && onFailure) this.renderSceneId(onFailure);
        });
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
    const title = this.root.querySelector('#scene-titre');
    const lieu = this.root.querySelector('#scene-lieu');
    const img = this.root.querySelector('#scene-image');
    const credit = this.root.querySelector('#scene-credit');
    const text = this.root.querySelector('#scene-texte');
    const choices = this.root.querySelector('#choices-container');
    title.textContent = scene.title || '';
    lieu.textContent = scene.location || '';
    const visual = this.resolveImage(scene);
    img.src = visual.src || '';
    img.alt = visual.alt || scene.title || 'Illustration';
    if (credit) {
      if (visual.credit) {
        if (typeof visual.credit === 'string') {
          credit.textContent = `Illustration : ${visual.credit}`;
        } else {
          const label = visual.credit.text || visual.credit.href || '';
          if (visual.credit.href) {
            credit.innerHTML = `Illustration : <a href="${visual.credit.href}" target="_blank" rel="noreferrer" class="text-[color:var(--beer-gold)] underline">${label}</a>`;
          } else {
            credit.textContent = `Illustration : ${label}`;
          }
        }
      } else {
        credit.textContent = '';
      }
    }
    text.innerHTML = scene.text || '';
    choices.innerHTML = '';
    (scene.choices || []).forEach((c) => {
      if (
        c.condition &&
        !(
          this.assets.conditions &&
          this.assets.conditions[c.condition] &&
          this.assets.conditions[c.condition](this.store.getState())
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
    if ((this.store.getState().currentScene || 'start') !== id) {
      this.store.commit({ currentScene: id });
    }
    this.currentSceneId = id;
  }
  renderHUD(state) {
    const stats = state.stats || {};
    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };
    setText('s-courage', stats.courage ?? 0);
    setText('s-esprit', stats.esprit ?? 0);
    setText('s-vitalite', stats.vitalite ?? 0);
    setText('s-renommee', stats.renommee ?? 0);
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
  showPause() {
    if (!this.pauseOverlay) return;
    this.pauseOverlay.classList.add('active');
    this.pauseOverlay.setAttribute('aria-hidden', 'false');
    const resume = this.root.querySelector('#pause-resume');
    if (resume) resume.focus();
  }
  hidePause() {
    if (!this.pauseOverlay) return;
    this.pauseOverlay.classList.remove('active');
    this.pauseOverlay.setAttribute('aria-hidden', 'true');
    const trigger = this.root.querySelector('#open-pause');
    if (trigger) trigger.focus();
  }
  handleRestart() {
    if (this.persistence) {
      this.persistence.clear();
    }
    this.currentSceneId = null;
    this.store.reset();
    this.hidePause();
  }
  resolveImage(scene) {
    const gallery = (this.assets && this.assets.gallery) || {};
    const keyFromImage =
      typeof scene.image === 'string' && scene.image.startsWith('gallery:')
        ? scene.image.replace('gallery:', '')
        : null;
    const key = scene.imageKey || keyFromImage;
    if (key && gallery[key]) {
      const entry = gallery[key];
      return {
        src: entry.url || '',
        alt: entry.alt || scene.imageAlt || scene.title || 'Illustration',
        credit: entry.credit || null,
      };
    }
    return {
      src: scene.image || '',
      alt: scene.imageAlt || scene.title || 'Illustration',
      credit: scene.imageCredit || null,
    };
  }
  showModal(title, body) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').textContent = body;
    document.getElementById('modal').style.display = 'flex';
  }
  hideModal() {
    document.getElementById('modal').style.display = 'none';
  }
}
