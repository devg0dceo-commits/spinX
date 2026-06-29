/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {createClient} from '@supabase/supabase-js';

// These are injected at build time via vite.config.ts `define`.
const supabaseUrl = (import.meta as any).env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = (import.meta as any).env
  .NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {eventsPerSecond: 10},
  },
  auth: {
    persistSession: false,
  },
});
