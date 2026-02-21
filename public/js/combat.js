// Combat Animation System v2 - Visual real-time combat (PvP + PvE)
// QTE (Quick Time Event) System integrated
// Mashing Rápido + Decisión Táctica mini-games

class QTESystem {
  constructor() {
    this.overlay = null;
    this.markerPos = 0;
    this.animId = null;
    this.resolved = false;
    this.startTime = 0;
    this.duration = 1400;
    this.criticalZoneWidth = 0.12;
    this.criticalZoneStart = 0.44;
    this.criticalZoneEnd = 0.56;
    this.speed = 2.6;
    this.audioCtx = null;
  }

  _beep(freq, duration, type) {
    try {
      if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = this.audioCtx.createOscillator();
      var gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.type = type || "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch(e) { /* audio not supported */ }
  }

  show() {
    var self = this;
    return new Promise(function(resolve) {
      self.resolved = false;
      self.markerPos = 0;
      self.startTime = performance.now();

      // Randomize critical zone position each QTE
      var zoneWidth = self.criticalZoneWidth;
      var center = 0.20 + Math.random() * 0.60; // center between 0.20 and 0.80
      self.criticalZoneStart = center - zoneWidth / 2;
      self.criticalZoneEnd = center + zoneWidth / 2;

      // Create overlay
      self.overlay = document.createElement("div");
      self.overlay.className = "qte-overlay";
      self.overlay.innerHTML =
        '<div class="qte-prompt">⚡ ATTACK! ⚡</div>' +
        '<div class="qte-bar-container">' +
          '<div class="qte-bar">' +
            '<div class="qte-zone-critical"></div>' +
            '<div class="qte-marker"></div>' +
          '</div>' +
        '</div>' +
        '<div class="qte-hint">SPACE / TAP</div>';

      document.body.appendChild(self.overlay);

      // Position the critical zone visually to match logic
      var critZone = self.overlay.querySelector(".qte-zone-critical");
      critZone.style.left = (self.criticalZoneStart * 100) + "%";
      critZone.style.width = (zoneWidth * 100) + "%";

      // Force reflow then show
      self.overlay.offsetHeight;
      self.overlay.classList.add("qte-visible");

      self._beep(440, 0.15, "square");

      var marker = self.overlay.querySelector(".qte-marker");
      var bar = self.overlay.querySelector(".qte-bar");
      var barWidth = bar.offsetWidth;

      // Animate marker with requestAnimationFrame
      function animate(now) {
        if (self.resolved) return;
        var elapsed = now - self.startTime;
        if (elapsed >= self.duration) {
          // Time's up - miss
          self._resolveMiss(resolve);
          return;
        }
        // Ping-pong movement
        var progress = (elapsed / self.duration) * self.speed;
        var cycle = progress % 2;
        self.markerPos = cycle <= 1 ? cycle : 2 - cycle;
        var px = self.markerPos * (barWidth - 4);
        marker.style.transform = "translateX(" + px + "px)";
        self.animId = requestAnimationFrame(animate);
      }
      self.animId = requestAnimationFrame(animate);

      // Input handlers
      function onInput(e) {
        if (self.resolved) return;
        if (e.type === "keydown" && e.code !== "Space") return;
        if (e.type === "keydown") e.preventDefault();
        self._resolveHit(resolve);
      }
      self._onKey = onInput;
      self._onTouch = onInput;
      document.addEventListener("keydown", self._onKey);
      self.overlay.addEventListener("touchstart", self._onTouch, { passive: true });
      self.overlay.addEventListener("click", self._onTouch);
    });
  }

  _resolveHit(resolve) {
    if (this.resolved) return;
    this.resolved = true;
    cancelAnimationFrame(this.animId);
    document.removeEventListener("keydown", this._onKey);

    var isCritical = this.markerPos >= this.criticalZoneStart && this.markerPos <= this.criticalZoneEnd;

    if (isCritical) {
      this._beep(880, 0.1, "square");
      setTimeout(function() { try { 
        var ctx = new (window.AudioContext || window.webkitAudioContext)();
        var o = ctx.createOscillator(); var g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = "square"; o.frequency.value = 1100;
        g.gain.setValueAtTime(0.15, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        o.start(); o.stop(ctx.currentTime + 0.2);
      } catch(e){} }, 100);
      this._showCriticalFeedback(resolve);
    } else {
      this._beep(200, 0.2, "sawtooth");
      this._showMissFeedback(resolve);
    }
  }

  _resolveMiss(resolve) {
    if (this.resolved) return;
    this.resolved = true;
    cancelAnimationFrame(this.animId);
    document.removeEventListener("keydown", this._onKey);
    this._beep(150, 0.3, "sawtooth");
    this._showMissFeedback(resolve);
  }

  _showCriticalFeedback(resolve) {
    var self = this;
    var overlay = this.overlay;
    overlay.innerHTML =
      '<div class="qte-result-critical">' +
        '<div class="qte-critical-text">💥 CRITICAL HIT! 💥</div>' +
        '<div class="qte-critical-x2">x2 DAMAGE</div>' +
      '</div>';
    overlay.classList.add("qte-shake");
    overlay.classList.add("qte-flash");

    setTimeout(function() {
      overlay.classList.remove("qte-visible");
      setTimeout(function() {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        self.overlay = null;
        resolve(true);
      }, 300);
    }, 1100);
  }

  _showMissFeedback(resolve) {
    var self = this;
    var overlay = this.overlay;
    overlay.innerHTML = '<div class="qte-result-miss">miss...</div>';

    setTimeout(function() {
      overlay.classList.remove("qte-visible");
      setTimeout(function() {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        self.overlay = null;
        resolve(false);
      }, 300);
    }, 700);
  }

  cleanup() {
    this.resolved = true;
    cancelAnimationFrame(this.animId);
    if (this._onKey) document.removeEventListener("keydown", this._onKey);
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.overlay = null;
  }
}

// =============================================
// MASHING RÁPIDO SYSTEM (15% chance per combat)
// =============================================
class MashingSystem {
  constructor() {
    this.overlay = null;
    this.tapCount = 0;
    this.active = false;
    this.duration = 3000; // 3 seconds
    this.audioCtx = null;
  }

  _beep(freq, dur, type) {
    try {
      if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = this.audioCtx.createOscillator();
      var gain = this.audioCtx.createGain();
      osc.connect(gain); gain.connect(this.audioCtx.destination);
      osc.type = type || "square"; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + dur);
      osc.start(); osc.stop(this.audioCtx.currentTime + dur);
    } catch(e) {}
  }

  show() {
    var self = this;
    return new Promise(function(resolve) {
      self.tapCount = 0;
      self.active = true;

      self.overlay = document.createElement("div");
      self.overlay.className = "mashing-overlay";
      self.overlay.innerHTML =
        '<div class="mashing-content">' +
          '<div class="mashing-icon">⚡</div>' +
          '<div class="mashing-title">¡PULSA RÁPIDO!</div>' +
          '<div class="mashing-counter" id="mashing-count">0</div>' +
          '<div class="mashing-timer-bar"><div class="mashing-timer-fill" id="mashing-timer"></div></div>' +
          '<div class="mashing-hint">CLICK / SPACE / TAP</div>' +
        '</div>';

      document.body.appendChild(self.overlay);
      self.overlay.offsetHeight;
      self.overlay.classList.add("mashing-visible");

      self._beep(660, 0.15, "square");

      var counterEl = document.getElementById("mashing-count");
      var timerEl = document.getElementById("mashing-timer");
      var startTime = performance.now();

      // Tap handler
      function onTap(e) {
        if (!self.active) return;
        if (e.type === "keydown" && e.code !== "Space") return;
        if (e.type === "keydown") e.preventDefault();
        self.tapCount++;
        if (counterEl) {
          counterEl.textContent = self.tapCount;
          counterEl.classList.remove("mashing-bump");
          void counterEl.offsetWidth;
          counterEl.classList.add("mashing-bump");
        }
        // Tick sound
        self._beep(440 + self.tapCount * 15, 0.05, "square");
      }

      self._onKey = onTap;
      self._onClick = onTap;
      document.addEventListener("keydown", self._onKey);
      self.overlay.addEventListener("touchstart", self._onClick, { passive: true });
      self.overlay.addEventListener("click", self._onClick);

      // Timer animation
      function animTimer(now) {
        if (!self.active) return;
        var elapsed = now - startTime;
        var remaining = Math.max(0, 1 - elapsed / self.duration);
        if (timerEl) {
          timerEl.style.width = (remaining * 100) + "%";
          // Color gradient: green -> yellow -> red
          var r = Math.min(255, Math.floor((1 - remaining) * 2 * 255));
          var g = Math.min(255, Math.floor(remaining * 2 * 255));
          timerEl.style.background = "rgb(" + r + "," + g + ",0)";
        }
        if (elapsed >= self.duration) {
          self._finish(resolve);
          return;
        }
        requestAnimationFrame(animTimer);
      }
      requestAnimationFrame(animTimer);
    });
  }

  _finish(resolve) {
    if (!this.active) return;
    this.active = false;
    document.removeEventListener("keydown", this._onKey);

    var taps = this.tapCount;
    var bonusPercent = 0;
    if (taps >= 26) bonusPercent = 50;
    else if (taps >= 16) bonusPercent = 25;
    else if (taps >= 6) bonusPercent = 10;

    var multiplier = 1 + bonusPercent / 100;

    // Show result
    var resultText = "";
    var resultClass = "";
    if (bonusPercent === 0) {
      resultText = "😤 ¡" + taps + " taps! Sin bonus...";
      resultClass = "mashing-result-miss";
    } else {
      resultText = "💪 ¡" + taps + " taps! +" + bonusPercent + "% daño extra!";
      resultClass = "mashing-result-hit";
      this._beep(880, 0.15, "square");
      setTimeout(function() {
        try {
          var ctx = new (window.AudioContext || window.webkitAudioContext)();
          var o = ctx.createOscillator(); var g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = "square"; o.frequency.value = 1100;
          g.gain.setValueAtTime(0.12, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
          o.start(); o.stop(ctx.currentTime + 0.15);
        } catch(e) {}
      }, 100);
    }

    var self = this;
    this.overlay.innerHTML =
      '<div class="mashing-content">' +
        '<div class="' + resultClass + '">' +
          '<div class="mashing-result-text">' + resultText + '</div>' +
          (bonusPercent > 0 ? '<div class="mashing-result-bonus">NEXT HIT: x' + multiplier.toFixed(1) + '</div>' : '') +
        '</div>' +
      '</div>';

    if (bonusPercent >= 25) {
      this.overlay.classList.add("mashing-shake");
    }

    setTimeout(function() {
      self.overlay.classList.remove("mashing-visible");
      setTimeout(function() {
        if (self.overlay && self.overlay.parentNode) self.overlay.parentNode.removeChild(self.overlay);
        self.overlay = null;
        resolve({ taps: taps, bonusPercent: bonusPercent, multiplier: multiplier });
      }, 400);
    }, 1400);
  }

  cleanup() {
    this.active = false;
    if (this._onKey) document.removeEventListener("keydown", this._onKey);
    if (this.overlay && this.overlay.parentNode) this.overlay.parentNode.removeChild(this.overlay);
    this.overlay = null;
  }
}

// =============================================
// DECISIÓN TÁCTICA SYSTEM (15% chance per combat)
// =============================================
class TacticalDecisionSystem {
  constructor() {
    this.overlay = null;
    this.resolved = false;
    this.duration = 5000; // 5 seconds
    this.audioCtx = null;
  }

  _beep(freq, dur, type) {
    try {
      if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = this.audioCtx.createOscillator();
      var gain = this.audioCtx.createGain();
      osc.connect(gain); gain.connect(this.audioCtx.destination);
      osc.type = type || "square"; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + dur);
      osc.start(); osc.stop(this.audioCtx.currentTime + dur);
    } catch(e) {}
  }

  show(fighterName) {
    var self = this;
    return new Promise(function(resolve) {
      self.resolved = false;

      self.overlay = document.createElement("div");
      self.overlay.className = "tactical-overlay";
      self.overlay.innerHTML =
        '<div class="tactical-content">' +
          '<div class="tactical-title">⚡ ¡DECISIÓN TÁCTICA!</div>' +
          '<div class="tactical-subtitle">' + fighterName + ' necesita tu ayuda</div>' +
          '<div class="tactical-cards">' +
            '<div class="tactical-card tactical-card-heal" id="tc-heal">' +
              '<div class="tactical-card-icon">💚</div>' +
              '<div class="tactical-card-label">Curar</div>' +
              '<div class="tactical-card-desc">+30% HP</div>' +
            '</div>' +
            '<div class="tactical-card tactical-card-damage" id="tc-damage">' +
              '<div class="tactical-card-icon">⚔️</div>' +
              '<div class="tactical-card-label">Daño</div>' +
              '<div class="tactical-card-desc">+50% (3 turnos)</div>' +
            '</div>' +
          '</div>' +
          '<div class="tactical-timer-bar"><div class="tactical-timer-fill" id="tactical-timer"></div></div>' +
          '<div class="tactical-hint">¡ELIGE RÁPIDO!</div>' +
        '</div>';

      document.body.appendChild(self.overlay);
      self.overlay.offsetHeight;
      self.overlay.classList.add("tactical-visible");

      self._beep(550, 0.2, "triangle");

      var timerEl = document.getElementById("tactical-timer");
      var startTime = performance.now();

      // Card click handlers
      var healCard = document.getElementById("tc-heal");
      var dmgCard = document.getElementById("tc-damage");

      function chooseHeal(e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (self.resolved) return;
        self._choose("heal", resolve);
      }
      function chooseDamage(e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (self.resolved) return;
        self._choose("damage", resolve);
      }

      healCard.addEventListener("click", chooseHeal);
      healCard.addEventListener("touchstart", chooseHeal, { passive: false });
      dmgCard.addEventListener("click", chooseDamage);
      dmgCard.addEventListener("touchstart", chooseDamage, { passive: false });

      // Keyboard shortcuts: 1 for heal, 2 for damage
      function onKey(e) {
        if (self.resolved) return;
        if (e.key === "1" || e.key === "a" || e.key === "A") { e.preventDefault(); self._choose("heal", resolve); }
        if (e.key === "2" || e.key === "d" || e.key === "D") { e.preventDefault(); self._choose("damage", resolve); }
      }
      self._onKey = onKey;
      document.addEventListener("keydown", self._onKey);

      // Timer
      function animTimer(now) {
        if (self.resolved) return;
        var elapsed = now - startTime;
        var remaining = Math.max(0, 1 - elapsed / self.duration);
        if (timerEl) {
          timerEl.style.width = (remaining * 100) + "%";
          var r = Math.min(255, Math.floor((1 - remaining) * 2 * 255));
          var g = Math.min(255, Math.floor(remaining * 2 * 255));
          timerEl.style.background = "rgb(" + r + "," + g + ",0)";
        }
        if (elapsed >= self.duration) {
          // Time's up - random choice
          var randomChoice = Math.random() < 0.5 ? "heal" : "damage";
          self._choose(randomChoice, resolve);
          return;
        }
        requestAnimationFrame(animTimer);
      }
      requestAnimationFrame(animTimer);
    });
  }

  _choose(choice, resolve) {
    if (this.resolved) return;
    this.resolved = true;
    if (this._onKey) document.removeEventListener("keydown", this._onKey);

    this._beep(choice === "heal" ? 520 : 780, 0.15, "square");

    var self = this;
    var resultEmoji = choice === "heal" ? "💚" : "⚔️";
    var resultText = choice === "heal" ? "¡CURACIÓN ACTIVADA!" : "¡DAÑO AUMENTADO!";
    var resultDetail = choice === "heal" ? "+30% HP restaurado" : "+50% daño por 3 turnos";

    this.overlay.innerHTML =
      '<div class="tactical-content">' +
        '<div class="tactical-result ' + (choice === "heal" ? "tactical-result-heal" : "tactical-result-damage") + '">' +
          '<div class="tactical-result-icon">' + resultEmoji + '</div>' +
          '<div class="tactical-result-text">' + resultText + '</div>' +
          '<div class="tactical-result-detail">' + resultDetail + '</div>' +
        '</div>' +
      '</div>';

    if (choice === "damage") {
      this.overlay.classList.add("tactical-shake");
    }

    setTimeout(function() {
      self.overlay.classList.remove("tactical-visible");
      setTimeout(function() {
        if (self.overlay && self.overlay.parentNode) self.overlay.parentNode.removeChild(self.overlay);
        self.overlay = null;
        resolve({ choice: choice });
      }, 400);
    }, 1200);
  }

  cleanup() {
    this.resolved = true;
    if (this._onKey) document.removeEventListener("keydown", this._onKey);
    if (this.overlay && this.overlay.parentNode) this.overlay.parentNode.removeChild(this.overlay);
    this.overlay = null;
  }
}

class CombatAnimator {
  constructor(container, fighter1Data, fighter2Data, isPvE) {
    this.container = container;
    this.f1 = fighter1Data;
    this.f2 = fighter2Data;
    this.isPvE = isPvE || false;
    this.resolve = null;
    this.qte = new QTESystem();
    this.qteIndices = [];
    this.qteFired = 0;

    // Mini-game systems
    this.mashing = new MashingSystem();
    this.tactical = new TacticalDecisionSystem();

    // Mini-game state: decide at construction time whether they trigger
    this.mashingEnabled = Math.random() < 0.15;
    this.tacticalEnabled = Math.random() < 0.15;

    // Mashing: pick a random turn between 3-8 to trigger
    this.mashingTriggerTurn = 3 + Math.floor(Math.random() * 6); // turns 3-8
    this.mashingFired = false;
    this.mashingBonus = 1.0; // multiplier for next attack

    // Tactical: track if triggered
    this.tacticalFired = false;
    this.tacticalChoice = null; // "heal" or "damage"
    this.tacticalDamageBoostTurns = 0; // remaining boosted turns
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

  _pickQTETurns(log) {
    // Find all attack entries by the player (f1 = always the player)
    var attackIndices = [];
    for (var i = 0; i < log.length; i++) {
      if (log[i].type === "attack" && log[i].attacker === this.f1.name) {
        attackIndices.push(i);
      }
    }
    if (attackIndices.length < 2) return [];

    // Pick 1-3 random attack turns for QTE
    var count = Math.min(attackIndices.length, Math.floor(Math.random() * 3) + 1);
    // Shuffle and pick
    var shuffled = attackIndices.slice();
    for (var j = shuffled.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var tmp = shuffled[j]; shuffled[j] = shuffled[k]; shuffled[k] = tmp;
    }
    return shuffled.slice(0, count);
  }

  async play(log) {
    var self = this;
    this.qteIndices = this._pickQTETurns(log);
    this.qteFired = 0;

    // Track turn count for mashing trigger
    var turnCount = 0;
    // Track HP for tactical trigger
    var tacticalCheckDone = false;

    return new Promise(async function(resolve) {
      self.resolve = resolve;
      var turnDelay = Math.max(200, Math.min(800, 7000 / Math.max(log.length, 1)));
      
      for (var i = 0; i < log.length; i++) {
        var entry = log[i];

        // Count turns (attacks count as turns)
        if (entry.type === "attack" || entry.type === "dodge") {
          turnCount++;
        }

        // === MASHING RÁPIDO CHECK ===
        if (self.mashingEnabled && !self.mashingFired && turnCount === self.mashingTriggerTurn && entry.type === "attack") {
          self.mashingFired = true;
          var mashResult = await self.mashing.show();
          self.mashingBonus = mashResult.multiplier;
          if (mashResult.bonusPercent > 0) {
            self.addLog("⚡ ¡Mashing Rápido! +" + mashResult.bonusPercent + "% daño en el próximo golpe!", "ability");
          }
        }

        // === TACTICAL DECISION CHECK ===
        // Trigger when any fighter drops below 60% HP for the first time
        if (self.tacticalEnabled && !self.tacticalFired && !tacticalCheckDone) {
          if (entry.type === "status" || entry.defenderHp !== undefined || (entry.f1 && entry.f2)) {
            var f1hp = 999, f1max = 999, f2hp = 999, f2max = 999;
            if (entry.f1 && entry.f2) {
              f1hp = entry.f1.hp; f1max = entry.f1.hp_max;
              f2hp = entry.f2.hp; f2max = entry.f2.hp_max;
            } else if (entry.defenderHp !== undefined) {
              // Partial info - check the defender
              var defIsF1 = (entry.defender === self.f1.name || entry.target === self.f1.name);
              if (defIsF1) { f1hp = entry.defenderHp; f1max = entry.defenderHpMax || self.f1.hp_max; }
              else { f2hp = entry.defenderHp; f2max = entry.defenderHpMax || self.f2.hp_max; }
            }

            var f1Ratio = f1max > 0 ? f1hp / f1max : 1;
            var f2Ratio = f2max > 0 ? f2hp / f2max : 1;

            if (f1Ratio < 0.6 || f2Ratio < 0.6) {
              self.tacticalFired = true;
              tacticalCheckDone = true;
              var tacResult = await self.tactical.show(self.f1.name);
              self.tacticalChoice = tacResult.choice;

              if (tacResult.choice === "heal") {
                // Visual heal: add 30% HP to f1 display
                var healAmount = Math.floor(self.f1.hp_max * 0.3);
                self.addLog("💚 ¡" + self.f1.name + " se cura " + healAmount + " HP!", "heal");
                self.showDamageNumber("left", "+" + healAmount, true);
                // Show heal particles
                self._showHealEffect("left");
              } else {
                // Damage boost for 3 turns
                self.tacticalDamageBoostTurns = 3;
                self.addLog("⚔️ ¡" + self.f1.name + " activa modo FURIA! +50% daño por 3 turnos!", "critical");
                self._showBuffEffect("left");
              }
            }
          }
        }

        await self.processEntry(entry, turnDelay, i);
      }
      await self.wait(1200);
      resolve();
    });
  }

  _showHealEffect(side) {
    var panel = document.getElementById("fp-" + side);
    if (!panel) return;
    for (var i = 0; i < 6; i++) {
      (function(idx) {
        setTimeout(function() {
          var particle = document.createElement("div");
          particle.className = "heal-particle";
          particle.textContent = "💚";
          particle.style.left = (20 + Math.random() * 60) + "%";
          particle.style.animationDelay = (idx * 0.1) + "s";
          panel.style.position = "relative";
          panel.appendChild(particle);
          setTimeout(function() { particle.remove(); }, 1200);
        }, idx * 100);
      })(i);
    }
  }

  _showBuffEffect(side) {
    var panel = document.getElementById("fp-" + side);
    if (!panel) return;
    for (var i = 0; i < 4; i++) {
      (function(idx) {
        setTimeout(function() {
          var particle = document.createElement("div");
          particle.className = "buff-particle";
          particle.textContent = "⚔️";
          particle.style.left = (20 + Math.random() * 60) + "%";
          particle.style.animationDelay = (idx * 0.15) + "s";
          panel.style.position = "relative";
          panel.appendChild(particle);
          setTimeout(function() { particle.remove(); }, 1200);
        }, idx * 120);
      })(i);
    }
    // Add glow to avatar
    var avatar = document.getElementById("avatar-" + side);
    if (avatar) {
      avatar.classList.add("buff-glow");
      setTimeout(function() { avatar.classList.remove("buff-glow"); }, 6000);
    }
  }

  async processEntry(entry, baseDelay, turnIndex) {
    try {
    switch (entry.type) {
      case "intro":
        this.addLog(entry.text, "ability");
        await this.wait(800);
        break;
      case "attack":
        await this.animateAttack(entry, turnIndex);
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

  async animateAttack(entry, turnIndex) {
    var isF1 = entry.attacker === this.f1.name;
    var attackerEl = document.getElementById(isF1 ? "avatar-left" : "avatar-right");
    var defSide = isF1 ? "right" : "left";

    // === QTE CHECK ===
    var isQTETurn = this.qteIndices.indexOf(turnIndex) !== -1;
    var qteCritical = false;

    if (isQTETurn) {
      // Show QTE before the attack animation
      qteCritical = await this.qte.show();
      this.qteFired++;
    }

    // Determine display damage
    var displayDamage = entry.damage;
    var isCriticalDisplay = entry.isCritical || qteCritical;
    if (qteCritical) {
      displayDamage = entry.damage * 2;
    }

    // === MASHING BONUS APPLICATION ===
    if (isF1 && this.mashingBonus > 1.0) {
      displayDamage = Math.floor(displayDamage * this.mashingBonus);
      isCriticalDisplay = true;
      this.mashingBonus = 1.0; // reset after one use
    }

    // === TACTICAL DAMAGE BOOST APPLICATION ===
    if (isF1 && this.tacticalDamageBoostTurns > 0) {
      displayDamage = Math.floor(displayDamage * 1.5);
      isCriticalDisplay = true;
      this.tacticalDamageBoostTurns--;
    }

    if (attackerEl) {
      attackerEl.classList.add(isF1 ? "attack-anim-left" : "attack-anim-right");
      setTimeout(function() { attackerEl.classList.remove("attack-anim-left", "attack-anim-right"); }, 400);
    }
    await this.wait(180);

    this.flashAvatar(defSide);

    if (isCriticalDisplay || displayDamage > 30) {
      var arena = this.container.querySelector(".arena");
      if (arena) { 
        arena.classList.add("screen-shake"); 
        if (qteCritical) arena.classList.add("qte-arena-critical");
        setTimeout(function() { 
          arena.classList.remove("screen-shake"); 
          arena.classList.remove("qte-arena-critical"); 
        }, qteCritical ? 500 : 300); 
      }
    }

    // Show boosted tag if tactical damage boost active
    var isBoosted = isF1 && this.tacticalChoice === "damage" && this.tacticalDamageBoostTurns >= 0 && this.tacticalDamageBoostTurns < 3;
    this.showDamageNumber(defSide, "-" + displayDamage, false, isCriticalDisplay, isBoosted);
    this.updateHPSingle(defSide, entry.defenderHp, entry.defenderHpMax);
    
    var aSide = isF1 ? "left" : "right";
    if (entry.attackerHp !== undefined) this.updateHPSingle(aSide, entry.attackerHp, entry.attackerHpMax);

    var logClass = "damage";
    if (isCriticalDisplay) logClass = "critical";

    // Modified log text for QTE critical
    var logText = entry.text;
    if (qteCritical) {
      logText = "💥 ¡GOLPE CRÍTICO! " + entry.attacker + " hace " + displayDamage + " de daño a " + (entry.defender || "el rival") + "!";
    } else if (isF1 && isBoosted) {
      logText = "⚔️ BOOSTED! " + entry.attacker + " hace " + displayDamage + " de daño a " + (entry.defender || "el rival") + "!";
    }
    this.addLog(logText, logClass);
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

  showDamageNumber(side, text, isHeal, isCritical, isBoosted) {
    var panel = document.getElementById("fp-" + side);
    if (!panel) return;
    var dmgEl = document.createElement("div");
    dmgEl.className = "damage-number " + (isHeal ? "heal" : "") + " " + (isCritical ? "critical" : "") + " " + (isBoosted ? "boosted" : "");
    dmgEl.textContent = text;
    if (isBoosted) {
      var tag = document.createElement("span");
      tag.className = "boosted-tag";
      tag.textContent = " ⚔️";
      dmgEl.appendChild(tag);
    }
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

  syncHP(entry) {
    if (entry.f1 && entry.f2) { this.updateHPBars(entry.f1, entry.f2); }
    if (entry.defenderHp !== undefined) {
      var side = entry.defender === this.f1.name || entry.target === this.f1.name ? "left" : "right";
      this.updateHPSingle(side, entry.defenderHp, entry.defenderHpMax);
    }
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