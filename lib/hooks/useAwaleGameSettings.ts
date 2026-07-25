"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface AwaleGameConfig {
  difficultyEasyDepth: number;
  difficultyMediumDepth: number;
  difficultyExpertDepth: number;
  initialSeeds: number;
  winThreshold: number;
  allowUndo: boolean;
  maxUndos: number;
  showMovePreview: boolean;
  showAiHint: boolean;
  gameEnabled: boolean;
}

const DEFAULT_CONFIG: AwaleGameConfig = {
  difficultyEasyDepth: 2,
  difficultyMediumDepth: 4,
  difficultyExpertDepth: 7,
  initialSeeds: 4,
  winThreshold: 25,
  allowUndo: true,
  maxUndos: 1,
  showMovePreview: true,
  showAiHint: false,
  gameEnabled: true,
};

let cachedConfig: AwaleGameConfig | null = null;
let cacheTs = 0;
const CACHE_TTL = 5 * 60 * 1000;

export async function fetchAwaleGameConfig(): Promise<AwaleGameConfig> {
  const now = Date.now();
  if (cachedConfig && now - cacheTs < CACHE_TTL) return cachedConfig;

  try {
    const { data } = await supabase
      .from('awale_game_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (data) {
      cachedConfig = {
        difficultyEasyDepth: data.difficulty_easy_depth ?? 2,
        difficultyMediumDepth: data.difficulty_medium_depth ?? 4,
        difficultyExpertDepth: data.difficulty_expert_depth ?? 7,
        initialSeeds: data.initial_seeds ?? 4,
        winThreshold: data.win_threshold ?? 25,
        allowUndo: data.allow_undo ?? true,
        maxUndos: data.max_undos ?? 1,
        showMovePreview: data.show_move_preview ?? true,
        showAiHint: data.show_ai_hint ?? false,
        gameEnabled: data.game_enabled ?? true,
      };
      cacheTs = now;
      return cachedConfig;
    }
  } catch (err) {
    console.warn('[useAwaleGameSettings] fallback defaults', err);
  }

  return DEFAULT_CONFIG;
}

export function useAwaleGameSettings() {
  const [config, setConfig] = useState<AwaleGameConfig>(DEFAULT_CONFIG);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    fetchAwaleGameConfig().then((cfg) => {
      if (active) { setConfig(cfg); setReady(true); }
    });
    return () => { active = false; };
  }, []);

  return { config, ready };
}