/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {OutcomeChoice} from '../types';

// How long the synchronized slot reveal animation lasts (ms)
export const SPIN_DURATION = 2200;

// Weighted random selector helper
export const getWeightedRandomChoice = (
  choices: OutcomeChoice[],
): OutcomeChoice => {
  const totalWeight = choices.reduce((sum, c) => sum + (c.weight || 0), 0);
  if (totalWeight <= 0) {
    return choices[Math.floor(Math.random() * choices.length)];
  }
  let random = Math.random() * totalWeight;
  for (const choice of choices) {
    random -= choice.weight || 0;
    if (random <= 0) {
      return choice;
    }
  }
  return choices[choices.length - 1];
};

export const shuffleArray = <T,>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Short, URL-friendly room code (avoids ambiguous characters)
export const generateRoomId = (): string => {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return id;
};

export const generateToken = (): string => {
  return (
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2) +
    Date.now().toString(36)
  );
};
