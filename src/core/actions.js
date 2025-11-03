export const actions = {
  boireBiere(state){
    return { state: { stats: { brosse: (state.stats.brosse||0)+1, buzz: (state.stats.buzz||0)+2, lucidite: (state.stats.lucidite||0)-1 } }, log: 'Tu cales une bière. Le buzz monte.' };
  },
  trouverBiere(state){
    const inv = [...(state.inventory||[])];
    const idx = inv.findIndex(i=>i.id==='biere');
    if (idx>=0) inv[idx].qty += 1; else inv.push({id:'biere',qty:1});
    return { state: { inventory: inv }, log: 'Tu trouves une bière !' };
  },
  trouverTape(state){
    const inv = [...(state.inventory||[])];
    const idx = inv.findIndex(i=>i.id==='duct_tape');
    if (idx>=0) inv[idx].qty += 1; else inv.push({id:'duct_tape',qty:1});
    return { state: { inventory: inv }, log: 'Tu trouves du TAPE GRIS !' };
  },
  decouvrirSentier(state){
    const zones = new Set(state.mapZones || []);
    zones.add('sentier');
    return { state:{ mapZones:[...zones] }, log: 'Tu as découvert le Sentier Bouetteux.' };
  }
};