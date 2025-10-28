const hasStructuredClone = typeof structuredClone === 'function';

const clone = (value) => {
  if (value === undefined || value === null) {
    return value;
  }
  if (hasStructuredClone) {
    return structuredClone(value);
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    console.warn('Clone échoué, retour de la valeur originale.', error);
    return value;
  }
};

const mergeObjects = (target, source) => {
  if (!source || typeof source !== 'object') {
    return clone(target ?? {});
  }

  const base = clone(target ?? {});
  for (const key of Object.keys(source)) {
    const next = source[key];
    if (Array.isArray(next)) {
      base[key] = next.map((entry) => clone(entry));
    } else if (next && typeof next === 'object') {
      base[key] = mergeObjects(base[key] ?? {}, next);
    } else {
      base[key] = next;
    }
  }
  return base;
};

export class Store {
  constructor(initial) {
    this.state = clone(initial ?? {});
    this.listeners = [];
    this.actions = {};
  }

  getState() {
    return clone(this.state);
  }

  subscribe(fn) {
    if (typeof fn !== 'function') {
      return () => {};
    }
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((listener) => listener !== fn);
    };
  }

  commit(patch) {
    if (!patch || typeof patch !== 'object') {
      return;
    }

    this.state = mergeObjects(this.state, patch);
    const snapshot = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot, patch);
      } catch (error) {
        console.error('Store subscriber failed', error);
      }
    });
  }

  registerActions(actionSet) {
    if (!actionSet || typeof actionSet !== 'object') {
      return;
    }
    this.actions = Object.assign({}, this.actions, actionSet);
  }

  dispatch(actionName, payload) {
    const fn = this.actions[actionName];
    if (!fn) {
      throw new Error(`Action inconnue ${actionName}`);
    }

    const patch = fn(this.getState(), payload) || {};
    if (patch.state) {
      this.commit(patch.state);
    }
    if (patch.log) {
      const history = [...(this.state.journal || []), patch.log].slice(-100);
      this.commit({ journal: history });
    }
    return patch;
  }
}
