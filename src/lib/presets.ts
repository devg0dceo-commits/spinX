/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {ChoicePreset, OutcomeChoice} from '../types';

const STORAGE_KEY = 'spinx_choice_presets';

export const getPresets = (): ChoicePreset[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const persist = (presets: ChoicePreset[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
};

export const savePreset = (
  name: string,
  items: OutcomeChoice[],
): ChoicePreset[] => {
  const presets = getPresets();
  const preset: ChoicePreset = {
    id: `preset-${Math.random().toString(36).slice(2, 9)}`,
    name: name.trim() || `Preset ${presets.length + 1}`,
    // Deep clone so later edits don't mutate the saved preset
    items: items.map((c) => ({...c})),
  };
  const next = [...presets, preset];
  persist(next);
  return next;
};

export const deletePreset = (id: string): ChoicePreset[] => {
  const next = getPresets().filter((p) => p.id !== id);
  persist(next);
  return next;
};
