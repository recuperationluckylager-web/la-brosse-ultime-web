export class Persistence {
  constructor(store, key = 'brosseSave_v1') {
    this.store = store;
    this.key = key;
  }

  getStorage() {
    try {
      if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
        return globalThis.localStorage;
      }
    } catch (error) {
      console.warn('Accès au stockage impossible.', error);
    }
    return null;
  }

  save() {
    try {
      const storage = this.getStorage();
      if (!storage) {
        return false;
      }
      const snapshot = JSON.stringify(this.store.getState());
      storage.setItem(this.key, snapshot);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  load() {
    try {
      const storage = this.getStorage();
      if (!storage) {
        return false;
      }
      const raw = storage.getItem(this.key);
      if (!raw) return false;
      const savedState = JSON.parse(raw);
      if (!savedState || typeof savedState !== 'object') {
        return false;
      }
      this.store.commit(savedState);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }
}
