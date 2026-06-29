/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {useCallback, useEffect, useRef, useState} from 'react';
import {supabase} from '../lib/supabase';
import {OutcomeChoice, Player, RoomRow, RoomState} from '../types';
import {
  generateRoomId,
  generateToken,
  getWeightedRandomChoice,
  shuffleArray,
  SPIN_DURATION,
} from '../utils/random';

export type RoomStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'notfound'
  | 'expired'
  | 'error';

const hostKey = (roomId: string) => `spinx_host_${roomId}`;

const rowToState = (row: RoomRow): RoomState => ({
  id: row.id,
  players: Array.isArray(row.players) ? row.players : [],
  choices: Array.isArray(row.choices) ? row.choices : [],
  isSpinning: !!row.is_spinning,
  spinSeed: row.spin_seed != null ? Number(row.spin_seed) : null,
  hasSpun: !!row.has_spun,
  createdAt: row.created_at,
  expiresAt: row.expires_at,
});

const isExpired = (expiresAt: string) =>
  new Date(expiresAt).getTime() < Date.now();

/**
 * Create a brand new room and return its id. The creator is stored as host
 * locally via a private token.
 */
export const createRoom = async (
  choices: OutcomeChoice[],
): Promise<string> => {
  const id = generateRoomId();
  const hostToken = generateToken();

  const {error} = await supabase.from('rooms').insert({
    id,
    host_token: hostToken,
    players: [],
    choices,
    results: {},
    is_spinning: false,
    spin_seed: null,
    has_spun: false,
  });

  if (error) throw error;

  localStorage.setItem(hostKey(id), hostToken);
  return id;
};

export function useRoom(roomId: string | null) {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [status, setStatus] = useState<RoomStatus>('idle');
  const [isHost, setIsHost] = useState(false);
  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!roomId) {
      setStatus('idle');
      setRoom(null);
      setIsHost(false);
      return;
    }

    let active = true;
    setStatus('loading');

    (async () => {
      const {data, error} = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .maybeSingle();

      if (!active) return;

      if (error) {
        setStatus('error');
        return;
      }
      if (!data) {
        setStatus('notfound');
        return;
      }

      const row = data as RoomRow;
      if (isExpired(row.expires_at)) {
        setStatus('expired');
        return;
      }

      const token = localStorage.getItem(hostKey(roomId));
      setIsHost(!!token && token === row.host_token);
      setRoom(rowToState(row));
      setStatus('ready');
    })();

    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setStatus('expired');
            setRoom(null);
            return;
          }
          const row = payload.new as RoomRow;
          if (isExpired(row.expires_at)) {
            setStatus('expired');
            return;
          }
          setRoom(rowToState(row));
          setStatus('ready');
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    };
  }, [roomId]);

  const patch = useCallback(
    async (updates: Partial<RoomRow>) => {
      if (!roomId) return;
      // Optimistic local update for snappy host UX; realtime will confirm.
      setRoom((prev) =>
        prev ? rowToState({...stateToRow(prev), ...updates}) : prev,
      );
      const {error} = await supabase
        .from('rooms')
        .update(updates)
        .eq('id', roomId);
      if (error) console.error('[v0] room update failed', error.message);
    },
    [roomId],
  );

  const updatePlayers = useCallback(
    (players: Player[]) => patch({players}),
    [patch],
  );

  const updateChoices = useCallback(
    (choices: OutcomeChoice[]) => patch({choices}),
    [patch],
  );

  // Host writes the full config and resets any previous spin results.
  const commitConfig = useCallback(
    (players: Player[], choices: OutcomeChoice[]) =>
      patch({
        players: players.map((p) => ({...p, resultId: null})),
        choices,
        is_spinning: false,
        spin_seed: null,
        has_spun: false,
      }),
    [patch],
  );

  const shufflePlayers = useCallback(() => {
    if (!room) return;
    patch({players: shuffleArray(room.players)});
  }, [room, patch]);

  // Host computes the outcome, then broadcasts the spin start. All clients
  // animate locally for SPIN_DURATION and reveal the same final results.
  const spin = useCallback(async () => {
    if (!room) return;
    if (room.players.length === 0 || room.choices.length === 0) return;

    const outcomes = room.players.map((p) => ({
      ...p,
      resultId: getWeightedRandomChoice(room.choices).id,
    }));
    const seed = Date.now();

    await patch({
      players: outcomes,
      is_spinning: true,
      spin_seed: seed,
      has_spun: false,
    });

    if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    spinTimerRef.current = setTimeout(() => {
      patch({is_spinning: false, has_spun: true});
    }, SPIN_DURATION);
  }, [room, patch]);

  return {
    room,
    status,
    isHost,
    updatePlayers,
    updateChoices,
    commitConfig,
    shufflePlayers,
    spin,
  };
}

// Helper to merge optimistic patches against a normalized state.
function stateToRow(state: RoomState): RoomRow {
  return {
    id: state.id,
    host_token: '',
    players: state.players,
    choices: state.choices,
    results: {},
    is_spinning: state.isSpinning,
    spin_seed: state.spinSeed,
    has_spun: state.hasSpun,
    created_at: state.createdAt,
    expires_at: state.expiresAt,
  };
}
