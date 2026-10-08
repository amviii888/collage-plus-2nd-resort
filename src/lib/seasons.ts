import { doc, setDoc, getDocs, collection } from 'firebase/firestore';

export type SeasonStatus = 'active' | 'upcoming' | 'ended';

export type RewardType = 'pet' | 'theme' | 'avatar' | 'badge';
export type RewardRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';

export type SeasonReward = {
  id: string;
  seasonId: string;
  seasonNumber: number;
  requiredLevel: number;
  title: string;
  description: string;
  type: RewardType;
  rarity: RewardRarity;
  iconOrAssetUrl: string;
  // Pet specific
  petQuote?: string;
  animationType?: 'bounce' | 'crawl' | 'sleep' | 'flutter' | 'fire' | 'none';
  // Theme specific
  themeClass?: string;
  // Badge/Avatar specific
  badgeCode?: string;
  // Requirement overrides (Stage 2)
  requirementType?: 'level' | 'checkin' | 'tests' | 'courses';
  requirementValue?: number;
  createdAt?: string;
};

export type Season = {
  id: string;
  seasonNumber: number;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: SeasonStatus;
  maxLevelCap: number;
  themeColor?: string;
  bannerUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CardCustomization = {
  bgColor?: string;
  borderColor?: string;
  textColor?: string;
  accentColor?: string;
  badgeEmoji?: string;
  badgePosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center';
  sprinkles?: 'none' | 'sparkles' | 'stars' | 'glow';
  glowIntensity?: 'none' | 'subtle' | 'vivid' | 'neon';
  borderRadius?: string;
};

export type AppThemeAsset = {
  id: string;
  title: string;
  description: string;
  category: 'event' | 'seasonal' | 'milestone' | 'special' | 'regular';
  previewBg: string;
  themeClass: string;
  accentColor: string;
  iconName: string;
  isGlobalEventActive?: boolean;

  // Rich theme customization options
  bgType?: 'solid' | 'gradient' | 'cyber';
  bgStartColor?: string;
  bgEndColor?: string;
  gradientAngle?: string;
  cardBgColor?: string;
  borderColor?: string;
  textColor?: string;
  glowIntensity?: 'none' | 'subtle' | 'vivid' | 'neon';
  gridPattern?: 'none' | 'dots' | 'lines' | 'stars' | 'cyber';
  fontFamily?: 'sans' | 'space' | 'mono' | 'serif';
  glassBlur?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  sprinkles?: 'none' | 'sparkles' | 'stars' | 'confetti' | 'hearts' | 'glow-orbs';

  // Per-card granular customization
  cardCustomizations?: {
    season_hero?: CardCustomization;
    badges?: CardCustomization;
    learning_track?: CardCustomization;
    performance?: CardCustomization;
    registry?: CardCustomization;
    avatar_badge?: CardCustomization;
    [key: string]: CardCustomization | undefined;
  };
};

// ==========================================
// DYNAMIC XP CURVE ALGORITHM SPECIFICATION
// - Level 1 to 40: Exactly 600 XP per level
// - Level 41+: Exactly 1,000 XP per level
// ==========================================

export const LEVEL_1_TO_40_XP = 600;
export const LEVEL_41_PLUS_XP = 1000;
export const LEVEL_40_CUMULATIVE_XP = 40 * LEVEL_1_TO_40_XP; // 24,000 XP

export function calculateLevelFromXP(totalXP: number): {
  calculatedLevel: number;
  xpInCurrentLevel: number;
  xpRequiredForCurrentLevel: number;
  progressPercent: number;
  totalXpForNextLevel: number;
} {
  const safeXP = Math.max(0, totalXP || 0);

  if (safeXP < LEVEL_40_CUMULATIVE_XP) {
    const calculatedLevel = Math.floor(safeXP / LEVEL_1_TO_40_XP);
    const xpInCurrentLevel = safeXP % LEVEL_1_TO_40_XP;
    const xpRequiredForCurrentLevel = LEVEL_1_TO_40_XP;
    const progressPercent = Math.min(100, Math.max(0, (xpInCurrentLevel / LEVEL_1_TO_40_XP) * 100));
    const totalXpForNextLevel = (calculatedLevel + 1) * LEVEL_1_TO_40_XP;

    return {
      calculatedLevel,
      xpInCurrentLevel,
      xpRequiredForCurrentLevel,
      progressPercent,
      totalXpForNextLevel,
    };
  } else {
    const overflowXP = safeXP - LEVEL_40_CUMULATIVE_XP;
    const additionalLevels = Math.floor(overflowXP / LEVEL_41_PLUS_XP);
    const calculatedLevel = 40 + additionalLevels;
    const xpInCurrentLevel = overflowXP % LEVEL_41_PLUS_XP;
    const xpRequiredForCurrentLevel = LEVEL_41_PLUS_XP;
    const progressPercent = Math.min(100, Math.max(0, (xpInCurrentLevel / LEVEL_41_PLUS_XP) * 100));
    const totalXpForNextLevel = LEVEL_40_CUMULATIVE_XP + (additionalLevels + 1) * LEVEL_41_PLUS_XP;

    return {
      calculatedLevel,
      xpInCurrentLevel,
      xpRequiredForCurrentLevel,
      progressPercent,
      totalXpForNextLevel,
    };
  }
}

export function getDisplayLevel(
  totalXP: number,
  activeSeasonMaxCap: number = 80
): {
  displayLevel: number;
  calculatedLevel: number;
  isCapped: boolean;
  overflowXP: number;
  levelInfo: ReturnType<typeof calculateLevelFromXP>;
} {
  const levelInfo = calculateLevelFromXP(totalXP);
  const cap = activeSeasonMaxCap || 80;
  const isCapped = levelInfo.calculatedLevel >= cap;
  const displayLevel = Math.min(levelInfo.calculatedLevel, cap);

  // Calculate overflow XP earned beyond season cap
  let capThresholdXP = 0;
  if (cap <= 40) {
    capThresholdXP = cap * LEVEL_1_TO_40_XP;
  } else {
    capThresholdXP = LEVEL_40_CUMULATIVE_XP + (cap - 40) * LEVEL_41_PLUS_XP;
  }

  const overflowXP = Math.max(0, (totalXP || 0) - capThresholdXP);

  return {
    displayLevel,
    calculatedLevel: levelInfo.calculatedLevel,
    isCapped,
    overflowXP,
    levelInfo,
  };
}

// Default initial seasons
export const DEFAULT_SEASONS: Season[] = [
  {
    id: 'season_1',
    seasonNumber: 1,
    title: 'Season 1: Horizon Origin',
    description: 'The inaugural academic term! Rise through 80 milestone levels and claim legendary rewards.',
    startDate: '2026-09-01',
    endDate: '2026-12-31',
    status: 'active',
    maxLevelCap: 80,
    themeColor: '#22c55e',
    bannerUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200',
  },
  {
    id: 'season_2',
    seasonNumber: 2,
    title: 'Season 2: Desert Echoes',
    description: 'The second term journey expanding your knowledge horizon up to Level 160.',
    startDate: '2027-01-15',
    endDate: '2027-05-30',
    status: 'upcoming',
    maxLevelCap: 160,
    themeColor: '#bf7c1c',
    bannerUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=1200',
  },
];

// Pre-designed theme assets library (initially empty so user creates and manages custom themes)
export const PRESET_THEME_ASSETS: AppThemeAsset[] = [];

// Default Milestone Rewards for Season 1 & 2
export const DEFAULT_REWARDS: SeasonReward[] = [];

// Local Storage Master Cache Keys
export const LOCAL_SEASONS_KEY = 'app_seasons_master_list';
export const LOCAL_REWARDS_KEY = 'app_seasons_rewards_list';
export const LOCAL_ACTIVE_THEME_KEY = 'app_active_global_theme';

// Helper to get seasons list
export function getStoredSeasons(): Season[] {
  if (typeof window === 'undefined') return DEFAULT_SEASONS;
  try {
    const cached = localStorage.getItem(LOCAL_SEASONS_KEY);
    if (cached) return JSON.parse(cached);
  } catch (e) {
    console.error('Failed to load local seasons:', e);
  }
  return DEFAULT_SEASONS;
}

export function saveStoredSeasons(seasons: Season[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_SEASONS_KEY, JSON.stringify(seasons));
  } catch (e) {
    console.error('Failed to save local seasons:', e);
  }
}

export function getActiveSeasonFromList(seasons: Season[]): Season {
  const active = seasons.find((s) => s.status === 'active');
  return active || seasons[0] || DEFAULT_SEASONS[0];
}

// Helper to get rewards list
export function getStoredRewards(): SeasonReward[] {
  if (typeof window === 'undefined') return DEFAULT_REWARDS;
  try {
    const cached = localStorage.getItem(LOCAL_REWARDS_KEY);
    if (cached) return JSON.parse(cached);
  } catch (e) {
    console.error('Failed to load local rewards:', e);
  }
  return DEFAULT_REWARDS;
}

export function saveStoredRewards(rewards: SeasonReward[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_REWARDS_KEY, JSON.stringify(rewards));
  } catch (e) {
    console.error('Failed to save local rewards:', e);
  }
}

// Helper for Student Claiming Reward
export function getStudentClaimedRewards(studentId: string): string[] {
  if (typeof window === 'undefined' || !studentId) return [];
  try {
    const key = `student_claimed_rewards_${studentId}`;
    const cached = localStorage.getItem(key);
    if (cached) return JSON.parse(cached);
  } catch (e) {
    console.error('Failed to get claimed rewards:', e);
  }
  return [];
}

export function claimStudentRewardLocally(
  studentId: string,
  rewardId: string
): string[] {
  if (typeof window === 'undefined' || !studentId) return [];
  const current = getStudentClaimedRewards(studentId);
  if (!current.includes(rewardId)) {
    const updated = [...current, rewardId];
    localStorage.setItem(`student_claimed_rewards_${studentId}`, JSON.stringify(updated));
    // Tag unsynced
    localStorage.setItem(`student_claimed_rewards_${studentId}_synced`, 'false');
    return updated;
  }
  return current;
}
