const STAT_MIN = 0;
const STAT_MAX = 15;

function cloneInventory(source) {
  const base = Array.isArray(source) ? source : source.inventory || [];
  return base.map((item) => ({ ...item }));
}

function upsertItem(state, id, delta = 1, inventoryOverride = null) {
  const inv = cloneInventory(inventoryOverride ?? state);
  const idx = inv.findIndex((entry) => entry.id === id);
  if (idx >= 0) {
    inv[idx].qty = Math.max(0, inv[idx].qty + delta);
    if (inv[idx].qty === 0) inv.splice(idx, 1);
  } else if (delta > 0) {
    inv.push({ id, qty: delta });
  }
  return inv;
}

function addFlag(state, flag) {
  const flags = new Set(state.flags || []);
  flags.add(flag);
  return [...flags];
}

function hasFlag(state, flag) {
  return (state.flags || []).includes(flag);
}

function clamp(value, min = STAT_MIN, max = STAT_MAX) {
  return Math.min(max, Math.max(min, value));
}

function statValue(state, key) {
  return state.stats?.[key] ?? 0;
}

function adjustStats(state, deltas) {
  const result = {};
  for (const [key, delta] of Object.entries(deltas)) {
    if (typeof delta !== "number" || Number.isNaN(delta)) continue;
    result[key] = clamp(statValue(state, key) + delta);
  }
  return result;
}

export const actions = {
  prendreCaisse(state) {
    if (hasFlag(state, "caisse_boreale")) {
      return {
        log: "Le frigo du dépanneur est vidé; Lise te dit d'attendre la prochaine livraison.",
      };
    }
    const inventory = upsertItem(state, "biere", 6);
    const stats = adjustStats(state, { brosse: 1, buzz: 1, lucidite: -1 });
    const flags = addFlag(state, "caisse_boreale");
    return {
      state: { inventory, stats, flags },
      log: "Tu charges une caisse de Boréale bien froide. La brosse s'annonce musclée.",
    };
  },

  acheterPoutine(state) {
    if (hasFlag(state, "poutine_depan")) {
      return { log: "Le comptoir de poutine est fermé jusqu'à demain matin." };
    }
    const inventory = upsertItem(state, "poutine", 1);
    const stats = adjustStats(state, { buzz: 1 });
    const flags = addFlag(state, "poutine_depan");
    return {
      state: { inventory, stats, flags },
      log: "Une bonne poutine graisseuse te promet un boost quand le party tombera.",
    };
  },

  mangerPoutine(state) {
    const hasPoutine = (state.inventory || []).find((item) => item.id === "poutine" && item.qty > 0);
    if (!hasPoutine) {
      return { log: "T'as plus de poutine. Faudra t'en racheter une autre." };
    }
    const inventory = upsertItem(state, "poutine", -1);
    const stats = adjustStats(state, { tenacite: 2, lucidite: 1 });
    return {
      state: { inventory, stats },
      log: "Tu manges ta poutine en deux bouchées. Ça te remet le cœur et la tête à la bonne place.",
    };
  },

  boireBiere(state) {
    const hasBiere = (state.inventory || []).find((item) => item.id === "biere" && item.qty > 0);
    if (!hasBiere) {
      return { log: "Y reste plus de bière dans la glacière. C'est plate." };
    }
    const inventory = upsertItem(state, "biere", -1);
    const stats = adjustStats(state, { brosse: 2, buzz: 1, lucidite: -2 });
    return {
      state: { inventory, stats },
      log: "Tu claques une Boréale d'un coup sec. La brosse monte, mais tes idées se mélangent.",
    };
  },

  jaserClerk(state) {
    if (hasFlag(state, "clerk_ami")) {
      return { log: "Le commis te fait déjà des rabais. Vous êtes rendus chum à chum." };
    }
    const stats = adjustStats(state, { relation: 2, lucidite: 1 });
    const flags = addFlag(state, "clerk_ami");
    const inventory = upsertItem(state, "billet_metro", 1);
    return {
      state: { stats, flags, inventory },
      log: "Lise te glisse un billet de métro gratis pis jase des ragots du quartier.",
    };
  },

  trouverDuctTape(state) {
    if (hasFlag(state, "duct_trouve")) {
      return { log: "Le bac de recyclage est vide; t'as déjà ramassé le duct tape utile." };
    }
    const inventory = upsertItem(state, "duct_tape", 1);
    const stats = adjustStats(state, { tenacite: 1 });
    const flags = addFlag(state, "duct_trouve");
    return {
      state: { inventory, stats, flags },
      log: "Parmi les vidanges, tu repognes un rouleau de duct tape encore bon. Un vrai trésor de ruelle.",
    };
  },

  encouragerBand(state) {
    if (hasFlag(state, "band_pompe")) {
      return { log: "La gang de musique est déjà sur un high. Ils te font un clin d'œil complice." };
    }
    const stats = adjustStats(state, { buzz: 2, relation: 1 });
    const flags = addFlag(state, "band_pompe");
    return {
      state: { stats, flags },
      log: "Tu cries « On lâche pas la patate! » et le band repart de plus belle. Toute la ruelle vibre.",
    };
  },

  improviserCasque(state) {
    if (hasFlag(state, "casque_bricole")) {
      return { log: "Ton casque de fortune tient encore. Inutile de le regosser." };
    }
    const inv = cloneInventory(state);
    const tapeIndex = inv.findIndex((item) => item.id === "duct_tape");
    if (tapeIndex < 0) {
      return { log: "Sans duct tape, impossible de bricoler quoi que ce soit." };
    }
    inv[tapeIndex].qty -= 1;
    if (inv[tapeIndex].qty <= 0) inv.splice(tapeIndex, 1);
    const casqueIndex = inv.findIndex((item) => item.id === "casque_hockey");
    if (casqueIndex >= 0) inv[casqueIndex].qty += 1;
    else inv.push({ id: "casque_hockey", qty: 1 });
    const stats = adjustStats(state, { tenacite: 2, relation: 1 });
    const flags = addFlag(state, "casque_bricole");
    return {
      state: { inventory: inv, stats, flags },
      log: "Avec du duct tape, une vieille épaule-pad pis du cœur, tu te fabriques un casque digne de la LNH.",
    };
  },

  motiverMimi(state) {
    if (hasFlag(state, "mimi_boost")) {
      return { log: "Mimi est déjà gonflée à bloc. Elle t'envoie un bec sur la joue." };
    }
    const stats = adjustStats(state, { relation: 2, buzz: 1 });
    const flags = addFlag(state, "mimi_boost");
    return {
      state: { stats, flags },
      log: "Tu rassures Mimi: « On va faire lever le toit, ma chum! » Son sourire illumine la station.",
    };
  },

  victoireBagarre(state) {
    if (hasFlag(state, "bagarre_gagnee")) {
      return { log: "La mascotte est déjà à terre. La soirée est sauvée pour de bon." };
    }
    const stats = adjustStats(state, { buzz: 3, relation: 2 });
    const flags = addFlag(state, "bagarre_gagnee");
    const inventory = upsertItem(state, "trophee_brosse", 1);
    return {
      state: { stats, flags, inventory },
      log: "Tu sacres la mascotte dehors. Le bar explose de joie pis on te remet le trophée de la brosse ultime.",
    };
  },

  defaiteBagarre(state) {
    const stats = adjustStats(state, { brosse: -1, buzz: -2, tenacite: -2, lucidite: -1 });
    return {
      state: { stats },
      log: "La mascotte t'envoie une volée. Tu recules en jurant de revenir mieux préparé.",
    };
  },
};
