# 0001. Tech stack for Milestone 0

Status: accepted (2026-10-22)

## Context

Slotwise needs a testable core (scheduler and notes parser) before any UI exists. The owner chose JavaScript instead of TypeScript.

## Decision

- Language: JavaScript (ESM), no `.ts` files.
- Type safety: JSDoc `@typedef` annotations checked by `tsc --checkJs --noEmit` in `strict` mode. `typescript` is a devDependency used only for checking.
- Monorepo: pnpm workspaces (`apps/*`, `packages/*`). Node >= 22.
- Tests: Vitest with v8 coverage. 100% threshold on `schedule.js` and `parseNotes.js`.
- Lint/format: ESLint 9 flat config + `eslint-plugin-jsdoc`, Prettier (Markdown excluded).
- CI: GitHub Actions running lint, typecheck, format check and tests on every PR.
- Deferred: Expo app (M1), Supabase (M2), AI (M4). Stack in `CLAUDE.md` section 3 remains the plan for those.
- Commit messages follow the owner's global convention (Conventional Commits, Vietnamese description), which overrides the English rule in `CLAUDE.md` section 2.

## Differences from the prototype parser

- Output uses `TreeNode` field names (`parentId`, `durationMin`, `doLast`, `status`) instead of prototype short names.
- Returns `{ nodes, skippedLines }` so callers can report ignored lines, as the spec requires. The prototype silently dropped them.
- `scheduledDate` is `null` after parsing; the caller assigns the day.

## Consequences

- No compile step, but type errors surface in CI via `checkJs`.
- Moving to TypeScript later is mechanical (rename files, promote typedefs).
