export class Store {
  constructor(initial) { this.state = initial || {}; this.listeners = []; this.actions = {}; }
  getState() { return structuredClone(this.state); }
  subscribe(fn) { this.listeners.push(fn); return () => { this.listeners = this.listeners.filter(s=>s!==fn); }; }
  commit(patch) {
    this.state = deepMerge(this.state, patch);
    this.listeners.forEach(l=>l(this.getState(), patch));
  }
  registerActions(actionSet) { this.actions = Object.assign({}, this.actions, actionSet); }
  dispatch(actionName, payload) {
    const fn = this.actions[actionName];
    if (!fn) throw new Error('Action inconnue '+actionName);
    const patch = fn(this.getState(), payload) || {};
    if (patch.state) this.commit(patch.state);
    if (patch.log) { this.commit({ journal: [...(this.state.journal||[]), patch.log] }); }
    return patch;
  }
}
function deepMerge(a,b){
  if (!b) return a;
  const out = structuredClone(a);
  for (const k of Object.keys(b)){
    if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) out[k] = deepMerge(out[k]||{}, b[k]);
    else out[k] = b[k];
  }
  return out;
}