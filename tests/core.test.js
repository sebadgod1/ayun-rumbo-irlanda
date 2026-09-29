const assert = require('assert');
const C = require('../core.js');

const d = C.emptyDay();
assert.strictEqual(C.completedCount(d), 0);
C.HABITS.forEach(id => { d.habits[id] = true; });
assert.strictEqual(C.dayPercent(d), 100);
assert.strictEqual(C.dayWon(d), true);
assert.strictEqual(C.dayXp(d), 80);

// Migración: sesiones antiguas conservan aproximadamente su XP previo.
const legacy = C.normalizeDay({ trainings:['bike','strength'] });
assert.strictEqual(C.sessionMinutes(legacy, 'bike'), 40);
assert.strictEqual(C.sessionMinutes(legacy, 'strength'), 45);
assert.strictEqual(C.trainingXp(legacy), 55);

// Tramos de bicicleta.
assert.strictEqual(C.trainingXpFor('bike', 19), 0);
assert.strictEqual(C.trainingXpFor('bike', 20), 15);
assert.strictEqual(C.trainingXpFor('bike', 40), 25);
assert.strictEqual(C.trainingXpFor('bike', 60), 35);
assert.strictEqual(C.trainingXpFor('bike', 90), 40);
assert.strictEqual(C.trainingXpFor('bike', 180), 40);

// Tramos de fuerza.
assert.strictEqual(C.trainingXpFor('strength', 14), 0);
assert.strictEqual(C.trainingXpFor('strength', 15), 10);
assert.strictEqual(C.trainingXpFor('strength', 30), 20);
assert.strictEqual(C.trainingXpFor('strength', 45), 30);
assert.strictEqual(C.trainingXpFor('strength', 60), 35);
assert.strictEqual(C.trainingXpFor('strength', 120), 35);

// Alimentación suma o queda neutra; nunca resta.
assert.strictEqual(C.foodXp({food:'nourishing'}), 10);
assert.strictEqual(C.foodXp({food:'mixed'}), 5);
assert.strictEqual(C.foodXp({food:'heavy'}), 0);

const full = C.normalizeDay({
  habits:Object.fromEntries(C.HABITS.map(id=>[id,true])),
  trainingMinutes:{bike:40,strength:45},
  food:'nourishing'
});
assert.strictEqual(C.totalDayXp(full), 145);

const state = {
  '2026-09-21': C.normalizeDay({habits:Object.fromEntries(C.HABITS.map(id=>[id,true])),trainingMinutes:{bike:40},food:'nourishing'}),
  '2026-09-22': C.normalizeDay({habits:Object.fromEntries(C.HABITS.map(id=>[id,true])),trainingMinutes:{strength:45},food:'mixed'}),
  '2026-09-23': C.normalizeDay({trainingMinutes:{bike:45},food:'nourishing'}),
  '2026-09-24': C.normalizeDay({trainingMinutes:{strength:30},food:'mixed'}),
  '2026-09-25': C.normalizeDay({trainingMinutes:{bike:60},food:'heavy'}),
  '2026-09-26': C.normalizeDay({trainingMinutes:{strength:60}}),
  '2026-09-27': C.normalizeDay({trainingMinutes:{bike:90}})
};
assert.strictEqual(C.weeklyTrainingCount(state,'bike',new Date(2026,8,24)), 4);
assert.strictEqual(C.weeklyTrainingCount(state,'strength',new Date(2026,8,24)), 3);
assert.deepStrictEqual(C.weeklyBalanceProgress(state,new Date(2026,8,24)), {logged:5,positive:4,earned:true,xp:30});
assert.deepStrictEqual(C.weeklyMovementProgress(state,new Date(2026,8,24)), {bike:4,strength:3,earned:true,xp:40});
assert.strictEqual(C.totalWeeklyBonusXp(state), 70);

const streakState = {'2026-09-27': C.normalizeDay({habits:Object.fromEntries(C.HABITS.map(id=>[id,true]))}),'2026-09-28': C.normalizeDay({habits:Object.fromEntries(C.HABITS.map(id=>[id,true]))})};
assert.strictEqual(C.consecutiveWonDays(streakState,'2026-09-28'), 2);
assert.strictEqual(C.bestStreak(streakState), 2);
assert.deepStrictEqual(C.levelFromXp(260), {level:2,current:10,next:250,percent:4});
console.log('Ayün core tests OK');
