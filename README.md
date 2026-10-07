# 霓虹末班車 · NEON LASTLINE

Original pixel-art convoy defense roguelite, in Traditional Chinese.

Play: https://zuestrd20.github.io/neon-lastline/

## Play

Deploy five different survivors with 1–5 or touch the cards. Resources regenerate, each unit has a cooldown. Shield units hold the front; rangers deal damage; medics heal; bombers handle groups. Clear three waves in each of three districts, select randomized upgrades, destroy barricades and defeat the final boss. Space/P pauses; hidden tabs automatically pause. No login or payment.

After victory/defeat, scrap, achievements, and permanent garage upgrades save locally. Live combat is not saved across closing/reloading the page. Daily challenge uses a fixed UTC-date seed and ignores permanent upgrades. Sound is opt-in. Corrupt or unavailable local storage is safely handled.

## Develop

Static ES modules, no build dependencies. Serve this directory using any local HTTP server. For example, `python3 -m http.server 8080`, then visit localhost:8080. Run `npm test` and `npm run check` with Node 20+.

- `engine.js`: deterministic fixed-step gameplay and sanitized persistence helpers
- `art.js`: entirely original procedural pixel-art scenery and animated characters
- `app.js`: accessible HTML controls, canvas rendering, audio and persistence
- `tests/`: gameplay simulations and UI contract checks

## Art and sound provenance

All characters, props, bus, environment, sprite-style poses, icons (except standard text glyphs), and game sound synthesis were created specifically for this game. No Dead Ahead assets, characters, trademarks, screenshots, or extracted game resources are included. The reference only informed the broad side-view deployment genre. Google Fonts Noto Sans TC (SIL OFL) and Space Grotesk (SIL OFL) are optional presentation fonts; system fallbacks remain functional without them. No analytics or backend.

## Verification

See `TEST-REPORT.md` for tests, browser checks, deployment evidence, and known limits. Tests simulate legal gameplay inputs without forcing victory or changing live game state.
