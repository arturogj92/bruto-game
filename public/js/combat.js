// Combat Animation System v2 - Visual real-time combat (PvP + PvE)
class CombatAnimator {
  constructor(container, fighter1Data, fighter2Data, isPvE) {
    this.container = container;
    this.f1 = fighter1Data;
    this.f2 = fighter2Data;
    this.isPvE = isPvE || false;
    this.resolve = null;
  }

  render() {
    var label = this.isPvE ? "🏟️ ARENA PvE 🏟️" : "⚔️ COMBATE PVP ⚔️";
    this.container.innerHTML =
      "<div class=\"arena " + (this.isPvE ? "arena-pve" : "") + "\">" +
        "<div class=\"arena-bg\"></div>" +
        "<div class=\"arena-header\">" +
          "<div class=\"arena-vs\">" + label + "</div>" +
        "</div>" +
        "<div class=\"arena-fighters\">" +
          "<div class=\"fighter-panel\" id=\"fp-left\">" +
            "<div class=\"fighter-avatar-img left\" id=\"avatar-left\">" +
              "<img src=\"" + (this.f1.avatarImg || "/img/bruto_guerrero.png") + "\" alt=\"" + this.f1.name + "\" onerror=\"this.src=/img/bruto_guerrero.png\">" +
            "</div>" +
            "<div class=\"fighter-name\">" + this.f1.name + "</div>" +
            "<div class=\"fighter-level\">Nv. " + this.f1.level + "</div>" +
            "<div class=\"fighter-hp-bar\"><div class=\"fighter-hp-fill\" id=\"hp-left\" style=\"width:100%\"></div></div>" +
            "<div class=\"fighter-hp-text\" id=\"hp-text-left\">" + this.f1.hp_max + " / " + this.f1.hp_max + "</div>" +
          "</div>" +
          "<div class=\"arena-vs-icon\">" + (this.isPvE ? "🏟️" : "⚔️") + "</div>" +
          "<div class=\"fighter-panel\" id=\"fp-right\">" +
            "<div class=\"fighter-avatar-img right\" id=\"avatar-right\">" +
              "<img src=\"" + (this.f2.avatarImg || "/img/bruto_guerrero.png") + "\" alt=\"" + this.f2.name + "\" onerror=\"this.src=/img/bruto_guerrero.png\">" +
            "</div>" +
            "<div class=\"fighter-name\">" + this.f2.name + "</div>" +
            "<div class=\"fighter-level\">Nv. " + this.f2.level + "</div>" +
            "<div class=\"fighter-hp-bar\"><div class=\"fighter-hp-fill\" id=\"hp-right\" style=\"width:100%\"></div></div>" +
            "<div class=\"fighter-hp-text\" id=\"hp-text-right\">" + this.f2.hp_max + " / " + this.f2.hp_max + "</div>" +
          "</div>" +
        "</div>" +
        "<div class=\"arena-log\" id=\"combat-log\"></div>" +
      "</div>";
  }

  async play(log) {
    var self = this;
    return new Promise(async function(resolve) {
      self.resolve = resolve;
      var turnDelay = Math.max(200, Math.min(800, 7000 / Math.max(log.length, 1)));
      
      for (var i = 0; i < log.length; i++) {
        await self.processEntry(log[i], turnDelay);
      }
      await self.wait(1200);
      resolve();
    });
  }

  async processEntry(entry, baseDelay) {
    try {
    switch (entry.type) {
      case "intro":
        this.addLog(entry.text, "ability");
        await this.wait(800);
        break;
      case "attack":
        await this.animateAttack(entry);
        await this.wait(baseDelay);
        break;
      case "dodge":
        await this.animateDodge(entry);
        await this.wait(baseDelay * 0.7);
        break;
      case "ability":
      case "heal":
      case "lifesteal":
        this.addLog(entry.text, entry.type === "heal" || entry.type === "lifesteal" ? "heal" : "ability");
        if (entry.amount) {
          var healSide = entry.fighter === this.f1.name ? "left" : "right";
          this.showDamageNumber(healSide, "+" + entry.amount, true);
        }
        this.syncHP(entry);
        await this.wait(baseDelay * 0.6);
        break;
      case "counter":
      case "thorns":
        this.addLog(entry.text, "damage");
        var cSide = entry.target === this.f1.name ? "left" : "right";
        this.showDamageNumber(cSide, "-" + entry.damage, false);
        this.flashAvatar(cSide);
        this.syncHP(entry);
        await this.wait(baseDelay * 0.5);
        break;
      case "double_strike":
        this.addLog(entry.text, "critical");
        var dsSide = entry.defender === this.f1.name ? "left" : "right";
        this.showDamageNumber(dsSide, "-" + entry.damage, false);
        this.flashAvatar(dsSide);
        this.syncHP(entry);
        await this.wait(baseDelay * 0.5);
        break;
      case "poison":
        this.addLog(entry.text, "damage");
        var pSide = entry.fighter === this.f1.name ? "left" : "right";
        this.showDamageNumber(pSide, "-" + entry.damage, false);
        this.syncHP(entry);
        await this.wait(baseDelay * 0.4);
        break;
      case "stun":
        this.addLog(entry.text, "ability");
        await this.wait(baseDelay * 0.5);
        break;
      case "status":
        this.f1hp = entry.f1.hp; this.f1hpMax = entry.f1.hp_max; this.f2hp = entry.f2.hp; this.f2hpMax = entry.f2.hp_max; this.updateHPBars(entry.f1, entry.f2);
        break;
      case "end":
        this.updateHPBars(entry.f1, entry.f2);
        this.addLog(entry.text, "end");
        await this.wait(600);
        break;
      default:
        if (entry.text) this.addLog(entry.text, "ability");
        this.syncHP(entry);
        await this.wait(baseDelay * 0.4);
        break;
    }
    } catch(err) { console.error("Combat anim error:", err, entry); if (entry.text) this.addLog(entry.text, "ability"); }
  }

  async animateAttack(entry) {
    var isF1 = entry.attacker === this.f1.name;
    var attackerEl = document.getElementById(isF1 ? "avatar-left" : "avatar-right");
    var defSide = isF1 ? "right" : "left";

    if (attackerEl) {
      attackerEl.classList.add(isF1 ? "attack-anim-left" : "attack-anim-right");
      setTimeout(function() { attackerEl.classList.remove("attack-anim-left", "attack-anim-right"); }, 400);
    }
    await this.wait(180);

    this.flashAvatar(defSide);

    if (entry.isCritical || entry.damage > 30) {
      var arena = this.container.querySelector(".arena");
      if (arena) { arena.classList.add("screen-shake"); setTimeout(function() { arena.classList.remove("screen-shake"); }, 300); }
    }

    this.showDamageNumber(defSide, "-" + entry.damage, false, entry.isCritical);
    this.updateHPSingle(defSide, entry.defenderHp, entry.defenderHpMax);
    
    var aSide = isF1 ? "left" : "right";
    if (entry.attackerHp !== undefined) this.updateHPSingle(aSide, entry.attackerHp, entry.attackerHpMax);

    var logClass = "damage";
    if (entry.isCritical) logClass = "critical";
    this.addLog(entry.text, logClass);
  }

  async animateDodge(entry) {
    var isF1Def = entry.defender === this.f1.name;
    var el = document.getElementById(isF1Def ? "avatar-left" : "avatar-right");
    if (el) { el.classList.add("dodge-anim"); setTimeout(function() { el.classList.remove("dodge-anim"); }, 400); }
    this.addLog(entry.text, "dodge");
  }

  flashAvatar(side) {
    var el = document.getElementById("avatar-" + side);
    if (el) { el.classList.add("hit-flash"); setTimeout(function() { el.classList.remove("hit-flash"); }, 200); }
  }

  showDamageNumber(side, text, isHeal, isCritical) {
    var panel = document.getElementById("fp-" + side);
    if (!panel) return;
    var dmgEl = document.createElement("div");
    dmgEl.className = "damage-number " + (isHeal ? "heal" : "") + " " + (isCritical ? "critical" : "");
    dmgEl.textContent = text;
    dmgEl.style.left = (30 + Math.random() * 40) + "%";
    dmgEl.style.top = "20px";
    panel.style.position = "relative";
    panel.appendChild(dmgEl);
    setTimeout(function() { dmgEl.remove(); }, 1000);
  }

  updateHPSingle(side, hp, hpMax) {
    var bar = document.getElementById("hp-" + side);
    var txt = document.getElementById("hp-text-" + side);
    if (bar) {
      var p = (hpMax > 0 && !isNaN(hp)) ? (hp / hpMax) * 100 : 100;
      bar.style.width = Math.max(0, p) + "%";
      bar.className = "fighter-hp-fill";
      if (p < 15) bar.classList.add("critical");
      else if (p < 35) bar.classList.add("low");
    }
    if (txt) txt.textContent = (isNaN(hp) ? "?" : Math.max(0, Math.floor(hp))) + " / " + (isNaN(hpMax) ? "?" : Math.floor(hpMax));
  }

  updateHPBars(f1, f2) {
    this.updateHPSingle("left", f1.hp, f1.hp_max);
    this.updateHPSingle("right", f2.hp, f2.hp_max);
  }

  addLog(text, className) {
    className = className || "";
    var logContainer = document.getElementById("combat-log");
    if (!logContainer) return;
    var entry = document.createElement("div");
    entry.className = "log-entry " + className;
    entry.textContent = text;
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
  }

  wait(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
}
