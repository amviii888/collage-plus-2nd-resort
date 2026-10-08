'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { getDisplayLevel, getStoredSeasons, AppThemeAsset } from '@/lib/seasons';
import { Flame, Trophy, Zap, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Logo } from '@/components/icons';

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string | null;
  // Fallbacks from leaderboard row to avoid flash-of-empty
  fallbackData?: {
    name?: string;
    xp?: number;
    streak?: number;
    equippedAvatar?: string;
    grade?: string;
  };
}

export function StudentProfileModal({
  isOpen,
  onClose,
  studentId,
  fallbackData,
}: StudentProfileModalProps) {
  const { t } = useTranslation();
  const firestore = useFirestore();

  // State loaded from DB
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [customizationData, setCustomizationData] = useState<any>(null);
  const [rewardsList, setRewardsList] = useState<any[]>([]);
  const [themesList, setThemesList] = useState<AppThemeAsset[]>([]);

  // Fetch student details securely (by ID only)
  useEffect(() => {
    if (!isOpen || !studentId) return;

    let isMounted = true;
    setLoading(true);

    const fetchStudentProfileDetails = async () => {
      try {
        // 1. Fetch main student profile doc (by specific ID)
        const studentRef = doc(firestore, 'students', studentId);
        const studentSnap = await getDoc(studentRef);
        let studentDoc: any = null;
        if (studentSnap.exists()) {
          studentDoc = { id: studentSnap.id, ...studentSnap.data() };
        }

        // 2. Fetch specific profile customization sub-document
        const customizationRef = doc(firestore, 'students', studentId, 'customizations', 'profile');
        const customizationSnap = await getDoc(customizationRef);
        let customDoc: any = null;
        if (customizationSnap.exists()) {
          customDoc = customizationSnap.data();
        }

        // 3. Fetch rewards list for rendering descriptions and images of unlocked labels
        const rewardsSnap = await getDocs(collection(firestore, 'rewards'));
        const loadedRewards: any[] = [];
        rewardsSnap.forEach((docSnap) => {
          loadedRewards.push({ id: docSnap.id, ...docSnap.data() });
        });

        // 4. Fetch library themes list
        const themesSnap = await getDocs(collection(firestore, 'library_themes'));
        const loadedThemes: AppThemeAsset[] = [];
        themesSnap.forEach((docSnap) => {
          loadedThemes.push({ id: docSnap.id, ...docSnap.data() } as AppThemeAsset);
        });

        if (isMounted) {
          if (studentDoc) setProfileData(studentDoc);
          if (customDoc) setCustomizationData(customDoc);
          if (loadedRewards.length > 0) setRewardsList(loadedRewards);
          if (loadedThemes.length > 0) setThemesList(loadedThemes);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed securely loading student details:", err);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchStudentProfileDetails();

    return () => {
      isMounted = false;
    };
  }, [isOpen, studentId, firestore]);

  // Merge loaded database fields with leaderboard fallbacks
  const name = profileData?.name || fallbackData?.name || t('Scholar');
  const xp = typeof profileData?.xp === 'number' ? profileData?.xp : (typeof fallbackData?.xp === 'number' ? fallbackData.xp : 0);
  const streak = typeof profileData?.streak === 'number' ? profileData?.streak : (typeof fallbackData?.streak === 'number' ? fallbackData.streak : 1);
  const equippedAvatar = profileData?.equippedAvatar || customizationData?.equippedAvatar || fallbackData?.equippedAvatar || '👦';
  const grade = profileData?.grade || fallbackData?.grade || 'General';
  const equippedTheme = customizationData?.equippedTheme || 'default';
  const equippedQrPet = customizationData?.equippedQrPet || 'none';
  const cardCustomizations = customizationData?.cardCustomizations || {};

  const equippedPetReward = useMemo(() => {
    return rewardsList.find(r => r.id === equippedQrPet);
  }, [rewardsList, equippedQrPet]);

  const equippedPetIcon = useMemo(() => {
    if (equippedQrPet === 'pet_test_frog') return '🐸';
    if (equippedQrPet === 'pet_snail') return '🐌';
    if (equippedQrPet === 'pet_cat') return '🐱';
    if (equippedQrPet === 'pet_bird') return '🐦';
    if (equippedQrPet === 'pet_dragon') return '🐲';
    return equippedPetReward?.iconOrAssetUrl || '';
  }, [equippedPetReward, equippedQrPet]);

  const equippedPetName = useMemo(() => {
    if (equippedQrPet === 'pet_test_frog') return t('Spurt');
    if (equippedQrPet === 'pet_snail') return t('Shelly');
    if (equippedQrPet === 'pet_cat') return t('Milo');
    if (equippedQrPet === 'pet_bird') return t('Pip');
    if (equippedQrPet === 'pet_dragon') return t('Ignis');
    return equippedPetReward?.title || t('Companion');
  }, [equippedPetReward, equippedQrPet, t]);

  const equippedPetAnimation = useMemo(() => {
    if (equippedQrPet === 'pet_test_frog') return 'bounce';
    if (equippedQrPet === 'pet_snail') return 'none';
    if (equippedQrPet === 'pet_cat') return 'sleep';
    if (equippedQrPet === 'pet_bird') return 'flutter';
    if (equippedQrPet === 'pet_dragon') return 'fire';
    return equippedPetReward?.animationType || 'none';
  }, [equippedPetReward, equippedQrPet]);

  const petSpeech = useMemo(() => {
    if (equippedPetReward?.petQuote) {
      return equippedPetReward.petQuote;
    }
    switch (equippedQrPet) {
      case 'pet_test_frog':
        return t("Ribbit! Focus on your study goals and make a big leap forward today!");
      case 'pet_snail':
        return t("Slow and steady wins the academic race! Keep moving forward!");
      case 'pet_cat':
        return t("Mew! Your study habits are purr-fect! Let's conquer the milestones!");
      case 'pet_bird':
        return t("Tweet tweet! Fly high with your study goals and sing of success!");
      case 'pet_dragon':
        return t("Raaawr! A mighty fire of knowledge burns within you, legend!");
      default:
        return t("Always ready to assist on the scholar journey!");
    }
  }, [equippedQrPet, equippedPetReward, t]);

  // Compute milestones and seasonal rewards
  const activeSeason = useMemo(() => {
    const seasons = getStoredSeasons();
    const active = seasons.find(s => s.status === 'active') || seasons[0];
    return active || { maxLevelCap: 80, seasonNumber: 1, title: 'Season 1 Horizon Origin' };
  }, []);

  const seasonCap = activeSeason.maxLevelCap || 80;
  const { displayLevel, isCapped, overflowXP, levelInfo } = getDisplayLevel(xp, seasonCap);
  const currentLevel = displayLevel;

  const xpInCurrentLevel = levelInfo.xpInCurrentLevel;
  const xpRequiredForCurrentLevel = levelInfo.xpRequiredForCurrentLevel;
  const levelProgressPercent = isCapped ? 100 : Math.min(100, Math.max(0, (xpInCurrentLevel / (xpRequiredForCurrentLevel || 1)) * 100));

  // Resolve list of unlocked badges/labels in CHRONOLOGICAL order
  const unlockedBadges = useMemo(() => {
    const unlockedIds: string[] = customizationData?.unlockedRewards || [];
    const badges: any[] = [];
    
    unlockedIds.forEach(id => {
      const match = rewardsList.find(r => r.id === id);
      if (match && match.type === 'badge') {
        badges.push({
          id: match.id,
          title: match.title,
          description: match.description,
          icon: match.iconOrAssetUrl || '🏆',
          rarity: match.rarity || 'Common',
        });
      }
    });

    return badges;
  }, [customizationData, rewardsList]);

  // Resolve customization theme style block
  const themeStyles = useMemo(() => {
    const themeName = equippedTheme;
    const customTheme = themesList.find(t => t.themeClass === themeName || t.id === themeName);
    
    if (customTheme) {
      const accent = customTheme.accentColor || '#22c55e';
      const bg = customTheme.bgStartColor || customTheme.previewBg || '#09090b';
      const textColor = customTheme.textColor || '#f8fafc';
      const cardBg = customTheme.cardBgColor || 'rgba(255, 255, 255, 0.04)';
      const borderColor = customTheme.borderColor || textColor;

      const hexToRgba = (hex: string, alpha: number) => {
        const cleanHex = (hex || '#ffffff').replace('#', '');
        if (cleanHex.length === 3) {
          const r = parseInt(cleanHex[0] + cleanHex[0], 16) || 255;
          const g = parseInt(cleanHex[1] + cleanHex[1], 16) || 255;
          const b = parseInt(cleanHex[2] + cleanHex[2], 16) || 255;
          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        if (cleanHex.length === 6) {
          const r = parseInt(cleanHex.substring(0, 2), 16) || 255;
          const g = parseInt(cleanHex.substring(2, 4), 16) || 255;
          const b = parseInt(cleanHex.substring(4, 6), 16) || 255;
          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        return `rgba(255, 255, 255, ${alpha})`;
      };

      const inkDim = hexToRgba(textColor, 0.6);
      const inkFaint = hexToRgba(textColor, 0.12);

      return {
        '--bg': bg,
        '--ink': textColor,
        '--ink-dim': inkDim,
        '--ink-faint': inkFaint,
        '--accent': accent,
        '--success': accent,
        '--warning': accent,
        '--card-bg': cardBg,
        '--border': borderColor,
        '--border-custom': borderColor,
        '--glow-custom': customTheme.glowIntensity || 'none',
        '--grid-custom': customTheme.gridPattern || 'none',
        '--font-custom': customTheme.fontFamily || 'sans',
        '--blur-custom': customTheme.glassBlur || 'none',
        '--sprinkles-custom': customTheme.sprinkles || 'none',
      } as React.CSSProperties;
    }

    switch (themeName) {
      case 'theme_test_forest':
        return {
          '--bg': '#0a1d13',
          '--ink': '#a7f3d0',
          '--ink-dim': 'rgba(167, 243, 208, 0.6)',
          '--ink-faint': 'rgba(167, 243, 208, 0.12)',
          '--accent': '#fbbf24',
          '--success': '#34d399',
          '--warning': '#f59e0b',
          '--card-bg': '#102e1f',
          '--border': 'rgba(167, 243, 208, 0.2)',
        } as React.CSSProperties;
      case 'theme-ramadan-emerald':
      case 'theme_ramadan_emerald':
        return {
          '--bg': '#022c22',
          '--ink': '#f59e0b',
          '--ink-dim': 'rgba(245, 158, 11, 0.6)',
          '--ink-faint': 'rgba(245, 158, 11, 0.12)',
          '--accent': '#10b981',
          '--success': '#34d399',
          '--warning': '#fbbf24',
          '--card-bg': '#064e3b',
          '--border': 'rgba(245, 158, 11, 0.2)',
        } as React.CSSProperties;
      case 'theme-halloween-obsidian':
      case 'theme_halloween_obsidian':
        return {
          '--bg': '#0c0a09',
          '--ink': '#f97316',
          '--ink-dim': 'rgba(249, 115, 22, 0.6)',
          '--ink-faint': 'rgba(249, 115, 22, 0.12)',
          '--accent': '#f59e0b',
          '--success': '#22c55e',
          '--warning': '#ea580c',
          '--card-bg': '#1c1917',
          '--border': 'rgba(249, 115, 22, 0.2)',
        } as React.CSSProperties;
      case 'theme-christmas-slate':
      case 'theme_christmas_slate':
        return {
          '--bg': '#0f172a',
          '--ink': '#38bdf8',
          '--ink-dim': 'rgba(56, 189, 248, 0.6)',
          '--ink-faint': 'rgba(56, 189, 248, 0.12)',
          '--accent': '#f43f5e',
          '--success': '#10b981',
          '--warning': '#fbbf24',
          '--card-bg': '#1e293b',
          '--border': 'rgba(56, 189, 248, 0.2)',
        } as React.CSSProperties;
      case 'theme-cyberpunk-neon':
      case 'theme_cyberpunk_neon':
      case 'theme_neon_cyber':
      case 'theme_neon_cyber_class':
        return {
          '--bg': '#050508',
          '--ink': '#39ff14',
          '--ink-dim': 'rgba(57, 255, 20, 0.6)',
          '--ink-faint': 'rgba(57, 255, 20, 0.15)',
          '--accent': '#ff007f',
          '--success': '#00ffff',
          '--warning': '#ffff00',
          '--card-bg': '#0f0f18',
          '--border': 'rgba(57, 255, 20, 0.25)',
        } as React.CSSProperties;
      case 'theme_retro_sand':
        return {
          '--bg': '#f5f2eb',
          '--ink': '#2c2a29',
          '--ink-dim': 'rgba(44, 42, 41, 0.6)',
          '--ink-faint': 'rgba(44, 42, 41, 0.12)',
          '--accent': '#e05a47',
          '--success': '#2a7e5c',
          '--warning': '#d99b26',
          '--card-bg': '#eae6dc',
          '--border': 'rgba(44, 42, 41, 0.2)',
        } as React.CSSProperties;
      default:
        return {
          '--bg': '#0b0b0c',
          '--ink': '#f2f2f2',
          '--ink-dim': 'rgba(242, 242, 242, 0.6)',
          '--ink-faint': 'rgba(255, 255, 255, 0.1)',
          '--accent': '#22c55e',
          '--success': '#00ff9d',
          '--warning': '#ffb800',
          '--card-bg': 'rgba(255, 255, 255, 0.03)',
          '--border': 'rgba(255, 255, 255, 0.1)',
        } as React.CSSProperties;
    }
  }, [equippedTheme, themesList]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[#0b0b0c] border border-white/15 text-white rounded-3xl p-0 overflow-hidden shadow-2xl transition-all">
        {/* Style tag block for dynamic styling of this mini scholar profile container */}
        <style dangerouslySetInnerHTML={{ __html: `
          .mini-scholar-wrapper {
            background: var(--bg) !important;
            color: var(--ink) !important;
            font-family: ${
              themeStyles['--font-custom'] === 'mono' ? "'JetBrains Mono', monospace" :
              themeStyles['--font-custom'] === 'space' ? "system-ui, -apple-system, sans-serif" :
              themeStyles['--font-custom'] === 'serif' ? "Georgia, serif" :
              "'Inter', sans-serif"
            } !important;
          }
          .mini-scholar-panel {
            background: var(--card-bg) !important;
            border: 1px solid var(--border) !important;
            border-radius: 20px !important;
            backdrop-filter: blur(20px) !important;
            -webkit-backdrop-filter: blur(20px) !important;
          }
          .mini-scholar-accent {
            color: var(--accent) !important;
          }
          .mini-scholar-pill {
            padding: 4px 12px;
            border-radius: 100px;
            font-size: 0.68rem;
            font-weight: 700;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            letter-spacing: 0.02em;
          }
          .mini-label-mono {
            font-family: ${themeStyles['--font-custom'] === 'mono' ? "'JetBrains Mono', monospace" : "'Space Mono', monospace"} !important;
            font-size: 0.62rem;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            opacity: 0.7;
            display: block;
          }

          /* Dynamic Background Grids */
          ${themeStyles['--grid-custom'] === 'none' ? `
            .mini-scholar-wrapper { background-image: none !important; }
          ` : ''}
          ${themeStyles['--grid-custom'] === 'dots' ? `
            .mini-scholar-wrapper { 
              background-image: radial-gradient(var(--ink-faint) 1.5px, transparent 1.5px) !important;
              background-size: 20px 20px !important;
            }
          ` : ''}
          ${themeStyles['--grid-custom'] === 'lines' ? `
            .mini-scholar-wrapper { 
              background-image: linear-gradient(to right, var(--ink-faint) 1px, transparent 1px), linear-gradient(to bottom, var(--ink-faint) 1px, transparent 1px) !important;
              background-size: 20px 20px !important;
            }
          ` : ''}
          ${themeStyles['--grid-custom'] === 'stars' ? `
            .mini-scholar-wrapper { 
              background-image: radial-gradient(circle at 20% 30%, var(--accent) 1.5px, transparent 1.5px),
                                radial-gradient(circle at 75% 15%, var(--ink-dim) 1.5px, transparent 1.5px),
                                radial-gradient(circle at 50% 85%, var(--accent) 1.5px, transparent 1.5px) !important;
              background-size: 60px 60px !important;
            }
          ` : ''}
          ${themeStyles['--grid-custom'] === 'cyber' ? `
            .mini-scholar-wrapper { 
              background-image: linear-gradient(0deg, transparent 24%, rgba(34, 197, 94, 0.05) 25%, rgba(34, 197, 94, 0.05) 26%, transparent 27%, transparent 74%, rgba(34, 197, 94, 0.05) 75%, rgba(34, 197, 94, 0.05) 76%, transparent 77%, transparent), 
                                linear-gradient(90deg, transparent 24%, rgba(34, 197, 94, 0.05) 25%, rgba(34, 197, 94, 0.05) 26%, transparent 27%, transparent 74%, rgba(34, 197, 94, 0.05) 75%, rgba(34, 197, 94, 0.05) 76%, transparent 77%, transparent) !important;
              background-size: 32px 32px !important;
            }
          ` : ''}

          /* Glow settings */
          ${themeStyles['--glow-custom'] === 'subtle' ? `
            .mini-scholar-panel { box-shadow: 0 0 16px var(--accent)25 !important; }
          ` : ''}
          ${themeStyles['--glow-custom'] === 'vivid' ? `
            .mini-scholar-panel { box-shadow: 0 0 28px var(--accent)50 !important; }
          ` : ''}
          ${themeStyles['--glow-custom'] === 'neon' ? `
            .mini-scholar-panel { box-shadow: 0 0 35px var(--accent)70, inset 0 0 12px var(--accent)25 !important; }
          ` : ''}
        ` }} />

        <div className="mini-scholar-wrapper p-5 max-h-[85vh] overflow-y-auto custom-scrollbar flex flex-col gap-4 relative select-none" style={themeStyles}>
          {/* Subtle top ambient glow */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Modal Header */}
          <DialogHeader className="pb-2 border-b border-white/10 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-xs font-black tracking-widest uppercase mini-scholar-accent flex items-center gap-1.5 font-mono">
                <Compass className="w-3.5 h-3.5" />
                {t('Scholar Showcase')}
              </DialogTitle>
              <DialogDescription className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                {t('Verified Leaderboard Profile')}
              </DialogDescription>
            </div>
          </DialogHeader>

          {loading ? (
            <div className="space-y-3 py-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-14 h-14 rounded-full bg-zinc-800/60" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-1/2 bg-zinc-800/60" />
                  <Skeleton className="h-3 w-1/3 bg-zinc-800/60" />
                </div>
              </div>
              <Skeleton className="h-28 w-full rounded-2xl bg-zinc-800/60" />
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {/* 1. Scholar Identity Hero Panel (Mini Scale Replica) */}
              <div className="mini-scholar-panel p-4 flex flex-col items-center text-center relative overflow-hidden">
                {/* Avatar with peaking companion */}
                <div className="relative mb-2 inline-flex justify-center items-center">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center text-5xl bg-transparent transition-transform hover:scale-105 select-none overflow-hidden">
                    {equippedAvatar && equippedAvatar !== '👦' ? (
                      <span>{equippedAvatar}</span>
                    ) : (
                      <Logo width={56} height={56} className="rounded-2xl shadow-sm" />
                    )}
                  </div>

                  {/* Peaking companion pet perched over avatar */}
                  {equippedQrPet !== 'none' && equippedPetIcon && (
                    <div className="absolute -top-1.5 -right-1.5 z-10 w-8 h-8 bg-zinc-950/90 border border-zinc-700/80 rounded-full flex items-center justify-center text-lg shadow-lg">
                      {equippedPetAnimation === 'bounce' && (
                        <motion.div
                          animate={{ scaleY: [1, 0.8, 1.15, 1], y: [0, 1, -4, 0] }}
                          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                        >
                          {equippedPetIcon}
                        </motion.div>
                      )}
                      {equippedPetAnimation === 'sleep' && (
                        <motion.div
                          animate={{ y: [0, 1, 0] }}
                          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                          className="relative"
                        >
                          <span className="absolute -top-2 -right-1 text-[7px] text-amber-400 font-bold animate-pulse">zZ</span>
                          {equippedPetIcon}
                        </motion.div>
                      )}
                      {equippedPetAnimation === 'flutter' && (
                        <motion.div
                          animate={{ rotate: [0, -15, 0, -15, 0], y: [0, 1, 0, 1, 0] }}
                          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                        >
                          {equippedPetIcon}
                        </motion.div>
                      )}
                      {equippedPetAnimation === 'fire' && (
                        <div className="relative">
                          <motion.div
                            className="absolute -top-1.5 -right-1.5 text-[7px]"
                            animate={{ opacity: [0, 1, 0], scale: [0.6, 1.2, 0.6] }}
                            transition={{ repeat: Infinity, duration: 1.2 }}
                          >
                            🔥
                          </motion.div>
                          <motion.div
                            animate={{ rotate: [-3, 3, -3] }}
                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                          >
                            {equippedPetIcon}
                          </motion.div>
                        </div>
                      )}
                      {(equippedPetAnimation === 'none' || !equippedPetAnimation || equippedPetAnimation === 'crawl') && (
                        <div>{equippedPetIcon}</div>
                      )}
                    </div>
                  )}
                </div>

                <span className="mini-label-mono mini-scholar-accent mb-1">SCHOLAR IDENTITY</span>
                <h3 className="text-xl font-black tracking-tight text-white truncate max-w-[280px] mb-2 leading-tight">
                  {name}
                </h3>

                {/* Status Pills */}
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <span className="mini-scholar-pill font-mono" style={{ color: 'var(--success)', background: 'rgba(0,255,157,0.1)', border: '1px solid rgba(0,255,157,0.2)' }}>
                    LEVEL {currentLevel}
                  </span>
                  <span className="mini-scholar-pill font-mono bg-white/5 border border-white/10 text-zinc-300">
                    {grade}
                  </span>
                  {streak > 0 && (
                    <span className="mini-scholar-pill font-mono" style={{ color: 'var(--warning)', background: 'rgba(255,184,0,0.1)', border: '1px solid rgba(255,184,0,0.2)' }}>
                      🔥 {streak} DAY STREAK
                    </span>
                  )}
                </div>
              </div>

              {/* 2. Season Progression Hub (Mini Scale Replica) */}
              <div className="mini-scholar-panel p-3.5 relative overflow-hidden">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="mini-label-mono">DEPLOYMENT PHASE</span>
                    <span className="mini-scholar-pill bg-white/10 text-white font-mono text-[10px] mt-0.5">
                      ✨ {activeSeason.title || 'Season 1 Horizon Origin'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="mini-label-mono">TOTAL XP</span>
                    <div className="font-mono font-black text-xs mini-scholar-accent">
                      {xp.toLocaleString()} XP
                    </div>
                  </div>
                </div>

                <div className="mt-2">
                  <div className="flex justify-between items-center text-[10px] font-mono mb-1">
                    <span className="text-zinc-400">Progression</span>
                    <span className="font-bold mini-scholar-accent">
                      Lvl {currentLevel} / {seasonCap}
                    </span>
                  </div>

                  <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full rounded-full"
                      style={{ 
                        backgroundColor: 'var(--accent)',
                        boxShadow: '0 0 12px var(--accent)'
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round(levelProgressPercent)}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[9px] text-zinc-400 font-mono mt-1">
                    <span>Tier: {Math.round(levelProgressPercent)}%</span>
                    <span>
                      {isCapped 
                        ? `Capped (+${overflowXP} XP)`
                        : `${levelInfo.xpRequiredForCurrentLevel - levelInfo.xpInCurrentLevel} XP to Lvl ${currentLevel + 1}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Companion Mascot Dialogue Card (if equipped) */}
              {equippedQrPet !== 'none' && equippedPetIcon && (
                <div className="mini-scholar-panel p-3 flex items-center gap-3 relative overflow-hidden">
                  <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-2xl shrink-0">
                    <motion.div
                      animate={{ y: [0, -3, 0] }}
                      transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                    >
                      {equippedPetIcon}
                    </motion.div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] font-black tracking-widest uppercase text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded font-mono">
                        {t('Companion')}
                      </span>
                      <h4 className="text-xs font-bold text-white truncate">
                        {equippedPetName}
                      </h4>
                    </div>
                    <div className="mt-1 bg-black/40 border border-white/5 rounded-lg px-2 py-1">
                      <p className="text-[10px] italic text-zinc-300 leading-snug">
                        &ldquo;{petSpeech}&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Credentials & Badges (Dynamic, no hardcoded placeholders) */}
              <div className="mini-scholar-panel p-3.5 flex flex-col gap-2">
                <span className="mini-label-mono flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-yellow-400 shrink-0" />
                  {t('Unlocked Credentials & Badges')}
                </span>

                {unlockedBadges.length === 0 ? (
                  <p className="text-[10px] text-zinc-500 italic py-1 font-mono">
                    {t('No badges equipped yet for this season.')}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 mt-0.5 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                    {unlockedBadges.map((badge) => (
                      <div 
                        key={badge.id}
                        title={badge.description}
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-1 rounded-xl border text-[10px] font-bold tracking-tight shadow-sm select-none transition-all hover:scale-105",
                          badge.rarity === 'Legendary' ? "text-amber-400 bg-amber-500/10 border-amber-500/30" :
                          badge.rarity === 'Epic' ? "text-purple-400 bg-purple-500/10 border-purple-500/30" :
                          badge.rarity === 'Rare' ? "text-blue-400 bg-blue-500/10 border-blue-500/30" :
                          "text-zinc-300 bg-white/5 border-white/10"
                        )}
                      >
                        <span className="text-xs shrink-0">{badge.icon}</span>
                        <span className="truncate max-w-[110px]">{badge.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

