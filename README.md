# Neon Bay

[![Make GTA 6](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/lovelydisya17/neon-bay/rank.svg)](https://make.fun/bounty/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/lovelydisya17/neon-bay/reward.svg)](https://make.fun/bounty/gta6-01)

Neon Bay is an original 2D top-down open-world crime game, built for the
[Make GTA 6](https://make.fun/bounty/gta6-01) bounty on make.fun. No libraries,
no network, no assets from any other game: vanilla JavaScript ES modules and
canvas 2D, with synthesized WebAudio sound.

## Play

Serve `game/` with any static server, for example `node serve.ts`, then open
http://localhost:8080 in a desktop browser.

- WASD or arrows: walk, or drive when in a car
- E: enter, exit, or steal a car (stealing raises your wanted level)
- Mouse click: shoot (Space also works on foot), mouse aims
- P: pause, M: mute, N: new game, C: continue a saved game

## The city

Neon Bay is a sun-soaked harbour city with a road grid, a waterfront, a
hospital, a plaza, a marina, a motel and a warehouse district. Traffic drives
the roads, pedestrians walk the sidewalks and flee gunfire, and the bay patrol
responds to your wanted level, from 0 to 5 stars. Wanted heat fades when you
stay hidden; getting caught means waking up at Bay General hospital, lighter
in the wallet.

## Story: five jobs for the Bay crew

1. First Fare: drive the cab to the north pier.
2. Harbour Package: pick up a sealed case at the docks, deliver it to the Coral Motel.
3. Lose the Tail: shake three stars of heat, then meet Dario at the ferry terminal.
4. Repo Run: lift a silver coupe from the marina and bring it to the garage.
5. The Final Job: lift the vault courier car from the plaza and run it to the warehouse.

Missions pay cash, with markers, dialogue, a timer and autosave to
localStorage. Combat covers punching, a pistol, and car ramming. The HUD shows
cash, health, ammo, wanted stars, the mission objective and a live minimap.
Polish includes tire marks, screen shake, rain, a pause menu and a neon bass loop.

## Files

- `game/index.html`, `game/src/main.js`: boot and the fixed-step loop
- `game/src/config.js`: tuning, missions, palette
- `game/src/random.js`: seeded RNG
- `game/src/world.js`: city, traffic, pedestrians, police, wanted, combat, missions, save
- `game/src/render.js`: canvas renderer, HUD, minimap, title and pause screens
- `game/src/input.js`: keyboard and mouse
- `game/src/shots.js`: deterministic autopilot screenshot scenes
- `game/src/audio.js`: synthesized WebAudio effects and music
- `main.ts`: Node 22 program that copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
- `screenshots/`: four real renders of the game (title, driving, police chase, mission), taken in the recorded build session

## License

MIT, see LICENSE.
