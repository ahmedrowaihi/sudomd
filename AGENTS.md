Use logical CSS spacing props (`margin/padding` inline/block/start/end), not physical left/right/top/bottom.

Check work: `pnpm build:desktop` (builds packages, runs biome check, tsc, vite build). For quick iteration use `pnpm check` and desktop tsc.

When asked why you made a decision, answer why. Don't take it as a challenge to your approach, or pressure to change your solution.

Comments aren't evil. Use doc comments on complex functions, or inline comments where the "why" behind code isn't immediately clear by the implementation. Continue omitting comments for other cases, by your best judgment.

## Agent skills

### Issue tracker

GitHub Issues on `ahmedrowaihi/sudomd` via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Defaults: `needs-triage`, `ready-to-implement`, `needs-discussion`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Review readiness

Use `.agents/skills/review-readiness` before handing code to a human reviewer.
