// Neon Bay: every tuning number and colour in one place. All names, places and
// people here are original; nothing is taken from any commercial game.
// The world is a 2400 by 1800 open city; the camera follows the player and the
// renderer scales the 1280 by 720 view to the window, so no rule below depends
// on the screen size. All names, places and people here are original.
export const STEP = 1 / 60;
export const WORLD = { width: 2400, height: 1800, road: 72, block: 300 };
export const VIEW = { width: 1280, height: 720 };
export const SAVE_KEY = 'neon-bay.save.v1';
export const PLAYER = {
  radius: 13, walkSpeed: 210, runSpeed: 300, health: 100,
  punchDamage: 12, punchRange: 34, pistolDamage: 26, pistolRange: 420,
  fireInterval: 0.22, startAmmo: 24, startCash: 120,
};
export const CAR = {
  length: 54, width: 28, accel: 420, brake: 620, maxSpeed: 430,
  maxReverse: 140, turn: 2.6, grip: 3.2, health: 100, ramDamage: 22,
};
export const TRAFFIC_COUNT = 12;
export const PED_COUNT = 26;
export const WANTED_MAX = 5;
export const WANTED_FADE_SECONDS = 6;
export const BUST_CASH_LOSS = 0.2;
export const HOSPITAL = { x: 1200, y: 330 };
export const MISSIONS = [
  { id: 1, name: 'First Fare', giver: 'Mara Voss', text: 'Drive the cab to the north pier before the meter runs out. No shortcuts through the park, rookie.', target: { x: 2100, y: 300 }, reward: 250, kind: 'drive', time: 75 },
  { id: 2, name: 'Harbour Package', giver: 'Mara Voss', text: 'Pick up the sealed case at the docks and drop it at the Coral Motel. Do not open it. Do not stop for anyone.', target: { x: 450, y: 1500 }, reward: 400, kind: 'deliver', time: 90 },
  { id: 3, name: 'Lose the Tail', giver: 'Dario Kest', text: 'The bay patrol is on you. Shake three stars of heat, then meet me at the old ferry terminal. Stay off the main avenue.', target: { x: 2100, y: 1500 }, reward: 550, kind: 'escape', time: 120 },
  { id: 4, name: 'Repo Run', giver: 'Dario Kest', text: 'A silver coupe is parked by the marina, owner three payments behind. Take it, bring it to the garage on Lark Street.', target: { x: 1950, y: 900 }, reward: 700, kind: 'repo', time: 90 },
  { id: 5, name: 'The Final Job', giver: 'Mara Voss', text: 'One last run: lift the vault courier car from the plaza and bring it to the warehouse. Every patrol unit in Neon Bay will be looking. Good luck, kid.', target: { x: 1200, y: 900 }, reward: 1500, kind: 'final', time: 150 },
];
export const PALETTE = {
  backdrop: '#0b1026', grass: '#14301f', blockA: '#1d2b4a', blockB: '#232a3d',
  buildingA: '#31406b', buildingB: '#3d2b5c', buildingC: '#274b5c', buildingD: '#5c2b4a',
  road: '#232733', roadLine: '#e8c34a', sidewalk: '#3a4152', water: '#0e4d6e',
  neonPink: '#ff4fd8', neonCyan: '#37e6ff', neonYellow: '#ffd23d', neonGreen: '#52ff8a',
  player: '#ffd23d', playerCar: '#ff4fd8', police: '#37e6ff', traffic: '#c8d2e0',
  ped: '#e8e4d8', text: '#f2f5ff', muted: '#9aa7c7', panel: '#12172ecc', danger: '#ff4d5e',
  health: '#52ff8a', cash: '#ffd23d', star: '#ffd23d',
};
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const CAR_COLORS = ['#e84a5f', '#4a90e8', '#f2a541', '#7ee081', '#c9c9c9', '#9b6dd6', '#ff8c42'];
export const BUILDING_COLORS = ['#31406b', '#3d2b5c', '#274b5c', '#5c2b4a', '#2f4a3a', '#4a3a2f'];
