const App = {
  currentPlayer: null,
  currentCharacter: null,
  players: [],
  defs: {},
  screenStack: ['select'],
  _pendingChoices: null,

  async init() {
    try { this.defs = await API.getDefinitions(); } catch(e) { console.warn('Defs:', e); }
    await new Promise(r => setTimeout(r, 1500));
    await this.showPlayerSelect();
  },

  pushScreen(name) { this.screenStack.push(name); },
  goBack() {
    this.screenStack.pop();
    const prev = this.screenStack[this.screenStack.length - 1];
    if (prev === 'hub') this.showHub();
    else this.showPlayerSelect();
  },
  setScreen(html) { document.getElementById('app').innerHTML = html; },

  // ============ SCREENS ============
  async showPlayerSelect() {
    this.screenStack = ['select'];
    this.currentPlayer = null;
    this.currentCharacter = null;
    try {
      this.players = await API.getPlayers();
      this.setScreen(Views.playerSelect(this.players));
    } catch(e) { this.toast('Error: ' + e.message, 'error'); }
  },

  async selectPlayer(slug) {
    try {
      const player = await API.getPlayer(slug);
      this.currentPlayer = player;
      if (player.character) {
        this.currentCharacter = player.character;
        this.pushScreen('hub');
        this.showHub();
      } else {
        this.pushScreen('create');
        this.setScreen(Views.characterCreate(player));
      }
    } catch(e) { this.toast('Error: ' + e.message, 'error'); }
  },

  async createCharacter() {
    const input = document.getElementById('char-name');
    const name = input ? input.value.trim() : '';
    if (!name || name.length < 2 || name.length > 20) {
      this.toast('Nombre: 2-20 caracteres', 'error'); return;
    }
    try {
      const result = await API.createCharacter(this.currentPlayer.slug, name);
      this.currentCharacter = result.character;
      this.toast('¡Guerrero creado! ⚔️', 'success');
      this.screenStack.pop();
      this.pushScreen('hub');
      this.showHub();
    } catch(e) { this.toast('Error: ' + e.message, 'error'); }
  },

  async showHub() {
    if (!this.currentPlayer) { this.showPlayerSelect(); return; }
    try {
      const player = await API.getPlayer(this.currentPlayer.slug);
      this.currentPlayer = player;
      this.currentCharacter = player.character;
      if (!this.currentCharacter) { this.showPlayerSelect(); return; }

      // Check pending choices
      if (this.currentCharacter.pending_choices) {
        this.setScreen(Views.mainHub(this.currentPlayer, this.currentCharacter, this.defs));
        const choices = JSON.parse(this.currentCharacter.pending_choices);
        this.showLevelUpChoice(choices);
        return;
      }

      this.setScreen(Views.mainHub(this.currentPlayer, this.currentCharacter, this.defs));
    } catch(e) {
      this.toast('Error: ' + e.message, 'error');
      if (this.currentPlayer && this.currentCharacter) {
        this.setScreen(Views.mainHub(this.currentPlayer, this.currentCharacter, this.defs));
      }
    }
  },

  // ============ MATCHMAKING PVP ============
  async matchmaking() {
    if (!this.currentCharacter) return;
    try {
      this.toast('🔎 Buscando rival...', 'info');
      const result = await API.matchmaking(this.currentCharacter.id);
      
      const introEntry = result.log.find(e => e.type === 'intro');
      const opp = result.opponent;
      const oppSlug = opp?.player_avatar || opp?.player_slug;

      const f1 = {
        name: introEntry.f1.name, level: introEntry.f1.level, hp_max: introEntry.f1.hp_max,
        avatarImg: getAvatarUrl(this.currentPlayer.slug)
      };
      const f2 = {
        name: introEntry.f2.name, level: introEntry.f2.level, hp_max: introEntry.f2.hp_max,
        avatarImg: getAvatarUrl(oppSlug || 'guerrero')
      };

      await this.playCombat(f1, f2, result.log);

      this.currentCharacter = result.character;
      this._pendingChoices = result.pendingChoices;

      this.showResult(result.result === 'win', result.xpGained, result.character, result.leveledUp);
    } catch(e) { this.toast('Error: ' + e.message, 'error'); }
  },

  // ============ DIRECT PVP ============
  async showPVPSelect() {
    if (!this.currentCharacter) return;
    try {
      const lb = await API.getLeaderboard();
      const opponents = lb.filter(c => c.id !== this.currentCharacter.id);
      this.pushScreen('pvp');
      this.setScreen(Views.pvpSelect(opponents, this.currentCharacter));
    } catch(e) { this.toast('Error: ' + e.message, 'error'); }
  },

  async fightPVP(opponentId) {
    if (!this.currentCharacter) return;
    try {
      this.toast('⚔️ ¡Preparando duelo!', 'info');
      const result = await API.fightPVP(this.currentCharacter.id, opponentId);
      
      const introEntry = result.log.find(e => e.type === 'intro');
      const oppChar = Object.values(result.characters).find(c => c.id !== this.currentCharacter.id);
      
      // Find opponent player info
      const allPlayers = this.players.length ? this.players : await API.getPlayers();
      const oppPlayer = allPlayers.find(p => p.character && p.character.id === opponentId);

      const f1 = {
        name: introEntry.f1.name, level: introEntry.f1.level, hp_max: introEntry.f1.hp_max,
        avatarImg: getAvatarUrl(this.currentPlayer.slug)
      };
      const f2 = {
        name: introEntry.f2.name, level: introEntry.f2.level, hp_max: introEntry.f2.hp_max,
        avatarImg: getAvatarUrl(oppPlayer?.slug || 'guerrero')
      };

      await this.playCombat(f1, f2, result.log);

      this.currentCharacter = result.character;
      this._pendingChoices = result.pendingChoices;
      
      this.showResult(result.result === 'win', result.xpGained, result.character, result.leveledUp);
    } catch(e) { this.toast('Error: ' + e.message, 'error'); }
  },

  // ============ COMBAT ============
  async playCombat(f1, f2, log) {
    const container = document.getElementById('app');
    const animator = new CombatAnimator(container, f1, f2);
    animator.render();
    await animator.play(log);
  },

  // ============ RESULT ============
  showResult(isWin, xpGained, character, leveledUp) {
    this.setScreen(Views.resultScreen(isWin, xpGained, character, leveledUp));
  },

  async closeResult() {
    if (this._pendingChoices && this._pendingChoices.length > 0) {
      this.showLevelUpChoice(this._pendingChoices);
      return;
    }
    this.screenStack = ['select', 'hub'];
    await this.showHub();
  },

  showLevelUpChoice(choices) {
    this._pendingChoices = choices;
    const modal = Views.levelUpChoiceModal(choices);
    document.getElementById('app').insertAdjacentHTML('beforeend', modal);
  },

  async selectLevelUpChoice(index) {
    if (!this.currentCharacter) return;
    try {
      const result = await API.chooseLevelUp(this.currentCharacter.id, index);
      this.currentCharacter = result.character;
      this._pendingChoices = null;
      this.toast(`¡Conseguido: ${result.chosen.emoji} ${result.chosen.name}!`, 'success');
      const modal = document.getElementById('levelup-modal');
      if (modal) modal.remove();
      this.screenStack = ['select', 'hub'];
      await this.showHub();
    } catch(e) { this.toast('Error: ' + e.message, 'error'); }
  },

  // ============ EQUIP ============
  async equipItem(slot, itemId) {
    if (!this.currentCharacter) return;
    try {
      await API.equipItem(this.currentCharacter.id, slot, itemId);
      this.toast('Equipado ✅', 'success');
      await this.showHub();
    } catch(e) { this.toast('Error: ' + e.message, 'error'); }
  },

  // ============ LEADERBOARD ============
  async showLeaderboard() {
    try {
      this.pushScreen('leaderboard');
      const chars = await API.getLeaderboard();
      this.setScreen(Views.leaderboard(chars));
    } catch(e) { this.toast('Error: ' + e.message, 'error'); }
  },

  // ============ TOURNAMENT ============
  async showTournament() {
    try {
      this.pushScreen('tournament');
      const data = await API.getTournament();
      this.setScreen(Views.tournament(data));
    } catch(e) { this.toast('Error: ' + e.message, 'error'); }
  },

  async startTournament() {
    try {
      this.toast('¡Torneo iniciado!', 'info');
      const data = await API.startTournament();
      this.setScreen(Views.tournament(data));
    } catch(e) { this.toast('Error: ' + e.message, 'error'); }
  },

  async playTournamentMatch(matchId) {
    try {
      const result = await API.playTournamentMatch(matchId);
      if (result.bye) { this.toast('Pase automático', 'info'); await this.showTournament(); return; }

      const intro = result.fightLog.find(e => e.type === 'intro');
      if (intro) {
        const f1 = { name: intro.f1.name, level: intro.f1.level, hp_max: intro.f1.hp_max, avatarImg: '/img/bruto_guerrero.png' };
        const f2 = { name: intro.f2.name, level: intro.f2.level, hp_max: intro.f2.hp_max, avatarImg: '/img/bruto_guerrero.png' };
        await this.playCombat(f1, f2, result.fightLog);
      }

      if (result.tournament.status === 'finished') {
        this.toast('🏆 ¡Campeón coronado! 👑', 'success');
      }
      this.setScreen(Views.tournament(result.tournament));
    } catch(e) { this.toast('Error: ' + e.message, 'error'); }
  },

  async resetTournament() {
    if (!confirm('¿Reiniciar torneo?')) return;
    try { await API.resetTournament(); this.toast('Torneo reiniciado', 'info'); await this.showTournament(); }
    catch(e) { this.toast('Error: ' + e.message, 'error'); }
  },

  // ============ TOAST ============
  toast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0'; toast.style.transform = 'translateY(-20px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
