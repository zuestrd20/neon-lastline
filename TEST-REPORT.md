# NEON LASTLINE verification report

Verified on 2026-10-07 UTC. Runtime release **1.0.4**.

## Result

The public GitHub Pages game completed a full campaign through ordinary browser UI controls, without changing game state or injecting inputs through an internal API. All three districts, nine waves, eight upgrade selections, two checkpoint transitions, the final boss, and the final barricade were completed.

Public victory: 74 kills, 24 deployments, 716 scrap earned, bus 520/520 HP, four achievements. The successful game-only browser session lasted approximately 10 minutes of wall time and 239 seconds of simulated combat. Visible JavaScript heap remained about 3–4 MB. The same session subsequently verified garage purchase, reload persistence, normal/daily configuration, defeat, retry and pause.

## Public browser coverage

- Original pixel scenes, ten character archetypes, animated sprites, troop cards and effects visually inspected.
- Resource/cooldown-gated deployment; five unit types used; three-choice upgrades; checkpoints; boss defeat and victory settlement.
- No-action daily run lost with 0 kills / 0 deployments, granting 10 scrap; retry restored 520/520 HP.
- Keyboard P pause, button pause/resume, tutorial, abandonment confirmation, and returning from dialogs.
- Garage balance 726 → 666 after a 60-scrap hull purchase; hull Lv.1 and balance survived reload. Next normal run had 565 HP; daily challenge retained its fair 520 HP baseline.
- Default public layout inspected and operated at desktop width and a 500px narrow desktop-browser viewport. At 500px, document client/scroll width were both 485px: no horizontal overflow. Native physical-phone touch and narrower devices were not tested.
- Current public build marker and versioned app/CSS asset references checked in the DOM; original renderer output and updated runtime behavior verified. Raw JavaScript navigation was blocked by the browser client, so a live raw-file SHA comparison was unavailable.

## Browser reliability caveat

Several earlier cloud-browser runs, including multi-tab sessions, ended in Chromium error code 9. Rendering was reduced through bounded sprite/background caches, software-oriented canvas contexts, explicit frame clearing, throttled painting, differential DOM updates and removal of filtered canvas-card compositing. Runtime 1.0.4 still encountered one failure in a multi-tab verification session.

The **same unmodified 1.0.4 release** then passed the complete game-only campaign and the post-game checks above after this task's old crashed/Actions tabs were closed. No browser security, GPU or global browser settings were changed. Root cause of the earlier crashes is not established; this report does not claim universal browser stability. A Chromium Task Manager sample during an earlier 1.0.4 run showed 94,872K game-process memory and 15.5% CPU.

## Automated verification

`npm test`: **47/47 pass**. `npm run check`: all production modules pass syntax checks. No external test packages required.

- 19 engine tests: legal complete victories across four seeds; no-action defeat; deterministic timing; resources/cooldowns; collisions, damage, healing, armor and splash; all nine upgrades; stage and boss victory gates; malformed identifiers; corrupt saves; bounded garage purchases; exactly-once reward claims; UTC daily seed fairness.
- 17 UI tests: real engine with a minimal DOM/event/frame harness; full legal-click journey without forced victory; pause/dialog/keyboard rules; abandonment; purchase preservation before/after settlement; discounted accessible labels; storage failure; daily replay; painting budgets; zero redundant paused-state text writes.
- 5 renderer-contract tests: finite coordinates, unchanged simulation inputs, balanced canvas state, ten archetypes, distinct stage scenes, reduced motion and empty preview.
- 6 cache-path tests: at most 33 cached surfaces / under 25 MiB; 1,000 warmed frames with zero new gradients/static repaints/allocations; immutable inputs; finite balanced drawing; flash rows; portrait tiles and bounded unknown-input fallbacks.

Some focused UI settlement tests use explicit result fixtures; these are separate from the legal-input full journey and real public browser campaign. Canvas stubs validate drawing contracts, not actual GPU behavior.

### Long-run stress

`node --expose-gc tests/reliability-stress.mjs 3` passed three legal wins: 600 simulated seconds, 36,025 frames, 15,500 scene draws and 7.05M canvas API calls. Context count stabilized at 32 and cache backing at 22,772,552 bytes after the first run. Heap after GC: 8.50 → 8.67 MB. Maximum DOM nodes 149; listeners 3; allies 32; effects 26; events 24. This counting-canvas test does not certify native GPU/raster memory.

## Deployment evidence

- Public game: https://zuestrd20.github.io/neon-lastline/
- Source: https://github.com/zuestrd20/neon-lastline
- Verified runtime commit: `51a5fe42d5d38087d240e10a92614e5dedd45062`
- Successful runtime Pages run: https://github.com/zuestrd20/neon-lastline/actions/runs/37590536081
- Build marker and module/CSS query version: `1.0.4`

Later test/report-only commits do not change the verified runtime files.

## Product scope

Single-player static game, no account/backend/payments. Garage, achievements and settled rewards save in this browser. Live battles do not resume after reload/closing the page. Sound is synthesized and opt-in; physical audio output was not verified. Original procedural artwork and cached sprite frames contain no extracted reference-game assets.
