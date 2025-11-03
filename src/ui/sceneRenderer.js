export class SceneRenderer {
  constructor(root, store, assets){ this.root = root; this.store = store; this.assets = assets; this.unsubscribe = null; }
  start(){
    this.buildShell();
    this.unsubscribe = this.store.subscribe(()=>this.render());
    this.render();
  }
  buildShell(){
    this.root.innerHTML = /*html*/`
      <div id="page-jeu" class="game-page active p-4 md:p-8 max-w-7xl mx-auto">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <main class="lg:col-span-2 bg-[color:var(--fjord-light)] p-6 rounded-lg shadow-lg">
            <section class="scene">
              <h2 id="scene-titre" class="font-title text-4xl text-white mb-4">...</h2>
              <div class="scene-image-container w-full h-64 bg-gray-700 rounded-lg mb-4 overflow-hidden">
                <img id="scene-image" src="" alt="Plan" class="w-full h-full object-cover">
              </div>
              <div id="scene-texte" class="text-lg text-gray-300 leading-relaxed mb-6"></div>
              <div id="choices-container" class="border-t border-gray-600 pt-4" role="list"></div>
            </section>
          </main>
          <aside class="lg:col-span-1 space-y-6">
            <div class="stats bg-[color:var(--fjord-light)] p-6 rounded-lg shadow-lg">
              <h3 class="font-title text-2xl text-white mb-4 border-b border-gray-600 pb-2">Stats</h3>
              <ul class="space-y-2 text-lg">
                <li>Brosse : <span id="s-brosse" class="font-bold text-[color:var(--beer-gold)]">0</span></li>
                <li>Buzz : <span id="s-buzz" class="font-bold text-green-400">0</span></li>
                <li>Lucidité : <span id="s-lucidite" class="font-bold text-blue-400">0</span></li>
              </ul>
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
    `;
    this.bindUI();
  }
  bindUI(){
    this.root.querySelector('#modal-close').addEventListener('click', ()=> this.hideModal());
    this.root.querySelector('#choices-container').addEventListener('click', (e)=>{
      const btn = e.target.closest('button');
      if (!btn) return;
      const target = btn.dataset.target;
      const action = btn.dataset.action;
      const dice = btn.dataset.dice === 'true';
      if (action) this.store.dispatch(action);
      if (dice){
        const faces = Number(btn.dataset.faces||20);
        const threshold = btn.dataset.threshold ? Number(btn.dataset.threshold) : null;
        const onSuccess = btn.dataset.onSuccess;
        const onFailure = btn.dataset.onFailure;
        this.assets.dice.roll({faces, threshold}).then(res=>{
          this.showModal('Résultat', `D${faces} = ${res.roll} => ${res.ok ? 'Succès' : 'Échec'}`);
          if (res.ok && onSuccess) this.renderSceneId(onSuccess);
          if (!res.ok && onFailure) this.renderSceneId(onFailure);
        });
      } else if (target) {
        this.renderSceneId(target);
      }
    });
  }
  render(){
    const state = this.store.getState();
    this.renderSceneId(state.currentScene || 'start');
    this.renderHUD(state);
    this.renderJournal(state);
  }
  renderSceneId(id){
    const scene = this.assets.scenes[id];
    if (!scene) return;
    const title = this.root.querySelector('#scene-titre');
    const img = this.root.querySelector('#scene-image');
    const text = this.root.querySelector('#scene-texte');
    const choices = this.root.querySelector('#choices-container');
    title.textContent = scene.title || '';
    img.src = scene.image || '';
    text.innerHTML = scene.text || '';
    choices.innerHTML = '';
    (scene.choices||[]).forEach(c=>{
      if (c.condition && !(this.assets.conditions && this.assets.conditions[c.condition] && this.assets.conditions[c.condition](this.store.getState()))) return;
      const b = document.createElement('button');
      b.className = 'btn-choice';
      b.textContent = c.text;
      if (c.target) b.dataset.target = c.target;
      if (c.action) b.dataset.action = c.action;
      if (c.dice){
        b.dataset.dice = 'true';
        b.dataset.faces = c.dice.faces;
        b.dataset.threshold = c.dice.threshold;
        if (c.dice.onSuccess) b.dataset.onSuccess = c.dice.onSuccess;
        if (c.dice.onFailure) b.dataset.onFailure = c.dice.onFailure;
      }
      choices.appendChild(b);
    });
    this.store.commit({ currentScene: id });
  }
  renderHUD(state){
    state = state || this.store.getState();
    document.getElementById('s-brosse').textContent = state.stats?.brosse ?? 0;
    document.getElementById('s-buzz').textContent = state.stats?.buzz ?? 0;
    document.getElementById('s-lucidite').textContent = state.stats?.lucidite ?? 0;
  }
  renderJournal(state){
    state = state || this.store.getState();
    const box = document.getElementById('log-box'); box.innerHTML = '';
    (state.journal||[]).forEach(l=>{
      const p = document.createElement('p'); p.textContent = `> ${l}`; box.appendChild(p);
    });
  }
  showModal(title, body){ document.getElementById('modal-title').textContent = title; document.getElementById('modal-body').textContent = body; document.getElementById('modal').style.display = 'flex'; }
  hideModal(){ document.getElementById('modal').style.display = 'none'; }
}