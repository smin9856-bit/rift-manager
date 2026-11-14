# Assets and simulation scope

Riot Data Dragon **16.22.1** provides 173 champion portraits, 692 Q/W/E/R icons, 173 passive icons and the overview map in `assets/`. Korean spell descriptions, ranges, cooldowns and costs are bundled in `data/champions.js`. Reimport with `node tools/fetch_assets.mjs`.

Source: [Riot Data Dragon documentation](https://developer.riotgames.com/docs/lol#data-dragon).

The starting pool contains champions available by the end of 2014. Later champions unlock at the start of their release year using annual Data Dragon catalogs. 2014 is a baseline, not every older champion’s original release year. All historical seasons use the pinned current artwork and ability metadata; historical reworks are not reproduced.

## Mechanics and VFX

The simulation runs at fixed 20 Hz. Unit separation, walls, teleport landing, projectile windup and swept collisions operate in actual world coordinates. Aimed projectiles can miss; damage applies on impact. Effects use the simulation clock and do not consume RNG.

`js/abilities.js` supplies explicit Q/W/E/R behavior profiles for **all 173 champions** (692 slots), based on their public descriptions. It separates aimed and targeted attacks, returning and penetrating projectiles, cones, beams, areas, persistent zones, dashes, pulls, knockback, charm, root, airborne effects, slows, silence, shields, heals and defensive effects. Yasuo R requires an airborne target. Champion identity, mastery and composition change combat.

These are **simplified web simulation mechanics**. Damage uses the management game's player/gold/level model. These profiles reuse common behavior primitives; listing a profile does not mean every unique interaction is faithfully reproduced. Some unique mechanics share common behaviors. Transformations, clones, summons, items, mana costs, exact rank allocation and historical reworks are not fully simulated. Public spell ranges are scaled by 0.25 and bounded to 60–1600 map units. Data Dragon special ranges are not an exact runtime specification.

**Original client resources are now used for Ahri Q/E, Ashe R, and Lux Q/R.** `data/particles.js` contains 10 selected original VFX systems (64 emitters), with 37 decoded textures in `assets/particles/` and two original SCB meshes (Ahri's heart and Ashe's ice arrow). The resources were read from a local client installation, without modifying it. `assets/particles/manifest.json` records source paths, hashes, and selected/omitted emitters. See [the importer documentation](tools/particles/README.md) for reproduction and format sources.

`js/native-vfx.js` interprets a subset of original emission, color, scale, atlas and motion data in Canvas. It uses original textures and mesh UVs, **not the full native Riot engine**. The 2D camera, reduced emitter count, capped trails, sustained missile lifetime and visual scaling are adaptations. Shader distortion, erosion, palettes, child systems and animated mesh lighting are not reproduced. These five skills therefore do not look pixel-identical to League. Other skills and failed asset loads use the reconstructed shapes in `js/combat-vfx.js`. Official reference videos remain separate from in-world VFX.

The renderer is read-only. Effect toggles and playback speed do not change outcomes. Automatic combat zoom and optional 1× combat playback improve readability.

League of Legends artwork belongs to Riot Games. Rift Manager is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and associated properties are trademarks or registered trademarks of Riot Games, Inc.

## Run and verify

Open `index.html`, or run `node tools/serve.mjs` and visit http://127.0.0.1:8765. `match-preview.html` starts an in-memory exhibition around 18:00 without touching career saves.

`particle-preview.html` demonstrates the five original-resource skills with pause, restart and speed controls, without touching saves.

- `node tools/physics_test.mjs`: body/wall collisions, swept hits, windup cancellation, respawn isolation, timestep batching.
- `node tools/particles_test.mjs`: exported PNG checksums, mesh topology, source provenance, curve sampling and selection coverage.
- `node tools/particles_browser_test.mjs`: original-resource rendering, read-only state, pause/repeat determinism, live match hooks and mobile layout.
- `node tools/physics_abilities_test.mjs`: dashes, CC displacement, terrain, separation and batching.
- `node tools/abilities_test.mjs`: charm, pulls, dashes, airborne, shields, heals, skillshot misses and return projectiles.
- `node tools/champion_test.mjs`: 1,038 PNGs, yearly pools, effect bounds and eight deterministic visual/nonvisual match pairs.
- `node tools/features_test.mjs`: drafts, mastery, management, save/load and rollover.
- `node tools/fullseason_features_test.mjs`: full-season automatic progression.
- `node tools/broadcast_test.mjs` and `node tools/features_browser_test.mjs`: Edge interaction and desktop/mobile screenshots. Install their optional dependency with `npm install --prefix tools/browser-test --no-package-lock --no-save playwright`; start the local server first.
