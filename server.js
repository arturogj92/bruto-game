const express = require('express');
const path = require('path');
const db = require('./database');
const combat = require('./combat-engine');

const app = express();
const PORT = process.env.PORT || 3481;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

db.init();

// ============ API ROUTES ============

// Get all players
app.get('/api/players', (req, res) => {
  const players = db.getPlayers();
  const chars = db.getAllCharacters();
  const charMap = {};
  for (const c of chars) charMap[c.player_id] = c;
  res.json(players.map(p => ({ ...p, character: charMap[p.id] || null })));
});

// Get single player + character
app.get('/api/player/:slug', (req, res) => {
  const player = db.getPlayer(req.params.slug);
  if (!player) return res.status(404).json({ error: 'Player not found' });
  const character = db.getCharacter(player.id);
  res.json({ ...player, character });
});

// Create character
app.post('/api/player/:slug/character', (req, res) => {
  const player = db.getPlayer(req.params.slug);
  if (!player) return res.status(404).json({ error: 'Player not found' });
  const existing = db.getCharacter(player.id);
  if (existing) return res.status(400).json({ error: 'Ya tienes un personaje' });
  const { name } = req.body;
  if (!name || name.length < 2 || name.length > 20) {
    return res.status(400).json({ error: 'Nombre inválido (2-20 chars)' });
  }
  db.createCharacter(player.id, name);
  const character = db.getCharacter(player.id);
  res.json({ success: true, character });
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

  // Find opponents ±2 levels, then closest
  const allChars = db.getAllCharacters();
  const opponents = allChars.filter(c => c.id !== char.id);
  if (opponents.length === 0) {
    return res.status(400).json({ error: 'No hay oponentes disponibles' });
  }

  // Sort by level proximity
  opponents.sort((a, b) => Math.abs(a.level - char.level) - Math.abs(b.level - char.level));
  
  // Prefer within ±2 levels, otherwise closest
  let pool = opponents.filter(o => Math.abs(o.level - char.level) <= 2);
  if (pool.length === 0) pool = [opponents[0]]; // closest level
  
  // Random from pool
  const opponent = pool[Math.floor(Math.random() * pool.length)];

  // Run combat
  const result = combat.simulateCombat(char, opponent);

  // XP calculation
  const baseWinXP = 30 + opponent.level * 5;
  const baseLoseXP = 8 + opponent.level * 2;
  const levelDiff = opponent.level - char.level;
  const winnerXP = Math.floor(baseWinXP * (1 + Math.max(0, levelDiff) * 0.1));
  const loserXP = Math.floor(baseLoseXP);

  const winnerId = result.winner_id;
  const isWin = winnerId === char.id;
  const myXP = isWin ? winnerXP : loserXP;

  // Update my character
  const myUpdates = {
    xp: char.xp + myXP,
    wins: isWin ? char.wins + 1 : char.wins,
    losses: isWin ? char.losses : char.losses + 1
  };
  
  let leveledUp = false;
  let levelUpData = null;
  if (myUpdates.xp >= char.xp_next && char.level < 50) {
    levelUpData = combat.levelUp(char);
    Object.assign(myUpdates, levelUpData.changes);
    myUpdates.xp = myUpdates.xp - char.xp_next;
    leveledUp = true;
  }

  db.updateCharacter(char.id, myUpdates);

  // Update opponent
  const oppXP = isWin ? loserXP : winnerXP;
  const oppUpdates = {
    xp: opponent.xp + oppXP,
    wins: !isWin ? opponent.wins + 1 : opponent.wins,
    losses: !isWin ? opponent.losses : opponent.losses + 1
  };
  if (oppUpdates.xp >= opponent.xp_next && opponent.level < 50) {
    const oppLvl = combat.levelUp(opponent);
    Object.assign(oppUpdates, oppLvl.changes);
    oppUpdates.xp = oppUpdates.xp - opponent.xp_next;
  }
  db.updateCharacter(opponent.id, oppUpdates);

  // Log fight
  db.addFightLog({
    char1_id: char.id, char2_id: opponent.id,
    winner_id: winnerId, xp_winner: winnerXP, xp_loser: loserXP,
    log: result.log
  });

  const updatedChar = db.getCharacterById(char.id);
  const updatedOpp = db.getCharacterById(opponent.id);

  // Get player info for opponent
  const oppPlayer = db.getPlayerById(opponent.player_id);

  res.json({
    result: isWin ? 'win' : 'lose',
    log: result.log,
    xpGained: myXP,
    leveledUp,
    pendingChoices: leveledUp && updatedChar.pending_choices ? JSON.parse(updatedChar.pending_choices) : null,
    character: updatedChar,
    opponent: { ...updatedOpp, player_name: oppPlayer?.display_name, player_avatar: oppPlayer?.avatar }
  });
});

// Direct PVP fight
app.post('/api/fight/pvp', (req, res) => {
  const { charId, opponentId } = req.body;
  const char1 = db.getCharacterById(charId);
  const char2 = db.getCharacterById(opponentId);
  if (!char1 || !char2) return res.status(404).json({ error: 'Character not found' });
  if (char1.id === char2.id) return res.status(400).json({ error: 'No puedes pelear contigo mismo' });

  const result = combat.simulateCombat(char1, char2);
  const winnerXP = Math.floor(30 + char2.level * 5);
  const loserXP = Math.floor(8 + char2.level * 2);
  const winnerId = result.winner_id;
  const loserId = result.loser_id;

  const winner = winnerId === char1.id ? char1 : char2;
  const loser = loserId === char1.id ? char1 : char2;

  // Update winner
  const winnerUpdates = { xp: winner.xp + winnerXP, wins: winner.wins + 1 };
  let winnerLeveledUp = false;
  if (winnerUpdates.xp >= winner.xp_next && winner.level < 50) {
    const lvlData = combat.levelUp(winner);
    Object.assign(winnerUpdates, lvlData.changes);
    winnerUpdates.xp = winnerUpdates.xp - winner.xp_next;
    winnerLeveledUp = true;
  }
  db.updateCharacter(winner.id, winnerUpdates);

  // Update loser
  const loserUpdates = { xp: loser.xp + loserXP, losses: loser.losses + 1 };
  if (loserUpdates.xp >= loser.xp_next && loser.level < 50) {
    const lvlData = combat.levelUp(loser);
    Object.assign(loserUpdates, lvlData.changes);
    loserUpdates.xp = loserUpdates.xp - loser.xp_next;
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
  if (!char.pending_choices) return res.status(400).json({ error: 'No hay elección pendiente' });

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

  res.json({ success: true, chosen, character: updated });
});

// Equip item
app.post('/api/character/:id/equip', (req, res) => {
  const char = db.getCharacterById(parseInt(req.params.id));
  if (!char) return res.status(404).json({ error: 'Character not found' });

  const { slot, itemId } = req.body;
  if (!['weapon', 'armor', 'accessory'].includes(slot)) {
    return res.status(400).json({ error: 'Slot inválido' });
  }

  const inventory = JSON.parse(char.inventory || '[]');
  const hasItem = inventory.some(i => i.type === slot && i.id === itemId);
  if (!hasItem && itemId !== null) {
    return res.status(400).json({ error: 'No tienes ese item' });
  }

  db.updateCharacter(char.id, { [slot]: itemId });
  res.json({ success: true, character: db.getCharacterById(char.id) });
});

// Get ability/item definitions
app.get('/api/definitions', (req, res) => {
  res.json({
    abilities: combat.ABILITIES,
    weapons: combat.WEAPONS,
    armors: combat.ARMORS,
    accessories: combat.ACCESSORIES
  });
});

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

  // Auto-resolve byes
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

// Admin reset
app.post('/api/admin/reset', (req, res) => {
  db.resetDB();
  res.json({ success: true, message: 'Todo reseteado' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`⚔️  BRUTO GAME v2 running on port ${PORT}`);
  console.log(`🏰 http://localhost:${PORT}`);
});
