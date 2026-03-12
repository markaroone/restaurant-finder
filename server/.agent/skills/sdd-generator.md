---
name: sdd-generator
description: Generates a comprehensive Spec-Driven Development (SDD) blueprint for a new feature. Uses the "Three-File System" (product.md, README.md, and tracker.md) and dynamically references repository skills. Use whenever a developer asks to plan, design, or architect a new feature module — including requests to "create an SDD", "plan a feature", "design a module", "generate a blueprint", or "set up documentation for a new feature". Also trigger when researchers reference scattered product documentation fragments that need to be consolidated before coding.
---

# SDD Generator Protocol

You are an expert Software Architect and Product Analyst. Your goal is to guide the user through designing a new feature and then output exactly three documentation files: a `product.md` (The Product Spec), a `README.md` (The Technical Blueprint), and a `tracker.md` (The State Machine).

## Phase 1: Context Gathering (The Interrogation & Discovery)

Do NOT generate the files yet. This phase has two sub-steps.

### Step 1: Fragment Consolidation

Before asking questions, proactively research the codebase and documentation to consolidate scattered information about the feature. It is very common for feature context to exist as fragments across multiple sources.

**Where to look:**

1. **`product-docs/features/`** — Product-level specs, workflows, stitch prompts, trackers.
2. **`docs/features/`** (in the backend or frontend repo) — Existing backend/frontend workflow docs, GEMINI.md, CLAUDE.md files.
3. **`docs/sprints/`** — Sprint guides may contain reference implementations or architecture context.
4. **`docs/dbml/`** — Database schema definitions.
5. **`prisma/schema.prisma`** — Check if models, enums, or indexes already exist.
6. **`FLUX_MASTERPLAN.md`** — The high-level product vision and module relationships.
7. **`src/modules/`** — Check if any code already exists for this feature or related features.
8. **`AI_FEATURES.md`** — Feature-level descriptions and business rules.

**What to consolidate:**

- Data models (what exists vs what's needed)
- Business rules and constraints
- API endpoint definitions
- User workflows and scenarios
- UI/UX requirements
- Connections to other modules
- Terminology and glossary items
- Conflicting information between sources (flag these for Q&A)

Present a consolidated summary to the user before proceeding to the interrogation. Highlight any conflicts, gaps, or ambiguities you discovered. This ensures no context is lost.

### Step 2: Interrogation (Targeted Q&A)

Based on the consolidated information, ask **targeted questions** to resolve ambiguities and make architectural decisions. Group questions by theme and provide options with trade-off analysis for each. The goal is to eliminate all ambiguity before generating files.

Common question themes:

- **Data model decisions** — nullable vs required fields, sign conventions, soft-delete strategies
- **Business rule clarifications** — edge cases, cross-module interactions, validation rules
- **Scope decisions** — MVP vs post-MVP, which statuses/features are included
- **Architecture decisions** — module naming, endpoint design, pagination strategy
- **Performance trade-offs** — caching strategies, computation location (backend vs frontend)

Wait for the user to answer all questions before proceeding.

### Step 3: Skill Discovery

Silently scan the repository's `.agent/skills/` directory. Identify which architectural standard files exist (e.g., testing standards, repository patterns, error handling conventions). These will be dynamically referenced in the tracker.

---

## Phase 2: Generation (The Three-File System)

Once the user answers, generate the following three files.

### File 1: `[feature-name]/product.md` (The Product Spec)

This is the **"what and why"** document. It explains the feature from a product perspective — what problem it solves, how users interact with it, and what the terminology means. It is written for stakeholders, designers, AI agents, and future-you.

**Structure:**

1. **What Is [Feature Name]?** — 2-3 sentences explaining the feature's purpose in plain language.
2. **What Problem Does It Solve?** — The user pain points this feature addresses. Use concrete scenarios.
3. **Glossary of Terms** — Define all domain-specific terminology (statuses, types, concepts). Use tables for clarity.
4. **Features** — Numbered sub-sections for each capability:
   - **What:** One-line description.
   - **How users use it:** Step-by-step user workflow.
   - **Example:** A concrete scenario with a named user (e.g., "Maria opens her GCash ledger...").
5. **Key Mechanics** — Deeper explanation of complex features (e.g., running balance, transfer pairs). Use tables and examples.
6. **Connections to Other Modules** — How this feature relates to the rest of the system. Use a table.
7. **MVP vs Post-MVP** — Clear separation of what's included now vs what's deferred. Use checkmarks (✅) for MVP and snowflakes (🧊) for post-MVP. Include priority for backlog items.

> [!NOTE]
> The product.md should be readable by someone with zero technical knowledge. Avoid SQL, code snippets, or implementation details. Focus on _what_ and _why_, never _how_.

### File 2: `[feature-name]/README.md` (The Technical Blueprint)

This is the **"how"** document. It is the Single Source of Truth for developers and AI agents building the feature.

**Structure:**

1. **High-Level Overview:** 2-3 sentences explaining the feature's technical purpose.
2. **Domain Boundaries & Relationships:** Explain how it connects to other modules. Include a Mermaid diagram showing module relationships.
3. **Data Model:** Explicitly list schema fields, types, constraints, and indexes. Note whether models already exist or need creation. Use tables.
4. **API Endpoints:** For each endpoint:
   - Method + Path
   - Query params / request body
   - Response shape (JSON example)
   - Business rules and guardrails
5. **Core Business Logic & Guardrails:** Bulleted list of strict rules. Include a Mermaid flowchart for complex logic (e.g., delete strategies, transfer flows).
6. **Key Strategies:** Explain architectural decisions (e.g., running balance computation, pagination approach, caching strategy).
7. **Validation Schemas (Zod):** Table of schema names, fields, and notes.
8. **Error Handling:** Table of scenarios, HTTP status codes, and messages. Reference the error-handling skill if it exists.
9. **Module File Structure:** The file tree for the module directory.

> [!IMPORTANT]
> Use GitHub-style blockquotes (`> [!NOTE]`, `> [!IMPORTANT]`) for emphasis. Use Mermaid.js diagrams for complex flows and relationships.

### File 3: `[feature-name]/tracker.md` (The State Machine)

This file tracks exactly where development currently stands. It is the primary file an AI agent reads to know **what to do next**.

**Crucial Dynamic Rule:** When generating the Development Checklist, you MUST append a reference to the relevant skill file discovered in Phase 1 Step 3 if it applies to the task. (e.g., `- [ ] Implement Repository functions. (See: .agent/skills/repository-pattern.md)`). DO NOT hardcode these; infer them dynamically based on what exists in the repository.

**Structure:**

```markdown
# Tracker: [Feature Name]

**Status:** 🟡 IN PROGRESS
**Current Phase:** Phase 1: Database & Data Access

## The "Next Immediate Step"

> **AI Instruction:** Read this section to know what to do next.

- [ ] [First actionable task — e.g., "Implement Zod schemas in depository-transactions.schema.ts"]

## Development Checklist

### Phase 1: Database & Data Access

- [ ] Verify/Update Prisma Schema.
- [ ] Implement Zod Schemas (`.schema.ts`). (See: [skill reference if applicable])
- [ ] Implement Types (`.types.ts`).
- [ ] Implement Repository functions (`.repository.ts`). (See: [skill reference if applicable])
  - [ ] [Specific repo function 1]
  - [ ] [Specific repo function 2]

### Phase 2: Business Logic

- [ ] Implement Service logic & guardrails (`.service.ts`).
  - [ ] [Specific service function 1]
  - [ ] [Specific service function 2]
- [ ] Write Integration Tests for the Service layer. (See: [skill reference if applicable])
  - [ ] [Specific test scenario 1]
  - [ ] [Specific test scenario 2]

### Phase 3: API Delivery

- [ ] Implement Controller (`.controller.ts`). (See: [skill reference if applicable])
- [ ] Wire up Routes (`.routes.ts`).
- [ ] Mount routes in `app.ts`.
- [ ] Run `bun run check` to verify no lint/type errors.

### Phase 4: Documentation & Cleanup

- [ ] Update AI context files.
- [ ] Final test run — all tests passing.

## Changelog

| Date   | Change                                      |
| :----- | :------------------------------------------ |
| [date] | Initial SDD generation. [Brief scope note]. |
```

---

## Output Location

All three files are placed in the backend docs directory:

```
docs/features/[feature-name]/
├── product.md    ← Product Spec (what & why)
├── README.md     ← Technical Blueprint (how)
└── tracker.md    ← State Machine (where are we)
```

If the project also has a `product-docs/features/` directory, place an additional copy of `product.md` there to keep the product-level documentation in sync.
