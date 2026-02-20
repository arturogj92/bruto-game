const App = {
  currentPlayer: null,
  currentCharacter: null,
  players: [],
  defs: {},
  screenStack: ["select"],
  _pendingChoices: null,
  _pveCooldown: false,
  _pveCooldownEnd: 0,
  _cooldownInterval: null,

  async init() {
    try { this.defs = await API.getDefinitions(); } catch(e) { console.warn("Defs:", e); }
    await new Promise(r => setTimeout(r, 1500));
    await this.showPlayerSelect();
  },

  pushScreen(name) { this.screenStack.push(name); },
  goBack() {
    this.screenStack.pop();
    const prev = this.screenStack[this.screenStack.length - 1];
    if (prev === "hub") this.showHub();
    else this.showPlayerSelect();
  },
  setScreen(html) { document.getElementById("app").innerHTML = html; },

  // ============ SCREENS ============
  async showPlayerSelect() {
    this.screenStack = ["select"];
    this.currentPlayer = null;
    this.currentCharacter = null;
    try {
      this.players = await API.getPlayers();
      this.setScreen(Views.playerSelect(this.players));
    } catch(e) { this.toast("Error: " + e.message, "error"); }
  },

  async selectPlayer(slug) {
    try {
      const player = await API.getPlayer(slug);
      this.currentPlayer = player;
      if (player.character) {
        this.currentCharacter = player.character;
        this.pushScreen("hub");
        this.showHub();
      } else {
        this.pushScreen("create");
        this.setScreen(Views.characterCreate(player));
      }
    } catch(e) { this.toast("Error: " + e.message, "error"); }
  },

  async createCharacter() {
    const input = document.getElementById("char-name");
    const name = input ? input.value.trim() : "";
    if (!name || name.length < 2 || name.length > 20) {
      this.toast("Nombre: 2-20 caracteres", "error"); return;
    }
    try {
      const result = await API.createCharacter(this.currentPlayer.slug, name);
      this.currentCharacter = result.character;
      this.toast("¡Guerrero creado! ⚔️", "success");
      this.screenStack.pop();
      this.pushScreen("hub");
      this.showHub();
    } catch(e) { this.toast("Error: " + e.message, "error"); }
  },

  async showHub() {
    if (!this.currentPlayer) { this.showPlayerSelect(); return; }
    try {
      const player = await API.getPlayer(this.currentPlayer.slug);
      this.currentPlayer = player;
      this.currentCharacter = player.character;
      if (!this.currentCharacter) { this.showPlayerSelect(); return; }

      if (this.currentCharacter.pending_choices) {
        this.setScreen(Views.mainHub(this.currentPlayer, this.currentCharacter, this.defs));
        const choices = JSON.parse(this.currentCharacter.pending_choices);
        this.showLevelUpChoice(choices);
        return;
      }

      this.setScreen(Views.mainHub(this.currentPlayer, this.currentCharacter, this.defs));
    } catch(e) {
      this.toast("Error: " + e.message, "error");
      if (this.currentPlayer && this.currentCharacter) {
        this.setScreen(Views.mainHub(this.currentPlayer, this.currentCharacter, this.defs));
      }
    }
  },

  // ============ MATCHMAKING PVP ============
  async matchmaking() {
    if (!this.currentCharacter) return;
    try {
      this.toast("🔎 Buscando rival...", "info");
      const result = await API.matchmaking(this.currentCharacter.id);
      
      const introEntry = result.log.find(e => e.type === "intro");
      const opp = result.opponent;
      const oppSlug = opp?.player_avatar || opp?.player_slug;

      const f1 = {
        name: introEntry.f1.name, level: introEntry.f1.level, hp_max: introEntry.f1.hp_max,
        avatarImg: getAvatarUrl(this.currentPlayer.slug)
      };
      const f2 = {
        name: introEntry.f2.name, level: introEntry.f2.level, hp_max: introEntry.f2.hp_max,
        avatarImg: getAvatarUrl(oppSlug || "guerrero")
      };

      await this.playCombat(f1, f2, result.log, false);

      this.currentCharacter = result.character;
      this._pendingChoices = result.pendingChoices;

      this.showResult(result.result === "win", result.xpGained, result.character, result.leveledUp, result.goldGained);
    } catch(e) { this.toast("Error: " + e.message, "error"); }
  },

  // ============ DIRECT PVP ============
  async showPVPSelect() {
    if (!this.currentCharacter) return;
    try {
      const lb = await API.getLeaderboard();
      const opponents = lb.filter(c => c.id !== this.currentCharacter.id);
      this.pushScreen("pvp");
      this.setScreen(Views.pvpSelect(opponents, this.currentCharacter));
    } catch(e) { this.toast("Error: " + e.message, "error"); }
  },

  async fightPVP(opponentId) {
    if (!this.currentCharacter) return;
    try {
      this.toast("⚔️ ¡Preparando duelo!", "info");
      const result = await API.fightPVP(this.currentCharacter.id, opponentId);
      
      const introEntry = result.log.find(e => e.type === "intro");
      const oppChar = Object.values(result.characters).find(c => c.id !== this.currentCharacter.id);
      
      const allPlayers = this.players.length ? this.players : await API.getPlayers();
      const oppPlayer = allPlayers.find(p => p.character && p.character.id === opponentId);

      const f1 = {
        name: introEntry.f1.name, level: introEntry.f1.level, hp_max: introEntry.f1.hp_max,
        avatarImg: getAvatarUrl(this.currentPlayer.slug)
      };
      const f2 = {
        name: introEntry.f2.name, level: introEntry.f2.level, hp_max: introEntry.f2.hp_max,
        avatarImg: getAvatarUrl(oppPlayer?.slug || "guerrero")
      };

      await this.playCombat(f1, f2, result.log, false);

      this.currentCharacter = result.character;
      this._pendingChoices = result.pendingChoices;
      
      this.showResult(result.result === "win", result.xpGained, result.character, result.leveledUp, result.goldGained);
    } catch(e) { this.toast("Error: " + e.message, "error"); }
  },

  // ============ PVE ARENA ============
  async showPveArena() {
    if (!this.currentCharacter) return;
    try {
      this.pushScreen("pve");
      const info = await API.getPveInfo(this.currentCharacter.id);
      this.setScreen(Views.pveArena(this.currentPlayer, this.currentCharacter, info));
    } catch(e) { this.toast("Error: " + e.message, "error"); }
  },

  async fightPVE(difficulty) {
    if (!this.currentCharacter) return;
    if (this._pveCooldown) {
      const remaining = Math.ceil((this._pveCooldownEnd - Date.now()) / 1000); this.toast("⏳ Espera " + remaining + "s antes de pelear otra vez", "error");
      return;
    }
    try {
      this.toast("🏟️ ¡Entrando en la arena!", "info");
      const result = await API.fightPVE(this.currentCharacter.id, difficulty);
      
      const introEntry = result.log.find(e => e.type === "intro");
      
      // NPC avatar based on difficulty
      const npcAvatars = {
        campesino: "guerrero",
        bandido: "ninja",
        gladiador: "caballero",
        bestia: "berserker"
      };

      const f1 = {
        name: introEntry.f1.name, level: introEntry.f1.level, hp_max: introEntry.f1.hp_max,
        avatarImg: getAvatarUrl(this.currentPlayer.slug)
      };
      const f2 = {
        name: introEntry.f2.name, level: introEntry.f2.level, hp_max: introEntry.f2.hp_max,
        avatarImg: getAvatarUrl(npcAvatars[difficulty] || "guerrero")
      };

      await this.playCombat(f1, f2, result.log, true);

      this.currentCharacter = result.character;
      this._pendingChoices = result.pendingChoices;
      
      this.showPveResult(result.result === "win", result.xpGained, result.character, result.leveledUp, result.fightsToday, result.maxFights, difficulty);

      // Start cooldown with visual timer
      this._pveCooldown = true;
      this._pveCooldownEnd = Date.now() + 10000;
      this._startCooldownTimer();
      setTimeout(() => { this._pveCooldown = false; this._pveCooldownEnd = 0; this._clearCooldownTimer(); }, 10000);
    } catch(e) { this.toast("Error: " + e.message, "error"); }
  },

  showPveResult(isWin, xpGained, character, leveledUp, fightsToday, maxFights, difficulty, goldGained) {
    this.setScreen(Views.pveResultScreen(isWin, xpGained, character, leveledUp, fightsToday, maxFights, difficulty, goldGained));
  },

  async closePveResult() {
    if (this._pendingChoices && this._pendingChoices.length > 0) {
      this.showLevelUpChoice(this._pendingChoices);
      return;
    }
    await this.showPveArena();
  },

  // ============ COMBAT ============
  async playCombat(f1, f2, log, isPvE) {
    const container = document.getElementById("app");
    const animator = new CombatAnimator(container, f1, f2, isPvE);
    animator.render();
    await animator.play(log);
  },

  // ============ RESULT ============
  showResult(isWin, xpGained, character, leveledUp, goldGained) {
    this.setScreen(Views.resultScreen(isWin, xpGained, character, leveledUp, goldGained));
  },

  async closeResult() {
    if (this._pendingChoices && this._pendingChoices.length > 0) {
      this.showLevelUpChoice(this._pendingChoices);
      return;
    }
    this.screenStack = ["select", "hub"];
    await this.showHub();
  },

  showLevelUpChoice(choices) {
    this._pendingChoices = choices;
    const modal = Views.levelUpChoiceModal(choices);
    document.getElementById("app").insertAdjacentHTML("beforeend", modal);
  },

  async selectLevelUpChoice(index) {
    if (!this.currentCharacter) return;
    try {
      const result = await API.chooseLevelUp(this.currentCharacter.id, index);
      this.currentCharacter = result.character;
      this._pendingChoices = null;
      this.toast("¡Conseguido: " + result.chosen.emoji + " " + result.chosen.name + "!", "success");
      const modal = document.getElementById("levelup-modal");
      if (modal) modal.remove();
      this.screenStack = ["select", "hub"];
      await this.showHub();
    } catch(e) { this.toast("Error: " + e.message, "error"); }
  },

  // ============ EQUIP ============
  async equipItem(slot, itemId) {
    if (!this.currentCharacter) return;
    try {
      await API.equipItem(this.currentCharacter.id, slot, itemId);
      this.toast("Equipado ✅", "success");
      await this.showHub();
    } catch(e) { this.toast("Error: " + e.message, "error"); }
  },

  // ============ LEADERBOARD ============
  async showLeaderboard() {
    try {
      this.pushScreen("leaderboard");
      const chars = await API.getLeaderboard();
      this.setScreen(Views.leaderboard(chars));
    } catch(e) { this.toast("Error: " + e.message, "error"); }
  },

  // ============ TOURNAMENT ============
  async showTournament() {
    try {
      this.pushScreen("tournament");
      const data = await API.getTournament();
      this.setScreen(Views.tournament(data));
    } catch(e) { this.toast("Error: " + e.message, "error"); }
  },

  async startTournament() {
    try {
      this.toast("¡Torneo iniciado!", "info");
      const data = await API.startTournament();
      this.setScreen(Views.tournament(data));
    } catch(e) { this.toast("Error: " + e.message, "error"); }
  },

  async playTournamentMatch(matchId) {
    try {
      const result = await API.playTournamentMatch(matchId);
      if (result.bye) { this.toast("Pase automático", "info"); await this.showTournament(); return; }

      const intro = result.fightLog.find(e => e.type === "intro");
      if (intro) {
        const f1 = { name: intro.f1.name, level: intro.f1.level, hp_max: intro.f1.hp_max, avatarImg: "/img/bruto_guerrero.png" };
        const f2 = { name: intro.f2.name, level: intro.f2.level, hp_max: intro.f2.hp_max, avatarImg: "/img/bruto_guerrero.png" };
        await this.playCombat(f1, f2, result.fightLog, false);
      }

      if (result.tournament.status === "finished") {
        this.toast("🏆 ¡Campeón coronado! 👑", "success");
      }
      this.setScreen(Views.tournament(result.tournament));
    } catch(e) { this.toast("Error: " + e.message, "error"); }
  },

  async resetTournament() {
    if (!confirm("¿Reiniciar torneo?")) return;
    try { await API.resetTournament(); this.toast("Torneo reiniciado", "info"); await this.showTournament(); }
    catch(e) { this.toast("Error: " + e.message, "error"); }
  },


  // ============ COOLDOWN TIMER ============
  _startCooldownTimer() {
    this._clearCooldownTimer();
    const updateTimer = () => {
      const btns = document.querySelectorAll(".pve-fight-btn, .pve-difficulty-card");
      const remaining = Math.max(0, Math.ceil((this._pveCooldownEnd - Date.now()) / 1000));
      if (remaining <= 0) { this._clearCooldownTimer(); return; }
      btns.forEach(btn => {
        if (!btn.dataset.originalText) btn.dataset.originalText = btn.textContent;
        let overlay = btn.querySelector(".cooldown-overlay");
        if (!overlay) {
          overlay = document.createElement("div");
          overlay.className = "cooldown-overlay";
          btn.style.position = "relative";
          btn.style.overflow = "hidden";
          btn.appendChild(overlay);
        }
        overlay.style.cssText = "position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:800;color:#ff6b6b;border-radius:inherit;z-index:2;pointer-events:none;";
        overlay.textContent = "⏳ " + remaining + "s";
      });
    };
    updateTimer();
    this._cooldownInterval = setInterval(updateTimer, 200);
  },

  _clearCooldownTimer() {
    if (this._cooldownInterval) { clearInterval(this._cooldownInterval); this._cooldownInterval = null; }
    document.querySelectorAll(".cooldown-overlay").forEach(el => el.remove());
  },

  // ============ TOAST ============
  toast(msg, type) {
    type = type || "info";
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = "toast " + type;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(function() {
      toast.style.opacity = "0"; toast.style.transform = "translateY(-20px)";
      setTimeout(function() { toast.remove(); }, 300);
    }, 3000);
  }
};

document.addEventListener("DOMContentLoaded", function() { App.init(); });

// ============ COMBO BOOK ============
App.showComboBook = async function() {
  if (!this.currentCharacter) return;
  try {
    this.pushScreen('combobook');
    const [combos, discoveries] = await Promise.all([
      API.getCombos ? API.getCombos() : fetch('/api/combos').then(r => r.json()),
      API.getDiscoveries ? API.getDiscoveries(this.currentCharacter.id) : fetch('/api/discoveries/' + this.currentCharacter.id).then(r => r.json())
    ]);
    this.setScreen(Views.comboBook(combos, discoveries, this.currentCharacter));
  } catch(e) { 
    this.toast('Error: ' + e.message, 'error');
    console.error(e);
  }
};


// ============ MARKET & SHOP ============
App.showMarket = async function(tab) {
  if (!this.currentCharacter) return;
  Views._marketTab = tab || 'shop';
  try {
    this.pushScreen('market');
    const [shopData, mpData, myListings] = await Promise.all([
      API.getShop(),
      API.getMarketplace(),
      API.getMyListings(this.currentCharacter.id)
    ]);
    this.setScreen(Views.marketScreen(shopData, mpData, myListings, this.currentCharacter, this.defs));
  } catch(e) { this.toast('Error: ' + e.message, 'error'); }
};

App.switchMarketTab = async function(tab) {
  Views._marketTab = tab;
  await App.showMarket(tab);
};

App.buyFromShop = async function(itemType, itemId, price) {
  if (!this.currentCharacter) return;
  try {
    const result = await API.buyFromShop(this.currentCharacter.id, itemType, itemId, price);
    this.currentCharacter = result.character;
    this.toast('\u{1FA99} \u00A1Item comprado!', 'success');
    await App.showMarket('shop');
  } catch(e) { this.toast('Error: ' + e.message, 'error'); }
};

App.buyFromMarketplace = async function(listingId) {
  if (!this.currentCharacter) return;
  try {
    const result = await API.buyFromMarketplace(this.currentCharacter.id, listingId);
    this.currentCharacter = result.character;
    this.toast('\u{1FA99} \u00A1Compra realizada!', 'success');
    await App.showMarket('market');
  } catch(e) { this.toast('Error: ' + e.message, 'error'); }
};

App.cancelListing = async function(listingId) {
  if (!this.currentCharacter) return;
  try {
    const result = await API.cancelListing(this.currentCharacter.id, listingId);
    this.currentCharacter = result.character;
    this.toast('Item retirado del mercado', 'info');
    await App.showMarket('market');
  } catch(e) { this.toast('Error: ' + e.message, 'error'); }
};

App.listItemForSale = async function() {
  if (!this.currentCharacter) return;
  var sel = document.getElementById('sell-item-select');
  var priceInput = document.getElementById('sell-price-input');
  if (!sel || !priceInput) return;
  var val = sel.value;
  if (!val) { App.toast('Selecciona un item', 'error'); return; }
  var parts = val.split('|');
  var itemType = parts[0], itemId = parts[1];
  var price = parseInt(priceInput.value);
  if (!price || price < 10 || price > 9999) { App.toast('Precio: 10-9999', 'error'); return; }
  try {
    var result = await API.listOnMarketplace(App.currentCharacter.id, itemType, itemId, price);
    App.currentCharacter = result.character;
    App.toast('\u{1FA99} Item puesto a la venta', 'success');
    await App.showMarket('market');
  } catch(e) { App.toast('Error: ' + e.message, 'error'); }
};
