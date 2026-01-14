---
name: Create API Route
description: Generate robust, secure Next.js 16 App Router API endpoints with validation, auth checks, and strict server-side enforcement.
---

# Create API Route

This skill guides you in creating secure and reliable API endpoints for Next.js 16.

## 1. Security First Principles (Next.js 16)
- **`import 'server-only'`**: MUST be at the top of the file to prevent accidental client-side usage.
- **Authentication**: EVERY route must check for authentication/authorization before processing data.
- **Validation**: Strict `zod` validation is mandatory.
- **Data Leakage**: Never return raw error objects or sensitive fields to the client.

## 2. Core Structure
- **File**: `app/api/{route}/route.ts`
- **Handlers**: Named exports `GET`, `POST`, `PUT`, `DELETE`.

## 3. Requirements

### A. Validation (Zod)
You **MUST** use `zod` to validate incoming request bodies. Enforce max lengths on strings.
```typescript
import { z } from 'zod';
const Schema = z.object({ 
  field: z.string().max(100) 
});
```

### B. Authorization
Explicitly check permissions at the start of the function.
```typescript
// Example: Check for admin secret or session
if (!authorized) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### C. Error Handling
- Log full errors to console (server-side).
- Return generic error messages to client to avoid exposing stack traces or DB schema.

## 4. Best Practices
- **Cache Control**: For GET routes in Next.js 16, explicitly set caching strategy if needed (`export const dynamic = 'force-dynamic'` or `revalidate`).
- **Environment**: Use `process.env.SUPABASE_SERVICE_ROLE_KEY` for privileged backend operations.
