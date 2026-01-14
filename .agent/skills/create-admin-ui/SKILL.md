---
name: Create Admin UI
description: Generate admin interface components (Cards, Tables, Forms) that adhere to POSMARS Design System and Next.js 16 patterns.
---

# Create Admin UI

This skill aids in creating standardized UI components for the POSMARS Admin Dashboard.

## 1. Next.js 16 Directives
- **Client Components**: Any component with interactivity (onClick, hooks, useState) MUST start with `'use client';`.
- **Server Components**: Layouts and non-interactive cards should remain server components (default) for performance.

## 2. Security (UI)
- **XSS Prevention**: NEVER use `dangerouslySetInnerHTML` unless absolutely necessary and initialized with sanitized content.
- **Input Handling**: Forms should use controlled inputs or strict server actions with validation.

## 3. Design Philosophy (Posmars Dark/Glass)
- **Theme**: Dark Mode only (`bg-[#0c0c0c]`).
- **Surface**: Glassmorphism (`bg-white/[0.02]`, `border-white/5`).
- **Accent**: Orange Gradient (`from-[#fa9440] to-[#e7313d]`).

## 4. Component Patterns

### A. The Card (AdminCard)
- **File**: `card-template.tsx` (Usually Server Component, unless it has interactive children).
- **Classes**: `bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl`

### B. The List/Table (AdminTable)
- **File**: `table-template.tsx` (**Client Component**).
- **Directive**: `'use client';`

## 5. Usage Rules
1.  **Always** use `lucide-react` for icons.
2.  **Explicit directives**: Don't rely on auto-detection. Mark Client components explicitly.
3.  **Border Radius**: Use `rounded-[2.5rem]` for main containers.
