export interface DynamicWatermarkConfig {
  enabled: boolean;
  // Content toggles (all default to true as requested)
  showPhone: boolean;
  showName: boolean;
  showStudentCode: boolean;
  showUniversity: boolean;
  universityName?: string;
  customText?: string;
  
  // Sizing & Appearance
  size: number; // Font size in px (e.g. 12 to 32, default 15)
  scale: number; // Scale multiplier (0.8 to 2.5, default 1.0)
  opacity: number; // 0.1 to 1.0 (default 0.45)
  textColor: string; // e.g. '#22c55e', '#ffffff', '#eab308', '#ef4444'
  bgColor: string; // e.g. 'rgba(0,0,0,0.5)', 'transparent', '#131316'
  borderStyle: 'none' | 'thin' | 'glow'; // border styling
  borderColor: string;

  // Placement & Movement
  movementType: 'fixed' | 'wandering' | 'corner_cycle' | 'floating_pulse';
  fixedPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'custom';
  customX?: number; // 0 - 100%
  customY?: number; // 0 - 100%

  // Movement Speed control
  movementSpeed: 'slow' | 'normal' | 'fast' | 'ultra_fast'; // DVD / corner movement speed

  // Security Overkill features
  flickerEnabled: boolean; // periodically increases visibility/flickers
  flickerIntervalSeconds: number; // default 45 seconds

  // Audio Watermark (TTS - Text to Speech Web Speech API, 100% free)
  ttsEnabled: boolean;
  ttsAutoStart?: boolean; // speaks immediately on video start
  ttsIntervalMinutes: number; // 5, 10, 15, 30, 60 minutes
  ttsVoice: 'female' | 'male' | 'child'; // voice personality
  ttsInitialTestDelaySeconds?: number; // delay in seconds before initial speech

  // Anti-Tamper & Anti-Inspect Shield
  antiTamperShieldEnabled?: boolean; // Blocks inspect element, devtools tampering, DOM deletion

  // High-Res QR Verification Pass Stamp Overlay
  showQrStamp?: boolean;
  qrPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  qrSize?: number;
  qrPassTitle?: string;

  // Diagonal Parallel Text Watermark Customization
  textStampOpacity?: number; // 0.1 to 1.0 (default 0.40)
  stampShowPhone?: boolean; // default true (mandatory default)
  stampShowName?: boolean; // default true
  stampShowStudentCode?: boolean; // default true
  stampShowUniversity?: boolean; // default false

  // Moving Dynamic Badge Frame Shape & Color Customization
  frameShape?: 'none' | 'thin' | 'glow' | 'rounded_card' | 'thick'; // Frame shape/style
  frameColor?: string; // Custom frame border color (e.g. '#22c55e', '#3b82f6', '#eab308', '#ef4444', '#a855f7', '#ffffff')

  // Visual Theme Representation
  profileTheme?: 'emerald' | 'sapphire' | 'amber' | 'obsidian' | 'violet';
}

export const DEFAULT_WATERMARK_CONFIG: DynamicWatermarkConfig = {
  enabled: true,
  showPhone: true,
  showName: true,
  showStudentCode: true,
  showUniversity: true,
  customText: '',
  size: 14,
  scale: 1.0,
  opacity: 0.5,
  textColor: '#22c55e', // Electric green default
  bgColor: 'rgba(0, 0, 0, 0.65)',
  borderStyle: 'thin',
  borderColor: 'rgba(34, 197, 94, 0.3)',
  movementType: 'wandering', // DVD / wandering bounce by default
  movementSpeed: 'normal', // slow, normal, fast, ultra_fast
  fixedPosition: 'top-left',
  customX: 10,
  customY: 10,
  flickerEnabled: true,
  flickerIntervalSeconds: 40,
  ttsEnabled: false,
  ttsAutoStart: true,
  ttsIntervalMinutes: 15,
  ttsVoice: 'female',
  ttsInitialTestDelaySeconds: 3,
  antiTamperShieldEnabled: true,
  showQrStamp: true,
  qrPosition: 'bottom-right',
  qrSize: 44,
  qrPassTitle: 'SECURE DIGITAL PASS',
  profileTheme: 'emerald',
  // New Diagonal Text Watermark Defaults
  textStampOpacity: 0.40,
  stampShowPhone: true,
  stampShowName: true,
  stampShowStudentCode: true,
  stampShowUniversity: false,
  // New Moving Dynamic Badge Frame Defaults
  frameShape: 'thin',
  frameColor: '#22c55e',
};
