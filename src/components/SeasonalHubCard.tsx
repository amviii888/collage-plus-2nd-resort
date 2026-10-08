'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Crown,
  Sparkles,
  Lock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flame,
  Zap,
  Gift,
  Calendar,
  Layers,
  Award
} from 'lucide-react';
import {
  Season,
  SeasonReward,
  getStoredSeasons,
  getStoredRewards,
  getActiveSeasonFromList,
  getDisplayLevel,
  getStudentClaimedRewards,
  claimStudentRewardLocally,
  RewardRarity
} from '@/lib/seasons';
import { useFirestore } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SeasonalHubCardProps {
  studentId: string;
  studentXP: number;
  onRewardClaimed?: (reward: SeasonReward) => void;
  className?: string;
  showCatalog?: boolean;
}

export function SeasonalHubCard({
  studentId,
  studentXP,
  onRewardClaimed,
  className,
  showCatalog = false
}: SeasonalHubCardProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [rewards, setRewards] = useState<SeasonReward[]>([]);
  const [claimedRewardIds, setClaimedRewardIds] = useState<string[]>([]);
  const [expandedSeasonId, setExpandedSeasonId] = useState<string | null>(null);

  // Student progress stats (Stage 2)
  const [studentBarcodeId, setStudentBarcodeId] = useState<string>('');
  const [appCheckInCount, setAppCheckInCount] = useState<number>(0);
  const [testsCompletedCount, setTestsCompletedCount] = useState<number>(0);
  const [coursesWatchedCount, setCoursesWatchedCount] = useState<number>(0);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);

  // Load seasons, rewards, and claim statuses on mount
  useEffect(() => {
    const loadedSeasons = getStoredSeasons();
    const loadedRewards = getStoredRewards();
    setSeasons(loadedSeasons);
    setRewards(loadedRewards);

    const activeSeason = getActiveSeasonFromList(loadedSeasons);
    setExpandedSeasonId(activeSeason.id);

    if (studentId) {
      setClaimedRewardIds(getStudentClaimedRewards(studentId));
    }
  }, [studentId]);

  // Load student progress stats dynamically (Stage 2)
  useEffect(() => {
    if (!studentId || !firestore) return;

    let isMounted = true;

    const fetchStats = async () => {
      try {
        setStatsLoading(true);

        // 1. Fetch Student barcodeId from cache or firestore
        let bId = '';
        let localStreak = 0;
        const cached = localStorage.getItem('cached_student_profile_' + studentId);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            bId = parsed.barcodeId || '';
            if (typeof parsed.streak === 'number') {
              localStreak = parsed.streak;
            }
          } catch (e) {}
        }

        // Check standalone streak key as fallback
        const standaloneStreak = localStorage.getItem('student-streak-' + studentId);
        if (standaloneStreak) {
          localStreak = Math.max(localStreak, parseInt(standaloneStreak, 10) || 0);
        }

        // If not cached, get from Firestore
        let cloudStreak = 0;
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const snap = await getDoc(doc(firestore, 'students', studentId));
          if (snap.exists()) {
            const data = snap.data();
            bId = data?.barcodeId || bId;
            if (typeof data?.streak === 'number') {
              cloudStreak = data.streak;
            }
            if (isMounted && bId) setStudentBarcodeId(bId);
          }
        } catch (e) {
          console.error("Error fetching student profile from firestore:", e);
        }

        const effectiveStreak = Math.max(localStreak, cloudStreak, 0);

        // 2. Fetch completed tests count from 'testAttempts'
        let testCount = 0;
        try {
          const { collection, query, where, getDocs } = await import('firebase/firestore');
          const testSnap = await getDocs(
            query(collection(firestore, 'testAttempts'), where('studentId', '==', studentId))
          );
          testCount = testSnap.size;
        } catch (e) {
          console.error("Error fetching test attempts count:", e);
        }

        // 3. Fetch courses watched count from students/{studentId}/watchHistory
        let watchCount = 0;
        try {
          const { collection, getDocs } = await import('firebase/firestore');
          const watchSnap = await getDocs(collection(firestore, `students/${studentId}/watchHistory`));
          watchCount = watchSnap.size;
        } catch (e) {
          console.error("Error fetching course watch history count:", e);
        }

        if (isMounted) {
          setAppCheckInCount(effectiveStreak);
          setTestsCompletedCount(testCount);
          setCoursesWatchedCount(watchCount);
          setStatsLoading(false);
        }
      } catch (err) {
        console.error("Failed to compile student metrics stats:", err);
        if (isMounted) {
          setStatsLoading(false);
        }
      }
    };

    fetchStats();

    return () => {
      isMounted = false;
    };
  }, [studentId, firestore]);

  const getRewardUnlockStatus = (reward: SeasonReward) => {
    const reqType = reward.requirementType || 'level';
    const reqValue = reward.requirementValue !== undefined ? reward.requirementValue : reward.requiredLevel;

    switch (reqType) {
      case 'level':
        return {
          isUnlocked: calculatedLevel >= reward.requiredLevel,
          currentValue: calculatedLevel,
          targetValue: reward.requiredLevel,
          label: `Level ${reward.requiredLevel}`,
          shortLabel: `LVL ${reward.requiredLevel}`,
          icon: '⭐',
        };
      case 'checkin':
        return {
          isUnlocked: appCheckInCount >= reqValue,
          currentValue: appCheckInCount,
          targetValue: reqValue,
          label: `${reqValue} Daily App Check-ins`,
          shortLabel: `${appCheckInCount}/${reqValue} Check-ins`,
          icon: '🔥',
        };
      case 'tests':
        return {
          isUnlocked: testsCompletedCount >= reqValue,
          currentValue: testsCompletedCount,
          targetValue: reqValue,
          label: `${reqValue} Tests Completed`,
          shortLabel: `${testsCompletedCount}/${reqValue} Tests`,
          icon: '📝',
        };
      case 'courses':
        return {
          isUnlocked: coursesWatchedCount >= reqValue,
          currentValue: coursesWatchedCount,
          targetValue: reqValue,
          label: `${reqValue} Courses Watched`,
          shortLabel: `${coursesWatchedCount}/${reqValue} Courses`,
          icon: '📺',
        };
      default:
        return {
          isUnlocked: calculatedLevel >= reward.requiredLevel,
          currentValue: calculatedLevel,
          targetValue: reward.requiredLevel,
          label: `Level ${reward.requiredLevel}`,
          shortLabel: `LVL ${reward.requiredLevel}`,
          icon: '⭐',
        };
    }
  };

  // Load latest from Firestore if online
  useEffect(() => {
    if (!firestore) return;

    const fetchLatestFromCloud = async () => {
      try {
        const seasonsSnap = await getDocs(collection(firestore, 'seasons'));
        const loadedSeasons: Season[] = [];
        seasonsSnap.forEach((doc) => {
          loadedSeasons.push({ id: doc.id, ...doc.data() } as Season);
        });

        const rewardsSnap = await getDocs(collection(firestore, 'rewards'));
        const loadedRewards: SeasonReward[] = [];
        rewardsSnap.forEach((doc) => {
          loadedRewards.push({ id: doc.id, ...doc.data() } as SeasonReward);
        });

        if (loadedSeasons.length > 0) {
          loadedSeasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
          setSeasons(loadedSeasons);
          const activeSeason = getActiveSeasonFromList(loadedSeasons);
          setExpandedSeasonId(activeSeason.id);
        }
        if (loadedRewards.length > 0) {
          setRewards(loadedRewards);
        }
      } catch (err) {
        console.error('Failed to pull latest seasons/rewards in SeasonalHubCard:', err);
      }
    };

    fetchLatestFromCloud();
  }, [firestore]);

  const activeSeason = useMemo(() => getActiveSeasonFromList(seasons), [seasons]);

  // Compute Leveling Engine Metrics using master formula
  const { displayLevel, calculatedLevel, isCapped, overflowXP, levelInfo } = useMemo(
    () => getDisplayLevel(studentXP, activeSeason.maxLevelCap),
    [studentXP, activeSeason.maxLevelCap]
  );

  // Calculate remaining days in active season
  const remainingDays = useMemo(() => {
    if (!activeSeason.endDate) return 90;
    const end = new Date(activeSeason.endDate).getTime();
    const now = new Date().getTime();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }, [activeSeason.endDate]);

  const handleClaim = (reward: SeasonReward) => {
    if (!studentId) return;

    // Check custom unlocking criteria (Stage 2)
    const { isUnlocked, label } = getRewardUnlockStatus(reward);
    if (!isUnlocked) {
      toast({
        variant: 'destructive',
        title: 'Locked 🔒',
        description: `You need to complete: ${label} to claim this milestone!`,
      });
      return;
    }

    const updated = claimStudentRewardLocally(studentId, reward.id);
    setClaimedRewardIds(updated);

    toast({
      title: `🎉 Reward Claimed: ${reward.title}!`,
      description: `You have successfully unlocked ${reward.title}. Equip it now in your Customization Station!`,
    });

    if (onRewardClaimed) {
      onRewardClaimed(reward);
    }
  };

  const getRarityBadgeStyle = (rarity: RewardRarity) => {
    switch (rarity) {
      case 'Common':
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
      case 'Rare':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'Epic':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'Legendary':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-amber-500/20 shadow-sm';
      default:
        return 'bg-zinc-800 text-zinc-300';
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Active Season Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-[#131316] p-6 shadow-2xl glass-card">
        {/* Glowing Background Radial Accents */}
        <div
          className="absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: activeSeason.themeColor || '#22c55e' }}
        />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-amber-600/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          {/* Top Metadata Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-md"
                style={{
                  borderColor: `${activeSeason.themeColor}50`,
                  backgroundColor: `${activeSeason.themeColor}20`,
                  color: activeSeason.themeColor,
                }}
              >
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono tracking-widest text-emerald-400 uppercase font-bold">
                    ACTIVE TERM
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                    SEASON {activeSeason.seasonNumber}
                  </Badge>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                  {activeSeason.title}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 px-3.5 py-1.5 rounded-xl text-xs font-mono text-zinc-300">
              <Calendar className="h-4 w-4 text-amber-500" />
              <span>
                Term Ends in <strong className="text-amber-400">{remainingDays} Days</strong>
              </span>
            </div>
          </div>

          {/* Season Progress & Overflow Vault */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/60">
            {/* Display Level & Progress */}
            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-emerald-400" />
                  Season Progress Cap
                </span>
                <span className="text-zinc-200 font-bold">
                  Level {displayLevel} / <span className="text-emerald-400">{activeSeason.maxLevelCap}</span>
                </span>
              </div>

              <Progress
                value={Math.min(100, (displayLevel / activeSeason.maxLevelCap) * 100)}
                className="h-3 bg-zinc-900 border border-zinc-800"
              />

              <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-0.5">
                <span>Total Earned: <strong className="text-zinc-200">{(studentXP || 0).toLocaleString()} XP</strong></span>
                <span>Next Lvl: <strong className="text-emerald-400">{levelInfo.xpInCurrentLevel} / {levelInfo.xpRequiredForCurrentLevel} XP</strong></span>
              </div>
            </div>

            {/* Overlevel Vault / Prestige XP Status */}
            <div className="flex flex-col justify-center items-center bg-zinc-900/80 p-3 rounded-lg border border-zinc-800 text-center space-y-1">
              {isCapped ? (
                <>
                  <div className="flex items-center gap-1 text-amber-400 text-xs font-bold font-mono uppercase tracking-wider">
                    <Crown className="h-4 w-4 text-amber-400 animate-bounce" />
                    CAP REACHED!
                  </div>
                  <div className="text-sm font-extrabold text-amber-300">
                    +{overflowXP.toLocaleString()} Overflow XP
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-tight">
                    Preserved for global leaderboard & prestige rank!
                  </p>
                </>
              ) : (
                <>
                  <div className="text-xs text-zinc-400 font-mono flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                    Cap Remaining
                  </div>
                  <div className="text-lg font-bold text-white">
                    {activeSeason.maxLevelCap - displayLevel} Levels
                  </div>
                  <p className="text-[10px] text-zinc-500">
                    Level up to unlock all rewards!
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Seasonal Rewards Accordion Catalog (Only rendered if showCatalog is explicitly true) */}
      {showCatalog && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-emerald-400" />
              <h3 className="text-lg font-extrabold text-white tracking-wide">
                Seasonal Level Milestone Rewards
              </h3>
            </div>
            <span className="text-xs text-zinc-400 font-mono">
              {claimedRewardIds.length} / {rewards.length} Claimed
            </span>
          </div>

        {seasons.map((season) => {
          const seasonRewards = rewards
            .filter((r) => r.seasonId === season.id || r.seasonNumber === season.seasonNumber)
            .sort((a, b) => a.requiredLevel - b.requiredLevel);

          const isExpanded = expandedSeasonId === season.id;
          const isCurrentSeason = season.id === activeSeason.id;

          return (
            <div
              key={season.id}
              className="rounded-xl border border-zinc-800 bg-[#131316] overflow-hidden transition-colors"
            >
              {/* Season Accordion Header */}
              <button
                onClick={() => setExpandedSeasonId(isExpanded ? null : season.id)}
                className="w-full flex items-center justify-between p-4 bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg font-mono font-bold text-sm border",
                    isCurrentSeason
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                      : "bg-zinc-800 text-zinc-400 border-zinc-700"
                  )}>
                    S{season.seasonNumber}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        {season.title}
                      </span>
                      {isCurrentSeason && (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px]">
                          CURRENT
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-zinc-400">
                      Cap: Level {season.maxLevelCap} • {seasonRewards.length} Milestones
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-zinc-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-zinc-400" />
                  )}
                </div>
              </button>

              {/* Reward Items List */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 space-y-3 border-t border-zinc-800/80 bg-zinc-950/40"
                  >
                    {seasonRewards.length === 0 ? (
                      <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider py-6 text-center">
                        🔒 Coming Soon!
                      </p>
                    ) : (
                      seasonRewards.map((reward) => {
                        const isClaimed = claimedRewardIds.includes(reward.id);
                        const { isUnlocked, currentValue, targetValue, label, shortLabel, icon } = getRewardUnlockStatus(reward);
                        const reqType = reward.requirementType || 'level';
                        const reqValue = reward.requirementValue !== undefined ? reward.requirementValue : reward.requiredLevel;

                        return (
                          <div
                            key={reward.id}
                            className={cn(
                              "flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border transition-all",
                              isClaimed && "bg-emerald-950/10 border-emerald-500/30",
                              !isClaimed && isUnlocked && "bg-amber-500/5 border-amber-500/30 hover:border-amber-500/60 shadow-lg shadow-amber-500/5",
                              !isUnlocked && "bg-zinc-950/30 border-zinc-800/80 opacity-60"
                            )}
                          >
                            <div className="flex items-center gap-3.5">
                              {/* Requirement / Level Badge */}
                              <div className={cn(
                                "flex flex-col items-center justify-center h-12 w-14 rounded-xl border font-mono text-center leading-none p-1",
                                isUnlocked ? "bg-zinc-900 border-amber-500/40 text-amber-400" : "bg-zinc-900 border-zinc-800 text-zinc-500"
                              )}>
                                <span className="text-[9px] uppercase text-zinc-500 font-bold tracking-tighter">
                                  {reqType === 'level' || !reqType ? 'LVL' : reqType === 'checkin' ? 'CHKN' : reqType.slice(0, 4).toUpperCase()}
                                </span>
                                <span className="text-sm font-extrabold text-white flex items-center gap-0.5 mt-1">
                                  {reqType !== 'level' && <span>{icon}</span>}
                                  {reqValue}
                                </span>
                              </div>

                              {/* Asset Preview Icon */}
                              <div className="text-3xl select-none flex items-center justify-center w-10 h-10 bg-zinc-900/80 rounded-lg border border-zinc-800">
                                {reward.iconOrAssetUrl}
                              </div>

                              {/* Details */}
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-zinc-100">
                                    {reward.title}
                                  </span>
                                  <Badge className={cn("text-[9px] border px-1.5 py-0.5", getRarityBadgeStyle(reward.rarity))}>
                                    {reward.rarity}
                                  </Badge>
                                </div>
                                <p className="text-xs text-zinc-400 max-w-md">
                                  {reward.description}
                                </p>
                                {reward.petQuote && (
                                  <p className="text-[11px] text-amber-400/90 italic mt-0.5">
                                    &quot;{reward.petQuote}&quot;
                                  </p>
                                )}

                                {/* Progress Indicator (Stage 2) */}
                                <div className="mt-1.5 flex items-center gap-2">
                                  <span className="text-[10px] text-zinc-500 font-mono">Progress:</span>
                                  <div className="w-24 bg-zinc-900 rounded-full h-1.5 overflow-hidden border border-zinc-800">
                                    <div 
                                      className={cn(
                                        "h-full rounded-full",
                                        isUnlocked ? "bg-amber-500" : "bg-zinc-600"
                                      )}
                                      style={{ width: `${Math.min(100, (currentValue / targetValue) * 100)}%` }}
                                    />
                                  </div>
                                  <span className={cn("text-[10px] font-mono font-bold", isUnlocked ? "text-emerald-400" : "text-zinc-400")}>
                                    {shortLabel}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Action Button */}
                            <div>
                              {isClaimed ? (
                                <Button
                                  disabled
                                  size="sm"
                                  variant="outline"
                                  className="bg-emerald-500/10 border-emerald-500/40 text-emerald-400 text-xs gap-1 h-9 cursor-default"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                  Claimed
                                </Button>
                              ) : isUnlocked ? (
                                <Button
                                  size="sm"
                                  onClick={() => handleClaim(reward)}
                                  className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs gap-1.5 h-9 shadow-lg shadow-amber-500/20 active:scale-95 transition-transform"
                                >
                                  <Sparkles className="h-3.5 w-3.5" />
                                  Claim Reward!
                                </Button>
                              ) : (
                                <Button
                                  disabled
                                  size="sm"
                                  variant="outline"
                                  className="bg-zinc-900 border-zinc-800 text-zinc-500 text-xs gap-1.5 h-9"
                                >
                                  <Lock className="h-3.5 w-3.5" />
                                  Locked ({shortLabel})
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
