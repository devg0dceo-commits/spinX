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
