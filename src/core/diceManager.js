export class DiceManager {
  constructor(logger = null) {
    this.rng = () => Math.random();
    this.history = [];
    this.logger = typeof logger === 'function' ? logger : null;
  }

  setRNG(fn) {
    if (typeof fn === 'function') this.rng = fn;
    else this.rng = () => Math.random();
  }

  setLogger(fn) {
    this.logger = typeof fn === 'function' ? fn : null;
  }

  // opts: { faces=20, mod=0, threshold=null, context='', animate=true }
  roll(opts = {}) {
    const { faces = 20, mod = 0, threshold = null, context = '', animate = true } = opts;
    return new Promise((resolve) => {
      const raw = Math.floor(this.rng() * faces) + 1;
      const total = raw + (Number(mod) || 0);
      const ok = threshold === null ? null : total >= threshold;
      const result = { roll: raw, faces, mod, total, ok, context, ts: Date.now() };
      this.history.push(result);
      if (this.history.length > 200) this.history.shift();

      this.writeLog(result, threshold);
      this.showModal(result, animate);

      setTimeout(() => resolve(result), 120);
    });
  }

  writeLog(result, threshold) {
    if (!this.logger) return;
    const { faces, total, ok, roll, mod, context } = result;
    const label = context ? `[${context}] ` : '';
    if (threshold == null) {
      const modPart = mod ? ` (jet ${roll}${mod >= 0 ? ' +' : ' '}${mod})` : ` (jet ${roll})`;
      this.logger(`${label}Lancer D${faces} => ${total}${modPart}`);
    } else {
      const modPart = mod ? ` | base ${roll}${mod >= 0 ? ' +' : ' '}${mod}` : '';
      this.logger(
        `${label}Test D${faces} (seuil ${threshold}) => ${total} (${ok ? 'OK' : 'KO'})${modPart}`,
      );
    }
  }

  showModal(result, animate) {
    if (typeof document === 'undefined') return;
    const { faces, total, ok } = result;
    const title = `Lancer D${faces}`;
    const messageBase = `Résultat: `;

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
            <div id="dice-modal-title" style="font-weight:800;margin-bottom:8px"></div>
            <div id="dice-modal-body" style="font-size:20px;margin-bottom:12px">${messageBase}<span id="dice-count">…</span></div>
            <button id="dice-modal-close" class="btn btn-primary">OK</button>
          </div>`;
      document.body.appendChild(modal);
      modal.querySelector('#dice-modal-close').addEventListener('click', () => {
        modal.style.display = 'none';
      });
    } else {
      modal.style.display = 'flex';
    }

    modal.querySelector('#dice-modal-title').textContent = title;
    const body = modal.querySelector('#dice-modal-body');
    const counterEl = modal.querySelector('#dice-count');
    counterEl.textContent = '…';

    if (!animate) {
      const desc = ok === null ? '' : ok ? ' — Succès' : ' — Échec';
      body.textContent = `${messageBase}${total}${desc}`;
      return;
    }

    const steps = Math.min(20, Math.max(6, Math.floor(faces / 2)));
    let step = 0;
    const start = 1;
    const end = total;
    const delta = (end - start) / steps;
    const interval = 40;
    const anim = setInterval(() => {
      step += 1;
      const val = Math.round(start + delta * step);
      counterEl.textContent = String(val);
      if (step >= steps) {
        clearInterval(anim);
        counterEl.textContent = String(total);
        const desc = ok === null ? '' : ok ? ' — Succès' : ' — Échec';
        body.textContent = `${messageBase}${total}${desc}`;
      }
    }, interval);
  }
}
