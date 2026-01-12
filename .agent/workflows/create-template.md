---
description: Tạo mới AR template (Lucky Draw, Image Tracking, Face Filter, AR Checkin)
---

# Hướng dẫn tạo mới AR Template

Workflow này hướng dẫn cách thêm một template AR mới vào hệ thống POSMARS.

> [!IMPORTANT]  
> **Nguyên tắc quan trọng:** TÁI SỬ DỤNG components và style có sẵn. KHÔNG viết mới CSS/component khi đã có sẵn.

---

## Cấu trúc Template

```
📁 PROJECT ROOT
├── 📁 lib/templates/
│   └── default-templates.ts          # HTML template + placeholder variables
│
├── 📁 components/admin/template-builder/
│   ├── types.ts                       # TypeScript interfaces cho config
│   ├── 📁 shared/                     # ⭐ SHARED COMPONENTS - Luôn dùng trước!
│   │   ├── FileUploader.tsx           # Upload file (image, 3D, video)
│   │   ├── ColorPicker.tsx            # Color input
│   │   └── PreviewPhone.tsx           # Phone mockup wrapper
│   ├── 📁 {template-name}/            # VD: lucky-draw, image-tracking
│   │   ├── {TemplateName}Builder.tsx  # Main builder component
│   │   └── ...                        # Sub-components nếu cần
│   └── TemplateConfigBuilder.tsx      # Switch component (entry point)
│
└── 📁 components/client/              # Client-side renderer (nếu cần)
```

---

## 🎨 Design System & Style Conventions

### Container Styles (BẮT BUỘC tuân theo)

```tsx
// ========== CARD/SECTION CONTAINER ==========
// Main section card
className="bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl space-y-8"

// Smaller card  
className="bg-[#0c0c0c] border border-white/5 rounded-[3rem] p-10 shadow-2xl"

// Nested card (inside section)  
className="p-6 bg-white/[0.02] border border-white/5 rounded-[2rem]"

// ========== GRID LAYOUT 4 COLUMNS ==========
// Standard builder layout: 1 | 2 | 1
className="flex flex-col lg:grid lg:grid-cols-4 gap-8 min-h-[calc(100vh-200px)]"

// Left sidebar (1/4)
className="lg:col-span-1"

// Main content (2/4)
className="lg:col-span-2"  

// Right preview (1/4)
className="lg:col-span-1"

// Sticky sidebar
className="lg:sticky lg:top-8"
```

### Typography Styles

```tsx
// ========== HEADINGS ==========
// Section header with dot indicator
<div className="flex items-center gap-3">
    <div className="w-2 h-2 rounded-full bg-orange-500" />
    <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/60">Section Title</h4>
</div>

// Module label (small)
className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]"

// Main heading
className="text-lg font-black text-white uppercase tracking-tighter"

// Subtitle  
className="text-[9px] text-white/40 font-black uppercase tracking-[0.2em]"

// ========== LABELS & HINTS ==========
// Field label
className="text-[10px] font-black text-white/60 uppercase tracking-widest"

// Helper text
className="text-[9px] text-white/30 font-medium"

// Badge indicator
className="px-3 py-1 bg-white/5 rounded-lg text-[8px] font-black text-white/20 uppercase tracking-[0.3em]"
```

### Input Styles

```tsx
// ========== TEXT INPUT ==========
className="w-full bg-black/40 border border-white/5 px-6 py-4 rounded-2xl text-sm text-white outline-none focus:border-orange-500/30 transition-all"

// Textarea (large)
className="w-full bg-black/40 border border-white/5 p-8 rounded-[2.5rem] text-sm text-white font-mono leading-relaxed outline-none focus:border-orange-500/30 transition-all shadow-inner min-h-[300px]"

// ========== NUMBER/SLIDER ==========
className="w-full accent-orange-500"
```

### Button Styles

```tsx
// ========== PRIMARY BUTTON ==========
className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:opacity-90 transition-all"

// Secondary button
className="px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-xl text-[10px] font-black text-orange-500 uppercase tracking-widest hover:bg-orange-500/20 transition-all"

// Ghost button  
className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-white/60 uppercase tracking-widest hover:bg-white/10 transition-all"

// Icon button
className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"

// Danger button
className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"

// ========== TAB BUTTON ==========
// Active state
className="bg-orange-500 text-white shadow-[0_15px_30px_rgba(249,115,22,0.2)]"

// Inactive state  
className="text-white/40 hover:bg-white/[0.03] hover:text-white"
```

### Icon Container Styles

```tsx
// Icon box with gradient (header)
className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#fa9440] to-[#e7313d] flex items-center justify-center text-white"

// Icon box solid (in-content)
className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500"

// Icon box in tab (active)
className="p-2.5 rounded-xl bg-white/20"

// Icon box in tab (inactive)  
className="p-2.5 rounded-xl bg-white/5 group-hover:bg-white/10"
```

### Animations

```tsx
// Container fade in
className="animate-in fade-in duration-500"

// Slide from right
className="animate-in slide-in-from-right-4 duration-500"

// Slide from bottom  
className="animate-in slide-in-from-bottom-2 duration-300"

// Hover scale effect
className="transition-transform duration-500 hover:scale-[1.02]"
```

### Info/Tip Box

```tsx
// Blue tip box
<div className="p-6 bg-blue-500/5 rounded-[2rem] border border-blue-500/10 flex items-start gap-4">
    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
        <Sparkles size={18} />
    </div>
    <div>
        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">PRO TIP</p>
        <p className="text-[11px] text-blue-400/60 leading-relaxed italic">Tip content here...</p>
    </div>
</div>
```

---

## 📦 Shared Components - PHẢI DÙNG!

### 1. FileUploader

Dùng cho mọi upload file (image, video, 3D model).

```tsx
import FileUploader from '../shared/FileUploader'

<FileUploader
    label="Upload Image"
    accept="image/*"  // hoặc ".glb,.gltf" cho 3D, "video/*" cho video
    currentUrl={config.logo_url}
    onUpload={async (file) => {
        const url = await onUpload(file, 'template-name/logo')
        updateConfig('logo_url', url)
        return url
    }}
    onClear={() => updateConfig('logo_url', undefined)}
    helperText="PNG, JPG tối đa 5MB"
    renderPreview={(url) => (
        <img src={url} className="w-full h-40 object-contain rounded-2xl" />
    )}
/>
```

### 2. ColorPicker

Dùng cho color input.

```tsx
import ColorPicker from '../shared/ColorPicker'

<ColorPicker
    value={config.theme_color || '#FF6B00'}
    onChange={(color) => updateConfig('theme_color', color)}
    size={10}
/>
```

### 3. PreviewPhone

Wrapper cho phone mockup preview.

```tsx
import PreviewPhone from '../shared/PreviewPhone'

<PreviewPhone>
    {/* Preview content */}
    <div className="flex-1 p-4">
        <h1>Preview here</h1>
    </div>
</PreviewPhone>
```

---

## 📐 Modular Architecture - TÁCH FILE KHI CẦN

> [!WARNING]  
> **Quy tắc vàng:** Một file Builder KHÔNG nên vượt quá **300 dòng**. Nếu dài hơn, PHẢI tách thành modules.

### Khi nào cần tách module?

| Tình huống | Hành động |
|------------|-----------|
| File > 300 dòng | ⚠️ PHẢI tách |
| Có nhiều tabs/sections độc lập | Tách mỗi tab thành component |
| Có list items phức tạp (prizes, assets) | Tách thành `{Name}List.tsx` + `{Name}Item.tsx` |
| Có panel settings riêng biệt | Tách thành `{Name}Panel.tsx` |
| Có preview phức tạp | Tách thành `{Name}Preview.tsx` |

### Cấu trúc Module theo Image Tracking (mẫu chuẩn)

```
📁 image-tracking/
├── ImageTrackingBuilder.tsx    # Main (891 lines - tối đa cho complex template)
│   └── Orchestrates all sub-components
│   └── State management & handlers
│   └── Layout grid (1|2|1)
│
├── TargetList.tsx              # 204 lines - Left sidebar explorer
│   └── Renders list of targets  
│   └── Menu actions (clone, inherit, delete)
│   └── Layer hierarchy view
│
├── AssetList.tsx               # ~100 lines - Asset layer list
│   └── Simple list rendering
│   └── Selection handling
│
├── AssetEditor.tsx             # ~400 lines - Main content editor
│   └── Transform controls (position, rotation, scale)
│   └── Type-specific settings
│
├── GlobalSettingsPanel.tsx     # 252 lines - Settings tab content
│   └── Lighting controls
│   └── Capture settings
│   └── Environment HDR
│
├── CloneInheritModal.tsx       # ~100 lines - Modal component
│   └── Target selection for clone/inherit
│
└── SmartCompilerModal.tsx      # ~150 lines - Modal component
    └── Image processing UI
```

### Pattern Interface cho Sub-components

```tsx
// ========== LIST COMPONENT PATTERN ==========
// File: PrizeList.tsx hoặc TargetList.tsx

interface TargetListProps {
    // Data
    config: ImageTrackingConfig
    selectedTargetIndex: number
    
    // Actions - Passed from parent
    onSelectTarget: (index: number) => void
    onRemoveTarget: (index: number) => void
    onClone: (index: number) => void
    onInherit: (index: number) => void
    
    // UI State
    menuOpenIndex: number | null
    setMenuOpenIndex: (index: number | null) => void
    
    // Refs (if needed)
    smartCompileInputRef: React.RefObject<HTMLInputElement>
}

export default function TargetList({ 
    config, 
    selectedTargetIndex, 
    onSelectTarget,
    ...props 
}: TargetListProps) {
    // Chỉ render UI, KHÔNG có business logic
    // Tất cả handlers đều từ props
}
```

```tsx
// ========== ITEM COMPONENT PATTERN ==========
// File: PrizeItem.tsx hoặc AssetItem.tsx

interface PrizeItemProps {
    index: number
    prize: Prize
    onUpdate: (index: number, updates: Partial<Prize>) => void
    onRemove: (index: number) => void
    onUpload: (file: File, path: string) => Promise<string>
}

export default function PrizeItem({ 
    index, 
    prize, 
    onUpdate, 
    onRemove, 
    onUpload 
}: PrizeItemProps) {
    // Self-contained item với local state nếu cần
    const [isEditing, setIsEditing] = useState(false)
    
    // Delegate actions to parent
    const handleNameChange = (name: string) => {
        onUpdate(index, { name })
    }
}
```

```tsx
// ========== PANEL COMPONENT PATTERN ==========
// File: GlobalSettingsPanel.tsx hoặc BrandingPanel.tsx

interface GlobalSettingsPanelProps {
    config: ImageTrackingConfig
    onUpdateConfig: (key: keyof ImageTrackingConfig, value: any) => void
    onUpload: (file: File, path: string) => Promise<string>
}

export default function GlobalSettingsPanel({ 
    config, 
    onUpdateConfig, 
    onUpload 
}: GlobalSettingsPanelProps) {
    // Local upload state
    const [uploading, setUploading] = useState(false)
    
    // Handle uploads internally
    const handleEnvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            setUploading(true)
            const url = await onUpload(file, `environments/${Date.now()}_${file.name}`)
            onUpdateConfig('environment_url', url)
        } finally {
            setUploading(false)
        }
    }
}
```

### Main Builder - Orchestration Pattern

```tsx
// ========== MAIN BUILDER ==========
// File: NewTemplateBuilder.tsx

export default function NewTemplateBuilder({ initialConfig, onChange, onUpload }: TemplateConfigBuilderProps) {
    // ===== CENTRALIZED STATE =====
    const [activeTab, setActiveTab] = useState<'items' | 'branding' | 'settings'>('items')
    const [selectedItemIndex, setSelectedItemIndex] = useState(0)
    const [menuOpenIndex, setMenuOpenIndex] = useState<number | null>(null)
    
    const config = initialConfig as NewTemplateConfig
    
    // ===== CENTRALIZED HANDLERS =====
    const updateConfig = (key: string, value: any) => {
        onChange({ ...initialConfig, [key]: value })
    }
    
    const addItem = () => { /* ... */ }
    const updateItem = (index: number, updates: Partial<Item>) => { /* ... */ }
    const removeItem = (index: number) => { /* ... */ }
    
    // ===== LAYOUT - DELEGATE TO SUB-COMPONENTS =====
    return (
        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-8">
            {/* LEFT - Item List Component */}
            <div className="lg:col-span-1">
                <ItemList
                    items={config.items}
                    selectedIndex={selectedItemIndex}
                    onSelect={setSelectedItemIndex}
                    onAdd={addItem}
                    onRemove={removeItem}
                    menuOpenIndex={menuOpenIndex}
                    setMenuOpenIndex={setMenuOpenIndex}
                />
            </div>
            
            {/* MIDDLE - Tab Content */}
            <div className="lg:col-span-2">
                {activeTab === 'items' && (
                    <ItemEditor
                        item={config.items[selectedItemIndex]}
                        onUpdate={(updates) => updateItem(selectedItemIndex, updates)}
                        onUpload={onUpload}
                    />
                )}
                
                {activeTab === 'branding' && (
                    <BrandingPanel
                        config={config}
                        onUpdateConfig={updateConfig}
                        onUpload={onUpload}
                    />
                )}
                
                {activeTab === 'settings' && (
                    <SettingsPanel
                        config={config}
                        onUpdateConfig={updateConfig}
                    />
                )}
            </div>
            
            {/* RIGHT - Preview Component */}
            <div className="lg:col-span-1">
                <NewTemplatePreview config={config} />
            </div>
        </div>
    )
}
```

### Checklist tách module

Khi tạo template mới, hãy hỏi:

- [ ] File chính có > 300 dòng không? → Tách
- [ ] Có list items không? → Tách `{Name}List.tsx` + `{Name}Item.tsx`
- [ ] Có nhiều tabs không? → Tách content của mỗi tab thành component riêng
- [ ] Có preview phức tạp không? → Tách `{Name}Preview.tsx`
- [ ] Có modals không? → Tách mỗi modal thành file riêng
- [ ] Có settings panel lớn không? → Tách `{Name}SettingsPanel.tsx`

---

## 🏗️ Builder Component Pattern

### Layout Template (Copy & Paste)

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Activity, Layers, ImageIcon, Settings, Sparkles } from 'lucide-react'
import { TemplateConfigBuilderProps, NewTemplateConfig } from '../types'
import FileUploader from '../shared/FileUploader'
import ColorPicker from '../shared/ColorPicker'
import PreviewPhone from '../shared/PreviewPhone'

export default function NewTemplateBuilder({ 
    initialConfig, 
    onChange, 
    onUpload 
}: TemplateConfigBuilderProps) {
    
    const [activeTab, setActiveTab] = useState<'content' | 'branding' | 'settings'>('content')
    
    const config = initialConfig as NewTemplateConfig
    
    // Helper to update config
    const updateConfig = (key: string, value: any) => {
        onChange({ ...initialConfig, [key]: value })
    }

    // ========== TAB DATA ==========
    const tabs = [
        { id: 'content', icon: <Layers size={16} />, label: 'Content', sub: 'Main content' },
        { id: 'branding', icon: <ImageIcon size={16} />, label: 'Branding', sub: 'Visual identity' },
        { id: 'settings', icon: <Settings size={16} />, label: 'Settings', sub: 'Behavior' },
    ]

    return (
        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-8 min-h-[calc(100vh-200px)] animate-in fade-in duration-500">
            
            {/* ========== LEFT SIDEBAR (1/4) ========== */}
            <div className="lg:col-span-1 space-y-8">
                <div className="bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl space-y-8 h-fit lg:sticky lg:top-8">
                    
                    {/* Header */}
                    <div className="flex items-center gap-4 border-b border-white/5 pb-8">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#fa9440] to-[#e7313d] flex items-center justify-center text-white shadow-xl shadow-orange-900/20">
                            <Activity size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tighter leading-tight">Template Name</h3>
                            <p className="text-[9px] text-white/40 font-black uppercase tracking-[0.2em] mt-0.5">Builder Kit</p>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex flex-col gap-3">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-2 px-2">Modules</p>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-start gap-4 px-6 py-5 rounded-[1.5rem] text-left transition-all border border-transparent group ${
                                    activeTab === tab.id
                                        ? 'bg-orange-500 text-white shadow-[0_15px_30px_rgba(249,115,22,0.2)]'
                                        : 'text-white/40 hover:bg-white/[0.03] hover:text-white'
                                }`}
                            >
                                <div className={`p-2.5 rounded-xl transition-colors ${
                                    activeTab === tab.id ? 'bg-white/20' : 'bg-white/5 group-hover:bg-white/10'
                                }`}>
                                    {tab.icon}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-black uppercase tracking-widest">{tab.label}</span>
                                    <span className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${
                                        activeTab === tab.id ? 'text-white/60' : 'text-white/20'
                                    }`}>{tab.sub}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ========== MAIN CONTENT (2/4) ========== */}
            <div className="lg:col-span-2 space-y-8">
                <div className="animate-in slide-in-from-right-4 duration-500">
                    
                    {activeTab === 'content' && (
                        <section className="bg-[#0c0c0c] border border-white/5 rounded-[3rem] p-10 shadow-2xl space-y-8">
                            {/* Section Header */}
                            <div className="flex items-center gap-3 border-b border-white/5 pb-8">
                                <div className="w-2 h-2 rounded-full bg-orange-500" />
                                <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/60">Content Settings</h4>
                            </div>
                            
                            {/* Form fields here */}
                            <div className="space-y-6">
                                {/* Example input */}
                                <div>
                                    <label className="block text-[10px] font-black text-white/60 uppercase tracking-widest mb-3">Title</label>
                                    <input
                                        type="text"
                                        value={config.title || ''}
                                        onChange={e => updateConfig('title', e.target.value)}
                                        className="w-full bg-black/40 border border-white/5 px-6 py-4 rounded-2xl text-sm text-white outline-none focus:border-orange-500/30 transition-all"
                                        placeholder="Enter title..."
                                    />
                                </div>

                                {/* Example file upload */}
                                <div>
                                    <label className="block text-[10px] font-black text-white/60 uppercase tracking-widest mb-3">Background</label>
                                    <FileUploader
                                        accept="image/*"
                                        currentUrl={config.bg_url}
                                        onUpload={async (file) => {
                                            const url = await onUpload(file, 'new-template/bg')
                                            updateConfig('bg_url', url)
                                            return url
                                        }}
                                        onClear={() => updateConfig('bg_url', undefined)}
                                        className="w-full h-40 border border-dashed border-white/10 rounded-2xl"
                                    />
                                </div>
                            </div>
                        </section>
                    )}

                    {activeTab === 'branding' && (
                        <section className="bg-[#0c0c0c] border border-white/5 rounded-[3rem] p-10 shadow-2xl space-y-8">
                            {/* Branding content */}
                        </section>
                    )}

                    {activeTab === 'settings' && (
                        <section className="bg-[#0c0c0c] border border-white/5 rounded-[3rem] p-10 shadow-2xl space-y-8">
                            {/* Settings content */}
                        </section>
                    )}
                </div>
            </div>

            {/* ========== RIGHT PREVIEW (1/4) ========== */}
            <div className="lg:col-span-1 w-full flex-shrink-0">
                <div className="lg:sticky lg:top-8 space-y-8">
                    <div className="bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl space-y-8">
                        <div className="space-y-1 text-center">
                            <h3 className="font-black text-xl text-white uppercase tracking-tighter">Preview</h3>
                            <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em]">Real-time Preview</p>
                        </div>

                        <PreviewPhone>
                            {/* Preview content */}
                            <div className="flex-1 flex items-center justify-center text-white/40">
                                Preview here
                            </div>
                        </PreviewPhone>
                    </div>
                </div>
            </div>
        </div>
    )
}
```

---

## Bước 1: Định nghĩa Config Type

File: `components/admin/template-builder/types.ts`

```typescript
export interface NewTemplateConfig {
    title?: string
    bg_url?: string
    theme_color?: string
    // ... các field khác
}
```

**Quy tắc đặt tên:**
- Interface dạng `{TemplateName}Config`
- Field names dùng `snake_case`
- URL fields kết thúc bằng `_url`

---

## Bước 2: Tạo HTML Template

File: `lib/templates/default-templates.ts`

Thêm vào object `DEFAULT_TEMPLATES` và cập nhật mapping trong `generateCodeFromConfig()`.

---

## Bước 3: Tạo Builder Component

1. Tạo folder: `components/admin/template-builder/{name}/`
2. Copy layout template ở trên
3. **DÙNG shared components** (FileUploader, ColorPicker, PreviewPhone)
4. **DÙNG style classes** đã định nghĩa ở trên

---

## Bước 4: Đăng ký Builder

File: `components/admin/TemplateConfigBuilder.tsx`

```tsx
case 'new_template':
    return <NewTemplateBuilder {...props} />
```

---

## ✅ Checklist

- [ ] Định nghĩa Config interface trong `types.ts`
- [ ] Thêm HTML template vào `DEFAULT_TEMPLATES`
- [ ] Tạo Builder component **DÙNG shared components**
- [ ] **Kiểm tra style consistency** với design system
- [ ] Đăng ký trong `TemplateConfigBuilder.tsx`
- [ ] Test tạo project với template mới

---

## 📚 Tham khảo

| Template | Folder | Điểm tham khảo |
|----------|--------|----------------|
| Lucky Draw | `lucky-draw/` | Tab navigation, Preview layout |
| Image Tracking | `image-tracking/` | Complex multi-target, Asset list |
| Face Filter | `face-filter/` | Slider controls |
| AR Check-in | `ar-checkin/` | Simple single-page layout |

---

## ⚠️ Những điều KHÔNG NÊN LÀM

1. ❌ Viết CSS mới - Dùng classes có sẵn
2. ❌ Tạo FileUploader riêng - Dùng `shared/FileUploader`
3. ❌ Tạo ColorPicker riêng - Dùng `shared/ColorPicker`
4. ❌ Style khác với templates hiện có
5. ❌ Border radius khác (phải dùng `rounded-[2rem]`, `rounded-[2.5rem]`, `rounded-[3rem]`)
6. ❌ Màu khác với orange-500 làm accent color
