// Avatar mapping: player slug → image file
const AVATAR_MAP = {
  arturo: 'bruto_guerrero.png',
  victor: 'bruto_mago.png',
  nacho: 'bruto_berserker.png',
  juan: 'bruto_arquero.png',
  rober: 'bruto_caballero.png',
  pollo: 'bruto_ninja.png'
};

const AVATAR_LABELS = {
  guerrero: 'Guerrero', mago: 'Mago', berserker: 'Berserker',
  arquero: 'Arquero', caballero: 'Caballero', ninja: 'Ninja'
};

function getAvatarUrl(playerSlugOrAvatar) {
  const file = AVATAR_MAP[playerSlugOrAvatar] || `bruto_${playerSlugOrAvatar || 'guerrero'}.png`;
  return `/img/${file}`;
}

const Views = {
  // Player Selection
  playerSelect(players) {
    return `
      <div class="screen active">
        <div style="text-align:center; margin-bottom:12px;">
          <div style="font-size:48px;">⚔️</div>
          <h1 class="game-title" style="font-size:32px; margin:8px 0;">EL BRUTO</h1>
          <p class="game-subtitle" style="font-size:12px;">Arena PvP</p>
        </div>
        <div class="player-grid">
          ${players.map(p => {
            const hasChar = !!p.character;
            const imgUrl = getAvatarUrl(p.slug);
            return `
              <div class="player-card ${hasChar ? 'has-character' : ''}" onclick="App.selectPlayer('${p.slug}')">
                ${hasChar ? `<div class="level-badge">Nv.${p.character.level}</div>` : ''}
                <div class="avatar-img-sm"><img src="${imgUrl}" alt="${p.display_name}"></div>
                <div class="name">${p.display_name}</div>
                <div class="status">${hasChar ? p.character.name : 'Sin personaje'}</div>
              </div>
            `;
          }).join('')}
        </div>
        <div style="margin-top:20px; text-align:center; display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm" onclick="App.showLeaderboard()" style="width:auto;">🏆 Ranking</button>
          <button class="btn btn-outline btn-sm" onclick="App.showTournament()" style="width:auto;">👑 Torneo</button>
        </div>
      </div>
    `;
  },

  // Character Creation
  characterCreate(player) {
    return `
      <div class="screen active">
        <div class="header">
          <button class="header-back" onclick="App.goBack()">←</button>
          <div class="header-title">⚔️ Crear Guerrero</div>
          <div class="header-player"><strong>${player.display_name}</strong></div>
        </div>
        <div class="create-form">
          <div class="preview-character">
            <div class="preview-avatar-img"><img src="${getAvatarUrl(player.slug)}" alt="${player.display_name}"></div>
            <div class="avatar-class">${AVATAR_LABELS[player.avatar] || 'Guerrero'}</div>
            <div class="preview-name" id="preview-name">Tu Guerrero</div>
          </div>
          <div class="form-group">
            <label>Nombre del Guerrero</label>
            <input type="text" id="char-name" placeholder="Ej: Thorin, Ragnar..." maxlength="20"
              oninput="document.getElementById('preview-name').textContent = this.value || 'Tu Guerrero'">
          </div>
          <button class="btn btn-gold" onclick="App.createCharacter()">⚔️ ¡CREAR GUERRERO!</button>
        </div>
      </div>
    `;
  },

  // Main Hub
  mainHub(player, character, defs) {
    const abilities = JSON.parse(character.abilities || '[]');
    const inventory = JSON.parse(character.inventory || '[]');
    const xpPct = character.level >= 50 ? 100 : (character.xp / character.xp_next * 100);
    const imgUrl = getAvatarUrl(player.slug);
    const effectiveStats = Views.calcEffective(character, defs);

    return `
      <div class="screen active">
        <div class="header">
          <button class="header-back" onclick="App.goBack()">←</button>
          <div class="header-title">⚔️ Arena</div>
          <div class="header-player"><strong>${player.display_name}</strong></div>
        </div>

        <div class="stats-card">
          <div class="stats-header">
            <div class="stats-avatar-img"><img src="${imgUrl}" alt="${character.name}"></div>
            <div class="stats-info">
              <h2>${character.name}</h2>
              <div class="stats-level">Nivel <strong>${character.level}</strong></div>
              <div class="xp-bar"><div class="xp-fill" style="width:${xpPct}%"></div></div>
              <div class="xp-text">${character.xp} / ${character.xp_next} XP</div>
            </div>
          </div>

          ${Views.statBar('❤️', 'Vida', effectiveStats.hp_max, 400, 'hp')}
          ${Views.statBar('💪', 'Fuerza', effectiveStats.strength, 60, 'str')}
          ${Views.statBar('🛡️', 'Defensa', effectiveStats.defense, 60, 'def')}
          ${Views.statBar('⚡', 'Velocidad', effectiveStats.speed, 60, 'spd')}

          <div class="record-row">
            <span class="wins">✅ ${character.wins}V</span>
            <span class="losses">❌ ${character.losses}D</span>
          </div>

          ${abilities.length > 0 ? `
            <div class="abilities-section">
              <div class="abilities-title">⚡ Habilidades</div>
              ${abilities.map(a => {
                const def = defs?.abilities?.[a];
                return `<span class="ability-tag">${def ? def.emoji : '⚡'} ${def ? def.name : a}</span>`;
              }).join('')}
            </div>
          ` : ''}
        </div>

        <!-- EQUIPMENT SLOTS -->
        <div class="equip-card">
          <div class="equip-title">🎒 Equipamiento</div>
          <div class="equip-slots">
            ${Views.equipSlot('weapon', '⚔️ Arma', character.weapon, defs?.weapons, inventory, character.id)}
            ${Views.equipSlot('armor', '🛡️ Armadura', character.armor, defs?.armors, inventory, character.id)}
            ${Views.equipSlot('accessory', '💍 Accesorio', character.accessory, defs?.accessories, inventory, character.id)}
          </div>
        </div>

        <!-- ACTION BUTTONS -->
        <div class="action-grid">
          <div class="action-card action-fight" onclick="App.matchmaking()">
            <div class="action-icon">⚔️</div>
            <div class="action-name">¡Lanzar Combate!</div>
            <div class="action-desc">Matchmaking PvP</div>
          </div>
          <div class="action-card" onclick="App.showPVPSelect()">
            <div class="action-icon">🎯</div>
            <div class="action-name">Retar Jugador</div>
            <div class="action-desc">Elige rival</div>
          </div>
          <div class="action-card" onclick="App.showLeaderboard()">
            <div class="action-icon">🏆</div>
            <div class="action-name">Ranking</div>
            <div class="action-desc">Clasificación</div>
          </div>
          <div class="action-card" onclick="App.showTournament()">
            <div class="action-icon">👑</div>
            <div class="action-name">Torneo</div>
            <div class="action-desc">Eliminatorio</div>
          </div>
        </div>
      </div>
    `;
  },

  statBar(emoji, name, value, max, cls) {
    return `
      <div class="stat-row">
        <div class="stat-name"><span class="emoji">${emoji}</span> ${name}</div>
        <div class="stat-bar-container"><div class="stat-bar-fill ${cls}" style="width:${Math.min(100, value/max*100)}%"></div></div>
        <div class="stat-value">${value}</div>
      </div>
    `;
  },

  equipSlot(slotType, label, equippedId, defsMap, inventory, charId) {
    const items = (inventory || []).filter(i => i.type === slotType);
    const equipped = equippedId && defsMap ? defsMap[equippedId] : null;
    
    return `
      <div class="equip-slot ${equipped ? 'equipped' : 'empty'}">
        <div class="slot-label">${label}</div>
        <div class="slot-content">
          ${equipped ? `
            <div class="slot-item">${equipped.emoji} ${equipped.name}</div>
            <div class="slot-desc">${equipped.desc || ''}</div>
          ` : `<div class="slot-empty">Vacío</div>`}
        </div>
        ${items.length > 1 ? `
          <select class="slot-select" onchange="App.equipItem('${slotType}', this.value)">
            ${items.map(i => {
              const def = defsMap?.[i.id];
              return `<option value="${i.id}" ${i.id === equippedId ? 'selected' : ''}>${def ? def.emoji + ' ' + def.name : i.id}</option>`;
            }).join('')}
          </select>
        ` : ''}
      </div>
    `;
  },

  calcEffective(char, defs) {
    const s = { hp_max: char.hp_max, strength: char.strength, defense: char.defense, speed: char.speed };
    if (char.weapon && defs?.weapons?.[char.weapon]) {
      const w = defs.weapons[char.weapon]; s.strength += (w.damage||0); s.speed += (w.speed||0);
    }
    if (char.armor && defs?.armors?.[char.armor]) {
      const a = defs.armors[char.armor]; s.defense += (a.defense||0); s.speed += (a.speed||0); s.hp_max += (a.hp||0);
    }
    if (char.accessory && defs?.accessories?.[char.accessory]) {
      const a = defs.accessories[char.accessory]; s.strength += (a.strength||0); s.defense += (a.defense||0); s.speed += (a.speed||0); s.hp_max += (a.hp||0);
    }
    return s;
  },

  // PVP Select
  pvpSelect(opponents, character) {
    return `
      <div class="screen active">
        <div class="header">
          <button class="header-back" onclick="App.showHub()">←</button>
          <div class="header-title">🎯 Retar Jugador</div>
          <div class="header-player"><strong>${character.name}</strong> Nv.${character.level}</div>
        </div>
        ${opponents.length === 0 ? `
          <div style="text-align:center; padding:40px; color:var(--text-dim);">
            <div style="font-size:48px;">😴</div><p>No hay oponentes aún.</p>
          </div>
        ` : `
          <div class="opponent-list">
            ${opponents.map(opp => {
              const imgUrl = getAvatarUrl(opp.player_slug || opp.player_avatar);
              return `
                <div class="opponent-card" onclick="App.fightPVP(${opp.id})">
                  <div class="opp-avatar-img"><img src="${imgUrl}" alt="${opp.name}"></div>
                  <div class="opp-info">
                    <div class="opp-name">${opp.name}</div>
                    <div class="opp-stats">Nv.${opp.level} | 💪${opp.strength} 🛡️${opp.defense} ⚡${opp.speed} | ${opp.player_name}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
  },

  // Leaderboard
  leaderboard(characters) {
    const medals = ['🥇', '🥈', '🥉'];
    return `
      <div class="screen active">
        <div class="header">
          <button class="header-back" onclick="App.goBack()">←</button>
          <div class="header-title">🏆 Ranking</div>
          <div></div>
        </div>
        ${characters.length === 0 ? '<div style="text-align:center;padding:40px;color:var(--text-dim);"><p>Aún no hay guerreros.</p></div>' : `
          <div class="leaderboard-list">
            ${characters.map((c, i) => {
              const imgUrl = getAvatarUrl(c.player_slug || c.player_avatar);
              return `
                <div class="lb-entry">
                  <div class="lb-rank">${medals[i] || (i + 1)}</div>
                  <div class="lb-avatar-img"><img src="${imgUrl}" alt="${c.name}"></div>
                  <div class="lb-info">
                    <div class="lb-name">${c.name}</div>
                    <div class="lb-stats">${c.player_name} · ${c.wins}V/${c.losses}D · 💪${c.strength} 🛡️${c.defense} ⚡${c.speed}</div>
                  </div>
                  <div class="lb-level">Nv.${c.level}</div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
  },

  // Result Screen
  resultScreen(isWin, xpGained, character, leveledUp) {
    return `
      <div class="victory-screen">
        <div class="victory-crown">${isWin ? '🏆' : '💀'}</div>
        <div class="victory-text ${isWin ? '' : 'defeat-text'}">${isWin ? '¡VICTORIA!' : '¡DERROTA!'}</div>
        <div class="victory-sub">+${xpGained} XP</div>
        ${leveledUp ? `<div class="level-up-text">⬆️ ¡NIVEL ${character.level}!</div>` : ''}
        <button class="btn btn-gold" onclick="App.closeResult()" style="max-width:300px;">Continuar</button>
      </div>
    `;
  },

  // Level up choice modal
  levelUpChoiceModal(choices) {
    return `
      <div class="modal-overlay" id="levelup-modal">
        <div class="modal-content">
          <div class="modal-title">⬆️ ¡Subida de Nivel!</div>
          <p style="color:var(--text-dim); font-size:13px; text-align:center; margin-bottom:16px;">Elige tu recompensa:</p>
          ${choices.map((c, i) => `
            <div class="ability-choice" onclick="App.selectLevelUpChoice(${i})">
              <div class="choice-type-badge ${c.type}">${c.type === 'weapon' ? '⚔️ ARMA' : c.type === 'ability' ? '⚡ HABILIDAD' : c.type === 'armor' ? '🛡️ ARMADURA' : c.type === 'accessory' ? '💍 ACCESORIO' : '📈 BOOST'}</div>
              <div class="ab-name">${c.emoji} ${c.name}</div>
              <div class="ab-desc">${c.desc}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  // Tournament
  tournament(data) {
    if (data.status === 'waiting') return Views.tournamentWaiting(data);
    return Views.tournamentBracket(data);
  },

  tournamentWaiting(data) {
    return `
      <div class="screen active">
        <div class="header">
          <button class="header-back" onclick="App.goBack()">←</button>
          <div class="header-title">👑 Torneo</div>
          <div></div>
        </div>
        <div class="tournament-section">
          <div style="text-align:center; margin-bottom:24px;">
            <div style="font-size:64px;">👑</div>
            <h2 style="color:var(--gold); font-size:24px;">Torneo Eliminatorio</h2>
          </div>
          <div class="stats-card">
            <h3 style="color:var(--gold); margin-bottom:12px;">Jugadores</h3>
            ${(data.chars || []).map(c => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                <span style="color:var(--text-bright);">${c.name}</span>
                <span style="color:var(--text-dim);">Nv.${c.level} (${c.player_name})</span>
              </div>
            `).join('')}
          </div>
          ${(data.chars||[]).length >= 2 ? `
            <button class="btn btn-gold" onclick="App.startTournament()" style="margin-top:16px;">⚔️ ¡INICIAR TORNEO!</button>
          ` : '<p style="text-align:center;color:var(--text-dim);">Se necesitan al menos 2 jugadores.</p>'}
        </div>
      </div>
    `;
  },

  tournamentBracket(data) {
    const matches = data.matches || [];
    const rounds = {};
    matches.forEach(m => { if (!rounds[m.round]) rounds[m.round] = []; rounds[m.round].push(m); });
    const roundNames = ['Cuartos', 'Semifinal', 'Final'];
    const numRounds = Object.keys(rounds).length;
    const champion = data.status === 'finished' && data.champion_id ? matches.find(m => m.winner_id === data.champion_id)?.winner : null;

    return `
      <div class="screen active">
        <div class="header">
          <button class="header-back" onclick="App.goBack()">←</button>
          <div class="header-title">👑 Torneo</div>
          <div></div>
        </div>
        ${champion ? `
          <div class="tournament-champion">
            <div class="champion-emoji">👑</div>
            <div class="champion-text">🏆 ¡${champion.name} es el CAMPEÓN! 🏆</div>
            <button class="btn btn-outline btn-sm" onclick="App.resetTournament()" style="margin-top:16px; width:auto;">🔄 Nuevo Torneo</button>
          </div>
        ` : ''}
        <div class="bracket-container">
          <div class="bracket">
            ${Object.keys(rounds).sort((a,b)=>a-b).map(round => {
              const rn = parseInt(round);
              const title = rn === numRounds - 1 ? 'Final' : rn === numRounds - 2 ? 'Semifinal' : (roundNames[rn] || `Ronda ${rn+1}`);
              return `
                <div class="bracket-round">
                  <div class="round-title">${title}</div>
                  ${rounds[round].map(m => {
                    const playable = !m.played && m.char1_id && m.char2_id;
                    return `
                      <div class="bracket-match ${m.played?'played':''} ${playable?'playable':''}" ${playable?`onclick="App.playTournamentMatch(${m.id})"`:''}>
                        <div class="bracket-fighter ${m.winner_id===m.char1_id?'winner':''} ${m.played&&m.winner_id!==m.char1_id?'loser':''}">
                          <span class="bf-name">${m.char1?m.char1.name:'BYE'}</span>
                        </div>
                        <div class="bracket-vs">VS</div>
                        <div class="bracket-fighter ${m.winner_id===m.char2_id?'winner':''} ${m.played&&m.winner_id!==m.char2_id?'loser':''}">
                          <span class="bf-name">${m.char2?m.char2.name:'BYE'}</span>
                        </div>
                        ${playable?'<div style="text-align:center;font-size:11px;color:var(--gold);margin-top:4px;">▶ Tap para pelear</div>':''}
                      </div>
                    `;
                  }).join('')}
                </div>
              `;
            }).join('')}
          </div>
        </div>
        ${data.status !== 'finished' ? `
          <div style="text-align:center;margin-top:16px;">
            <button class="btn btn-outline btn-sm" onclick="App.resetTournament()" style="width:auto;">🔄 Reiniciar</button>
          </div>
        ` : ''}
      </div>
    `;
  }
};
