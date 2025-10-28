// DiceManager autonome, testable, injectable RNG
app.dice = {
  rng: () => Math.random(),
  history: [],
  setRNG(fn) {
    if (typeof fn === 'function') this.rng = fn;
    else this.rng = () => Math.random();
  },

  // opts: { faces=20, mod=0, threshold=null, context='', animate=true }
  roll(opts = {}) {
    const { faces = 20, mod = 0, threshold = null, context = '', animate = true } = opts;
    return new Promise((resolve) => {
      const raw = Math.floor(this.rng() * faces) + 1;
      const total = raw + (Number(mod) || 0);
      const ok = threshold === null ? null : (total >= threshold);
      const result = { roll: raw, faces, mod, total, ok, context, ts: Date.now() };
      this.history.push(result);
      if (this.history.length > 200) this.history.shift();

      // UI: modal with simple numeric animation (count-up)
      const showAnimatedModal = () => {
        const title = `Lancer D${faces}`;
        const messageBase = `Résultat: `;
        // Create minimal modal if not present
        let modal = document.getElementById('dice-modal');
        if (!modal) {
          modal = document.createElement('div');
          modal.id = 'dice-modal';
          modal.style.position = 'fixed';
          modal.style.inset = '0';
          modal.style.display = 'flex';
          modal.style.alignItems = 'center';
          modal.style.justifyContent = 'center';
          modal.style.background = 'rgba(0,0,0,0.6)';
          modal.style.zIndex = 9999;
          modal.innerHTML = `<div style="background:var(--fjord-light);padding:18px;border-radius:10px;min-width:260px;text-align:center;color:#e2e8f0">
            <div id="dice-modal-title" style="font-weight:800;margin-bottom:8px">${title}</div>
            <div id="dice-modal-body" style="font-size:20px;margin-bottom:12px">${messageBase}<span id="dice-count">…</span></div>
            <button id="dice-modal-close" class="btn btn-primary">OK</button>
          </div>`;
          document.body.appendChild(modal);
          modal.querySelector('#dice-modal-close').addEventListener('click', () => {
            modal.style.display = 'none';
          });
        } else {
          modal.style.display = 'flex';
          modal.querySelector('#dice-modal-title').textContent = title;
        }

        const counterEl = modal.querySelector('#dice-count');
        counterEl.textContent = '…';

        if (!animate) {
          counterEl.textContent = String(total);
          const desc = ok === null ? '' : (ok ? ' — Succès' : ' — Échec');
          modal.querySelector('#dice-modal-body').textContent = `${messageBase}${total}${desc}`;
          return;
        }

        // animation: count up from 1 to total (fast)
        const steps = Math.min(20, Math.max(6, Math.floor(faces / 2)));
        let step = 0;
        const start = 1;
        const end = total;
        const delta = (end - start) / steps;
        const interval = 40;
        const anim = setInterval(() => {
          step++;
          const val = Math.round(start + delta * step);
          counterEl.textContent = String(val);
          if (step >= steps) {
            clearInterval(anim);
            counterEl.textContent = String(total);
            const desc = ok === null ? '' : (ok ? ' — Succès' : ' — Échec');
            modal.querySelector('#dice-modal-body').textContent = `${messageBase}${total}${desc}`;
          }
        }, interval);
      };

      // Always add an entry to journal if app.addLog exists
      if (typeof app.addLog === 'function') {
        if (ok === null) app.addLog(`Lancer D${faces} => ${total}`);
        else app.addLog(`Test D${faces} (${threshold}) => ${total} (${ok ? 'OK' : 'KO'})`);
      }

      // show modal then resolve
      if (typeof document !== 'undefined') {
        try {
          showAnimatedModal();
        } catch (e) {
          // ignore UI errors
        }
      }

      // small delay to let animation start
      setTimeout(() => resolve(result), 120);
    });
  }
};