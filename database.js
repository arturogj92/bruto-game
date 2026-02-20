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
      weapon2 TEXT DEFAULT NULL,
      weapon3 TEXT DEFAULT NULL,
      weapon4 TEXT DEFAULT NULL,
      armor TEXT DEFAULT NULL,
      accessory TEXT DEFAULT NULL,
      inventory TEXT DEFAULT '[]',
      pending_choices TEXT DEFAULT NULL,
      gold INTEGER DEFAULT 0,
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

    CREATE TABLE IF NOT EXISTS pve_fights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      char_id INTEGER NOT NULL,
      difficulty TEXT NOT NULL,
      won INTEGER DEFAULT 0,
      xp_gained INTEGER DEFAULT 0,
      fight_date TEXT DEFAULT (date('now')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (char_id) REFERENCES characters(id)
    );

    CREATE TABLE IF NOT EXISTS marketplace (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seller_id INTEGER NOT NULL,
      item_type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      price INTEGER NOT NULL,
      listed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (seller_id) REFERENCES characters(id)
    );

    CREATE TABLE IF NOT EXISTS discoveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      combo_id TEXT NOT NULL,
      discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id) REFERENCES players(id),
      UNIQUE(player_id, combo_id)
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
  try { db.exec("ALTER TABLE characters ADD COLUMN weapon2 TEXT DEFAULT NULL"); } catch(e) {}
  try { db.exec("ALTER TABLE characters ADD COLUMN weapon3 TEXT DEFAULT NULL"); } catch(e) {}
  try { db.exec("ALTER TABLE characters ADD COLUMN weapon4 TEXT DEFAULT NULL"); } catch(e) {}
  try { db.exec("ALTER TABLE characters ADD COLUMN armor TEXT DEFAULT NULL"); } catch(e) {}
  try { db.exec("ALTER TABLE characters ADD COLUMN accessory TEXT DEFAULT NULL"); } catch(e) {}
  try { db.exec("ALTER TABLE characters ADD COLUMN inventory TEXT DEFAULT '[]'"); } catch(e) {}
  try { db.exec("ALTER TABLE characters ADD COLUMN pending_choices TEXT DEFAULT NULL"); } catch(e) {}
  try { db.exec("ALTER TABLE characters ADD COLUMN defense INTEGER DEFAULT 10"); } catch(e) {}
  try { db.exec("ALTER TABLE characters ADD COLUMN gold INTEGER DEFAULT 0"); } catch(e) {}
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
    INSERT INTO characters (player_id, name, hp_max, hp_base, strength, defense, speed, gold)
    VALUES (?, ?, 120, 120, 10, 10, 10, 0)
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
    DELETE FROM marketplace;
    DELETE FROM tournament_matches;
    DELETE FROM tournament;
    DELETE FROM fight_log;
    DELETE FROM discoveries;
    DELETE FROM characters;
  `);
};

// PvE queries
const getPveFightsHour = (charId) => {
  return db.prepare("SELECT COUNT(*) as count FROM pve_fights WHERE char_id = ? AND created_at >= datetime('now', '-1 hour')").get(charId);
};

const addPveFight = (data) => {
  return db.prepare(
    "INSERT INTO pve_fights (char_id, difficulty, won, xp_gained) VALUES (?, ?, ?, ?)"
  ).run(data.char_id, data.difficulty, data.won ? 1 : 0, data.xp_gained);
};

const getMinLevel = () => {
  return db.prepare("SELECT MIN(level) as min_level FROM characters").get();
};

const getMaxLevel = () => {
  return db.prepare("SELECT MAX(level) as max_level FROM characters").get();
};

// Discovery queries
const getDiscoveries = (playerId) => {
  return db.prepare('SELECT * FROM discoveries WHERE player_id = ?').all(playerId);
};

const addDiscovery = (playerId, comboId) => {
  try {
    return db.prepare('INSERT INTO discoveries (player_id, combo_id) VALUES (?, ?)').run(playerId, comboId);
  } catch(e) {
    // UNIQUE constraint - already discovered
    return null;
  }
};

const hasDiscovery = (playerId, comboId) => {
  return !!db.prepare('SELECT 1 FROM discoveries WHERE player_id = ? AND combo_id = ?').get(playerId, comboId);
};


// ============ MARKETPLACE QUERIES ============
const getMarketplaceListings = () => {
  return db.prepare(`
    SELECT m.*, c.name as seller_name, p.display_name as seller_player_name, p.slug as seller_slug
    FROM marketplace m
    JOIN characters c ON m.seller_id = c.id
    JOIN players p ON c.player_id = p.id
    ORDER BY m.listed_at DESC
  `).all();
};

const getMarketplaceListing = (id) => {
  return db.prepare('SELECT * FROM marketplace WHERE id = ?').get(id);
};

const addMarketplaceListing = (sellerId, itemType, itemId, price) => {
  return db.prepare(
    'INSERT INTO marketplace (seller_id, item_type, item_id, price) VALUES (?, ?, ?, ?)'
  ).run(sellerId, itemType, itemId, price);
};

const removeMarketplaceListing = (id) => {
  return db.prepare('DELETE FROM marketplace WHERE id = ?').run(id);
};

const getMyListings = (sellerId) => {
  return db.prepare('SELECT * FROM marketplace WHERE seller_id = ?').all(sellerId);
};

module.exports = {
  db, init,
  getPlayers, getPlayer, getPlayerById,
  getCharacter, getCharacterById, getAllCharacters,
  createCharacter, updateCharacter,
  addFightLog, getFightHistory,
  getActiveTournament, createTournament, updateTournament,
  getTournamentMatches, createTournamentMatch, updateTournamentMatch,
  resetDB,
  getPveFightsHour, addPveFight, getMinLevel, getMaxLevel,
  getDiscoveries, addDiscovery, hasDiscovery,
  getMarketplaceListings, getMarketplaceListing, addMarketplaceListing,
  removeMarketplaceListing, getMyListings
};
