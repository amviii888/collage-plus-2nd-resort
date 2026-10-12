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

  // Security Overkill features
  flickerEnabled: boolean; // periodically increases visibility/flickers
  flickerIntervalSeconds: number; // default 45 seconds

  // Audio Watermark (TTS - Text to Speech Web Speech API, 100% free)
  ttsEnabled: boolean;
  ttsIntervalMinutes: 0 | 15 | 30 | 60; // 0 = off, 15, 30, 60 minutes
  ttsInitialTestDelaySeconds?: number; // 0 = disabled, 10 or 15 = speaks once shortly after starting to verify audio

  // Anti-Tamper & Anti-Inspect Shield
  antiTamperShieldEnabled?: boolean; // Blocks inspect element, devtools tampering, DOM deletion
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
  fixedPosition: 'top-left',
  customX: 10,
  customY: 10,
  flickerEnabled: true,
  flickerIntervalSeconds: 40,
  ttsEnabled: false,
  ttsIntervalMinutes: 0,
  ttsInitialTestDelaySeconds: 15,
  antiTamperShieldEnabled: true,
};
