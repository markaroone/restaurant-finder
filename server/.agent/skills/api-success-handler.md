---
name: api-success-handler
description: Standards for sending successful API responses in the Flux AI backend. Use this skill when implementing controllers to ensure strict type safety and consistent response structures.
---

# API Success Handling

## Core Rule

**NEVER** use `res.json()` or `res.send()` directly in controllers. You **MUST** use the `handleSuccess` utility.

## The Mutually Exclusive (XOR) Pattern

The `handleSuccess` utility enforces a strict contract using TypeScript's mutually exclusive types. This prevents invalid states (e.g., returning pagination metadata without an array of data).

### Scenarios

#### 1. Single Entry / Simple Object

Return a single object or primitive. `pagination`, `cursor`, and `bulk` MUST NOT be present.

```typescript
return handleSuccess({
  res,
  message: 'User profile updated',
  data: user,
});
```

#### 2. Offset Pagination (Tables/Grids)

**Requirement:** `data` must be an Array `T[]`. `pagination` object is required.

```typescript
return handleSuccess({
  res,
  message: 'Users fetched',
  data: users, // Must be array
  pagination: { total, page, limit },
});
```

#### 3. Cursor Pagination (Infinite Scroll)

**Requirement:** `data` must be an Array `T[]`. `cursor` object is required.

```typescript
return handleSuccess({
  res,
  message: 'Transactions fetched',
  data: transactions, // Must be array
  cursor: { nextCursor: 'next_id', hasNextPage: true },
});
```

#### 4. Bulk Operations

**Requirement:** `bulk` object is required.

```typescript
return handleSuccess({
  res,
  message: 'Batch import complete',
  data: null,
  bulk: { successCount: 50, failedCount: 2, errors: [...] },
});
```
