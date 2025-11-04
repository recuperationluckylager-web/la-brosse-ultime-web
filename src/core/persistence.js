export class Persistence {
  constructor(store, key = 'brosseSave_v1') {
    this.store = store;
    this.key = key;
  }
  save() {
    try {
      localStorage.setItem(this.key, JSON.stringify(this.store.getState()));
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
  load() {
    try {
      const saved = localStorage.getItem(this.key);
      if (!saved) return false;
      this.store.commit(JSON.parse(saved));
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
  hasSave() {
    try {
      return Boolean(localStorage.getItem(this.key));
    } catch (e) {
      console.error(e);
      return false;
    }
  }
  clear() {
    try {
      localStorage.removeItem(this.key);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
}
