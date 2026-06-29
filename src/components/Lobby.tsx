/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useState} from 'react';
import {ArrowRight, Loader2, LogIn, Sparkles, Users, Zap} from 'lucide-react';
import {motion} from 'motion/react';

interface LobbyProps {
  onCreate: () => void;
  onJoin: (code: string) => void;
  creating: boolean;
  errorMsg: string | null;
}

export default function Lobby({
  onCreate,
  onJoin,
  creating,
  errorMsg,
}: LobbyProps) {
  const [code, setCode] = useState('');

  const handleJoin = () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed) onJoin(trimmed);
  };

  return (
    <motion.div
      key="lobby-screen"
      initial={{opacity: 0, y: 15}}
      animate={{opacity: 1, y: 0}}
      exit={{opacity: 0, y: -15}}
      transition={{duration: 0.25}}
      className="w-full max-w-3xl mx-auto space-y-8"
    >
      <div className="text-center space-y-3">
        <span className="text-[10px] tracking-widest font-extrabold text-indigo-400 bg-indigo-500/15 border border-indigo-500/20 px-3 py-1 rounded-full uppercase">
          Realtime Random Rooms
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-white font-display text-balance">
          สร้างห้องสุ่มแล้วชวนเพื่อนมาลุ้นพร้อมกัน
        </h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto text-pretty leading-relaxed">
          เปิดห้อง แชร์ลิงก์ให้เพื่อน แล้วทุกคนในลิงก์เดียวกันจะเห็นผลสุ่มแบบ
          เรียลไทม์ ห้องจะหมดอายุอัตโนมัติใน 24 ชั่วโมง
        </p>
      </div>

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl text-xs flex items-center gap-2.5 max-w-md mx-auto justify-center">
          <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Create */}
        <div className="glass rounded-2xl p-6 border border-indigo-500/20 flex flex-col justify-between gap-5 min-h-[240px]">
          <div className="space-y-3">
            <div className="w-11 h-11 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-extrabold text-white font-display">
              สร้างห้องใหม่
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              คุณจะเป็นเจ้าของห้อง (Host) ตั้งค่ารายชื่อผู้เล่นและตัวเลือก
              แล้วเป็นคนกดสุ่มให้ทุกคนดู
            </p>
          </div>
          <button
            onClick={onCreate}
            disabled={creating}
            className="w-full px-5 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-display font-extrabold tracking-wide shadow-lg shadow-indigo-950/20 border border-indigo-400/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-50"
          >
            {creating ? (
              <>
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
                <span>กำลังสร้างห้อง...</span>
              </>
            ) : (
              <>
                <Zap className="w-4.5 h-4.5 fill-white" />
                <span>สร้างห้องเลย</span>
              </>
            )}
          </button>
        </div>

        {/* Join */}
        <div className="glass rounded-2xl p-6 border border-white/5 flex flex-col justify-between gap-5 min-h-[240px]">
          <div className="space-y-3">
            <div className="w-11 h-11 bg-slate-800 rounded-xl flex items-center justify-center text-indigo-400 border border-white/5">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-extrabold text-white font-display">
              เข้าร่วมห้อง
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              มีรหัสห้องจากเพื่อนแล้ว? ใส่รหัส 6 หลักเพื่อเข้าไปลุ้นผลแบบเรียลไทม์
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              maxLength={6}
              placeholder="เช่น A1B2C3"
              className="flex-1 min-w-0 text-sm font-mono tracking-[0.2em] uppercase bg-slate-950/50 border border-white/10 rounded-xl px-3.5 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
            />
            <button
              onClick={handleJoin}
              disabled={!code.trim()}
              className="px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold border border-white/5 cursor-pointer transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              <LogIn className="w-4 h-4" />
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
