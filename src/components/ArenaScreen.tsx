/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  ArrowLeft,
  Check,
  Clock,
  Copy,
  Crown,
  Eye,
  RefreshCw,
  Settings,
  Shuffle,
  Skull,
} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {OutcomeChoice, Player, RoomState} from '../types';
import {playFanfare, playSpinStart, playTick} from '../utils/audio';
import {SPIN_DURATION} from '../utils/random';

interface ArenaScreenProps {
  room: RoomState;
  isHost: boolean;
  isMuted: boolean;
  onSpin: () => void;
  onShufflePlayers: () => void;
  onBackToSetup: () => void;
}

const formatRemaining = (ms: number) => {
  if (ms <= 0) return 'หมดอายุแล้ว';
  const totalMinutes = Math.floor(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h} ชม. ${m} นาที`;
  return `${m} นาที`;
};

export default function ArenaScreen({
  room,
  isHost,
  isMuted,
  onSpin,
  onShufflePlayers,
  onBackToSetup,
}: ArenaScreenProps) {
  const {players, choices, spinSeed} = room;

  const [rolling, setRolling] = useState(false);
  const [rollingIndexes, setRollingIndexes] = useState<Record<string, number>>(
    {},
  );
  const lastSeedRef = useRef<number | null>(null);

  const [copied, setCopied] = useState(false);
  const [remaining, setRemaining] = useState(
    () => new Date(room.expiresAt).getTime() - Date.now(),
  );

  // Live countdown to room expiry
  useEffect(() => {
    const tick = () =>
      setRemaining(new Date(room.expiresAt).getTime() - Date.now());
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [room.expiresAt]);

  // Drive the synchronized slot animation off the shared spin seed.
  useEffect(() => {
    if (!spinSeed) return;
    if (lastSeedRef.current === spinSeed) return;
    lastSeedRef.current = spinSeed;

    const remainingMs = SPIN_DURATION - (Date.now() - spinSeed);
    if (remainingMs <= 0) {
      setRolling(false);
      return;
    }

    setRolling(true);
    if (!isMuted) playSpinStart();

    const tick = setInterval(() => {
      setRollingIndexes(() => {
        const next: Record<string, number> = {};
        players.forEach((p) => {
          next[p.id] = Math.floor(Math.random() * Math.max(choices.length, 1));
        });
        return next;
      });
      if (!isMuted && Math.random() > 0.3) {
        playTick(0.8 + Math.random() * 0.4);
      }
    }, 90);

    const end = setTimeout(() => {
      clearInterval(tick);
      setRolling(false);
      if (!isMuted) playFanfare();
    }, remainingMs);

    return () => {
      clearInterval(tick);
      clearTimeout(end);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinSeed]);

  const choiceById = useMemo(() => {
    const map: Record<string, OutcomeChoice> = {};
    choices.forEach((c) => (map[c.id] = c));
    return map;
  }, [choices]);

  const totalWeightSum = useMemo(
    () => choices.reduce((sum, c) => sum + (c.weight || 0), 0),
    [choices],
  );

  const {lucky, unlucky} = useMemo(() => {
    const luckyArr: Player[] = [];
    const unluckyArr: Player[] = [];
    if (!rolling) {
      players.forEach((p) => {
        const c = p.resultId ? choiceById[p.resultId] : undefined;
        if (c?.tier === 'lucky') luckyArr.push(p);
        if (c?.tier === 'unlucky') unluckyArr.push(p);
      });
    }
    return {lucky: luckyArr, unlucky: unluckyArr};
  }, [players, choiceById, rolling]);

  const hasResults = !rolling && players.some((p) => p.resultId);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard may be unavailable; ignore.
    }
  };

  return (
    <motion.div
      key="arena-screen"
      initial={{opacity: 0, y: 15}}
      animate={{opacity: 1, y: 0}}
      exit={{opacity: 0, y: -15}}
      transition={{duration: 0.25}}
      className="space-y-6 sm:space-y-8 w-full"
    >
      {/* Share bar */}
      <div className="glass rounded-2xl border border-indigo-500/15 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-widest font-bold text-slate-500">
              รหัสห้อง
            </span>
            <span className="text-xl font-black font-mono tracking-[0.2em] text-indigo-300">
              {room.id}
            </span>
          </div>
          <div className="h-8 w-px bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-1.5 text-slate-400">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[11px] font-semibold">
              เหลือเวลา {formatRemaining(remaining)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isHost && (
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg">
              <Eye className="w-3.5 h-3.5" />
              ผู้ชม
            </span>
          )}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg cursor-pointer transition-all"
            title="คัดลอกลิงก์ห้องเพื่อแชร์ให้เพื่อน"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" /> คัดลอกแล้ว
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> แชร์ลิงก์
              </>
            )}
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          {isHost && (
            <button
              onClick={onBackToSetup}
              disabled={rolling}
              className="p-1.5 rounded-lg bg-slate-900 border border-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer mr-1 disabled:opacity-40"
              title="ย้อนกลับหน้าตั้งค่า"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h2 className="text-xl font-extrabold text-white font-display">
              ผลการสุ่มบทบาท / คลาส 🎉
            </h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
              Synchronized Slot Reveal Board
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
          {isHost && (
            <button
              onClick={onShufflePlayers}
              disabled={rolling}
              className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/20 cursor-pointer flex items-center gap-1.5 transition-all disabled:opacity-40"
              title="สลับตำแหน่ง/ลำดับผู้เล่น (เขย่า)"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>เขย่าลำดับ</span>
            </button>
          )}
          <span className="bg-slate-950/80 px-3 py-1.5 rounded-xl border border-white/5">
            ผู้เล่น {players.length} คน • สุ่มจาก {choices.length} ผลลัพธ์
          </span>
        </div>
      </div>

      {players.length === 0 ? (
        <div className="text-center py-16 text-slate-500 text-sm">
          {isHost
            ? 'ยังไม่มีผู้เล่น กลับไปหน้าตั้งค่าเพื่อเพิ่มรายชื่อ'
            : 'รอเจ้าของห้องตั้งค่าผู้เล่น...'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {players.map((player, idx) => {
            let displayedText = 'รอลุ้นผลลัพธ์...';
            let activeChoice: OutcomeChoice | undefined;

            if (rolling) {
              const currentRollIdx = rollingIndexes[player.id];
              if (currentRollIdx !== undefined && choices[currentRollIdx]) {
                activeChoice = choices[currentRollIdx];
                displayedText = activeChoice.text;
              }
            } else if (player.resultId) {
              activeChoice = choiceById[player.resultId];
              if (activeChoice) displayedText = activeChoice.text;
            }

            const isLuckyMatch =
              !rolling && activeChoice && activeChoice.tier === 'lucky';
            const isUnluckyMatch =
              !rolling && activeChoice && activeChoice.tier === 'unlucky';

            return (
              <motion.div
                key={player.id}
                initial={{opacity: 0, scale: 0.92, y: 10}}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                  borderColor: isLuckyMatch
                    ? 'rgba(236, 72, 153, 0.4)'
                    : isUnluckyMatch
                      ? 'rgba(245, 158, 11, 0.4)'
                      : 'rgba(255, 255, 255, 0.05)',
                  backgroundColor: isLuckyMatch
                    ? 'rgba(236, 72, 153, 0.04)'
                    : isUnluckyMatch
                      ? 'rgba(245, 158, 11, 0.04)'
                      : 'rgba(255, 255, 255, 0.02)',
                }}
                transition={{duration: 0.3, delay: idx * 0.04}}
                className={`relative overflow-hidden p-6 rounded-2xl border-2 backdrop-blur-md flex flex-col justify-between min-h-[140px] transition-all duration-300 ${
                  isLuckyMatch
                    ? 'shadow-[0_0_20px_rgba(236,72,153,0.1)]'
                    : isUnluckyMatch
                      ? 'shadow-[0_0_20px_rgba(245,158,11,0.08)]'
                      : ''
                }`}
              >
                {rolling && (
                  <div className="absolute inset-x-0 h-[2px] bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,1)] top-1/2 -translate-y-1/2 animate-bounce pointer-events-none opacity-40" />
                )}

                <div className="flex items-start justify-between z-10">
                  <div className="space-y-1 min-w-0">
                    <span className="text-[10px] text-slate-500 font-mono font-bold tracking-widest uppercase block">
                      PLAYER #{idx + 1}
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-white font-sans truncate pr-4">
                      {player.name}
                    </h3>
                  </div>

                  {!rolling && activeChoice && (
                    <div className="shrink-0">
                      {activeChoice.tier === 'lucky' && (
                        <motion.div
                          initial={{scale: 0}}
                          animate={{scale: 1}}
                          className="bg-pink-500 text-white p-1.5 rounded-lg shadow-md flex items-center justify-center animate-bounce"
                          title="ได้รางวัลใหญ่ โคตรดวงดี! 👑"
                        >
                          <Crown className="w-4 h-4 fill-white" />
                        </motion.div>
                      )}
                      {activeChoice.tier === 'unlucky' && (
                        <motion.div
                          initial={{scale: 0}}
                          animate={{scale: 1}}
                          className="bg-amber-500 text-slate-950 p-1.5 rounded-lg shadow-md flex items-center justify-center animate-pulse"
                          title="ดวงกุด ดวงซวยที่สุดรอบนี้! 💀"
                        >
                          <Skull className="w-4 h-4 fill-slate-950" />
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4.5 pt-3.5 border-t border-white/5 flex items-center justify-between z-10">
                  <div className="min-w-0 flex-1">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={displayedText}
                        initial={{y: rolling ? 8 : 0, opacity: 0}}
                        animate={{y: 0, opacity: 1}}
                        exit={{y: rolling ? -8 : 0, opacity: 0}}
                        transition={{duration: 0.08}}
                        className={`text-xs sm:text-sm font-extrabold tracking-tight truncate ${
                          rolling
                            ? 'text-indigo-400 font-mono animate-pulse'
                            : isLuckyMatch
                              ? 'text-pink-400 neon-glow-pink'
                              : isUnluckyMatch
                                ? 'text-amber-400 font-bold'
                                : 'text-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">{displayedText}</span>
                          {!rolling && activeChoice && (
                            <span className="text-[9px] font-mono bg-white/5 border border-white/10 px-1 py-0.5 rounded text-slate-400 font-medium">
                              {totalWeightSum > 0
                                ? (
                                    ((activeChoice.weight || 0) /
                                      totalWeightSum) *
                                    100
                                  ).toFixed(0)
                                : 0}
                              %
                            </span>
                          )}
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <div className="shrink-0 font-mono text-[9px] font-bold tracking-widest text-slate-500 ml-3">
                    {rolling ? (
                      <span className="text-indigo-400 animate-pulse uppercase">
                        CYCLING
                      </span>
                    ) : player.resultId ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse inline-block" />
                        <span>LOCKED</span>
                      </span>
                    ) : (
                      <span className="text-slate-600 uppercase">WAITING</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* MVP announcement */}
      {hasResults && (lucky.length > 0 || unlucky.length > 0) && (
        <motion.div
          initial={{opacity: 0, scale: 0.95}}
          animate={{opacity: 1, scale: 1}}
          className="bg-slate-950/80 border border-white/5 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 divide-y md:divide-y-0 md:divide-x divide-white/5">
            <div className="flex flex-col items-center justify-center text-center p-2 space-y-3">
              <div className="w-10 h-10 bg-pink-500/20 border border-pink-500/30 rounded-full flex items-center justify-center text-pink-400 animate-bounce">
                <Crown className="w-5 h-5 fill-pink-400" />
              </div>
              <div>
                <h4 className="text-[10px] tracking-widest font-extrabold text-pink-400 uppercase">
                  👑 LUCKY MVP (ผู้โชคดีพิเศษ)
                </h4>
                <div className="mt-2 space-y-1">
                  {lucky.length > 0 ? (
                    lucky.map((winner) => (
                      <p
                        key={winner.id}
                        className="text-base font-black text-white"
                      >
                        คุณ <span className="text-pink-400">{winner.name}</span>{' '}
                        ได้รับโชคดีสุดแจ่ม! 🎉
                      </p>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500">
                      ไม่มีใครได้รางวัลโชคดีรอบนี้
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center text-center p-2 space-y-3 pt-6 md:pt-2">
              <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/30 rounded-full flex items-center justify-center text-amber-400 animate-pulse">
                <Skull className="w-5 h-5 fill-amber-400" />
              </div>
              <div>
                <h4 className="text-[10px] tracking-widest font-extrabold text-amber-400 uppercase">
                  💀 UNLUCKY GANG (ผู้ประสบภัยดวงซวย)
                </h4>
                <div className="mt-2 space-y-1">
                  {unlucky.length > 0 ? (
                    unlucky.map((loser) => (
                      <p
                        key={loser.id}
                        className="text-base font-black text-white"
                      >
                        คุณ <span className="text-amber-400">{loser.name}</span>{' '}
                        ดวงซวยที่สุดแล้วรอบนี้... 💀
                      </p>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500">
                      รอบนี้สงบสุข ไม่มีใครดวงกุด!
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Action buttons (host only) */}
      {isHost ? (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
          <button
            onClick={onBackToSetup}
            disabled={rolling}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-slate-900 border border-white/5 hover:border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 font-semibold text-sm disabled:opacity-50"
          >
            <Settings className="w-4.5 h-4.5" />
            <span>แก้ไขรายชื่อ / ตัวเลือก (Edit)</span>
          </button>

          <button
            onClick={onSpin}
            disabled={rolling}
            className="w-full sm:w-auto px-9 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-display font-extrabold tracking-wide shadow-lg shadow-indigo-950/20 border border-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2.5 text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${rolling ? 'animate-spin' : ''}`} />
            <span>{hasResults ? 'สุ่มใหม่อีกครั้ง! (SPIN AGAIN)' : 'เริ่มสุ่ม! (SPIN)'}</span>
          </button>
        </div>
      ) : (
        <div className="text-center pt-4">
          <span className="text-xs text-slate-500 font-semibold inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            {rolling
              ? 'กำลังสุ่ม... ลุ้นไปพร้อมกัน!'
              : 'รอเจ้าของห้องกดสุ่ม ผลจะอัปเดตให้อัตโนมัติ'}
          </span>
        </div>
      )}
    </motion.div>
  );
}
