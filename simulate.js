#!/usr/bin/env node
/**
 * Balance Simulator for El Bruto
 * Usage: node simulate.js [cycles] [matchesPerPair]
 * Example: node simulate.js 5 10000
 */

const combat = require('./combat-engine');

const { ABILITIES, WEAPONS, ARMORS, ACCESSORIES, STAT_BOOSTS } = combat;

// ============ VIRTUAL PLAYER CREATION ============

function createBaseCharacter(id, name) {
  return {
    id,
    name,
    level: 1,
    hp_max: 100,
    hp_base: 100,
    strength: 10,
    defense: 8,
    speed: 8,
    abilities: '[]',
    inventory: '[]',
    weapon: null,
    armor: null,
    accessory: null,
    xp: 0,
    xp_next: 100,
    wins: 0,
    losses: 0,
    pending_choices: null
  };
}

function levelUpCharacter(char) {
  // Apply base stat gains (same as server)
  char.level += 1;
  char.hp_max += Math.floor(8 + Math.random() * 8);
  char.strength += Math.floor(1 + Math.random() * 2);
  char.defense += Math.floor(1 + Math.random() * 2);
  char.speed += Math.floor(1 + Math.random() * 2);
  char.hp_base = char.hp_max;
  char.xp_next = combat.getXPForLevel(char.level);

  // Generate 3 choices, pick one randomly
  const choices = combat.generateLevelUpChoices(char);
  if (choices.length > 0) {
    const chosen = choices[Math.floor(Math.random() * choices.length)];
    const updates = combat.applyLevelUpChoice(char, chosen);
    for (const [key, val] of Object.entries(updates)) {
      char[key] = val;
    }
  }
}

function buildRandomPlayer(id, targetLevel) {
  const names = ['Guerrero', 'Bárbaro', 'Paladín', 'Asesino', 'Berserker', 'Caballero',
                  'Druida', 'Monje', 'Ranger', 'Brujo', 'Gladiador', 'Vikingo'];
  const name = names[id % names.length] + '_' + id;
  const char = createBaseCharacter(id, name);

  for (let lvl = 1; lvl < targetLevel; lvl++) {
    levelUpCharacter(char);
  }

  // Auto-equip best items from inventory
  autoEquip(char);

  return char;
}

function autoEquip(char) {
  const inventory = JSON.parse(char.inventory || '[]');

  // Equip best weapon (highest damage)
  const weapons = inventory.filter(i => i.type === 'weapon');
  if (weapons.length > 0 && !char.weapon) {
    let best = weapons[0];
    for (const w of weapons) {
      if (WEAPONS[w.id] && WEAPONS[best.id] && WEAPONS[w.id].damage > WEAPONS[best.id].damage) {
        best = w;
      }
    }
    char.weapon = best.id;
  }

  // Equip best armor (highest defense)
  const armors = inventory.filter(i => i.type === 'armor');
  if (armors.length > 0 && !char.armor) {
    let best = armors[0];
    for (const a of armors) {
      if (ARMORS[a.id] && ARMORS[best.id] && ARMORS[a.id].defense > ARMORS[best.id].defense) {
        best = a;
      }
    }
    char.armor = best.id;
  }

  // Equip best accessory
  const accessories = inventory.filter(i => i.type === 'accessory');
  if (accessories.length > 0 && !char.accessory) {
    char.accessory = accessories[0].id;
  }
}

// ============ SIMULATION ============

function runSimulation(numCycles, matchesPerPair) {
  const PLAYERS_PER_CYCLE = 6;
  const TARGET_LEVEL = 20;

  // Tracking data
  const abilityStats = {};   // ability -> { appearances, wins, totalFights }
  const weaponStats = {};    // weapon -> { appearances, wins, totalFights }
  const armorStats = {};     // armor -> { appearances, wins, totalFights }
  const accessoryStats = {}; // accessory -> { appearances, wins, totalFights }
  const comboStats = {};     // "ability+ability+weapon" -> { appearances, wins }
  const boostStats = {};     // stat boost patterns

  let totalFights = 0;
  let globalId = 1;

  const startTime = Date.now();

  for (let cycle = 0; cycle < numCycles; cycle++) {
    // Create players with random builds
    const players = [];
    for (let i = 0; i < PLAYERS_PER_CYCLE; i++) {
      players.push(buildRandomPlayer(globalId++, TARGET_LEVEL));
    }

    // Round-robin: each pair fights N times
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const p1 = players[i];
        const p2 = players[j];

        const p1Abilities = JSON.parse(p1.abilities || '[]');
        const p2Abilities = JSON.parse(p2.abilities || '[]');
        const p1Weapon = p1.weapon;
        const p2Weapon = p2.weapon;
        const p1Armor = p1.armor;
        const p2Armor = p2.armor;
        const p1Accessory = p1.accessory;
        const p2Accessory = p2.accessory;

        // Build key for combo tracking
        const p1BuildKey = buildKey(p1);
        const p2BuildKey = buildKey(p2);

        let p1Wins = 0;
        let p2Wins = 0;

        for (let m = 0; m < matchesPerPair; m++) {
          const result = combat.simulateCombat(p1, p2);
          totalFights++;

          if (result.winner_id === p1.id) {
            p1Wins++;
          } else {
            p2Wins++;
          }
        }

        // Record ability stats
        for (const ab of p1Abilities) {
          if (!abilityStats[ab]) abilityStats[ab] = { appearances: 0, wins: 0, totalFights: 0 };
          abilityStats[ab].appearances++;
          abilityStats[ab].wins += p1Wins;
          abilityStats[ab].totalFights += matchesPerPair;
        }
        for (const ab of p2Abilities) {
          if (!abilityStats[ab]) abilityStats[ab] = { appearances: 0, wins: 0, totalFights: 0 };
          abilityStats[ab].appearances++;
          abilityStats[ab].wins += p2Wins;
          abilityStats[ab].totalFights += matchesPerPair;
        }

        // Record weapon stats
        if (p1Weapon) {
          if (!weaponStats[p1Weapon]) weaponStats[p1Weapon] = { appearances: 0, wins: 0, totalFights: 0 };
          weaponStats[p1Weapon].appearances++;
          weaponStats[p1Weapon].wins += p1Wins;
          weaponStats[p1Weapon].totalFights += matchesPerPair;
        }
        if (p2Weapon) {
          if (!weaponStats[p2Weapon]) weaponStats[p2Weapon] = { appearances: 0, wins: 0, totalFights: 0 };
          weaponStats[p2Weapon].appearances++;
          weaponStats[p2Weapon].wins += p2Wins;
          weaponStats[p2Weapon].totalFights += matchesPerPair;
        }

        // Record armor stats
        if (p1Armor) {
          if (!armorStats[p1Armor]) armorStats[p1Armor] = { appearances: 0, wins: 0, totalFights: 0 };
          armorStats[p1Armor].appearances++;
          armorStats[p1Armor].wins += p1Wins;
          armorStats[p1Armor].totalFights += matchesPerPair;
        }
        if (p2Armor) {
          if (!armorStats[p2Armor]) armorStats[p2Armor] = { appearances: 0, wins: 0, totalFights: 0 };
          armorStats[p2Armor].appearances++;
          armorStats[p2Armor].wins += p2Wins;
          armorStats[p2Armor].totalFights += matchesPerPair;
        }

        // Record accessory stats
        if (p1Accessory) {
          if (!accessoryStats[p1Accessory]) accessoryStats[p1Accessory] = { appearances: 0, wins: 0, totalFights: 0 };
          accessoryStats[p1Accessory].appearances++;
          accessoryStats[p1Accessory].wins += p1Wins;
          accessoryStats[p1Accessory].totalFights += matchesPerPair;
        }
        if (p2Accessory) {
          if (!accessoryStats[p2Accessory]) accessoryStats[p2Accessory] = { appearances: 0, wins: 0, totalFights: 0 };
          accessoryStats[p2Accessory].appearances++;
          accessoryStats[p2Accessory].wins += p2Wins;
          accessoryStats[p2Accessory].totalFights += matchesPerPair;
        }

        // Record combo stats
        if (!comboStats[p1BuildKey]) comboStats[p1BuildKey] = { appearances: 0, wins: 0, totalFights: 0 };
        comboStats[p1BuildKey].appearances++;
        comboStats[p1BuildKey].wins += p1Wins;
        comboStats[p1BuildKey].totalFights += matchesPerPair;

        if (!comboStats[p2BuildKey]) comboStats[p2BuildKey] = { appearances: 0, wins: 0, totalFights: 0 };
        comboStats[p2BuildKey].appearances++;
        comboStats[p2BuildKey].wins += p2Wins;
        comboStats[p2BuildKey].totalFights += matchesPerPair;
      }
    }

    process.stdout.write(`\r  Ciclo ${cycle + 1}/${numCycles} completado...`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n  ✅ ${totalFights.toLocaleString()} peleas simuladas en ${elapsed}s\n`);

  return { abilityStats, weaponStats, armorStats, accessoryStats, comboStats, totalFights, elapsed };
}

function buildKey(player) {
  const abilities = JSON.parse(player.abilities || '[]').sort();
  const parts = [];
  if (player.weapon) parts.push(WEAPONS[player.weapon]?.name || player.weapon);
  if (player.armor) parts.push(ARMORS[player.armor]?.name || player.armor);
  for (const ab of abilities) {
    parts.push(ABILITIES[ab]?.name || ab);
  }
  return parts.join(' + ') || '(sin equipo)';
}

// ============ OUTPUT ============

function printResults(data) {
  const { abilityStats, weaponStats, armorStats, accessoryStats, comboStats } = data;
  const BASELINE = 50.0; // Expected winrate in balanced game

  // Header
  console.log('╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    ⚔️  EL BRUTO — BALANCE REPORT  ⚔️                    ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝');
  console.log();

  // ─── ABILITIES ───
  console.log('┌──────────────────────────────────────────────────────────────────────────┐');
  console.log('│  🎯 HABILIDADES POR WINRATE                                             │');
  console.log('├────────────────────────┬─────────────┬──────────┬────────────────────────┤');
  console.log('│ Habilidad              │ Apariciones │ Winrate  │ Impacto                │');
  console.log('├────────────────────────┼─────────────┼──────────┼────────────────────────┤');

  const abilitySorted = Object.entries(abilityStats)
    .map(([key, s]) => ({ key, name: ABILITIES[key]?.name || key, ...s, winrate: s.totalFights > 0 ? (s.wins / s.totalFights * 100) : 0 }))
    .sort((a, b) => b.winrate - a.winrate);

  for (const ab of abilitySorted) {
    const impact = ab.winrate - BASELINE;
    const impactStr = impact >= 0 ? `+${impact.toFixed(1)}%` : `${impact.toFixed(1)}%`;
    const flag = impact > 8 ? ' ⚠️ OP' : impact < -5 ? ' ❌ WEAK' : '';
    console.log(`│ ${pad(ab.name, 22)} │ ${pad(ab.appearances.toString(), 11)} │ ${pad(ab.winrate.toFixed(1) + '%', 8)} │ ${pad(impactStr + flag, 22)} │`);
  }
  console.log('└────────────────────────┴─────────────┴──────────┴────────────────────────┘');
  console.log();

  // ─── WEAPONS ───
  console.log('┌──────────────────────────────────────────────────────────────────────────┐');
  console.log('│  ⚔️  ARMAS POR WINRATE                                                   │');
  console.log('├────────────────────────┬─────────────┬──────────┬────────────────────────┤');
  console.log('│ Arma                   │ Apariciones │ Winrate  │ Impacto                │');
  console.log('├────────────────────────┼─────────────┼──────────┼────────────────────────┤');

  const weaponSorted = Object.entries(weaponStats)
    .map(([key, s]) => ({ key, name: WEAPONS[key]?.name || key, ...s, winrate: s.totalFights > 0 ? (s.wins / s.totalFights * 100) : 0 }))
    .sort((a, b) => b.winrate - a.winrate);

  for (const w of weaponSorted) {
    const impact = w.winrate - BASELINE;
    const impactStr = impact >= 0 ? `+${impact.toFixed(1)}%` : `${impact.toFixed(1)}%`;
    const flag = impact > 8 ? ' ⚠️ OP' : impact < -5 ? ' ❌ WEAK' : '';
    console.log(`│ ${pad(w.name, 22)} │ ${pad(w.appearances.toString(), 11)} │ ${pad(w.winrate.toFixed(1) + '%', 8)} │ ${pad(impactStr + flag, 22)} │`);
  }
  console.log('└────────────────────────┴─────────────┴──────────┴────────────────────────┘');
  console.log();

  // ─── ARMORS ───
  console.log('┌──────────────────────────────────────────────────────────────────────────┐');
  console.log('│  🛡️  ARMADURAS POR WINRATE                                               │');
  console.log('├────────────────────────┬─────────────┬──────────┬────────────────────────┤');
  console.log('│ Armadura               │ Apariciones │ Winrate  │ Impacto                │');
  console.log('├────────────────────────┼─────────────┼──────────┼────────────────────────┤');

  const armorSorted = Object.entries(armorStats)
    .map(([key, s]) => ({ key, name: ARMORS[key]?.name || key, ...s, winrate: s.totalFights > 0 ? (s.wins / s.totalFights * 100) : 0 }))
    .sort((a, b) => b.winrate - a.winrate);

  for (const a of armorSorted) {
    const impact = a.winrate - BASELINE;
    const impactStr = impact >= 0 ? `+${impact.toFixed(1)}%` : `${impact.toFixed(1)}%`;
    const flag = impact > 8 ? ' ⚠️ OP' : impact < -5 ? ' ❌ WEAK' : '';
    console.log(`│ ${pad(a.name, 22)} │ ${pad(a.appearances.toString(), 11)} │ ${pad(a.winrate.toFixed(1) + '%', 8)} │ ${pad(impactStr + flag, 22)} │`);
  }
  console.log('└────────────────────────┴─────────────┴──────────┴────────────────────────┘');
  console.log();

  // ─── ACCESSORIES ───
  console.log('┌──────────────────────────────────────────────────────────────────────────┐');
  console.log('│  💍 ACCESORIOS POR WINRATE                                               │');
  console.log('├────────────────────────┬─────────────┬──────────┬────────────────────────┤');
  console.log('│ Accesorio              │ Apariciones │ Winrate  │ Impacto                │');
  console.log('├────────────────────────┼─────────────┼──────────┼────────────────────────┤');

  const accSorted = Object.entries(accessoryStats)
    .map(([key, s]) => ({ key, name: ACCESSORIES[key]?.name || key, ...s, winrate: s.totalFights > 0 ? (s.wins / s.totalFights * 100) : 0 }))
    .sort((a, b) => b.winrate - a.winrate);

  for (const a of accSorted) {
    const impact = a.winrate - BASELINE;
    const impactStr = impact >= 0 ? `+${impact.toFixed(1)}%` : `${impact.toFixed(1)}%`;
    const flag = impact > 8 ? ' ⚠️ OP' : impact < -5 ? ' ❌ WEAK' : '';
    console.log(`│ ${pad(a.name, 22)} │ ${pad(a.appearances.toString(), 11)} │ ${pad(a.winrate.toFixed(1) + '%', 8)} │ ${pad(impactStr + flag, 22)} │`);
  }
  console.log('└────────────────────────┴─────────────┴──────────┴────────────────────────┘');
  console.log();

  // ─── OP COMBOS (>55% with enough data) ───
  console.log('┌──────────────────────────────────────────────────────────────────────────┐');
  console.log('│  🔥 COMBINACIONES OP (Winrate > 55%, min 3 apariciones)                  │');
  console.log('├────────────────────────────────────────────────────────┬──────────────────┤');
  console.log('│ Build                                                  │ Winrate          │');
  console.log('├────────────────────────────────────────────────────────┼──────────────────┤');

  const opCombos = Object.entries(comboStats)
    .map(([key, s]) => ({ key, ...s, winrate: s.totalFights > 0 ? (s.wins / s.totalFights * 100) : 0 }))
    .filter(c => c.winrate > 55 && c.appearances >= 3)
    .sort((a, b) => b.winrate - a.winrate)
    .slice(0, 20);

  if (opCombos.length === 0) {
    console.log('│ (ninguna combinación supera 55% con suficientes datos)                   │');
  }
  for (const c of opCombos) {
    const flag = c.winrate > 60 ? ' ⚠️' : '';
    console.log(`│ ${pad(c.key, 54)} │ ${pad(c.winrate.toFixed(1) + '%' + flag, 16)} │`);
  }
  console.log('└────────────────────────────────────────────────────────┴──────────────────┘');
  console.log();

  // ─── WEAK ABILITIES (<45%) ───
  console.log('┌──────────────────────────────────────────────────────────────────────────┐');
  console.log('│  ❌ HABILIDADES DÉBILES (Winrate < 48%)                                  │');
  console.log('├────────────────────────┬──────────┬──────────────────────────────────────┤');
  console.log('│ Habilidad              │ Winrate  │ Sugerencia                           │');
  console.log('├────────────────────────┼──────────┼──────────────────────────────────────┤');

  const weakAbilities = abilitySorted.filter(a => a.winrate < 48).reverse();

  const suggestions = {
    curacion: 'Subir healPercent a 0.30 o bajar threshold',
    esquivar: 'Subir dodgeBonus a 0.25',
    escudo: 'Subir damageReduction a 0.25',
    contraataque: 'Subir chance a 0.30 o counterDamage a 0.8',
    veneno: 'Subir poisonDamage a 7 o duration a 5',
    espinas: 'Subir thornsDamage a 0.35',
    ultima_resistencia: 'Añadir 2 usos o heal parcial al activar',
    vampirico: 'Subir lifeSteal a 0.25',
    furia: 'Subir threshold a 0.30 o bonus a 0.75',
    golpe_critico: 'Subir chance a 0.30',
    doble_golpe: 'Subir chance a 0.25 o damage a 0.7',
    grito_guerra: 'Subir buff a 0.40 o duración a 5',
  };

  if (weakAbilities.length === 0) {
    console.log('│ ✅ Todas las habilidades están por encima de 48%                         │');
  }
  for (const a of weakAbilities) {
    const sug = suggestions[a.key] || 'Revisar valores';
    console.log(`│ ${pad(a.name, 22)} │ ${pad(a.winrate.toFixed(1) + '%', 8)} │ ${pad(sug, 36)} │`);
  }
  console.log('└────────────────────────┴──────────┴──────────────────────────────────────┘');
  console.log();

  // ─── WEAK WEAPONS (<48%) ───
  const weakWeapons = weaponSorted.filter(w => w.winrate < 48).reverse();
  if (weakWeapons.length > 0) {
    console.log('┌──────────────────────────────────────────────────────────────────────────┐');
    console.log('│  ❌ ARMAS DÉBILES (Winrate < 48%)                                       │');
    console.log('├────────────────────────┬──────────┬──────────────────────────────────────┤');
    console.log('│ Arma                   │ Winrate  │ Sugerencia                           │');
    console.log('├────────────────────────┼──────────┼──────────────────────────────────────┤');
    for (const w of weakWeapons) {
      console.log(`│ ${pad(w.name, 22)} │ ${pad(w.winrate.toFixed(1) + '%', 8)} │ ${pad('Ajustar damage/speed ratio', 36)} │`);
    }
    console.log('└────────────────────────┴──────────┴──────────────────────────────────────┘');
    console.log();
  }

  // ─── BALANCE SUMMARY ───
  console.log('┌──────────────────────────────────────────────────────────────────────────┐');
  console.log('│  📊 RESUMEN DE BALANCE                                                   │');
  console.log('├──────────────────────────────────────────────────────────────────────────┤');
  
  const abilitySpread = abilitySorted.length > 0 ? (abilitySorted[0].winrate - abilitySorted[abilitySorted.length - 1].winrate) : 0;
  const weaponSpread = weaponSorted.length > 0 ? (weaponSorted[0].winrate - weaponSorted[weaponSorted.length - 1].winrate) : 0;
  
  const balanceScore = Math.max(0, 100 - abilitySpread * 2 - weaponSpread * 2 - opCombos.filter(c => c.winrate > 60).length * 5);
  
  console.log(`│  Spread habilidades: ${pad(abilitySpread.toFixed(1) + '%', 8)} (menor = mejor, ideal < 10%)          │`);
  console.log(`│  Spread armas:       ${pad(weaponSpread.toFixed(1) + '%', 8)} (menor = mejor, ideal < 10%)          │`);
  console.log(`│  Combos OP (>60%):   ${pad(opCombos.filter(c => c.winrate > 60).length.toString(), 8)}                                       │`);
  console.log(`│  Habilidades weak:   ${pad(weakAbilities.length.toString(), 8)}                                       │`);
  console.log(`│                                                                          │`);
  
  let grade;
  if (balanceScore >= 85) grade = '🟢 EXCELENTE';
  else if (balanceScore >= 70) grade = '🟡 BUENO';
  else if (balanceScore >= 50) grade = '🟠 MEJORABLE';
  else grade = '🔴 NECESITA AJUSTES';
  
  console.log(`│  NOTA DE BALANCE:    ${pad(balanceScore.toFixed(0) + '/100', 8)} ${pad(grade, 31)}│`);
  console.log('└──────────────────────────────────────────────────────────────────────────┘');
  console.log();
}

function pad(str, len) {
  str = String(str);
  if (str.length >= len) return str.substring(0, len);
  return str + ' '.repeat(len - str.length);
}

// ============ JSON REPORT ============

function generateReport(data) {
  const { abilityStats, weaponStats, armorStats, accessoryStats, comboStats, totalFights, elapsed } = data;
  const BASELINE = 50.0;

  const abilities = Object.entries(abilityStats)
    .map(([key, s]) => ({
      id: key,
      name: ABILITIES[key]?.name || key,
      appearances: s.appearances,
      wins: s.wins,
      totalFights: s.totalFights,
      winrate: s.totalFights > 0 ? +(s.wins / s.totalFights * 100).toFixed(2) : 0,
      impact: s.totalFights > 0 ? +((s.wins / s.totalFights * 100) - BASELINE).toFixed(2) : 0
    }))
    .sort((a, b) => b.winrate - a.winrate);

  const weapons = Object.entries(weaponStats)
    .map(([key, s]) => ({
      id: key,
      name: WEAPONS[key]?.name || key,
      appearances: s.appearances,
      wins: s.wins,
      totalFights: s.totalFights,
      winrate: s.totalFights > 0 ? +(s.wins / s.totalFights * 100).toFixed(2) : 0,
      impact: s.totalFights > 0 ? +((s.wins / s.totalFights * 100) - BASELINE).toFixed(2) : 0
    }))
    .sort((a, b) => b.winrate - a.winrate);

  const armors = Object.entries(armorStats)
    .map(([key, s]) => ({
      id: key,
      name: ARMORS[key]?.name || key,
      appearances: s.appearances,
      wins: s.wins,
      totalFights: s.totalFights,
      winrate: s.totalFights > 0 ? +(s.wins / s.totalFights * 100).toFixed(2) : 0,
      impact: s.totalFights > 0 ? +((s.wins / s.totalFights * 100) - BASELINE).toFixed(2) : 0
    }))
    .sort((a, b) => b.winrate - a.winrate);

  const accessories = Object.entries(accessoryStats)
    .map(([key, s]) => ({
      id: key,
      name: ACCESSORIES[key]?.name || key,
      appearances: s.appearances,
      wins: s.wins,
      totalFights: s.totalFights,
      winrate: s.totalFights > 0 ? +(s.wins / s.totalFights * 100).toFixed(2) : 0,
      impact: s.totalFights > 0 ? +((s.wins / s.totalFights * 100) - BASELINE).toFixed(2) : 0
    }))
    .sort((a, b) => b.winrate - a.winrate);

  const opCombos = Object.entries(comboStats)
    .map(([key, s]) => ({
      build: key,
      appearances: s.appearances,
      wins: s.wins,
      totalFights: s.totalFights,
      winrate: s.totalFights > 0 ? +(s.wins / s.totalFights * 100).toFixed(2) : 0
    }))
    .filter(c => c.winrate > 55 && c.appearances >= 3)
    .sort((a, b) => b.winrate - a.winrate)
    .slice(0, 30);

  const weakAbilities = abilities.filter(a => a.winrate < 48);
  const weakWeapons = weapons.filter(w => w.winrate < 48);

  const abilitySpread = abilities.length > 1 ? abilities[0].winrate - abilities[abilities.length - 1].winrate : 0;
  const weaponSpread = weapons.length > 1 ? weapons[0].winrate - weapons[weapons.length - 1].winrate : 0;
  const balanceScore = Math.max(0, 100 - abilitySpread * 2 - weaponSpread * 2 - opCombos.filter(c => c.winrate > 60).length * 5);

  return {
    timestamp: new Date().toISOString(),
    config: {
      totalFights,
      elapsedSeconds: parseFloat(elapsed),
      playersPerCycle: 6,
      targetLevel: 20
    },
    balanceScore: +balanceScore.toFixed(1),
    abilities,
    weapons,
    armors,
    accessories,
    opCombos,
    weakAbilities,
    weakWeapons,
    summary: {
      abilitySpread: +abilitySpread.toFixed(2),
      weaponSpread: +weaponSpread.toFixed(2),
      opComboCount: opCombos.filter(c => c.winrate > 60).length,
      weakAbilityCount: weakAbilities.length,
      weakWeaponCount: weakWeapons.length
    }
  };
}

// ============ MAIN ============

const args = process.argv.slice(2);
const numCycles = parseInt(args[0]) || 5;
const matchesPerPair = parseInt(args[1]) || 10000;

console.log();
console.log(`  ⚔️  EL BRUTO — Simulador de Balance`);
console.log(`  ─────────────────────────────────────`);
console.log(`  Ciclos:           ${numCycles}`);
console.log(`  Partidas/par:     ${matchesPerPair.toLocaleString()}`);
console.log(`  Jugadores/ciclo:  6`);
console.log(`  Nivel objetivo:   20`);
console.log(`  Peleas estimadas: ${(numCycles * 15 * matchesPerPair).toLocaleString()}`);
console.log();

const data = runSimulation(numCycles, matchesPerPair);
printResults(data);

// Save JSON report
const fs = require('fs');
const report = generateReport(data);
const reportPath = __dirname + '/balance-report.json';
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`  📄 Reporte guardado en: ${reportPath}`);
console.log();
