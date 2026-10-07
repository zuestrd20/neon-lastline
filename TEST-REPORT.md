# Verification report

Test date: 2026-10-07 UTC. Original application, no third-party game assets.

## Automated checks

`npm test`: 40 tests passed. `npm run check`: all three production modules passed Node syntax checks.

- 19 deterministic engine tests: legal deployment and complete nine-wave victories across four seeds with no garage buffs; no-action defeat; resource/cooldown; pause freeze; collision/damage/healing/armor/splash; all nine upgrades; final-boss gate; stage transitions; malformed identifiers; corrupt-save sanitation; prices and purchase bounds; exactly-once reward claims; stable UTC daily seed and fair base stats.
- 16 UI tests: real engine with a minimal DOM/event/animation-frame harness; full journey uses legal intro/deployment/upgrade/checkpoint clicks and elapsed animation frames without forcing victory; modal/keyboard pause rules; abandonment; garage purchase preservation before/after settlement; discounted accessible costs; storage failure; daily replay; render/DOM update budget.
- 5 canvas contract tests: finite drawing coordinates, immutable engine input, balanced drawing save/restore, all ten archetypes, three distinct stage environments, reduced-motion and empty preview.

Some targeted settlement tests use explicit result-state fixtures to isolate UI behavior. Those are separate from the full legal-input UI journey and independent engine win simulations. Canvas tests check drawing API contracts, not screenshots or pixel quality.

## Public browser checks completed on initial release

Public HTTPS page loaded without login. Desktop screenshot inspected: original neon streetscape, bus, troop portraits and distinct animated units. Mouse clicks started a run, deployed shield/ranger/medic/bomber, reached first and second wave upgrade screens, selected upgrades and advanced to wave three. Insufficient-energy card remained disabled. Pause/resume and tutorial open/close while already paused behaved correctly.

Initial Pages commit: `874a8822985e8cfea16beb8455fa0dfa7781e791`.
Initial GitHub Pages run: https://github.com/zuestrd20/neon-lastline/actions/runs/37587081870 (success shown in Actions list).

During longer active cloud-browser testing the Chrome renderer crashed with error code 9. Root cause was not established. Subsequent changes cap scene painting at 30fps, DOM at 8Hz and portrait animation at 4Hz; reduce renderer allocation and cache stable drawing work. These changes require repeat public browser verification before this report should be considered final.

## Known scope and limits

- Single-player static browser game. No backend, multiplayer, account, leaderboard or payments.
- Permanent garage/achievement state saves locally after a run settles. Live battle does not resume after reload/closing the page.
- Sound is synthesized on device and opt-in; actual speaker output has not been verified.
- Automated win/loss and mobile-oriented CSS checks are not substitutes for physical-device touch or public-browser full completion.
- Narrow public browser layout, final runtime longevity, public asset matching and final deployment are pending final verification.
