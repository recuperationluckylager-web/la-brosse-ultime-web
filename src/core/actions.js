const clamp = (value, min = 0) => (value < min ? min : value);

const consumeItem = (state, itemId, qty = 1) => {
  const inventory = (state.inventory || []).map((entry) => ({ ...entry }));
  const idx = inventory.findIndex((entry) => entry.id === itemId);
  if (idx === -1 || inventory[idx].qty < qty) {
    return { inventory, consumed: false };
  }
  inventory[idx].qty -= qty;
  if (inventory[idx].qty <= 0) {
    inventory.splice(idx, 1);
  }
  return { inventory, consumed: true };
};

const addItem = (state, itemId, qty = 1) => {
  const inventory = (state.inventory || []).map((entry) => ({ ...entry }));
  const idx = inventory.findIndex((entry) => entry.id === itemId);
  if (idx >= 0) inventory[idx].qty += qty;
  else inventory.push({ id: itemId, qty });
  return inventory;
};

const addZone = (state, zoneId) => {
  const zones = new Set(state.mapZones || []);
  if (zoneId) zones.add(zoneId);
  return [...zones];
};

export const actions = {
  boireBiere(state) {
    const { inventory, consumed } = consumeItem(state, 'biere');
    if (!consumed) {
      return { log: "Plus de bière dans le sac !" };
    }
    return {
      state: {
        stats: {
          brosse: (state.stats.brosse || 0) + 1,
          buzz: (state.stats.buzz || 0) + 2,
          lucidite: clamp((state.stats.lucidite || 0) - 1),
        },
        inventory,
      },
      log: 'Tu cales une bière. Le buzz monte.',
    };
  },

  mangerChips(state) {
    const { inventory, consumed } = consumeItem(state, 'chips');
    if (!consumed) {
      return { log: 'Les sacs de chips sont tous vides.' };
    }
    return {
      state: {
        stats: {
          lucidite: (state.stats.lucidite || 0) + 1,
          tenacite: (state.stats.tenacite || 0) + 1,
          buzz: clamp((state.stats.buzz || 0) - 1),
        },
        inventory,
      },
      log: 'Un snack croustillant te redonne un peu de force.',
    };
  },

  infusionCafe(state) {
    return {
      state: {
        stats: {
          lucidite: (state.stats.lucidite || 0) + 2,
          buzz: clamp((state.stats.buzz || 0) - 1),
        },
      },
      log: 'Tu bois un café instant : lucidité retrouvée !',
    };
  },

  trouverBiere(state) {
    return {
      state: { inventory: addItem(state, 'biere', 1) },
      log: 'Tu trouves une bière !',
    };
  },

  trouverTape(state) {
    return {
      state: { inventory: addItem(state, 'duct_tape', 1) },
      log: 'Tu trouves du TAPE GRIS !',
    };
  },

  trouverChips(state) {
    return {
      state: { inventory: addItem(state, 'chips', 1) },
      log: 'Quelqu’un a caché un sac de chips ici !',
    };
  },

  discuterValette(state) {
    return {
      state: {
        stats: {
          relation: (state.stats.relation || 0) + 1,
          lucidite: clamp((state.stats.lucidite || 0) - 1),
        },
      },
      log: 'Valette apprécie la discussion. La confiance grimpe.',
    };
  },

  decouvrirSentier(state) {
    return {
      state: {
        mapZones: addZone(state, 'sentier'),
        location: 'Sentier Bouetteux',
        playerTile: { row: 3, col: 3, zone: 'sentier' },
      },
      log: 'Tu as découvert le Sentier Bouetteux.',
    };
  },

  debloquerQuai(state) {
    const { inventory, consumed } = consumeItem(state, 'duct_tape');
    return {
      state: {
        mapZones: addZone(state, 'quai'),
        location: 'Quai du Fjord',
        playerTile: { row: 4, col: 6, zone: 'quai' },
        inventory: consumed ? inventory : state.inventory,
        stats: {
          relation: (state.stats.relation || 0) + (consumed ? 1 : 0),
        },
      },
      log: consumed
        ? 'Grâce au tape gris, tu répares le quai et tu peux maintenant y accéder.'
        : 'Le quai est accessible, mais tu n’avais pas de tape pour réparer les planches.',
    };
  },

  reposCourt(state) {
    return {
      state: {
        stats: {
          lucidite: Math.min((state.stats.lucidite || 0) + 3, 20),
          buzz: clamp((state.stats.buzz || 0) - 2),
        },
      },
      log: 'Une sieste express te remet un peu d’aplomb.',
    };
  },

  lancerDefi(state) {
    return {
      state: {
        stats: {
          tenacite: (state.stats.tenacite || 0) + 1,
          brosse: (state.stats.brosse || 0) + 1,
        },
      },
      log: 'Le défi t’a secoué, mais tu te sens plus tenace.',
    };
  },

  majPosition(state, payload) {
    if (!payload) return {};
    return {
      state: {
        playerTile: {
          row: payload.row ?? state.playerTile?.row ?? 0,
          col: payload.col ?? state.playerTile?.col ?? 0,
          zone: payload.zone || state.playerTile?.zone || 'chalet',
        },
        location: payload.location || state.location,
      },
    };
  },

  trouverThermos(state) {
    return {
      state: { inventory: addItem(state, 'thermos', 1) },
      log: 'Tu remplis un thermos d’infusion boréale.',
    };
  },

  utiliserThermos(state) {
    const { inventory, consumed } = consumeItem(state, 'thermos');
    if (!consumed) {
      return { log: 'Le thermos est vide. Il faudra le remplir de nouveau.' };
    }
    return {
      state: {
        stats: {
          lucidite: (state.stats.lucidite || 0) + 3,
          buzz: clamp((state.stats.buzz || 0) - 1),
        },
        inventory,
      },
      log: 'La tisane boréale éclaircit ton esprit sans gâcher la fête.',
    };
  },

  trouverSirop(state) {
    return {
      state: { inventory: addItem(state, 'sirop_erable', 1) },
      log: 'Tu trouves un pot de sirop d’érable vieilli.',
    };
  },

  degusterSirop(state) {
    const { inventory, consumed } = consumeItem(state, 'sirop_erable');
    if (!consumed) {
      return { log: 'Il n’y a plus de sirop dans ta besace.' };
    }
    return {
      state: {
        stats: {
          relation: (state.stats.relation || 0) + 1,
          lucidite: (state.stats.lucidite || 0) + 1,
        },
        inventory,
      },
      log: 'Un filet de sirop apaise ta gorge et rapproche le groupe.',
    };
  },

  trouverLampe(state) {
    return {
      state: { inventory: addItem(state, 'lampe_tempete', 1) },
      log: 'Une lampe-tempête ancienne rejoint ton inventaire.',
    };
  },

  decouvrirBelvedere(state) {
    const already = (state.mapZones || []).includes('belvedere');
    const patch = {
      mapZones: addZone(state, 'belvedere'),
      location: 'Belvédère du Fjord',
      playerTile: { row: 1, col: 7, zone: 'belvedere' },
    };
    if (!already) {
      patch.stats = {
        lucidite: (state.stats.lucidite || 0) + 1,
      };
    }
    return {
      state: patch,
      log: already
        ? 'Tu retrouves le belvédère : un repère désormais familier.'
        : 'Tu atteins le belvédère et la vue panoramique te coupe le souffle.',
    };
  },

  decouvrirCabane(state) {
    const already = (state.mapZones || []).includes('cabane');
    const patch = {
      mapZones: addZone(state, 'cabane'),
      location: 'Cabane Cachée',
      playerTile: { row: 6, col: 1, zone: 'cabane' },
    };
    if (!already) {
      patch.stats = {
        tenacite: (state.stats.tenacite || 0) + 1,
      };
    }
    return {
      state: patch,
      log: already
        ? 'Tu retrouves le refuge secret et vérifies que tout est en ordre.'
        : 'Tu ouvres la cabane cachée : un nouveau refuge s’ajoute à la carte.',
    };
  },

  composerChanson(state) {
    return {
      state: {
        stats: {
          relation: (state.stats.relation || 0) + 1,
          brosse: (state.stats.brosse || 0) + 1,
        },
      },
      log: 'Tu improvises une chanson du fjord qui électrise la brosse.',
    };
  },

  mediterBelvedere(state) {
    return {
      state: {
        stats: {
          lucidite: (state.stats.lucidite || 0) + 2,
          buzz: clamp((state.stats.buzz || 0) - 1),
        },
      },
      log: 'Tu prends le temps de respirer la brise du fjord. La lucidité revient.',
    };
  },
};
