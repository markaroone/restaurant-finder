# Restaurant Finder — Shared AI Context

> Monorepo: `server/` (Express 5 + Bun) · `client/` (React 19 + Vite 7)
>
> See `server/AGENTS.md` and `client/AGENTS.md` for project-specific rules.

---

## TypeScript (Universal)

- **No `any`.** Use `unknown` + narrowing or Generics.
- **Use `type` not `interface`.**
- **JSDoc** on all exported functions and other codes if necessary.
- Always specify return types on functions.
- Use `1_000` not `1000` (numeric separators).

## Coding Style (Universal)

- **File Naming:** `kebab-case` for all files.
  - Module files: `[entity].[role].ts` (e.g., `execute.controller.ts`)
  - Shared/config: `kebab-case.ts` (e.g., `app-error.ts`)
- **Named exports only.** No `export default`.
- **No barrel files.** Import from specific file paths.
- **Guard clauses.** Early returns over nested if-else. No switch statements.
- **Options Object.** Functions with 2+ params use a single destructured object. Exception: Express handlers (`req`, `res`, `next`).
- **Namespace imports** for service modules: `import * as LLMService from '@/services/llm.service'`
- **Constants.** No magic strings/numbers. Use `HTTP_STATUS.BAD_REQUEST` not `400`.

## Planning & Artifacts

- **Always generate an artifact before coding.** For any non-trivial change (a bug fix, new feature, or refactor), create an `implementation_plan.md` artifact first. The plan must cover: root cause / context, proposed solution options, the recommended approach, and a verification plan.
- **Wait for user approval** of the plan before writing any code.
- **Only skip the plan** for obvious one-liners or purely mechanical changes (e.g., renaming a variable, fixing a typo).

## Git & Commits

- **Never commit directly to `main`.** Always switch to a new branch with a suitable name based on the feature being worked on (e.g., `feat/search-parser`, `style/design-audit-fixes`).
- **Conventional Commits:** `<type>(<scope>): <subject>` (e.g., `feat(execute): add LLM parsing service`)
- **Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- **Subject line:** imperative mood, lowercase, no period, ≤72 characters.
- **Body format** (for non-trivial changes):
  1. Blank line after subject
  2. One short paragraph explaining **what** changed and **why**
  3. Bullet list (`-`) of specific changes, grouped by scope

  Example:

  ```text
  fix(security): harden trust proxy, CORS, regex, and injection detection

  Addresses four vulnerabilities identified in SAST review.

  - Configure trust proxy for single-hop PaaS deployments (Render/Railway)
  - Block null-origin CORS requests in production
  - Bound ll regex quantifiers and add .max(40) to prevent ReDoS
  - Normalize Unicode confusables before injection pattern matching
  ```

- **Branches:** Prefix with `feat/`, `fix/`, `docs/`, `style/`, `chore/` etc. Merge to `main` via `--no-ff`.

## SDD Documentation

Docs live in `_docs/` at the repo root:

- `_docs/product.md` — Product spec (what & why)
- `_docs/README.md` — Technical blueprint (how)
- `_docs/tracker.md` — Development state machine
- `_docs/decisions.md` — Architecture Decision Records

**Before coding:** Read `tracker.md` to know what to do next.
**After coding:** Update `tracker.md` to mark items complete.
