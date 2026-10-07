# Verification report

Test date: 2026-10-07 UTC. Original application, no third-party game assets.

## Automated checks

`npm test`: 41 tests passed. `npm run check`: all three production modules passed Node syntax checks.

- 19 deterministic engine tests: legal deployment and complete nine-wave victories across four seeds with no garage buffs; no-action defeat; resource/cooldown; pause freeze; collision/damage/healing/armor/splash; all nine upgrades; final-boss gate; stage transitions; malformed identifiers; corrupt-save sanitation; prices and purchase bounds; exactly-once reward claims; stable UTC daily seed and fair base stats.
- 17 UI tests: real engine with a minimal DOM/event/animation-frame harness; full journey uses legal intro/deployment/upgrade/checkpoint clicks and elapsed animation frames without forcing victory; modal/keyboard pause rules; abandonment; garage purchase preservation before/after settlement; discounted accessible costs; storage failure; daily replay; render/DOM update budget.
- 5 canvas contract tests: finite drawing coordinates, immutable engine input, balanced drawing save/restore, all ten archetypes, three distinct stage environments, reduced-motion and empty preview.

Some targeted settlement tests use explicit result-state fixtures to isolate UI behavior. Those are separate from the full legal-input UI journey and independent engine win simulations. Canvas tests check drawing API contracts, not screenshots or pixel quality.

## Public browser checks completed on initial release

Public HTTPS page loaded without login. Desktop screenshot inspected: original neon streetscape, bus, troop portraits and distinct animated units. Mouse clicks started a run, deployed shield/ranger/medic/bomber, reached first and second wave upgrade screens, selected upgrades and advanced to wave three. Insufficient-energy card remained disabled. Pause/resume and tutorial open/close while already paused behaved correctly.

Initial Pages commit: `874a8822985e8cfea16beb8455fa0dfa7781e791`.
Initial GitHub Pages run: https://github.com/zuestrd20/neon-lastline/actions/runs/37587081870 (success shown in Actions list).

During longer active cloud-browser testing the Chrome renderer crashed with error code 9. Root cause was not established. Subsequent changes cap scene painting at 30fps, DOM at 8Hz and portrait animation at 4Hz; reduce renderer allocation and cache stable drawing work. Explicit per-frame clearing, an opaque main canvas and differential DOM writes were also added. A versioned asset URL prevents stale browser modules from masking a release. The final fresh build is undergoing a full public campaign test.

## Known scope and limits

- Single-player static browser game. No backend, multiplayer, account, leaderboard or payments.
- Permanent garage/achievement state saves locally after a run settles. Live battle does not resume after reload/closing the page.
- Sound is synthesized on device and opt-in; actual speaker output has not been verified.
- Automated win/loss and mobile-oriented CSS checks are not substitutes for physical-device touch or public-browser full completion.
- A 500px-wide public browser layout was inspected and interacted with; document width was 485px within a 500px viewport, with no horizontal overflow. This is a narrow desktop browser, not a physical-phone touch test. Final full-run verification is recorded below when complete.

## Long-run JavaScript stress

Run `node --expose-gc tests/reliability-stress.mjs 5`. Five legal winning journeys completed 1,001 simulation seconds, 60,041 animation frames and 23,506 scene draws / 41.3M canvas API calls. Heap after GC remained 8.39–8.58MB; listeners stayed at 3; canvas contexts stayed at 10; DOM node count stayed bounded. Maximum engine arrays: 32 allies, 4 enemies, 26 effects, 24 events. Drawing arguments remained finite and save/restore balanced. This uses a counting canvas implementation, so it does not certify native GPU/raster memory.

## Versioned deployment

Build 1.0.3, runtime commit `d331047c1cb6a95ba684d5b5a1ba384a77c90dfa`. Pages build/deploy succeeded: https://github.com/zuestrd20/neon-lastline/actions/runs/37589215278 . Live DOM verified the build marker, versioned app.js and CSS URLs, one 1000×430 game canvas and five 80×80 portraits. New runtime-specific diagnostics/labels and original art were verified in public interaction. Direct raw-JS navigation was blocked by the browser client, so live raw asset SHA comparison was not available.
