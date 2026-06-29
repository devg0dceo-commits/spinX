/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useEffect, useRef, useState} from 'react';
import {AlertTriangle, Home, Loader2, Volume2, VolumeX} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {OutcomeChoice, Player} from './types';
import {createRoom, useRoom} from './hooks/useRoom';
import {isSupabaseConfigured} from './lib/supabase';
import Lobby from './components/Lobby';
import SetupScreen, {DEFAULT_CHOICES} from './components/SetupScreen';
import ArenaScreen from './components/ArenaScreen';

const getRoomFromUrl = (): string | null =>
  new URLSearchParams(window.location.search).get('room');

const setRoomInUrl = (id: string | null) => {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set('room', id);
  else url.searchParams.delete('room');
  window.history.replaceState({}, '', url.toString());
};

const loadSavedChoices = (): OutcomeChoice[] => {
  try {
    const raw = localStorage.getItem('spinx_choices_raw_list');
    if (!raw) return DEFAULT_CHOICES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((c) => ({...c, weight: typeof c.weight === 'number' ? c.weight : 10}));
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_CHOICES;
};

export default function App() {
  const [roomId, setRoomId] = useState<string | null>(() => getRoomFromUrl());
  const [creating, setCreating] = useState(false);
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const [hostView, setHostView] = useState<'setup' | 'arena'>('setup');
  const [isMuted, setIsMuted] = useState(false);

  const hostViewInitialized = useRef(false);

  const {room, status, isHost, commitConfig, shufflePlayers, spin} =
    useRoom(roomId);

  useEffect(() => {
    const savedMuted = localStorage.getItem('spinx_muted');
    if (savedMuted) setIsMuted(savedMuted === 'true');
  }, []);

  // Bounce back to the lobby with a message when the room is unreachable.
  useEffect(() => {
    if (status === 'notfound') {
      setLobbyError('ไม่พบห้องนี้ หรือรหัสห้องไม่ถูกต้อง');
      setRoomInUrl(null);
      setRoomId(null);
    } else if (status === 'expired') {
      setLobbyError('ห้องนี้หมดอายุแล้ว (เกิน 24 ชั่วโมง) กรุณาสร้างห้องใหม่');
      setRoomInUrl(null);
      setRoomId(null);
    } else if (status === 'error') {
      setLobbyError('เชื่อมต่อห้องไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
  }, [status]);

  // Decide the host's initial screen once the room has loaded.
  useEffect(() => {
    if (status === 'ready' && isHost && room && !hostViewInitialized.current) {
      hostViewInitialized.current = true;
      setHostView(room.players.length > 0 ? 'arena' : 'setup');
    }
  }, [status, isHost, room]);

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      localStorage.setItem('spinx_muted', String(next));
      return next;
    });
  };

  const handleCreateRoom = async () => {
    setLobbyError(null);
    setCreating(true);
    try {
      const id = await createRoom(loadSavedChoices());
      hostViewInitialized.current = true;
      setHostView('setup');
      setRoomInUrl(id);
      setRoomId(id);
    } catch (err) {
      console.error('[v0] create room failed', err);
      setLobbyError('สร้างห้องไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = (code: string) => {
    setLobbyError(null);
    hostViewInitialized.current = false;
    setRoomInUrl(code);
    setRoomId(code);
  };

  const handleLeaveRoom = () => {
    setLobbyError(null);
    hostViewInitialized.current = false;
    setRoomInUrl(null);
    setRoomId(null);
  };

  const handleProceed = (players: Player[], choices: OutcomeChoice[]) => {
    commitConfig(players, choices);
    setHostView('arena');
  };

  const initialPlayersText = room?.players.length
    ? room.players.map((p) => p.name).join('\n')
    : localStorage.getItem('spinx_players_raw') || '';

  const initialChoices =
    room && room.choices.length > 0 ? room.choices : loadSavedChoices();

  const renderContent = () => {
    // No room selected yet -> lobby
    if (!roomId) {
      return (
        <Lobby
          onCreate={handleCreateRoom}
          onJoin={handleJoinRoom}
          creating={creating}
          errorMsg={lobbyError}
        />
      );
    }

    if (status === 'loading' || status === 'idle') {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-400">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
          <span className="text-sm font-semibold">กำลังเชื่อมต่อห้อง...</span>
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <p className="text-sm text-slate-300 font-semibold max-w-xs">
            {lobbyError || 'เชื่อมต่อห้องไม่สำเร็จ'}
          </p>
          <button
            onClick={handleLeaveRoom}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm cursor-pointer transition-all flex items-center gap-2"
          >
            <Home className="w-4 h-4" /> กลับหน้าแรก
          </button>
        </div>
      );
    }

    if (status === 'ready' && room) {
      if (isHost && hostView === 'setup') {
        return (
          <SetupScreen
            initialPlayersText={initialPlayersText}
            initialChoices={initialChoices}
            isMuted={isMuted}
            canGoBack={room.players.length > 0}
            onBack={() => setHostView('arena')}
            onProceed={handleProceed}
          />
        );
      }
      return (
        <ArenaScreen
          room={room}
          isHost={isHost}
          isMuted={isMuted}
          onSpin={spin}
          onShufflePlayers={shufflePlayers}
          onBackToSetup={() => setHostView('setup')}
        />
      );
    }

    return null;
  };

  return (
    <div
      className="min-h-screen bg-[#07080D] text-slate-100 font-sans flex flex-col justify-between selection:bg-indigo-500/30 selection:text-indigo-200"
      id="main-app-container"
    >
      <header className="border-b border-white/5 bg-[#07080D]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4.5 flex items-center justify-between">
          <button
            onClick={handleLeaveRoom}
            className="flex items-center gap-3 cursor-pointer text-left"
            title="กลับหน้าแรก"
          >
            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-lg italic text-white shadow-lg shadow-indigo-500/20">
              S
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-white font-display">
                DEVg0d/SPIN<span className="text-indigo-400">X</span>
              </h1>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">
                Randomed & Get it !
              </p>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex glass px-3 py-1 rounded-full items-center gap-2 border-indigo-500/20">
              <span
                className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                  isSupabaseConfigured ? 'bg-emerald-400' : 'bg-rose-400'
                }`}
              />
              <span className="text-[9px] font-mono tracking-wider text-slate-400 uppercase">
                {isSupabaseConfigured ? 'REALTIME ONLINE' : 'OFFLINE'}
              </span>
            </div>

            <button
              onClick={toggleMute}
              className="p-2 rounded-xl bg-slate-900/60 border border-white/5 text-slate-400 hover:text-slate-100 transition-all cursor-pointer flex items-center justify-center"
              title={isMuted ? 'เปิดเสียง' : 'ปิดเสียง'}
            >
              {isMuted ? (
                <VolumeX className="w-4.5 h-4.5 text-rose-400" />
              ) : (
                <Volume2 className="w-4.5 h-4.5 text-indigo-400" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 md:py-10 flex flex-col justify-center">
        <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>
      </main>

      <footer className="border-t border-white/5 bg-[#07080D] py-5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-12">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <p>© DEV/g0d • All Rights Reserved</p>
          <div className="flex items-center gap-3 text-slate-500">
            <span>v6.0 // Realtime Rooms Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
