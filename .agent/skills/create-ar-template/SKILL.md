---
name: Create AR Template
description: Comprehensive guide and automation for creating new AR templates in POSMARS, ensuring adherence to design systems and project structure.
---

# Create AR Template

This skill guides you through the process of adding a new AR template to the POSMARS system.

## 1. Core Principles
> [!IMPORTANT]
> **REUSE FIRST**: You MUST reuse existing shared components and styles. do NOT create new CSS or generic components.
> **STRICT STYLING**: Follow the predefined Tailwind classes exactly.

## 2. Shared Components (MANDATORY)

Pass these components recursively to sub-components if needed.

- **File Upload**: `import FileUploader from '../shared/FileUploader'`
  - Usage: `<FileUploader accept="image/*" currentUrl={config.url} onUpload={...} />`
- **Color Picker**: `import ColorPicker from '../shared/ColorPicker'`
  - Usage: `<ColorPicker value={config.color} onChange={...} />`
- **Preview Phone**: `import PreviewPhone from '../shared/PreviewPhone'`
  - Usage: Wrapper for the preview area.

## 3. Step-by-Step Implementation

### Step 1: Define Config Type
Create or update `components/admin/template-builder/types.ts`.
- Interface name: `{TemplateName}Config`
- Fields: `snake_case` (e.g., `background_url`, `theme_color`)
- URLs: Must end in `_url`

```typescript
// Example from resources/types-template.ts
export interface NewTemplateConfig {
    title?: string
    bg_url?: string
    theme_color?: string
}
```

### Step 2: Create HTML Template
Update `lib/templates/default-templates.ts`:
1.  Add HTML string to `DEFAULT_TEMPLATES`.
2.  Update `generateCodeFromConfig` to handle the new template type.

### Step 3: Create Builder Component
Create `components/admin/template-builder/{template-name}/{TemplateName}Builder.tsx`.

**Use the Boilerplate:**
Read the content of `.agent/skills/create-ar-template/resources/builder-template.tsx` and use it as your starting point. It contains the correct grid layout (`1 | 2 | 1`), tab navigation, and styling.

**Layout Rules:**
- **Left (1/4)**: Navigation / Item List
- **Middle (2/4)**: Main Editors
- **Right (1/4)**: Preview Phone (Sticky)

### Step 4: Register Builder
Update `components/admin/TemplateConfigBuilder.tsx` to include the new builder in the switch statement.

```tsx
case 'new_template':
    return <NewTemplateBuilder {...props} />
```

## 4. Modularization Rules
> [!WARNING]
> **MAX 300 LINES PER FILE**: If a file exceeds 300 lines, you MUST split it.

- **Lists**: Split into `{Name}List.tsx` and `{Name}Item.tsx`.
- **Tabs**: Split tab content into `{Name}Panel.tsx`.
- **Preview**: If complex, split into `{Name}Preview.tsx`.

## 5. Style Guide (Copy & Paste these classes)

### Containers
- **Main Section**: `bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl space-y-8`
- **Inner Card**: `p-6 bg-white/[0.02] border border-white/5 rounded-[2rem]`

### Typography
- **Section Header**: `text-[11px] font-black uppercase tracking-[0.4em] text-white/60`
- **Label**: `text-[10px] font-black text-white/60 uppercase tracking-widest`
- **Input text**: `text-sm text-white`

### Inputs
- **Text Input**: `w-full bg-black/40 border border-white/5 px-6 py-4 rounded-2xl text-sm text-white outline-none focus:border-orange-500/30 transition-all`
- **Primary Button**: `px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:opacity-90`

## 6. Verification
After creating the files, ensure:
1.  The project builds (`npm run build` or check for errors).
2.  The new template appears in the admin dashboard.
3.  Uploads work using the `FileUploader`.
