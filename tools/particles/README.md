# Original particle subset

The client installation is opened read-only. Nothing is installed into, injected into, or written back to League. Only the explicitly selected base-skin systems are exported into this repository. No network request is needed when the three hash dictionaries are cached.

Requires Node 24 (Zstandard support) and optional build/test packages:

```powershell
npm install --prefix tools/browser-test --no-package-lock --no-save playwright hash-wasm@4.13.0 tex-decoder@2.0.0 pngjs@7.0.0
node tools/import_particles.mjs --game "C:/Riot Games/League of Legends/Game"
node tools/particles_test.mjs
node tools/serve.mjs
node tools/particles_browser_test.mjs
```

`tools/cache/particles/hashes.bin{fields,types,entries}.txt` come from [CommunityDragon/Data](https://github.com/CommunityDragon/Data/tree/master/hashes/lol). The importer follows linked PROP bins from skin0, reads selected `VfxSystemDefinitionData` emitters, converts their TEX images to PNG, and converts two SCB meshes to positions/faces/UVs. It does not scan player/account data. Archive version, resource paths, source SHA-256, output SHA-256, chosen and omitted emitter names are recorded in `assets/particles/manifest.json`. The installed client may differ from the pinned Data Dragon metadata version; the manifest identifies these particular source resources without claiming an unverified client patch number.

Format references:

- [CommunityDragon WAD reader](https://github.com/CommunityDragon/CDTB/blob/master/cdtb/wad.py)
- [CommunityDragon PROP reader](https://github.com/CommunityDragon/CDTB/blob/master/cdtb/binfile.py)
- [LeagueToolkit TEX formats](https://github.com/LeagueToolkit/league-toolkit/blob/main/crates/ltk_texture/src/tex/format.rs)
- [LeagueToolkit static mesh](https://github.com/LeagueToolkit/LeagueToolkit/blob/main/src/LeagueToolkit/Core/Mesh/StaticMesh.cs) and [face UV layout](https://github.com/LeagueToolkit/LeagueToolkit/blob/main/src/LeagueToolkit/Core/Mesh/StaticMeshFace.cs)

## Runtime scope

Five skills: Ahri Q/E, Ashe R, Lux Q/R. Ten systems include Q return and impact systems. Source lifetime, emission rate, color and scale curves, probability tables, texture atlases, selected velocity/drag, blend families, and actual mesh topology/UVs feed the Canvas renderer. Meshes are orthographically baked once into sprites. Assets remain credited to Riot, not licensed as original project artwork.

This is a bounded 2D adaptation, not Riot's native particle engine. It intentionally omits non-selected emitters, mesh rotation/lighting, exact camera projection, child systems, shader material drivers, palette remapping, distortion, erosion maps, texture multiplication, and exact trail splines. Trails follow current projectile heading and are capped at 150 world units. Visual scale is adapted for readable portraits. The selected continuous emitters are capped at six particles, each system at 72 draws; tint cache is capped at 96 entries. Attached missile particles sustain until the actual projectile ends; Lux R's original one-second charge is mapped onto the simulation's windup. These adaptations do not alter collision bounds, range, damage, mastery, RNG, or match results.

The runtime uses simulation time only. Failed or missing assets fall back to the existing procedural renderer. `particle-preview.html` provides a repeatable demonstration without career saves; `match-preview.html` exercises the actual match event hooks.
