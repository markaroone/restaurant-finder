---
name: zod-schema-creator
description: Guidelines for creating robust, user-friendly Zod schemas in the Flux AI frontend. Use this skill whenever generating, refactoring, or modifying Zod validation schemas for forms, API responses, or state values.
---

# Zod Schema Creator Skill

This skill provides the standard approach for writing Zod schemas in the Flux AI frontend.
Validation forms the core of our user experience. A well-written schema prevents confusing error states and ensures data integrity.

## 1. User-Friendly & SaaS-Friendly Error Messages

Never rely on Zod's default error messages. They are often too technical (e.g., "Expected string, received undefined").
Instead, always provide clear, actionable, and SaaS-friendly error messages tailored to the specific field.

**Principles for Error Messages:**

- **Be Specific:** Tell the user exactly what is wrong and how to fix it.
- **Be Polite but Direct:** Use professional, SaaS-standard tone.
- **Cover All Angles:** Provide messages for both `required_error` (when the field is missing) and `invalid_type_error` (when the input is the wrong type).

### Example Pattern

```typescript
import { z } from 'zod';

export const workspaceSchema = z.object({
  name: z
    .string({
      required_error: 'Workspace name is required.',
      invalid_type_error: 'Workspace name must be text.',
    })
    .min(1, 'Please enter a workspace name.'),

  email: z
    .string({
      required_error: 'Email address is required.',
      invalid_type_error: 'Please enter a valid email address.',
    })
    .email('Please enter a valid email address (e.g., name@company.com).'),
});
```

## 2. Handling All Possible Errors Properly

When creating schemas for forms or API payloads, you must anticipate how the data might be malformed.

- **Strings:** Always use `.min(1, { message: "message" })` to prevent empty strings from satisfying a `z.string()` requirement. A string of length 0 technically passes `z.string()`, but usually, you want text.
- **Numbers:** Handle edge cases like NaN or strings passed as numbers. For form inputs that yield strings (like text inputs for numbers), you may need to preprocess or use `z.coerce.number()`.
- **Enums:** When using enums, provide an error message that hints at the valid options implicitly or explicitly, e.g., "Please select a valid status."

### Example Pattern for Numbers

```typescript
export const paymentSchema = z.object({
  amount: z.coerce
    .number({
      required_error: 'Payment amount is required.',
      invalid_type_error: 'Amount must be a valid number.',
    })
    .positive('Amount must be greater than zero.'),
});
```

## 3. Use Modern, Non-Deprecated Zod Methods

Always use the latest Zod (v4+) patterns. Avoid legacy or deprecated methods:

- **Avoid `.nonempty()` for strings and arrays:** Use `.min(1, { message: "message" })` instead. In modern Zod, `.min(1)` is the robust way to ensure a string or array isn't empty without affecting inferred types unexpectedly.

### ✅ Do This

```typescript
const tags = z.array(z.string()).min(1, 'Please add at least one tag.');
const title = z.string().min(1, 'Title cannot be empty.');
```

### ❌ Not This

```typescript
// Deprecated / Discouraged
const tags = z.array(z.string()).nonempty('Please add at least one tag.');
```

## 4. Refining and Super-Refining

When simple validation isn't enough (e.g., password matching, conditional requirements), use `.refine()` or `.superRefine()` but ensure the `path` is correctly set so the error attaches to the correct UI field.

### Example pattern

```typescript
const passwordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'], // Attaches the error to the confirmPassword field
  });
```

## Summary Checklist

When generating a Zod schema, verify:

- [ ] Every `z.string()`, `z.number()`, etc. has a `required_error` (and `invalid_type_error` if ambiguous).
- [ ] Empty strings are prevented with `.min(1, "message")` where appropriate.
- [ ] Error messages read like a high-quality SaaS product (clear, polite, actionable).
- [ ] Deprecated methods like `.nonempty()` are not used. Use `.min(1)` instead.
