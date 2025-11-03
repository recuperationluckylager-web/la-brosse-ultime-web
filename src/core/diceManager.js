/**
 * DiceManager v2.0 (Modulaire)
 * Transformé en module ES6 exportable par MegaMind Genius
 */

// On expose un objet 'dice' unique qui contient toute la logique
export const dice = {
  history: [],
  // Permet au 'main.js' d'injecter le RNG (Random Number Generator)
  _rng: () => Math.random(),
  
  setRNG(fn) {
    if (typeof fn === 'function') this._rng = fn;
    else this._rng = () => Math.random();
  },

  // Fonction pour les sons (Génie pur)
  _playSound(success = true) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = success ? 'sine' : 'triangle';
      o.frequency.value = success ? 880 : 220;
      g.gain.value = 0;
      o.connect(g); g.connect(ctx.destination);
      o.start();
      g.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.01);
      g.gain.linearRampToValueAtTime(0.0, ctx.currentTime + 0.22);
      o.stop(ctx.currentTime + 0.25);
    } catch (e) {}
  },

  // Fonction pour les confettis (LÉGENDAIRE)
  _burstConfetti(x = window.innerWidth / 2, y = window.innerHeight / 2, count = 20) {
    try {
      const canvas = document.getElementById('dice-confetti');
      if (!canvas) return; // S'assure que le canvas existe
      const ctx = canvas.getContext('2d');
      canvas.width = innerWidth; canvas.height = innerHeight; canvas.style.display = 'block';
      const particles = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() * -6) - 2,
          size: 6 + Math.random() * 8,
          color: ['#f59e0b','#06b6d4','#84cc16','#f97316','#ef4444'][Math.floor(Math.random() * 5)],
          life: 50 + Math.floor(Math.random() * 40)
        });
      }
      let t = 0;
      const anim = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let p of particles) {
          p.vy += 0.25; p.x += p.vx; p.y += p.vy; p.life--;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x, p.y, p.size, p.size * 0.6);
        }
        t++;
        for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) particles.splice(i, 1);
        if (particles.length > 0 && t < 400) requestAnimationFrame(anim); else { ctx.clearRect(0,0,canvas.width,canvas.height); canvas.style.display = 'none'; }
      };
      anim();
    } catch (e) {}
  },

  // Dessine les points sur le dé
  _drawDots(n) {
    const dots = document.getElementById('dice-dots');
    if (!dots) return;
    while (dots.firstChild) dots.removeChild(dots.firstChild);
    const mk = (cx, cy) => {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', String(cx)); c.setAttribute('cy', String(cy)); c.setAttribute('r', '4.5');
      c.setAttribute('fill', '#f8fafc');
      dots.appendChild(c);
    };
    const coords = {
      1: [[50,50]],
      2: [[30,30],[70,70]],
      3: [[30,30],[50,50],[70,70]],
      4: [[30,30],[30,70],[70,30],[70,70]],
      5: [[30,30],[30,70],[70,30],[70,70],[50,50]],
      6: [[30,22],[30,50],[30,78],[70,22],[70,50],[70,78]]
    };
    if (n >= 1 && n <= 6) coords[n].forEach(c => mk(c[0], c[1])); else {
      const t = document.createElementNS('http://www.w3.org/2000/svg','text');
      t.setAttribute('x','50'); t.setAttribute('y','58'); t.setAttribute('text-anchor','middle'); t.setAttribute('font-size','36'); t.setAttribute('fill','#f8fafc'); t.setAttribute('font-weight','700');
      t.textContent = String(n);
      dots.appendChild(t);
    }
  },

  // La fonction ROLL principale, maintenant une méthode de l'objet 'dice'
  roll({ faces = 20, mod = 0, threshold = null, animate = true } = {}) {
    const self = this; // 'this' fait référence à l'objet 'dice'
    return new Promise((resolve) => {
      const raw = Math.floor(self._rng() * faces) + 1;
      const total = raw + (Number(mod) || 0);
      const ok = threshold === null ? null : (total >= threshold);
      const result = { roll: raw, faces, mod, total, ok, ts: Date.now() };
      self.history.push(result); if (self.history.length > 300) self.history.shift();

      // Logique pour le journal (sera gérée par le store via 'dispatch')
      
      // La logique d'animation de l'interface (UI)
      try {
        const modal = document.getElementById('dice-modal');
        const svg = document.getElementById('dice-svg');
        const overlay = document.getElementById('dice-overlay');
        const countEl = document.getElementById('dice-count');
        const titleEl = document.getElementById('dice-modal-title');

        if (!modal || !svg || !countEl || !titleEl) { // Sécurité renforcée
          console.warn("Éléments du modal de dés non trouvés.");
          resolve(result); 
          return; 
        }

        titleEl.textContent = `Lancer D${faces}`;
        overlay.style.opacity = '0';
        countEl.textContent = '…';
        const isD6 = faces === 6;
        const steps = Math.min(12, Math.max(6, Math.floor(faces / 2)));
        let step = 0;

        const frame = () => {
          step++;
          const interm = Math.floor(self._rng() * Math.min(6, faces)) + 1;
          if (isD6) self._drawDots(interm);
          else {
            // Logique pour D20, etc.
            const dots = document.getElementById('dice-dots');
            while (dots.firstChild) dots.removeChild(dots.firstChild);
            const t = document.createElementNS('http://www.w3.org/2000/svg','text');
            t.setAttribute('x','50'); t.setAttribute('y','58'); t.setAttribute('text-anchor','middle'); t.setAttribute('font-size','28'); t.setAttribute('fill','#f8fafc');
            t.textContent = String(interm);
            dots.appendChild(t);
          }
          if (step < steps) setTimeout(frame, 40 + Math.random()*30);
          else {
            // Affiche le résultat final
            if (isD6 && raw <= 6) self._drawDots(raw);
            else {
              const dots = document.getElementById('dice-dots');
              while (dots.firstChild) dots.removeChild(dots.firstChild);
              const t = document.createElementNS('http://www.w3.org/2000/svg','text');
              t.setAttribute('x','50'); t.setAttribute('y','58'); t.setAttribute('text-anchor','middle'); t.setAttribute('font-size','36'); t.setAttribute('fill','#f8fafc'); t.setAttribute('font-weight','700');
              t.textContent = String(total);
              dots.appendChild(t);
            }
            svg.style.transform = 'rotate(0deg) scale(1)';
            overlay.textContent = total;
            overlay.style.opacity = '1';
            countEl.textContent = String(total) + (ok === null ? '' : (ok ? ' ✓' : ' ✕'));
            if (ok === true) { self._burstConfetti(window.innerWidth/2, window.innerHeight/2); self._playSound(true); }
            else if (ok === false) { self._playSound(false); }
          }
        };

        modal.style.display = 'flex';
        svg.style.transform = 'rotate(720deg) scale(.96)';
        setTimeout(() => frame(), 80);
      } catch (e) {
        console.error('Erreur UI du dé', e);
      }

      // Résout la promesse (le 'await' dans main.js sera libéré)
      setTimeout(() => resolve(result), 180);
    });
  }
};
