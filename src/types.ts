/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ChoiceTier = 'lucky' | 'unlucky' | 'normal';

export interface OutcomeChoice {
  id: string;
  text: string;
  tier: ChoiceTier;
  weight: number; // Probability weight
}

export interface Player {
  id: string;
  name: string;
  resultId: string | null; // References the OutcomeChoice id
}

// Raw database row shape for the `rooms` table
export interface RoomRow {
  id: string;
  host_token: string;
  players: Player[];
  choices: OutcomeChoice[];
  results: Record<string, string>;
  is_spinning: boolean;
  spin_seed: number | string | null;
  has_spun: boolean;
  created_at: string;
  expires_at: string;
}

// Normalized client-side room state
export interface RoomState {
  id: string;
  players: Player[];
  choices: OutcomeChoice[];
  isSpinning: boolean;
  spinSeed: number | null;
  hasSpun: boolean;
  createdAt: string;
  expiresAt: string;
}

// A locally-saved choices preset
export interface ChoicePreset {
  id: string;
  name: string;
  items: OutcomeChoice[];
}
