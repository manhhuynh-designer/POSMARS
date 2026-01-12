
// Lucky Draw Types
export interface Prize {
    id: string
    name: string
    image?: string // URL
    probability: number // 0-100
    color: string
}

export interface POSConfig {
    pos_id: string       // POS Code
    pos_name: string     // Human readable name
    prizes: Prize[]      // Specific prize list for this POS
}

export interface LuckyDrawConfig {
    banner_url?: string // KV
    bg_url?: string // Background image
    bg_type?: 'image' | 'solid' | 'gradient' // Background type
    bg_color?: string // Solid background color
    bg_gradient_start?: string // Gradient start color
    bg_gradient_end?: string // Gradient end color
    wheel_bg_url?: string // Custom wheel shape
    logo_url?: string
    spin_btn_url?: string
    pointer_url?: string
    rules_text?: string
    prizes: Prize[]

    // Theme Options
    theme_primary_color?: string // Primary brand color (default: #f97316 orange)
    theme_accent_color?: string // Accent/secondary color (default: #ef4444 red)
    theme_text_color?: string // Text color for result popup (default: #ffffff)

    // Result Popup Customization
    result_title_text?: string // e.g., "Chúc mừng bạn nhận được"
    result_button_text?: string // e.g., "Nhận quà"
    result_icon_url?: string // Custom emoji/icon for result popup

    // POS Configuration
    enable_pos_config?: boolean
    pos_configs?: Record<string, POSConfig> // Map: pos_id -> config

    // Replay Feature
    allow_replay?: boolean
    replay_button_text?: string

    // Play Limits & Reset
    max_plays?: number // Default 1
}

// AR Check-in Types
export interface ARCheckinConfig {
    frame_url?: string
    instructions?: string
}

// Image Tracking Types
export interface AnimationStep {
    id: string
    property: 'position' | 'rotation' | 'scale'
    to: string // VD: "0 1 0" cho position hoặc "1.5" cho scale
    duration: number
    easing: string
}

export interface VideoKeyframe {
    id: string
    time: number           // Timestamp in seconds (0 = targetFound)
    property: 'position' | 'rotation' | 'scale' | 'opacity'
    value: string          // "0 0.5 0" for position/rotation, "1.2" for scale, "0.8" for opacity
    easing: string         // 'linear' | 'easeIn' | 'easeOut' | 'easeInOut'
}

export interface ARAsset {
    id: string
    name: string
    type: '3d' | 'video' | 'occlusion' | 'image'
    url: string
    scale: number
    position: [number, number, number]
    rotation: [number, number, number]
    video_autoplay?: boolean
    video_loop?: boolean
    video_muted?: boolean
    video_width?: number // Aspect ratio width (relative to height=1)
    video_height?: number
    keyframes?: VideoKeyframe[]
    animation_duration?: number
    loop_animation?: boolean
    occlusion_shape?: 'model' | 'cube' | 'sphere' | 'plane'

    // Image settings
    image_width?: number  // Aspect ratio width
    image_height?: number // Aspect ratio height

    // 3D Animation settings
    animation_mode?: 'auto' | 'loop_clips' | 'tap_to_play'
    enable_tap_animation?: boolean

    // Sequential Animation
    steps?: AnimationStep[]
}

// Multi-target support
export interface TargetConfig {
    targetIndex: number      // Index in .mind file (0-based)
    name: string             // Display name for admin UI
    thumbnail?: string       // Reference image thumbnail
    assets: ARAsset[]        // Assets for THIS target only
    extends?: number         // Inherit from target index
}

export interface ImageTrackingConfig {
    // Multi-target mode
    targets?: TargetConfig[]
    max_track?: number
    default_assets?: ARAsset[] // Global fallback assets

    // Legacy mode
    assets?: ARAsset[]
    marker_url?: string // .mind file URL

    enable_capture?: boolean
    show_scan_hint?: boolean

    // Lighting & Env (Global)
    ambient_intensity?: number
    directional_intensity?: number
    environment_url?: string
    exposure?: number
    tone_mapping?: 'no' | 'acesfilmic' | 'linear' | 'reinhard'

    // Capture Settings
    max_video_duration?: number
    capture_quality?: number

    // Legacy support (to be migrated)
    model_scale?: number
    model_position?: [number, number, number]
    model_rotation?: [number, number, number]
}

// Face Filter Types (Implicit in original file, explicit here)
export interface FaceFilterConfig {
    filter_type?: '2d' | '3d'
    filter_url?: string // 2D
    filter_3d_url?: string // 3D
    logo_url?: string
    instructions?: string
    anchor_position?: 'nose_bridge' | 'forehead' | 'nose_tip' | 'chin' | 'full_face'
    filter_scale?: number
    offset_x?: number
    offset_y?: number
    offset_z?: number
    full_head_occlusion?: boolean
    occlusion_radius?: number
    capture_btn_text?: string
    capture_btn_color?: string

    // Shared with FaceARConfig
    scale_x?: number
    scale_y?: number
    scale_z?: number
    rotation_x?: number
    rotation_y?: number
    rotation_z?: number
    blend_mode?: 'normal' | 'multiply' | 'add' | 'screen'
    occlusion_offset_z?: number
}

// Minimal interface to pass location data
export interface LocationStub {
    id: string
    code: string
    name: string
}

export interface TemplateConfigBuilderProps {
    template: string
    initialConfig: any
    onChange: (config: any) => void
    onUpload: (file: File, path: string) => Promise<string>
    availableLocations?: LocationStub[] // Pass project locations
}
