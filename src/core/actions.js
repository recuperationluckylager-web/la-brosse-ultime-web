function cloneInventory(state) {
  return (state.inventory || []).map((item) => ({ ...item }));
}
function upsertItem(state, id, delta = 1) {
  const inv = cloneInventory(state);
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
function removeFlag(state, flag) {
  const flags = new Set(state.flags || []);
  flags.delete(flag);
  return [...flags];
}
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export const actions = {
  mediterAutel(state) {
    const esprit = clamp((state.stats?.esprit || 0) + 1, 0, 12);
    return {
      state: { stats: { esprit } },
      log: 'La méditation calme vos pensées et affûte votre esprit.',
    };
  },
  recevoirBriefing(state) {
    const renommee = (state.stats?.renommee || 0) + 1;
    const flags = addFlag(state, 'briefing_recu');
    return {
      state: { stats: { renommee }, flags },
      log: 'Le capitaine Elian vous confie la sauvegarde de Lysandre.',
    };
  },
  recevoirProphetie(state) {
    const esprit = clamp((state.stats?.esprit || 0) + 1, 0, 12);
    const flags = addFlag(state, 'vision_recue');
    const inventory = upsertItem(state, 'amulette_oracle', 1);
    return {
      state: { stats: { esprit }, flags, inventory },
      log: "L'oracle noue une amulette au creux de votre main et murmure la voie du soleil.",
    };
  },
  acheterPotion(state) {
    const inventory = upsertItem(state, 'potion_etoilee', 1);
    return {
      state: { inventory },
      log: 'Le marchand sourit et glisse une potion étoilée dans votre besace.',
    };
  },
  obtenirLameArgent(state) {
    const inventory = upsertItem(state, 'lame_argent', 1);
    const courage = clamp((state.stats?.courage || 0) + 1, 0, 12);
    const renommee = (state.stats?.renommee || 0) + 1;
    return {
      state: { inventory, stats: { courage, renommee } },
      log: "La lame d'argent chante lorsqu'elle rencontre votre poigne assurée.",
    };
  },
  froisserMarchand(state) {
    const renommee = Math.max(0, (state.stats?.renommee || 0) - 1);
    return {
      state: { stats: { renommee } },
      log: 'Le marchand outré répand des rumeurs sur votre nom.',
    };
  },
  cueillirHerbes(state) {
    const inventory = upsertItem(state, 'herbes_lumineuses', 1);
    const vitalite = clamp((state.stats?.vitalite || 0) + 1, 0, 12);
    return {
      state: { inventory, stats: { vitalite } },
      log: 'Les herbes lumineuses diffusent une chaleur réconfortante.',
    };
  },
  subirBlessure(state) {
    const vitalite = clamp((state.stats?.vitalite || 0) - 2, 0, 12);
    return {
      state: { stats: { vitalite } },
      log: 'La chute vous meurtrit, mais vous jurez de vous relever.',
    };
  },
  releverDefi(state) {
    const courage = clamp((state.stats?.courage || 0) + 1, 0, 12);
    return {
      state: { stats: { courage } },
      log: 'Votre détermination embrase la clairière.',
    };
  },
  boirePotion(state) {
    const hasPotion = (state.inventory || []).find((item) => item.id === 'potion_etoilee' && item.qty > 0);
    if (!hasPotion) return {};
    const inventory = upsertItem(state, 'potion_etoilee', -1);
    const vitalite = clamp((state.stats?.vitalite || 0) + 2, 0, 12);
    const esprit = clamp((state.stats?.esprit || 0) + 1, 0, 12);
    return {
      state: { inventory, stats: { vitalite, esprit } },
      log: 'La potion étoilée illumine vos veines et ranime votre esprit.',
    };
  },
  utiliserHerbes(state) {
    const hasHerbes = (state.inventory || []).find((item) => item.id === 'herbes_lumineuses' && item.qty > 0);
    if (!hasHerbes) return {};
    const inventory = upsertItem(state, 'herbes_lumineuses', -1);
    const vitalite = clamp((state.stats?.vitalite || 0) + 3, 0, 12);
    return {
      state: { inventory, stats: { vitalite } },
      log: 'Vous mâchez les herbes lumineuses, ressentant une vague de vitalité.',
    };
  },
  triompheOmbre(state) {
    const flags = addFlag(state, 'ombre_vaincue');
    const inventory = upsertItem(state, 'relique_aube', 1);
    const renommee = (state.stats?.renommee || 0) + 2;
    const courage = clamp((state.stats?.courage || 0) + 1, 0, 12);
    return {
      state: { flags, inventory, stats: { renommee, courage } },
      log: "L'ombre se dissipe et laisse place à la relique de l'aube.",
    };
  },
  subirBlessureGrave(state) {
    const vitalite = clamp((state.stats?.vitalite || 0) - 3, 0, 12);
    return {
      state: { stats: { vitalite } },
      log: "Les griffes de l'ombre entaillent votre armure.",
    };
  },
  calmerEsprit(state) {
    const esprit = clamp((state.stats?.esprit || 0) + 1, 0, 12);
    return {
      state: { stats: { esprit } },
      log: 'Le murmure des arbres apaise vos doutes.',
    };
  },
  bannirVision(state) {
    const flags = removeFlag(state, 'vision_recue');
    return {
      state: { flags },
      log: 'Vous ancrez la prophétie dans la réalité et passez à l’action.',
    };
  },
};
