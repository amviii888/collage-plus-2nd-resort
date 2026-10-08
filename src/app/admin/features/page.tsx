'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  SlidersHorizontal, 
  Users, 
  Trophy, 
  AlertTriangle,
  RotateCcw,
  Save,
  Globe
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FeatureToggles {
  parentRoleEnabled: boolean;
  seasonsGamification: boolean;
  publicDiscoverFeed: boolean;
  leaderboardControl: boolean;
  dailyQuestionPublisher: boolean;
  photoMarketing: boolean;
  recordings: boolean;
}

const DEFAULT_TOGGLES: FeatureToggles = {
  parentRoleEnabled: false, // Disabled
  seasonsGamification: false, // Disabled for this year
  publicDiscoverFeed: false, // Disabled: Private college mode by default
  leaderboardControl: false, // Disabled as requested
  dailyQuestionPublisher: false, // Disabled as requested
  photoMarketing: false, // Disabled as requested
  recordings: false, // Disabled as requested
};

export default function AdminFeatureManagementPage() {
  const { toast } = useToast();
  const [toggles, setToggles] = useState<FeatureToggles>(DEFAULT_TOGGLES);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('mol5saty_feature_flags');
      if (stored) {
        setToggles(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load feature flags', e);
    }
  }, []);

  const handleToggle = (key: keyof FeatureToggles, value: boolean) => {
    setToggles(prev => {
      const updated = { ...prev, [key]: value };
      setHasChanges(true);
      return updated;
    });
  };

  const saveFlags = () => {
    setIsSaving(true);
    try {
      localStorage.setItem('mol5saty_feature_flags', JSON.stringify(toggles));
      toast({ title: 'Feature flags saved successfully!' });
      setHasChanges(false);
    } catch (e) {
      toast({ title: 'Failed to save feature flags', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    setToggles(DEFAULT_TOGGLES);
    setHasChanges(true);
    toast({ title: 'Reset flags to defaults' });
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Feature Management</h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Toggle specific auxiliary features on or off as requested.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={resetToDefaults}
            className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Reset Defaults
          </Button>

          <Button 
            onClick={saveFlags} 
            disabled={!hasChanges || isSaving}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </div>

      {hasChanges && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>You have unsaved feature flag modifications. Click &quot;Save Configuration&quot; to apply them.</span>
        </div>
      )}

      {/* Only the requested toggles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Toggle 1: Seasons & Gamification */}
        <Card className="bg-zinc-900/80 border-zinc-800">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Seasons & Gamification System
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Global student leaderboards, rank XP, and seasonal awards.
                </CardDescription>
              </div>
              <Switch 
                checked={toggles.seasonsGamification}
                onCheckedChange={(val) => handleToggle('seasonsGamification', val)}
              />
            </div>
          </CardHeader>
          <CardContent className="pt-0 text-xs">
            <span className={`font-mono font-bold px-2 py-0.5 rounded ${
              toggles.seasonsGamification 
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
            }`}>
              {toggles.seasonsGamification ? 'ACTIVE' : 'DISABLED (OFF)'}
            </span>
          </CardContent>
        </Card>

        {/* Toggle 2: Parent Role & Portal */}
        <Card className="bg-zinc-900/80 border-zinc-800">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  Parent Role & Login Portal
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Allow parent authentication and student monitoring access.
                </CardDescription>
              </div>
              <Switch 
                checked={toggles.parentRoleEnabled}
                onCheckedChange={(val) => handleToggle('parentRoleEnabled', val)}
              />
            </div>
          </CardHeader>
          <CardContent className="pt-0 text-xs">
            <span className={`font-mono font-bold px-2 py-0.5 rounded ${
              toggles.parentRoleEnabled 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
            }`}>
              {toggles.parentRoleEnabled ? 'ACTIVE' : 'DISABLED (OFF)'}
            </span>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
