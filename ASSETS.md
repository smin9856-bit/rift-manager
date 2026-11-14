# Match center assets and implementation

- Riot Data Dragon patch **16.22.1**: 173 champion portraits, 692 Q/W/E/R icons, 173 passive icons, and Summoner's Rift overview map. Stored locally in `assets/`; no runtime CDN dependency or API key.
- Source and URL format: https://developer.riotgames.com/docs/lol#data-dragon
- Reimport with `node tools/fetch_assets.mjs`. Champion availability by season is based on each year's final Data Dragon champion catalog. Artwork and spell metadata use the pinned current patch, not historical patch balance.
- League of Legends artwork belongs to Riot Games. Rift Manager is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.

## Effects and simulation scope

`js/broadcast.js` implements original Canvas projectile, slash, ring, impact, damage-number, recall and teleport animations, with champion-themed beam/orb/hook/volley/fire/wind/rocket variants. These are **not extracted League client particle animations**. Public CommunityDragon extraction hosting returned HTTP 522 during implementation; no original particle bundle is included.

Real Riot spell icons accompany casts. Q/W/E/R cooldowns use Data Dragon values with simplified rank progression and minimum cooldowns (4 seconds for basic spells, 30 for ultimates); R unlocks at level 6. Champion identity and casts provide presentation over the existing management simulation damage model, not a recreation of all 173 champions' combat mechanics, hitboxes, mana, items, crowd control or live patch balance. Champion selection does not modify the original player ability / team tactic damage model.

Combat particles originate from engine damage events; farming, camp clears and objective/structure attacks have their own visual events. Presentation uses its own clock, does not consume simulation randomness, pauses with playback, and caps retained particles. Overlapping portraits are spread visually without moving simulated units. Match speed labels now represent real game-seconds per real second.

## Run and verify

Open `index.html` normally, or run `node tools/serve.mjs` and visit http://127.0.0.1:8765. `match-preview.html` provides an exhibition starting at 18:00 in memory without reading or writing a career save.

- `node tools/sim_test.mjs 30`: existing simulation smoke check.
- `node tools/champion_test.mjs`: local assets, historical pools, cooldowns, visual event bounds and deterministic outcome checks.
- Browser checks: `npm install --prefix tools/browser-test --no-package-lock --no-save playwright`, start the local server, then `node tools/broadcast_test.mjs` (uses installed Microsoft Edge). Screenshots go to `tools/test-output/`.
