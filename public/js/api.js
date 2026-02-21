const API = {
  async get(url) {
    const res = await fetch(url);
    if (!res.ok) { const err = await res.json().catch(() => ({ error: "Error desconocido" })); throw new Error(err.error || "Error del servidor"); }
    return res.json();
  },
  async post(url, data) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!res.ok) { const err = await res.json().catch(() => ({ error: "Error desconocido" })); throw new Error(err.error || "Error del servidor"); }
    return res.json();
  },
  getPlayers() { return this.get("/api/players"); },
  getPlayer(slug) { return this.get("/api/player/" + slug); },
  createCharacter(slug, name) { return this.post("/api/player/" + slug + "/character", { name }); },
  getCharacter(id) { return this.get("/api/character/" + id); },
  getLeaderboard() { return this.get("/api/leaderboard"); },
  getDefinitions() { return this.get("/api/definitions"); },
  matchmaking(charId) { return this.post("/api/fight/matchmaking", { charId }); },
  fightPVP(charId, opponentId) { return this.post("/api/fight/pvp", { charId, opponentId }); },
  fightPVE(characterId, difficulty) { return this.post("/api/fight/pve", { characterId, difficulty }); },
  getPveInfo(charId) { return this.get("/api/pve/info/" + charId); },
  chooseLevelUp(charId, choiceIndex) { return this.post("/api/character/" + charId + "/choose", { choiceIndex }); },
  equipItem(charId, slot, itemId) { return this.post("/api/character/" + charId + "/equip", { slot, itemId }); },
  getFightHistory(charId) { return this.get("/api/fights/" + charId); },
  getDiscoveries(playerId) { return this.get("/api/discoveries/" + playerId); },
  getActiveCombos(charId) { return this.get("/api/character/" + charId + "/combos"); },
  getTournament() { return this.get("/api/tournament"); },
  startTournament() { return this.post("/api/tournament/start"); },
  playTournamentMatch(matchId) { return this.post("/api/tournament/match/" + matchId); },
  resetTournament() { return this.post("/api/tournament/reset"); },
  adminReset() { return this.post("/api/admin/reset"); }
};

// Combo endpoints
API.getCombos = async () => {
  const res = await fetch(API.BASE + '/api/combos');
  if (!res.ok) throw new Error('Error fetching combos');
  return res.json();
};

API.getDiscoveries = async (charId) => {
  const res = await fetch(API.BASE + '/api/discoveries/' + charId);
  if (!res.ok) throw new Error('Error fetching discoveries');
  return res.json();
};

// Gold, Shop & Marketplace
API.getShop = function() { return API.get('/api/shop'); };
API.buyFromShop = function(charId, itemType, itemId, price) {
  return API.post('/api/shop/buy', { charId, itemType, itemId, price });
};
API.getMarketplace = function() { return API.get('/api/marketplace'); };
API.getMyListings = function(charId) { return API.get('/api/marketplace/mine/' + charId); };
API.listOnMarketplace = function(charId, itemType, itemId, price) {
  return API.post('/api/marketplace/list', { charId, itemType, itemId, price: parseInt(price) });
};
API.buyFromMarketplace = function(charId, listingId) {
  return API.post('/api/marketplace/buy', { charId, listingId });
};
API.cancelListing = function(charId, listingId) {
  return API.post('/api/marketplace/cancel', { charId, listingId });
};


// ============ CHALLENGES / RETOS ============
API.createChallenge = function(challengerId, challengedId, betAmount) {
  return API.post('/api/challenge', { challenger_id: challengerId, challenged_id: challengedId, bet_amount: betAmount });
};
API.getChallenges = function(charId) {
  return API.get('/api/challenges/' + charId);
};
API.getChallengeCount = function(charId) {
  return API.get('/api/challenges/' + charId + '/count');
};
API.acceptChallenge = function(challengeId, acceptedBet) {
  return API.post('/api/challenge/' + challengeId + '/accept', { accepted_bet: acceptedBet });
};
API.declineChallenge = function(challengeId) {
  return API.post('/api/challenge/' + challengeId + '/decline', {});
};

// Combat History & Active Combat
API.getCombatHistory = function(charId) { return API.get('/api/history/' + charId); };
API.getActiveCombat = function(charId) { return API.get('/api/combat/active/' + charId); };
API.clearActiveCombat = function(charId) { return fetch('/api/combat/active/' + charId, { method: 'DELETE' }).then(r => r.json()); };
