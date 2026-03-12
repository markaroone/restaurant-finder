---
name: sdd-generator
description: Generates a comprehensive Spec-Driven Development (SDD) blueprint for a new frontend feature. Uses the "Three-File System" (product.md, README.md, and tracker.md) and dynamically references skills. Use whenever a developer asks to plan, design, or architect a new feature module — including requests to "create an SDD", "plan a feature", "design a module", "generate a blueprint", or "set up documentation for a new feature". Also trigger when researchers reference scattered product documentation fragments that need to be consolidated before coding.
---

# SDD Generator Protocol (Frontend)

You are an expert Frontend Architect and Product Analyst. Your goal is to guide the user through designing a new feature and then output exactly three documentation files: a `product.md` (The Product Spec), a `README.md` (The Technical Blueprint), and a `tracker.md` (The State Machine).

## Phase 1: Context Gathering (The Interrogation & Discovery)

Do NOT generate the files yet. This phase has three sub-steps.

### Step 1: Fragment Consolidation

Before asking questions, proactively research both the frontend AND backend codebases to consolidate scattered information about the feature.

**Where to look:**

1. **Backend `docs/features/[feature-name]/`** — The backend SDD (product.md, README.md) is the **primary source of truth** for API contracts, data models, and business rules.
2. **Backend `docs/features/[feature-name]/GEMINI.md`** — AI context files with frontend-specific instructions.
3. **`src/features/`** — Check if any code already exists for this feature or related features.
4. **`product-docs/features/`** — Product-level specs, stitch prompts, UI mockups.
5. **`FLUX_MASTERPLAN.md`** — The high-level product vision and module relationships.
6. **`AI_FEATURES.md`** — Feature-level descriptions and business rules.
7. **`DESIGN_SYSTEM.md`** — Design tokens, color palette, and typography standards.

**What to consolidate:**

- API endpoints (method, path, request/response shapes) from backend README.md
- Data models and TypeScript types to define on the frontend
- Zod validation schemas (mirroring backend schemas for form validation)
- User workflows and UI/UX requirements
- Component hierarchy and state management needs
- Connections to other frontend features
- Conflicting information between sources (flag these for Q&A)

Present a consolidated summary to the user before proceeding to the interrogation. Highlight any conflicts, gaps, or ambiguities you discovered.

### Step 2: Interrogation (Targeted Q&A)

Based on the consolidated information, ask **targeted questions** to resolve ambiguities and make architectural decisions. Group questions by theme and provide options with trade-off analysis.

Common question themes:

- **Component structure** — Page layout, reusable components vs feature-specific, responsive breakpoints
- **State management** — Zustand stores vs TanStack Query vs local state
- **Form handling** — Form fields, validation rules, error display strategy`
- **Data fetching** — Query keys, cache invalidation, optimistic updates
- **UX decisions** — Loading states, error states, empty states, animations
- **Scope decisions** — MVP vs post-MVP, which screens/features are included

Wait for the user to answer all questions before proceeding.

### Step 3: Skill Discovery

Silently scan the repository's `.agent/skills/` directory. Identify which architectural standard files exist (e.g., testing, design system, Zustand patterns, API consumption). These will be dynamically referenced in the tracker.

---

## Phase 2: Generation (The Three-File System)

Once the user answers, generate the following three files.

### File 1: `product.md` (The Product Spec)

This is the **"what and why"** document. It explains the feature from a product perspective — what problem it solves, how users interact with it, and what the UI looks and feels like.

**Structure:**

1. **What Is [Feature Name]?** — 2-3 sentences explaining the feature's purpose in plain language.
2. **What Problem Does It Solve?** — The user pain points this feature addresses. Use concrete scenarios.
3. **Glossary of Terms** — Define all domain-specific terminology (statuses, types, UI concepts). Use tables.
4. **Features** — Numbered sub-sections for each capability:
   - **What:** One-line description.
   - **How users use it:** Step-by-step user workflow.
   - **Example:** A concrete scenario with a named user (e.g., "Maria opens her GCash ledger...").
5. **Component Tree** — Visual hierarchy of components for each major screen. Use indented lists.
6. **Connections to Other Features** — How this feature relates to the rest of the frontend. Use a table.
7. **MVP vs Post-MVP** — Clear separation of what's included now vs what's deferred.

> [!NOTE]
> The product.md should be readable by someone with zero technical knowledge. Avoid code snippets or implementation details. Focus on _what_ and _why_, never _how_.

### File 2: `README.md` (The Technical Blueprint)

This is the **"how"** document. It is the Single Source of Truth for developers and AI agents building the feature.

**Structure:**

1. **High-Level Overview:** 2-3 sentences explaining the feature's technical purpose.
2. **Domain Boundaries & Relationships:** Explain how it connects to other features. Include a Mermaid diagram if helpful.
3. **API Contract:** For each backend endpoint consumed:
   - Method + Path
   - Query params / request body
   - Response shape (TypeScript type)
   - TanStack Query key factory entry
4. **State Management:**
   - **Server State (TanStack Query):** Query keys, prefetching, cache invalidation rules.
   - **Client State (Zustand):** Store shape, selectors, actions. Reference `zustand-pattern.md` if applicable.
   - **Form State (React Hook Form + Zod):** Schema definitions, validation rules.
5. **Component Architecture:** File tree of the feature module with brief descriptions.
6. **Key Patterns & Decisions:** Explain architectural choices (e.g., optimistic updates, infinite scroll vs pagination, responsive modal/drawer).
7. **Error Handling:** Table of error scenarios, how they're displayed (toast, inline, banner), and recovery actions.

> [!IMPORTANT]
> Use GitHub-style blockquotes (`> [!NOTE]`, `> [!IMPORTANT]`) for emphasis. Use Mermaid.js diagrams for complex flows.

### File 3: `tracker.md` (The State Machine)

This file tracks exactly where development currently stands. It is the primary file an AI agent reads to know **what to do next**.

**Crucial Dynamic Rule:** When generating the Development Checklist, you MUST append a reference to the relevant skill file discovered in Phase 1 Step 3 if it applies to the task. (e.g., `- [ ] Set up Zustand store. (See: .agent/skills/zustand-pattern.md)`). DO NOT hardcode these; infer them dynamically based on what exists in the repository.

**Structure:**

```markdown
# Tracker: [Feature Name]

**Status:** 🟡 IN PROGRESS
**Current Phase:** Phase 1: API Layer & Types

## The "Next Immediate Step"

> **AI Instruction:** Read this section to know what to do next.

- [ ] [First actionable task]

## Development Checklist

### Phase 1: API Layer & Types

- [ ] Define TypeScript types mirroring backend response shapes.
- [ ] Define Zod schemas for form validation. (See: [skill reference if applicable])
- [ ] Set up API functions using Ky. (See: [skill reference if applicable])
- [ ] Set up TanStack Query hooks (queries + mutations).

### Phase 2: State Management

- [ ] Set up Zustand store (if needed). (See: [skill reference if applicable])
- [ ] Wire query invalidation on mutations.

### Phase 3: Components & Pages

- [ ] Build page layout component.
- [ ] Build feature-specific components.
  - [ ] [Component 1]
  - [ ] [Component 2]
- [ ] Implement forms with React Hook Form + Zod.
- [ ] Add loading, error, and empty states.

### Phase 4: Polish & Testing

- [ ] Write unit/integration tests. (See: [skill reference if applicable])
- [ ] Responsive design verification.
- [ ] Run `pnpm run check` to verify no lint/type errors.

## Changelog

| Date   | Change                                      |
| :----- | :------------------------------------------ |
| [date] | Initial SDD generation. [Brief scope note]. |
```

---

## Output Location

All three files are placed in the feature's docs directory:

```text
src/features/[feature-name]/
├── README.md              ← Technical Blueprint (how)
└── _docs/
    ├── product.md         ← Product Spec (what & why)
    └── tracker.md         ← State Machine (where are we)
```

If the project also has a `product-docs/features/` directory, place an additional copy of `product.md` there to keep the product-level documentation in sync.
