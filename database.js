const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'bruto.db'));
db.pragma('journal_mode = WAL');

function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      avatar TEXT DEFAULT 'guerrero',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS characters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      xp_next INTEGER DEFAULT 100,
      hp_max INTEGER DEFAULT 120,
      hp_base INTEGER DEFAULT 120,
      strength INTEGER DEFAULT 10,
      defense INTEGER DEFAULT 10,
      speed INTEGER DEFAULT 10,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      abilities TEXT DEFAULT '[]',
      weapon TEXT DEFAULT NULL,
      armor TEXT DEFAULT NULL,
      accessory TEXT DEFAULT NULL,
      inventory TEXT DEFAULT '[]',
      pending_choices TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id) REFERENCES players(id)
    );

    CREATE TABLE IF NOT EXISTS fight_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      char1_id INTEGER,
      char2_id INTEGER,
      winner_id INTEGER,
      xp_winner INTEGER DEFAULT 0,
      xp_loser INTEGER DEFAULT 0,
      log TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tournament (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT DEFAULT 'waiting',
      bracket TEXT DEFAULT '[]',
      current_round INTEGER DEFAULT 0,
      champion_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tournament_matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER,
      round INTEGER,
      match_index INTEGER,
      char1_id INTEGER,
      char2_id INTEGER,
      winner_id INTEGER,
      fight_log TEXT,
      played INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournament(id)
    );
  `);

  // Seed fixed players with avatar assignments
  const existingPlayers = db.prepare('SELECT COUNT(*) as c FROM players').get();
  if (existingPlayers.c === 0) {
    const insert = db.prepare('INSERT INTO players (slug, display_name, avatar) VALUES (?, ?, ?)');
    const players = [
      ['arturo', 'Arturo', 'guerrero'],
      ['victor', 'Víctor', 'mago'],
      ['nacho', 'Nacho', 'berserker'],
      ['juan', 'Juan', 'arquero'],
      ['rober', 'Rober', 'caballero'],
      ['pollo', 'Pollo', 'ninja']
    ];
    for (const [slug, name, avatar] of players) {
      insert.run(slug, name, avatar);
    }
    console.log('✅ Seeded 6 players with avatars');
  } else {
    // Update existing players with avatars if missing
    const avatarMap = { arturo: 'guerrero', victor: 'mago', nacho: 'berserker', juan: 'arquero', rober: 'caballero', pollo: 'ninja' };
    try {
      db.exec("ALTER TABLE players ADD COLUMN avatar TEXT DEFAULT 'guerrero'");
    } catch(e) { /* column exists */ }
    for (const [slug, avatar] of Object.entries(avatarMap)) {
      db.prepare('UPDATE players SET avatar = ? WHERE slug = ?').run(avatar, slug);
    }
  }

  // Migrate characters table if needed
  try { db.exec("ALTER TABLE characters ADD COLUMN weapon TEXT DEFAULT NULL"); } catch(e) {}
  try { db.exec("ALTER TABLE characters ADD COLUMN armor TEXT DEFAULT NULL"); } catch(e) {}
  try { db.exec("ALTER TABLE characters ADD COLUMN accessory TEXT DEFAULT NULL"); } catch(e) {}
  try { db.exec("ALTER TABLE characters ADD COLUMN inventory TEXT DEFAULT '[]'"); } catch(e) {}
  try { db.exec("ALTER TABLE characters ADD COLUMN pending_choices TEXT DEFAULT NULL"); } catch(e) {}
  try { db.exec("ALTER TABLE characters ADD COLUMN defense INTEGER DEFAULT 10"); } catch(e) {}
}

// Player queries
const getPlayers = () => db.prepare('SELECT * FROM players').all();
const getPlayer = (slug) => db.prepare('SELECT * FROM players WHERE slug = ?').get(slug);
const getPlayerById = (id) => db.prepare('SELECT * FROM players WHERE id = ?').get(id);

// Character queries
const getCharacter = (playerId) => db.prepare('SELECT * FROM characters WHERE player_id = ?').get(playerId);
const getCharacterById = (id) => db.prepare('SELECT * FROM characters WHERE id = ?').get(id);
const getAllCharacters = () => db.prepare(`
  SELECT c.*, p.display_name as player_name, p.slug as player_slug, p.avatar as player_avatar
  FROM characters c JOIN players p ON c.player_id = p.id
  ORDER BY c.level DESC, c.xp DESC
`).all();

const createCharacter = (playerId, name) => {
  return db.prepare(`
    INSERT INTO characters (player_id, name, hp_max, hp_base, strength, defense, speed)
    VALUES (?, ?, 120, 120, 10, 10, 10)
  `).run(playerId, name);
};

const updateCharacter = (id, data) => {
  const fields = [];
  const values = [];
  for (const [key, val] of Object.entries(data)) {
    fields.push(`${key} = ?`);
    values.push(val);
  }
  values.push(id);
  return db.prepare(`UPDATE characters SET ${fields.join(', ')} WHERE id = ?`).run(...values);
};

const addFightLog = (data) => {
  return db.prepare(`
    INSERT INTO fight_log (char1_id, char2_id, winner_id, xp_winner, xp_loser, log)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(data.char1_id, data.char2_id, data.winner_id, data.xp_winner, data.xp_loser, JSON.stringify(data.log));
};

const getFightHistory = (charId, limit = 20) => {
  return db.prepare(`
    SELECT * FROM fight_log 
    WHERE char1_id = ? OR char2_id = ?
    ORDER BY created_at DESC LIMIT ?
  `).all(charId, charId, limit);
};

// Tournament queries
const getActiveTournament = () => db.prepare("SELECT * FROM tournament WHERE status != 'finished' ORDER BY id DESC LIMIT 1").get();
const createTournament = (bracket) => {
  return db.prepare("INSERT INTO tournament (status, bracket) VALUES ('active', ?)").run(JSON.stringify(bracket));
};
const updateTournament = (id, data) => {
  const fields = [];
  const values = [];
  for (const [key, val] of Object.entries(data)) {
    fields.push(`${key} = ?`);
    values.push(val);
  }
  values.push(id);
  return db.prepare(`UPDATE tournament SET ${fields.join(', ')} WHERE id = ?`).run(...values);
};

const getTournamentMatches = (tournamentId, round) => {
  if (round !== undefined) {
    return db.prepare('SELECT * FROM tournament_matches WHERE tournament_id = ? AND round = ? ORDER BY match_index').all(tournamentId, round);
  }
  return db.prepare('SELECT * FROM tournament_matches WHERE tournament_id = ? ORDER BY round, match_index').all(tournamentId);
};

const createTournamentMatch = (data) => {
  return db.prepare(`
    INSERT INTO tournament_matches (tournament_id, round, match_index, char1_id, char2_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(data.tournament_id, data.round, data.match_index, data.char1_id, data.char2_id);
};

const updateTournamentMatch = (id, data) => {
  const fields = [];
  const values = [];
  for (const [key, val] of Object.entries(data)) {
    fields.push(`${key} = ?`);
    values.push(val);
  }
  values.push(id);
  return db.prepare(`UPDATE tournament_matches SET ${fields.join(', ')} WHERE id = ?`).run(...values);
};

const resetDB = () => {
  db.exec(`
    DELETE FROM tournament_matches;
    DELETE FROM tournament;
    DELETE FROM fight_log;
    DELETE FROM characters;
  `);
};

module.exports = {
  db, init,
  getPlayers, getPlayer, getPlayerById,
  getCharacter, getCharacterById, getAllCharacters,
  createCharacter, updateCharacter,
  addFightLog, getFightHistory,
  getActiveTournament, createTournament, updateTournament,
  getTournamentMatches, createTournamentMatch, updateTournamentMatch,
  resetDB
};
