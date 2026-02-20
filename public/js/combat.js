// Combat Animation System v2 - Visual real-time combat
class CombatAnimator {
  constructor(container, fighter1Data, fighter2Data) {
    this.container = container;
    this.f1 = fighter1Data;
    this.f2 = fighter2Data;
    this.resolve = null;
  }

  render() {
    this.container.innerHTML = `
      <div class="arena">
        <div class="arena-bg"></div>
        <div class="arena-header">
          <div class="arena-vs">⚔️ COMBATE PVP ⚔️</div>
        </div>
        <div class="arena-fighters">
          <div class="fighter-panel" id="fp-left">
            <div class="fighter-avatar-img left" id="avatar-left">
              <img src="${this.f1.avatarImg || '/img/bruto_guerrero.png'}" alt="${this.f1.name}" onerror="this.src='/img/bruto_guerrero.png'">
            </div>
            <div class="fighter-name">${this.f1.name}</div>
            <div class="fighter-level">Nv. ${this.f1.level}</div>
            <div class="fighter-hp-bar"><div class="fighter-hp-fill" id="hp-left" style="width:100%"></div></div>
            <div class="fighter-hp-text" id="hp-text-left">${this.f1.hp_max} / ${this.f1.hp_max}</div>
          </div>
          <div class="arena-vs-icon">⚔️</div>
          <div class="fighter-panel" id="fp-right">
            <div class="fighter-avatar-img right" id="avatar-right">
              <img src="${this.f2.avatarImg || '/img/bruto_guerrero.png'}" alt="${this.f2.name}" onerror="this.src='/img/bruto_guerrero.png'">
            </div>
            <div class="fighter-name">${this.f2.name}</div>
            <div class="fighter-level">Nv. ${this.f2.level}</div>
            <div class="fighter-hp-bar"><div class="fighter-hp-fill" id="hp-right" style="width:100%"></div></div>
            <div class="fighter-hp-text" id="hp-text-right">${this.f2.hp_max} / ${this.f2.hp_max}</div>
          </div>
        </div>
        <div class="arena-log" id="combat-log"></div>
      </div>
    `;
  }

  async play(log) {
    return new Promise(async (resolve) => {
      this.resolve = resolve;
      const turnDelay = Math.max(200, Math.min(800, 7000 / Math.max(log.length, 1)));
      
      for (let i = 0; i < log.length; i++) {
        await this.processEntry(log[i], turnDelay);
      }
      await this.wait(1200);
      resolve();
    });
  }

  async processEntry(entry, baseDelay) {
    switch (entry.type) {
      case 'intro':
        this.addLog(entry.text, 'ability');
        await this.wait(800);
        break;
      case 'attack':
        await this.animateAttack(entry);
        await this.wait(baseDelay);
        break;
      case 'dodge':
        await this.animateDodge(entry);
        await this.wait(baseDelay * 0.7);
        break;
      case 'ability':
      case 'heal':
      case 'lifesteal':
        this.addLog(entry.text, entry.type === 'heal' || entry.type === 'lifesteal' ? 'heal' : 'ability');
        if (entry.amount) {
          this.showDamageNumber(entry.fighter === this.f1.name ? 'left' : 'right', `+${entry.amount}`, true);
        }
        await this.wait(baseDelay * 0.6);
        break;
      case 'counter':
      case 'thorns':
        this.addLog(entry.text, 'damage');
        this.showDamageNumber(entry.target === this.f1.name ? 'left' : 'right', `-${entry.damage}`, false);
        await this.wait(baseDelay * 0.5);
        break;
      case 'double_strike':
        this.addLog(entry.text, 'critical');
        this.showDamageNumber(entry.defender === this.f1.name ? 'left' : 'right', `-${entry.damage}`, false);
        this.flashAvatar(entry.defender === this.f1.name ? 'left' : 'right');
        await this.wait(baseDelay * 0.5);
        break;
      case 'poison':
        this.addLog(entry.text, 'damage');
        this.showDamageNumber(entry.fighter === this.f1.name ? 'left' : 'right', `-${entry.damage}`, false);
        await this.wait(baseDelay * 0.4);
        break;
      case 'stun':
        this.addLog(entry.text, 'ability');
        await this.wait(baseDelay * 0.5);
        break;
      case 'status':
        this.updateHPBars(entry.f1, entry.f2);
        break;
      case 'end':
        this.updateHPBars(entry.f1, entry.f2);
        this.addLog(entry.text, 'end');
        await this.wait(600);
        break;
    }
  }

  async animateAttack(entry) {
    const isF1 = entry.attacker === this.f1.name;
    const attackerEl = document.getElementById(isF1 ? 'avatar-left' : 'avatar-right');
    const defenderEl = document.getElementById(isF1 ? 'avatar-right' : 'avatar-left');
    const defSide = isF1 ? 'right' : 'left';

    if (attackerEl) {
      attackerEl.classList.add(isF1 ? 'attack-anim-left' : 'attack-anim-right');
      setTimeout(() => attackerEl.classList.remove('attack-anim-left', 'attack-anim-right'), 400);
    }
    await this.wait(180);

    this.flashAvatar(defSide);

    if (entry.isCritical || entry.damage > 30) {
      const arena = this.container.querySelector('.arena');
      if (arena) { arena.classList.add('screen-shake'); setTimeout(() => arena.classList.remove('screen-shake'), 300); }
    }

    this.showDamageNumber(defSide, `-${entry.damage}`, false, entry.isCritical);
    this.updateHPSingle(defSide, entry.defenderHp, entry.defenderHpMax);
    
    const aSide = isF1 ? 'left' : 'right';
    if (entry.attackerHp !== undefined) this.updateHPSingle(aSide, entry.attackerHp, entry.attackerHpMax);

    let logClass = 'damage';
    if (entry.isCritical) logClass = 'critical';
    this.addLog(entry.text, logClass);
  }

  async animateDodge(entry) {
    const isF1Def = entry.defender === this.f1.name;
    const el = document.getElementById(isF1Def ? 'avatar-left' : 'avatar-right');
    if (el) { el.classList.add('dodge-anim'); setTimeout(() => el.classList.remove('dodge-anim'), 400); }
    this.addLog(entry.text, 'dodge');
  }

  flashAvatar(side) {
    const el = document.getElementById(`avatar-${side}`);
    if (el) { el.classList.add('hit-flash'); setTimeout(() => el.classList.remove('hit-flash'), 200); }
  }

  showDamageNumber(side, text, isHeal = false, isCritical = false) {
    const panel = document.getElementById(`fp-${side}`);
    if (!panel) return;
    const dmgEl = document.createElement('div');
    dmgEl.className = `damage-number ${isHeal ? 'heal' : ''} ${isCritical ? 'critical' : ''}`;
    dmgEl.textContent = text;
    dmgEl.style.left = `${30 + Math.random() * 40}%`;
    dmgEl.style.top = '20px';
    panel.style.position = 'relative';
    panel.appendChild(dmgEl);
    setTimeout(() => dmgEl.remove(), 1000);
  }

  updateHPSingle(side, hp, hpMax) {
    const bar = document.getElementById(`hp-${side}`);
    const txt = document.getElementById(`hp-text-${side}`);
    if (bar) {
      const p = (hp / hpMax) * 100;
      bar.style.width = `${Math.max(0, p)}%`;
      bar.className = 'fighter-hp-fill';
      if (p < 15) bar.classList.add('critical');
      else if (p < 35) bar.classList.add('low');
    }
    if (txt) txt.textContent = `${Math.max(0, hp)} / ${hpMax}`;
  }

  updateHPBars(f1, f2) {
    this.updateHPSingle('left', f1.hp, f1.hp_max);
    this.updateHPSingle('right', f2.hp, f2.hp_max);
  }

  addLog(text, className = '') {
    const logContainer = document.getElementById('combat-log');
    if (!logContainer) return;
    const entry = document.createElement('div');
    entry.className = `log-entry ${className}`;
    entry.textContent = text;
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
  }

  wait(ms) { return new Promise(r => setTimeout(r, ms)); }
}
