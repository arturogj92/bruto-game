const express = require('express');
const path = require('path');
const db = require('./database');
const combat = require('./combat-engine');

const app = express();
const PORT = process.env.PORT || 3481;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

db.init();
db.initCombatHistory();

// In-memory active combats store
const activeCombats = {};

// ============ GOLD HELPERS ============
function calcPvPGold(winnerLevel) {
  const base = winnerLevel * 8;
  const bonus = Math.floor(Math.random() * 11) + 5;
  return base + bonus;
}

function calcPvEGold(difficulty, isWin) {
  if (!isWin) return 0;
  const ranges = { campesino: [5, 10], bandido: [10, 20], gladiador: [20, 35], bestia: [35, 60] };
  const [min, max] = ranges[difficulty] || [5, 10];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getShopSeed() {
  const now = new Date();
  const period = Math.floor(now.getUTCHours() / 6);
  return now.toISOString().slice(0, 10) + '-' + period;
}

function seededRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) { h = ((h << 5) - h) + seed.charCodeAt(i); h |= 0; }
  return function() {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 13), 0x45d9f3b);
    h = (h ^ (h >>> 16)) >>> 0;
    return h / 4294967296;
  };
}

function getShopItems() {
  const seed = getShopSeed();
  const rng = seededRandom(seed);
  const pool = [];
  for (const [id, w] of Object.entries(combat.WEAPONS)) {
    const power = (w.damage || 0) + Math.abs(w.speed || 0);
    pool.push({ type: 'weapon', id, name: w.name, emoji: w.emoji, desc: w.desc, price: Math.max(50, Math.min(500, Math.floor(power * 40 + 30))) });
  }
  for (const [id, a] of Object.entries(combat.ARMORS)) {
    const power = (a.defense || 0) + Math.abs(a.speed || 0) + (a.hp || 0) / 5;
    pool.push({ type: 'armor', id, name: a.name, emoji: a.emoji, desc: a.desc, price: Math.max(50, Math.min(500, Math.floor(power * 35 + 40))) });
  }
  for (const [id, ac] of Object.entries(combat.ACCESSORIES)) {
    const power = (ac.strength || 0) + (ac.defense || 0) + (ac.speed || 0) + (ac.hp || 0) / 5;
    pool.push({ type: 'accessory', id, name: ac.name, emoji: ac.emoji, desc: ac.desc, price: Math.max(50, Math.min(500, Math.floor(power * 40 + 50))) });
  }
  const shuffled = [...pool].sort(() => rng() - 0.5);
  return shuffled.slice(0, 3 + Math.floor(rng() * 3));
}


// ============ API ROUTES ============

// Get all players
app.get('/api/players', (req, res) => {
  const players = db.getPlayers();
  const chars = db.getAllCharacters();
  const charMap = {};
  const charsMap = {};
  for (const c of chars) {
    if (!charMap[c.player_id]) charMap[c.player_id] = c;
    if (!charsMap[c.player_id]) charsMap[c.player_id] = [];
    charsMap[c.player_id].push(c);
  }
  res.json(players.map(p => ({ ...p, character: charMap[p.id] || null, characters: charsMap[p.id] || [] })));
});

// Get single player + characters
app.get('/api/player/:slug', (req, res) => {
  const player = db.getPlayer(req.params.slug);
  if (!player) return res.status(404).json({ error: 'Player not found' });
  const characters = db.getCharacters(player.id);
  const character = characters[0] || null;
  res.json({ ...player, character, characters });
});

// Create character (max 3 per player, 2nd+ cost 2500 gold)
const NEW_CHAR_COST = 2500;
app.post('/api/player/:slug/character', (req, res) => {
  const player = db.getPlayer(req.params.slug);
  if (!player) return res.status(404).json({ error: 'Player not found' });
  
  const charCount = db.getCharacterCount(player.id);
  if (charCount >= 3) return res.status(400).json({ error: 'Máximo 3 personajes por jugador' });
  
  const { name } = req.body;
  if (!name || name.length < 2 || name.length > 20) {
    return res.status(400).json({ error: 'Nombre inválido (2-20 chars)' });
  }

  // 2nd and 3rd characters cost gold (taken from first character's gold)
  if (charCount > 0) {
    const firstChar = db.getCharacters(player.id)[0];
    if ((firstChar.gold || 0) < NEW_CHAR_COST) {
      return res.status(400).json({ error: `Necesitas ${NEW_CHAR_COST} oro para crear otro personaje (tienes ${firstChar.gold || 0})` });
    }
    db.updateCharacter(firstChar.id, { gold: (firstChar.gold || 0) - NEW_CHAR_COST });
  }

  db.createCharacter(player.id, name);
  const characters = db.getCharacters(player.id);
  res.json({ success: true, character: characters[characters.length - 1], characters });
});

// Get character details
app.get('/api/character/:id', (req, res) => {
  const char = db.getCharacterById(parseInt(req.params.id));
  if (!char) return res.status(404).json({ error: 'Character not found' });
  res.json(char);
});

// Get leaderboard
app.get('/api/leaderboard', (req, res) => {
  const chars = db.getAllCharacters();
  res.json(chars);
});

// ============ PVP MATCHMAKING ============
app.post('/api/fight/matchmaking', (req, res) => {
  const { charId } = req.body;
  const char = db.getCharacterById(charId);
  if (!char) return res.status(404).json({ error: 'Character not found' });

  const allChars = db.getAllCharacters();
  const opponents = allChars.filter(c => c.id !== char.id);
  if (opponents.length === 0) {
    return res.status(400).json({ error: 'No hay oponentes disponibles' });
  }

  opponents.sort((a, b) => Math.abs(a.level - char.level) - Math.abs(b.level - char.level));
  let pool = opponents.filter(o => Math.abs(o.level - char.level) <= 2);
  if (pool.length === 0) pool = [opponents[0]];
  const opponent = pool[Math.floor(Math.random() * pool.length)];

  const result = combat.simulateCombat(char, opponent);

  // Dynamic XP based on level difference
  const levelDiff = opponent.level - char.level;
  const baseWinXP = 50 + Math.max(char.level, opponent.level) * 8; // PvP gives MORE than PvE
  const baseLoseXP = 15 + Math.max(char.level, opponent.level) * 3; // Losing PvP still decent
  // Beat someone higher = more XP, beat someone lower = less XP
  let winMultiplier = 1.0;
  if (levelDiff > 0) winMultiplier = 1 + levelDiff * 0.2; // +20% per level above you
  else if (levelDiff < 0) winMultiplier = Math.max(0.2, 1 + levelDiff * 0.25); // -25% per level below you, min 20%
  const winnerXP = Math.floor(baseWinXP * winMultiplier);
  const loserXP = Math.floor(baseLoseXP * Math.max(0.5, 1 + levelDiff * 0.1));

  const winnerId = result.winner_id;
  const isWin = winnerId === char.id;
  const myXP = isWin ? winnerXP : loserXP;

  // Gold
  const winnerGold = calcPvPGold(Math.max(char.level, opponent.level));
  const loserGold = Math.floor(winnerGold * 0.3);
  const myGold = isWin ? winnerGold : loserGold;
  const oppGold = isWin ? loserGold : winnerGold;

  const myUpdates = {
    xp: char.xp + myXP,
    gold: (char.gold || 0) + myGold,
    wins: isWin ? char.wins + 1 : char.wins,
    losses: isWin ? char.losses : char.losses + 1
  };
  
  let leveledUp = false;
  let levelUpData = null;
  // Multi-level-up: loop until no more XP threshold crossed
  let tempCharState = { ...char };
  while (myUpdates.xp >= tempCharState.xp_next && tempCharState.level < 50) {
    levelUpData = combat.levelUp(tempCharState);
    Object.assign(myUpdates, levelUpData.changes);
    myUpdates.xp = myUpdates.xp - tempCharState.xp_next;
    Object.assign(tempCharState, levelUpData.changes);
    tempCharState.xp = myUpdates.xp;
    leveledUp = true;
  }

  db.updateCharacter(char.id, myUpdates);

  const oppXP = isWin ? loserXP : winnerXP;
  const oppUpdates = {
    xp: opponent.xp + oppXP,
    wins: !isWin ? opponent.wins + 1 : opponent.wins,
    losses: !isWin ? opponent.losses : opponent.losses + 1
  };
  let tempOppState = { ...opponent };
  while (oppUpdates.xp >= tempOppState.xp_next && tempOppState.level < 50) {
    const oppLvl = combat.levelUp(tempOppState);
    Object.assign(oppUpdates, oppLvl.changes);
    oppUpdates.xp = oppUpdates.xp - tempOppState.xp_next;
    Object.assign(tempOppState, oppLvl.changes);
    tempOppState.xp = oppUpdates.xp;
  }
  db.updateCharacter(opponent.id, oppUpdates);

  db.addFightLog({
    char1_id: char.id, char2_id: opponent.id,
    winner_id: winnerId, xp_winner: winnerXP, xp_loser: loserXP,
    log: result.log
  });

  // Combat history
  db.addCombatHistory({
    char1_id: char.id, char2_id: opponent.id,
    char1_name: char.name, char2_name: opponent.name,
    winner_id: winnerId, is_pve: false,
    char1_xp: myXP, char2_xp: oppXP,
    char1_gold: myGold, char2_gold: oppGold,
    wager: 0
  });

  let updatedChar = db.getCharacterById(char.id);
  const updatedOpp = db.getCharacterById(opponent.id);
  const oppPlayer = db.getPlayerById(opponent.player_id);

  // Chest roll (10% on win)
  let chest = null;
  if (isWin && Math.random() < 0.10) {
    chest = generateChest();
    let chestGold = 0;
    const chestItems = [];
    for (const item of chest.items) {
      if (item.type === 'gold') chestGold += item.amount;
      else chestItems.push({ type: item.type, id: item.id });
    }
    if (chestGold > 0 || chestItems.length > 0) {
      const inv = JSON.parse(updatedChar.inventory || '[]');
      inv.push(...chestItems);
      db.updateCharacter(char.id, { inventory: JSON.stringify(inv), gold: (updatedChar.gold || 0) + chestGold });
      updatedChar = db.getCharacterById(char.id);
    }
  }

  const matchmakingResponse = {
    result: isWin ? 'win' : 'lose',
    log: result.log,
    chest,
    xpGained: myXP,
    goldGained: myGold,
    leveledUp,
    pendingChoices: leveledUp && updatedChar.pending_choices ? JSON.parse(updatedChar.pending_choices) : null,
    character: updatedChar,
    opponent: { ...updatedOpp, player_name: oppPlayer?.display_name, player_avatar: oppPlayer?.avatar }
  };

  // Store active combat for redirect
  activeCombats[char.id] = matchmakingResponse;
  activeCombats[opponent.id] = matchmakingResponse;
  setTimeout(() => { delete activeCombats[char.id]; delete activeCombats[opponent.id]; }, 120000);

  res.json(matchmakingResponse);
});

// Direct PVP fight
app.post('/api/fight/pvp', (req, res) => {
  const { charId, opponentId } = req.body;
  const char1 = db.getCharacterById(charId);
  const char2 = db.getCharacterById(opponentId);
  if (!char1 || !char2) return res.status(404).json({ error: 'Character not found' });
  if (char1.id === char2.id) return res.status(400).json({ error: 'No puedes pelear contigo mismo' });

  const result = combat.simulateCombat(char1, char2);
  // Determine winner first
  const winnerId = result.winner_id;
  const loserId = result.loser_id;

  // Dynamic XP: beating lower levels gives less, higher gives more
  const pvpLevelDiff1 = char2.level - char1.level; // from char1 perspective
  const pvpBaseWin = 50 + Math.max(char1.level, char2.level) * 8; // PvP premium XP
  const pvpBaseLose = 15 + Math.max(char1.level, char2.level) * 3;
  let pvpWinMult = 1.0;
  const winnerLevelDiff = (winnerId === char1.id) ? pvpLevelDiff1 : -pvpLevelDiff1;
  if (winnerLevelDiff > 0) pvpWinMult = 1 + winnerLevelDiff * 0.2;
  else if (winnerLevelDiff < 0) pvpWinMult = Math.max(0.15, 1 + winnerLevelDiff * 0.3);
  const winnerXP = Math.floor(pvpBaseWin * pvpWinMult);
  const loserXP = Math.floor(pvpBaseLose * Math.max(0.5, 1 - Math.abs(winnerLevelDiff) * 0.1));

  const winner = winnerId === char1.id ? char1 : char2;
  const loser = loserId === char1.id ? char1 : char2;

  // Gold
  const winnerGold = calcPvPGold(Math.max(char1.level, char2.level));
  const loserGold = Math.floor(winnerGold * 0.3);

  const winnerUpdates = { xp: winner.xp + winnerXP, wins: winner.wins + 1, gold: (winner.gold || 0) + winnerGold };
  let winnerLeveledUp = false;
  let tempWinnerState = { ...winner };
  while (winnerUpdates.xp >= tempWinnerState.xp_next && tempWinnerState.level < 50) {
    const lvlData = combat.levelUp(tempWinnerState);
    Object.assign(winnerUpdates, lvlData.changes);
    winnerUpdates.xp = winnerUpdates.xp - tempWinnerState.xp_next;
    Object.assign(tempWinnerState, lvlData.changes);
    tempWinnerState.xp = winnerUpdates.xp;
    winnerLeveledUp = true;
  }
  db.updateCharacter(winner.id, winnerUpdates);

  const loserUpdates = { xp: loser.xp + loserXP, losses: loser.losses + 1, gold: (loser.gold || 0) + loserGold };
  let tempLoserState = { ...loser };
  while (loserUpdates.xp >= tempLoserState.xp_next && tempLoserState.level < 50) {
    const lvlData = combat.levelUp(tempLoserState);
    Object.assign(loserUpdates, lvlData.changes);
    loserUpdates.xp = loserUpdates.xp - tempLoserState.xp_next;
    Object.assign(tempLoserState, lvlData.changes);
    tempLoserState.xp = loserUpdates.xp;
  }
  db.updateCharacter(loser.id, loserUpdates);

  db.addFightLog({ char1_id: char1.id, char2_id: char2.id, winner_id: winnerId, xp_winner: winnerXP, xp_loser: loserXP, log: result.log });

  const isMyWin = winnerId === char1.id;
  const updatedChar = db.getCharacterById(char1.id);

  res.json({
    winnerId, loserId,
    log: result.log,
    winnerXP, loserXP,
    result: isMyWin ? 'win' : 'lose',
    xpGained: isMyWin ? winnerXP : loserXP,
    goldGained: isMyWin ? winnerGold : loserGold,
    leveledUp: isMyWin ? winnerLeveledUp : false,
    pendingChoices: updatedChar.pending_choices ? JSON.parse(updatedChar.pending_choices) : null,
    character: updatedChar,
    characters: {
      [char1.id]: db.getCharacterById(char1.id),
      [char2.id]: db.getCharacterById(char2.id)
    }
  });
});

// Choose level up reward
app.post('/api/character/:id/choose', (req, res) => {
  const char = db.getCharacterById(parseInt(req.params.id));
  if (!char) return res.status(404).json({ error: 'Character not found' });
  if (!char.pending_choices) return res.json({ success: true, character: char, chosen: null, message: 'Ya elegido' });

  const choices = JSON.parse(char.pending_choices);
  const { choiceIndex } = req.body;
  
  if (choiceIndex < 0 || choiceIndex >= choices.length) {
    return res.status(400).json({ error: 'Elección inválida' });
  }

  const chosen = choices[choiceIndex];
  const updates = combat.applyLevelUpChoice(char, chosen);
  updates.pending_choices = null;

  db.updateCharacter(char.id, updates);
  const updated = db.getCharacterById(char.id);

  // Check for new combos after equipping a new weapon
  let newCombos = [];
  if (chosen.type === 'weapon') {
    newCombos = checkAndDiscoverCombos(updated);
  }

  res.json({ success: true, chosen, character: updated, newCombos });
});

// Equip item - supports weapon, weapon2, weapon3, weapon4, armor, accessory
app.post('/api/character/:id/equip', (req, res) => {
  const char = db.getCharacterById(parseInt(req.params.id));
  if (!char) return res.status(404).json({ error: 'Character not found' });

  const { slot, itemId } = req.body;
  const validSlots = ['weapon', 'weapon2', 'weapon3', 'weapon4', 'armor', 'accessory'];
  if (!validSlots.includes(slot)) {
    return res.status(400).json({ error: 'Slot inválido' });
  }

  // Determine item type from slot
  const slotType = slot.startsWith('weapon') ? 'weapon' : slot;
  
  const inventory = JSON.parse(char.inventory || '[]');
  const hasItem = inventory.some(i => i.type === slotType && i.id === itemId);
  if (!hasItem && itemId !== null) {
    return res.status(400).json({ error: 'No tienes ese item' });
  }

  db.updateCharacter(char.id, { [slot]: itemId });
  const updated = db.getCharacterById(char.id);

  // Check for new combos
  const newCombos = checkAndDiscoverCombos(updated);

  res.json({ success: true, character: updated, newCombos });
});

// Get ability/item/combo definitions
app.get('/api/definitions', (req, res) => {
  res.json({
    abilities: combat.ABILITIES,
    weapons: combat.WEAPONS,
    armors: combat.ARMORS,
    accessories: combat.ACCESSORIES,
    combos: combat.WEAPON_COMBOS
  });
});

// Get player discoveries
app.get('/api/discoveries/:playerId', (req, res) => {
  const discoveries = db.getDiscoveries(parseInt(req.params.playerId));
  res.json(discoveries);
});

// Get active combos for a character
app.get('/api/character/:id/combos', (req, res) => {
  const char = db.getCharacterById(parseInt(req.params.id));
  if (!char) return res.status(404).json({ error: 'Character not found' });
  const activeCombos = combat.getActiveCombos(char);
  res.json(activeCombos);
});

// Helper: check and discover new combos
function checkAndDiscoverCombos(character) {
  const activeCombos = combat.getActiveCombos(character);
  const newCombos = [];
  for (const combo of activeCombos) {
    if (!db.hasDiscovery(character.player_id, combo.id)) {
      db.addDiscovery(character.player_id, combo.id);
      newCombos.push(combo);
    }
  }
  return newCombos;
}

// Fight history
app.get('/api/fights/:charId', (req, res) => {
  res.json(db.getFightHistory(parseInt(req.params.charId)));
});

// ============ TOURNAMENT ROUTES ============
app.get('/api/tournament', (req, res) => {
  const tournament = db.getActiveTournament();
  if (!tournament) {
    const chars = db.getAllCharacters();
    return res.json({ status: 'waiting', chars: chars.map(c => ({ id: c.id, name: c.name, level: c.level, player_name: c.player_name })) });
  }
  const matches = db.getTournamentMatches(tournament.id);
  const enrichedMatches = matches.map(m => {
    const c1 = m.char1_id ? db.getCharacterById(m.char1_id) : null;
    const c2 = m.char2_id ? db.getCharacterById(m.char2_id) : null;
    const winner = m.winner_id ? db.getCharacterById(m.winner_id) : null;
    const p1 = c1 ? db.getPlayerById(c1.player_id) : null;
    const p2 = c2 ? db.getPlayerById(c2.player_id) : null;
    return { ...m, char1: c1 ? { ...c1, player_avatar: p1?.avatar } : null, char2: c2 ? { ...c2, player_avatar: p2?.avatar } : null, winner };
  });
  res.json({ ...tournament, matches: enrichedMatches });
});

app.post('/api/tournament/start', (req, res) => {
  const existing = db.getActiveTournament();
  if (existing) return res.status(400).json({ error: 'Ya hay un torneo activo' });
  const chars = db.getAllCharacters();
  if (chars.length < 2) return res.status(400).json({ error: 'Se necesitan al menos 2 jugadores' });

  const shuffled = [...chars].sort(() => Math.random() - 0.5);
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(shuffled.length)));
  const bracket = [];
  for (let i = 0; i < bracketSize; i++) bracket.push(shuffled[i] ? shuffled[i].id : null);

  const result = db.createTournament(bracket);
  const tournamentId = result.lastInsertRowid;

  for (let i = 0; i < bracket.length; i += 2) {
    db.createTournamentMatch({ tournament_id: tournamentId, round: 0, match_index: Math.floor(i / 2), char1_id: bracket[i], char2_id: bracket[i + 1] });
  }

  const matches = db.getTournamentMatches(tournamentId);
  for (const match of matches) {
    if (match.char1_id && !match.char2_id) db.updateTournamentMatch(match.id, { winner_id: match.char1_id, played: 1 });
    else if (!match.char1_id && match.char2_id) db.updateTournamentMatch(match.id, { winner_id: match.char2_id, played: 1 });
  }

  const tournament = db.getActiveTournament();
  const allMatches = db.getTournamentMatches(tournamentId);
  res.json({ ...tournament, matches: allMatches.map(m => ({ ...m, char1: m.char1_id ? db.getCharacterById(m.char1_id) : null, char2: m.char2_id ? db.getCharacterById(m.char2_id) : null })) });
});

app.post('/api/tournament/match/:matchId', (req, res) => {
  const matchId = parseInt(req.params.matchId);
  const tournament = db.getActiveTournament();
  if (!tournament) return res.status(400).json({ error: 'No hay torneo activo' });

  const matches = db.getTournamentMatches(tournament.id);
  const match = matches.find(m => m.id === matchId);
  if (!match) return res.status(404).json({ error: 'Match not found' });
  if (match.played) return res.status(400).json({ error: 'Combate ya jugado' });

  if (!match.char1_id || !match.char2_id) {
    const winnerId = match.char1_id || match.char2_id;
    db.updateTournamentMatch(matchId, { winner_id: winnerId, played: 1 });
    return res.json({ bye: true, winner_id: winnerId });
  }

  const char1 = db.getCharacterById(match.char1_id);
  const char2 = db.getCharacterById(match.char2_id);
  const result = combat.simulateCombat(char1, char2);

  db.updateTournamentMatch(matchId, { winner_id: result.winner_id, played: 1, fight_log: JSON.stringify(result.log) });

  const roundMatches = db.getTournamentMatches(tournament.id, match.round);
  const allPlayed = roundMatches.every(m => m.played);

  if (allPlayed) {
    const winners = roundMatches.map(m => m.winner_id).filter(Boolean);
    if (winners.length === 1) {
      db.updateTournament(tournament.id, { status: 'finished', champion_id: winners[0], current_round: match.round });
    } else {
      const nextRound = match.round + 1;
      for (let i = 0; i < winners.length; i += 2) {
        db.createTournamentMatch({ tournament_id: tournament.id, round: nextRound, match_index: Math.floor(i / 2), char1_id: winners[i], char2_id: winners[i + 1] || null });
      }
      db.updateTournament(tournament.id, { current_round: nextRound });
      const newMatches = db.getTournamentMatches(tournament.id, nextRound);
      for (const m of newMatches) {
        if (m.char1_id && !m.char2_id) db.updateTournamentMatch(m.id, { winner_id: m.char1_id, played: 1 });
        else if (!m.char1_id && m.char2_id) db.updateTournamentMatch(m.id, { winner_id: m.char2_id, played: 1 });
      }
    }
  }

  const updatedTournament = db.getActiveTournament() || { ...tournament, status: 'finished', champion_id: result.winner_id };
  const allMatches = db.getTournamentMatches(tournament.id);
  const enrichedMatches = allMatches.map(m => {
    const c1 = m.char1_id ? db.getCharacterById(m.char1_id) : null;
    const c2 = m.char2_id ? db.getCharacterById(m.char2_id) : null;
    return { ...m, char1: c1, char2: c2, winner: m.winner_id ? db.getCharacterById(m.winner_id) : null };
  });

  res.json({ fightLog: result.log, winner_id: result.winner_id, tournament: { ...updatedTournament, matches: enrichedMatches } });
});

app.post('/api/tournament/reset', (req, res) => {
  db.db.exec("DELETE FROM tournament_matches; DELETE FROM tournament;");
  res.json({ success: true });
});


// ============ CHEST SYSTEM ============
function generateChest() {
  const roll = Math.random();
  let rarity, color, items = [];
  
  if (roll < 0.01) { // 1% = LEGENDARY
    rarity = 'legendary'; color = '#ff6b00';
    items = generateChestItems(3, [0.3, 0.4, 0.2, 0.1]); // common, rare, epic, legendary weights
  } else if (roll < 0.08) { // 7% = EPIC  
    rarity = 'epic'; color = '#9b59b6';
    items = generateChestItems(2, [0.4, 0.4, 0.2, 0]);
  } else if (roll < 0.35) { // 27% = RARE
    rarity = 'rare'; color = '#3498db';
    items = generateChestItems(2, [0.6, 0.3, 0.1, 0]);
  } else { // 65% = COMMON
    rarity = 'common'; color = '#95a5a6';
    items = generateChestItems(1, [0.8, 0.2, 0, 0]);
  }
  
  return { rarity, color, items };
}

function generateChestItems(count, tierWeights) {
  const items = [];
  const allWeapons = Object.entries(combat.WEAPONS);
  const allArmors = Object.entries(combat.ARMORS);
  const allAccessories = Object.entries(combat.ACCESSORIES);
  const allItems = [
    ...allWeapons.map(([id, w]) => ({ type: 'weapon', id, name: w.name, emoji: w.emoji })),
    ...allArmors.map(([id, a]) => ({ type: 'armor', id, name: a.name, emoji: a.emoji })),
    ...allAccessories.map(([id, a]) => ({ type: 'accessory', id, name: a.name, emoji: a.emoji }))
  ];
  
  for (let i = 0; i < count; i++) {
    const r = Math.random();
    if (r < 0.4) {
      // Gold reward
      const goldAmounts = [
        { min: 10, max: 30 },   // common
        { min: 30, max: 80 },   // rare
        { min: 80, max: 200 },  // epic
        { min: 200, max: 500 }  // legendary
      ];
      const tierRoll = Math.random();
      let tier = 0;
      let cumul = 0;
      for (let t = 0; t < tierWeights.length; t++) {
        cumul += tierWeights[t];
        if (tierRoll < cumul) { tier = t; break; }
      }
      const range = goldAmounts[tier];
      const gold = Math.floor(range.min + Math.random() * (range.max - range.min));
      items.push({ type: 'gold', amount: gold, emoji: '🪙', name: gold + ' oro', tier });
    } else {
      // Item reward
      const item = allItems[Math.floor(Math.random() * allItems.length)];
      items.push({ ...item, tier: 0 });
    }
  }
  return items;
}

// ============ PVE ARENA ============
const NPC_TEMPLATES = {
  campesino: { name: 'Campesino', emoji: '\u{1F9D1}\u200D\u{1F33E}', statMult: 0.60, xpMult: 15, danger: 'Fácil' },
  bandido:   { name: 'Bandido',   emoji: '\u{1F5E1}\uFE0F', statMult: 0.80, xpMult: 25, danger: 'Medio' },
  gladiador: { name: 'Gladiador', emoji: '\u2694\uFE0F', statMult: 1.00, xpMult: 40, danger: 'Difícil' },
  bestia:    { name: 'Bestia',    emoji: '\u{1F432}', statMult: 1.20, xpMult: 60, danger: 'Muy Difícil' }
};

function generateNPC(character, difficulty) {
  const template = NPC_TEMPLATES[difficulty];
  if (!template) return null;
  const mult = template.statMult;
  const effectiveStats = combat.getEffectiveStats(character);
  
  const npcNames = {
    campesino: ['Aldeano Furioso', 'Granjero Loco', 'Pastor Vengativo', 'Herrero Novato', 'Leñador Torpe'],
    bandido: ['Bandido Errante', 'Ladrón de Caminos', 'Saqueador', 'Mercenario Barato', 'Rufián'],
    gladiador: ['Gladiador de Arena', 'Campeón Esclavo', 'Luchador Veterano', 'Guerrero de Foso', 'Centurión'],
    bestia: ['Bestia Infernal', 'Dragón Joven', 'Hidra Furiosa', 'Gólem de Piedra', 'Quimera Oscura']
  };
  const names = npcNames[difficulty] || ['Enemigo'];
  const name = names[Math.floor(Math.random() * names.length)];
  
  const possibleAbilities = Object.keys(combat.ABILITIES);
  const numAbilities = difficulty === 'campesino' ? 0 : difficulty === 'bandido' ? 1 : difficulty === 'gladiador' ? 2 : 3;
  const shuffled = [...possibleAbilities].sort(() => Math.random() - 0.5);
  const npcAbilities = shuffled.slice(0, numAbilities);

  return {
    id: -1,
    name: template.emoji + ' ' + name,
    level: character.level,
    hp_max: Math.max(50, Math.floor(effectiveStats.hp_max * mult)),
    strength: Math.max(5, Math.floor(effectiveStats.strength * mult)),
    defense: Math.max(3, Math.floor(effectiveStats.defense * mult)),
    speed: Math.max(3, Math.floor(effectiveStats.speed * mult)),
    abilities: JSON.stringify(npcAbilities),
    weapon: null, weapon2: null, weapon3: null, weapon4: null,
    armor: null, accessory: null,
    inventory: '[]'
  };
}

app.get('/api/pve/info/:charId', (req, res) => {
  const charId = parseInt(req.params.charId);
  const char = db.getCharacterById(charId);
  if (!char) return res.status(404).json({ error: 'Character not found' });

  const todayFights = db.getPveFightsHour(charId);
  const minLevelData = db.getMinLevel();
  const maxLevelData = db.getMaxLevel();
  const minLevel = minLevelData ? minLevelData.min_level : char.level;
  const maxLevel = maxLevelData ? maxLevelData.max_level : char.level;

  let catchUpBonus = 0;
  let catchUpReason = '';
  if (char.level === minLevel && maxLevel > minLevel) {
    catchUpBonus = 0.50;
    catchUpReason = '¡Menor nivel del server! +50% XP';
  } else if (maxLevel - char.level >= 2) {
    catchUpBonus = 0.30;
    catchUpReason = '2+ niveles por debajo del líder: +30% XP';
  }

  const difficulties = Object.entries(NPC_TEMPLATES).map(([key, t]) => {
    const baseXP = char.level * t.xpMult;
    const bonusXP = Math.floor(baseXP * catchUpBonus);
    return {
      id: key,
      name: t.name,
      emoji: t.emoji,
      danger: t.danger,
      statPercent: Math.floor(t.statMult * 100),
      baseXP: Math.floor(baseXP),
      bonusXP,
      totalXP: Math.floor(baseXP + bonusXP),
      goldRange: ({campesino:'5-10',bandido:'10-20',gladiador:'20-35',bestia:'35-60'})[key] || '5-10'
    };
  });

  res.json({
    fightsToday: todayFights.count,
    maxFights: 20,
    catchUpBonus,
    catchUpReason,
    difficulties
  });
});

app.post('/api/fight/pve', (req, res) => {
  const { characterId, difficulty } = req.body;
  if (!characterId || !difficulty) return res.status(400).json({ error: 'characterId y difficulty requeridos' });
  if (!NPC_TEMPLATES[difficulty]) return res.status(400).json({ error: 'Dificultad inválida' });

  const char = db.getCharacterById(characterId);
  if (!char) return res.status(404).json({ error: 'Character not found' });

  const todayFights = db.getPveFightsHour(characterId);
  if (todayFights.count >= 20) {
    return res.status(429).json({ error: 'Límite diario de 20 peleas PvE alcanzado', fightsToday: todayFights.count });
  }

  const npc = generateNPC(char, difficulty);
  if (!npc) return res.status(400).json({ error: 'Error generando NPC' });

  const result = combat.simulateCombat(char, npc);
  const isWin = result.winner_id === char.id;

  const template = NPC_TEMPLATES[difficulty];
  let xpGained = 0;
  if (isWin) {
    xpGained = Math.floor(char.level * template.xpMult);
    
    const minLevelData = db.getMinLevel();
    const maxLevelData = db.getMaxLevel();
    const minLevel = minLevelData ? minLevelData.min_level : char.level;
    const maxLevel = maxLevelData ? maxLevelData.max_level : char.level;
    
    let catchUpBonus = 0;
    if (char.level === minLevel && maxLevel > minLevel) {
      catchUpBonus = 0.50;
    } else if (maxLevel - char.level >= 2) {
      catchUpBonus = 0.30;
    }
    xpGained = Math.floor(xpGained * (1 + catchUpBonus));
  }

  // Gold from PvE
  const goldGained = calcPvEGold(difficulty, isWin);

  const updates = { xp: char.xp + xpGained, gold: (char.gold || 0) + goldGained };
  let leveledUp = false;
  let levelUpData = null;
  let tempPvEState = { ...char };
  while (updates.xp >= tempPvEState.xp_next && tempPvEState.level < 50 && xpGained > 0) {
    levelUpData = combat.levelUp(tempPvEState);
    Object.assign(updates, levelUpData.changes);
    updates.xp = updates.xp - tempPvEState.xp_next;
    Object.assign(tempPvEState, levelUpData.changes);
    tempPvEState.xp = updates.xp;
    leveledUp = true;
  }
  db.updateCharacter(char.id, updates);

  db.addPveFight({ char_id: char.id, difficulty, won: isWin, xp_gained: xpGained });

  db.addFightLog({
    char1_id: char.id, char2_id: null,
    winner_id: isWin ? char.id : -1,
    xp_winner: xpGained, xp_loser: 0,
    log: result.log
  });

  // Combat history
  db.addCombatHistory({
    char1_id: char.id, char2_id: -1,
    char1_name: char.name, char2_name: npc.name,
    winner_id: isWin ? char.id : -1,
    is_pve: true, pve_difficulty: difficulty,
    char1_xp: xpGained, char2_xp: 0,
    char1_gold: goldGained, char2_gold: 0,
    wager: 0
  });

  let updatedChar = db.getCharacterById(char.id);
  const updatedFights = db.getPveFightsHour(char.id);

  // Chest roll (10% on win)
  let chest = null;
  if (isWin && Math.random() < 0.10) {
    chest = generateChest();
    // Apply chest rewards
    let chestGold = 0;
    const chestItems = [];
    for (const item of chest.items) {
      if (item.type === 'gold') {
        chestGold += item.amount;
      } else {
        chestItems.push({ type: item.type, id: item.id });
      }
    }
    if (chestGold > 0 || chestItems.length > 0) {
      const inv = JSON.parse(updatedChar.inventory || '[]');
      inv.push(...chestItems);
      db.updateCharacter(char.id, { 
        inventory: JSON.stringify(inv), 
        gold: (updatedChar.gold || 0) + chestGold 
      });
      updatedChar = db.getCharacterById(char.id);
    }
  }

  const pveResponse = {
    result: isWin ? 'win' : 'lose',
    log: result.log,
    xpGained,
    goldGained,
    leveledUp,
    pendingChoices: leveledUp && updatedChar.pending_choices ? JSON.parse(updatedChar.pending_choices) : null,
    character: updatedChar,
    npc: { name: npc.name, level: npc.level, difficulty },
    fightsToday: updatedFights.count,
    maxFights: 20
  };

  // Store active combat for redirect
  activeCombats[char.id] = pveResponse;
  setTimeout(() => { delete activeCombats[char.id]; }, 120000);

  res.json(pveResponse);
});


// Get all weapon combos
app.get("/api/combos", (req, res) => {
  const combos = Object.entries(combat.WEAPON_COMBOS).map(([id, c]) => ({
    id, name: c.name, emoji: c.emoji, desc: c.desc,
    weapons: c.weapons, weaponCount: c.weapons.length
  }));
  res.json(combos);
});

// ============ SHOP (MERCADER NPC) ============
app.get('/api/shop', (req, res) => {
  const items = getShopItems();
  const nextRotation = new Date();
  const h = nextRotation.getUTCHours();
  nextRotation.setUTCHours((Math.floor(h / 6) + 1) * 6, 0, 0, 0);
  res.json({ items, nextRotation: nextRotation.toISOString(), seed: getShopSeed() });
});

app.post('/api/shop/buy', (req, res) => {
  const { charId, itemType, itemId, price } = req.body;
  const char = db.getCharacterById(charId);
  if (!char) return res.status(404).json({ error: 'Character not found' });
  const shopItems = getShopItems();
  const shopItem = shopItems.find(si => si.type === itemType && si.id === itemId && si.price === price);
  if (!shopItem) return res.status(400).json({ error: 'Item no disponible en la tienda' });
  if ((char.gold || 0) < price) return res.status(400).json({ error: 'No tienes suficiente oro' });
  const inventory = JSON.parse(char.inventory || '[]');
  if (inventory.some(i => i.type === itemType && i.id === itemId)) return res.status(400).json({ error: 'Ya tienes este objeto' });
  inventory.push({ type: itemType, id: itemId });
  db.updateCharacter(char.id, { inventory: JSON.stringify(inventory), gold: (char.gold || 0) - price });
  res.json({ success: true, character: db.getCharacterById(char.id) });
});

// ============ MARKETPLACE (P2P) ============
app.get('/api/marketplace', (req, res) => {
  res.json(db.getMarketplaceListings());
});

app.get('/api/marketplace/mine/:charId', (req, res) => {
  res.json(db.getMyListings(parseInt(req.params.charId)));
});

app.post('/api/marketplace/list', (req, res) => {
  const { charId, itemType, itemId, price } = req.body;
  const char = db.getCharacterById(charId);
  if (!char) return res.status(404).json({ error: 'Character not found' });
  if (!price || price < 10 || price > 9999) return res.status(400).json({ error: 'Precio: 10-9999 oro' });
  const inventory = JSON.parse(char.inventory || '[]');
  const idx = inventory.findIndex(i => i.type === itemType && i.id === itemId);
  if (idx === -1) return res.status(400).json({ error: 'No tienes ese item' });
  if (itemType === 'weapon' && [char.weapon, char.weapon2, char.weapon3, char.weapon4].includes(itemId))
    return res.status(400).json({ error: 'Desequipa el item primero' });
  if (itemType === 'armor' && char.armor === itemId) return res.status(400).json({ error: 'Desequipa la armadura primero' });
  if (itemType === 'accessory' && char.accessory === itemId) return res.status(400).json({ error: 'Desequipa el accesorio primero' });
  inventory.splice(idx, 1);
  db.updateCharacter(char.id, { inventory: JSON.stringify(inventory) });
  db.addMarketplaceListing(char.id, itemType, itemId, price);
  res.json({ success: true, character: db.getCharacterById(char.id) });
});

app.post('/api/marketplace/buy', (req, res) => {
  const { charId, listingId } = req.body;
  const char = db.getCharacterById(charId);
  if (!char) return res.status(404).json({ error: 'Character not found' });
  const listing = db.getMarketplaceListing(listingId);
  if (!listing) return res.status(404).json({ error: 'Listing no encontrado' });
  if (listing.seller_id === char.id) return res.status(400).json({ error: 'No puedes comprar tus propios items' });
  if ((char.gold || 0) < listing.price) return res.status(400).json({ error: 'No tienes suficiente oro' });
  const seller = db.getCharacterById(listing.seller_id);
  if (!seller) return res.status(400).json({ error: 'Vendedor no encontrado' });
  const buyerInv = JSON.parse(char.inventory || '[]');
  buyerInv.push({ type: listing.item_type, id: listing.item_id });
  db.updateCharacter(char.id, { inventory: JSON.stringify(buyerInv), gold: (char.gold || 0) - listing.price });
  db.updateCharacter(seller.id, { gold: (seller.gold || 0) + listing.price });
  db.removeMarketplaceListing(listing.id);
  res.json({ success: true, character: db.getCharacterById(char.id) });
});

app.post('/api/marketplace/cancel', (req, res) => {
  const { charId, listingId } = req.body;
  const char = db.getCharacterById(charId);
  if (!char) return res.status(404).json({ error: 'Character not found' });
  const listing = db.getMarketplaceListing(listingId);
  if (!listing) return res.status(404).json({ error: 'Listing no encontrado' });
  if (listing.seller_id !== char.id) return res.status(403).json({ error: 'No es tu listing' });
  const inventory = JSON.parse(char.inventory || '[]');
  inventory.push({ type: listing.item_type, id: listing.item_id });
  db.updateCharacter(char.id, { inventory: JSON.stringify(inventory) });
  db.removeMarketplaceListing(listing.id);
  res.json({ success: true, character: db.getCharacterById(char.id) });
});


// ============ CHALLENGES / RETOS ============

// Create a challenge
app.post('/api/challenge', (req, res) => {
  const { challenger_id, challenged_id, bet_amount } = req.body;
  if (!challenger_id || !challenged_id || bet_amount === undefined) {
    return res.status(400).json({ error: 'Faltan datos: challenger_id, challenged_id, bet_amount' });
  }
  if (challenger_id === challenged_id) {
    return res.status(400).json({ error: 'No puedes retarte a ti mismo' });
  }
  const bet = parseInt(bet_amount);
  if (isNaN(bet) || bet < 0) {
    return res.status(400).json({ error: 'Apuesta inválida' });
  }

  const challenger = db.getCharacterById(challenger_id);
  if (!challenger) return res.status(404).json({ error: 'Retador no encontrado' });
  
  const challenged = db.getCharacterById(challenged_id);
  if (!challenged) return res.status(404).json({ error: 'Retado no encontrado' });

  if (bet > 0 && (challenger.gold || 0) < bet) {
    return res.status(400).json({ error: 'No tienes suficiente oro. Tienes ' + (challenger.gold || 0) + ' y apuestas ' + bet });
  }

  // Max 3 pending challenges per player
  const pending = db.countPendingChallenges(challenger_id);
  if (pending.count >= 3) {
    return res.status(400).json({ error: 'Máximo 3 retos pendientes. Espera a que respondan.' });
  }

  // Block gold from challenger immediately
  if (bet > 0) {
    db.updateCharacter(challenger_id, { gold: (challenger.gold || 0) - bet });
  }

  const result = db.createChallenge(challenger_id, challenged_id, bet);
  res.json({ success: true, challengeId: result.lastInsertRowid, goldBlocked: bet });
});

// Get pending challenges for a character
app.get('/api/challenges/:charId', (req, res) => {
  const charId = parseInt(req.params.charId);
  const challenges = db.getPendingChallenges(charId);
  res.json(challenges);
});

// Count incoming pending challenges (for badge)
app.get('/api/challenges/:charId/count', (req, res) => {
  const charId = parseInt(req.params.charId);
  const result = db.countIncomingPending(charId);
  res.json({ count: result.count });
});

// Accept a challenge
app.post('/api/challenge/:id/accept', (req, res) => {
  const challengeId = parseInt(req.params.id);
  const { accepted_bet } = req.body;
  
  const challenge = db.getChallengeById(challengeId);
  if (!challenge) return res.status(404).json({ error: 'Reto no encontrado' });
  if (challenge.status !== 'pending') return res.status(400).json({ error: 'Este reto ya no está pendiente' });

  // Check if expired (24h)
  const createdAt = new Date(challenge.created_at + 'Z').getTime();
  if (Date.now() - createdAt > 24 * 60 * 60 * 1000) {
    // Refund blocked gold to challenger
    if (challenge.bet_amount > 0) {
      const challengerRefund = db.getCharacterById(challenge.challenger_id);
      if (challengerRefund) {
        db.updateCharacter(challengerRefund.id, { gold: (challengerRefund.gold || 0) + challenge.bet_amount });
      }
    }
    db.declineChallenge(challengeId);
    return res.status(400).json({ error: 'Este reto ha expirado (24h)' });
  }

  const acceptBet = parseInt(accepted_bet) || 0;
  if (acceptBet < 0) return res.status(400).json({ error: 'Apuesta inválida' });

  const challenger = db.getCharacterById(challenge.challenger_id);
  const challenged = db.getCharacterById(challenge.challenged_id);
  if (!challenger || !challenged) return res.status(404).json({ error: 'Personaje no encontrado' });

  // Challenger's gold was already blocked on creation, no need to check again
  // But verify challenged has enough
  if (acceptBet > 0 && (challenged.gold || 0) < acceptBet) {
    return res.status(400).json({ error: 'No tienes suficiente oro. Tienes ' + (challenged.gold || 0) + ' y apuestas ' + acceptBet });
  }

  // Run the combat
  const result = combat.simulateCombat(challenger, challenged);
  const winnerId = result.winner_id;
  const loserId = result.loser_id;
  const isWin = winnerId === challenged.id; // from perspective of the challenged

  // Save fight log
  const fightResult = db.addFightLog({
    char1_id: challenger.id,
    char2_id: challenged.id,
    winner_id: winnerId,
    xp_winner: 0,
    xp_loser: 0,
    log: result.log
  });

  // Combat history for challenge
  db.addCombatHistory({
    char1_id: challenger.id, char2_id: challenged.id,
    char1_name: challenger.name, char2_name: challenged.name,
    winner_id: winnerId, is_pve: false,
    char1_xp: 0, char2_xp: 0,
    char1_gold: 0, char2_gold: 0,
    wager: challenge.bet_amount + (parseInt(req.body.accepted_bet) || 0)
  });

  // Gold transfer: challenger's gold was already blocked on creation
  // Block challenged's bet now
  const challengerBet = challenge.bet_amount;
  const challengedBet = acceptBet;
  const totalPot = challengerBet + challengedBet;

  // Re-read characters for accurate gold (challenger's was already deducted)
  const challengerNow = db.getCharacterById(challenger.id);
  const challengedNow = db.getCharacterById(challenged.id);

  if (totalPot > 0) {
    if (winnerId === challenger.id) {
      // Challenger wins: refund own bet + get challenged's bet
      db.updateCharacter(challenger.id, { gold: (challengerNow.gold || 0) + challengerBet + challengedBet });
      db.updateCharacter(challenged.id, { gold: (challengedNow.gold || 0) - challengedBet });
    } else {
      // Challenged wins: gets challenger's blocked bet, loses own bet to nowhere (already blocked)
      // Challenger's gold was already deducted, challenged gets the full pot
      db.updateCharacter(challenged.id, { gold: (challengedNow.gold || 0) - challengedBet + totalPot });
      // Challenger already lost their gold (was blocked), no change needed
    }
  } else {
    // No bets, refund challenger's blocked gold (was 0 anyway)
  }

  // Mark challenge as completed
  db.completeChallenge(challengeId, winnerId, fightResult.lastInsertRowid, acceptBet);

  // Get updated characters
  const updatedChallenger = db.getCharacterById(challenger.id);
  const updatedChallenged = db.getCharacterById(challenged.id);
  const challengerPlayer = db.getPlayerById(challenger.player_id);
  const challengedPlayer = db.getPlayerById(challenged.player_id);

  res.json({
    success: true,
    winnerId,
    loserId,
    log: result.log,
    challengerBet,
    challengedBet,
    totalPot,
    challenger: { ...updatedChallenger, player_name: challengerPlayer?.display_name, player_slug: challengerPlayer?.slug, player_avatar: challengerPlayer?.avatar },
    challenged: { ...updatedChallenged, player_name: challengedPlayer?.display_name, player_slug: challengedPlayer?.slug, player_avatar: challengedPlayer?.avatar }
  });
});

// Decline a challenge
app.post('/api/challenge/:id/decline', (req, res) => {
  const challengeId = parseInt(req.params.id);
  const challenge = db.getChallengeById(challengeId);
  if (!challenge) return res.status(404).json({ error: 'Reto no encontrado' });
  if (challenge.status !== 'pending') return res.status(400).json({ error: 'Este reto ya no está pendiente' });

  // Refund blocked gold to challenger
  if (challenge.bet_amount > 0) {
    const challenger = db.getCharacterById(challenge.challenger_id);
    if (challenger) {
      db.updateCharacter(challenger.id, { gold: (challenger.gold || 0) + challenge.bet_amount });
    }
  }

  db.declineChallenge(challengeId);
  res.json({ success: true });
});

// Get challenge result
app.get('/api/challenge/:id/result', (req, res) => {
  const challengeId = parseInt(req.params.id);
  const challenge = db.getChallengeById(challengeId);
  if (!challenge) return res.status(404).json({ error: 'Reto no encontrado' });
  
  const challenger = db.getCharacterById(challenge.challenger_id);
  const challenged = db.getCharacterById(challenge.challenged_id);
  const challengerPlayer = challenger ? db.getPlayerById(challenger.player_id) : null;
  const challengedPlayer = challenged ? db.getPlayerById(challenged.player_id) : null;
  
  let fightLog = null;
  if (challenge.fight_log_id) {
    const log = db.getFightLogById(challenge.fight_log_id);
    if (log) fightLog = JSON.parse(log.log);
  }

  res.json({
    ...challenge,
    fightLog,
    challenger: challenger ? { ...challenger, player_name: challengerPlayer?.display_name, player_slug: challengerPlayer?.slug, player_avatar: challengerPlayer?.avatar } : null,
    challenged: challenged ? { ...challenged, player_name: challengedPlayer?.display_name, player_slug: challengedPlayer?.slug, player_avatar: challengedPlayer?.avatar } : null
  });
});
// ============ COMBAT HISTORY ============
app.get('/api/history/:charId', (req, res) => {
  const charId = parseInt(req.params.charId);
  if (!charId) return res.status(400).json({ error: 'charId invalido' });
  const history = db.getCombatHistory(charId, 50);
  res.json(history);
});

// ============ ACTIVE COMBAT ============
app.get('/api/combat/active/:charId', (req, res) => {
  const charId = parseInt(req.params.charId);
  const activeCombat = activeCombats[charId];
  if (activeCombat) {
    res.json({ active: true, data: activeCombat });
  } else {
    res.json({ active: false });
  }
});

app.delete('/api/combat/active/:charId', (req, res) => {
  const charId = parseInt(req.params.charId);
  delete activeCombats[charId];
  res.json({ ok: true });
});



app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('BRUTO GAME v3.0 (Weapon Combos) running on port ' + PORT);
});
