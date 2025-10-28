export class Persistence {
  constructor(store, key='brosseSave_v1'){ this.store = store; this.key = key; }
  save(){ try{ localStorage.setItem(this.key, JSON.stringify(this.store.getState())); return true; }catch(e){ console.error(e); return false; } }
  load(){ try{ const s = localStorage.getItem(this.key); if (!s) return false; this.store.commit(JSON.parse(s)); return true;}catch(e){ console.error(e); return false; } }
}