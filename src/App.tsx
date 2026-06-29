/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Player, OutcomeChoice, ChoiceTier } from './types';
import { playTick, playSpinStart, playFanfare, playWoosh } from './utils/audio';
import { 
  Play, 
  RefreshCw, 
  Settings, 
  Users, 
  Layers, 
  Volume2, 
  VolumeX, 
  Crown, 
  Sparkles, 
  Trash2, 
  UserPlus,
  ArrowLeft,
  Flame,
  CheckCircle2,
  Plus,
  Skull,
  PlusCircle,
  AlertTriangle,
  Edit3,
  X,
  Shuffle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Preset sample players to get started easily
const SAMPLE_PLAYERS = ['สมชาย', 'สมหญิง', 'สมศักดิ์', 'มานะ', 'ชูใจ'];

// Preset sample choices with pre-defined tiers and custom weights
const CHOICE_PRESETS = [
  {
    name: 'สเกลขนาดตัวละคร',
    items: [
      { id: 'size-1', text: 'x1.0 (ปกติ) 🟢', tier: 'normal' as ChoiceTier, weight: 50 },
      { id: 'size-2', text: 'x1.0 (เหลี่ยม) 🕶️', tier: 'unlucky' as ChoiceTier, weight: 15 },
      { id: 'size-3', text: 'x1.4 (ยักษ์ใหญ่) 🟡', tier: 'normal' as ChoiceTier, weight: 25 },
      { id: 'size-4', text: 'x1.7 (มหาเทพโคตรบอส) 🔥', tier: 'lucky' as ChoiceTier, weight: 10 },
    ]
  },
  {
    name: 'เกรดระดับเกลือ (Gacha)',
    items: [
      { id: 'gacha-1', text: '👑 SSR (Legendary)', tier: 'lucky' as ChoiceTier, weight: 5 },
      { id: 'gacha-2', text: '⭐ SR (Rare)', tier: 'normal' as ChoiceTier, weight: 20 },
      { id: 'gacha-3', text: '💎 R (Common)', tier: 'normal' as ChoiceTier, weight: 50 },
      { id: 'gacha-4', text: '💩 เกลือบริสุทธิ์ (Trash)', tier: 'unlucky' as ChoiceTier, weight: 25 },
    ]
  },
  {
    name: 'จัดฝั่ง / แบ่งสีทีม',
    items: [
      { id: 'team-1', text: 'ทีมสีแดง 🔴 (โคตรบุก)', tier: 'lucky' as ChoiceTier, weight: 30 },
      { id: 'team-2', text: 'ทีมสีน้ำเงิน 🔵 (สมดุล)', tier: 'normal' as ChoiceTier, weight: 50 },
      { id: 'team-3', text: 'ทีมสีดำ ⚫ (ดวงซวยมาก)', tier: 'unlucky' as ChoiceTier, weight: 20 },
    ]
  }
];

// Weighted random selector helper
const getWeightedRandomChoice = (choices: OutcomeChoice[]): OutcomeChoice => {
  const totalWeight = choices.reduce((sum, c) => sum + (c.weight || 0), 0);
  if (totalWeight <= 0) {
    return choices[Math.floor(Math.random() * choices.length)];
  }
  let random = Math.random() * totalWeight;
  for (const choice of choices) {
    random -= (choice.weight || 0);
    if (random <= 0) {
      return choice;
    }
  }
  return choices[choices.length - 1];
};

export default function App() {
  // Input lists
  const [playersInput, setPlayersInput] = useState<string>('');
  
  // Custom Choice input state
  const [newChoiceText, setNewChoiceText] = useState<string>('');
  const [newChoiceTier, setNewChoiceTier] = useState<ChoiceTier>('normal');
  const [newChoiceWeight, setNewChoiceWeight] = useState<number>(10);

  // Edit Choice state
  const [editingChoiceId, setEditingChoiceId] = useState<string | null>(null);
  const [editChoiceText, setEditChoiceText] = useState<string>('');
  const [editChoiceTier, setEditChoiceTier] = useState<ChoiceTier>('normal');
  const [editChoiceWeight, setEditChoiceWeight] = useState<number>(10);

  // Choices List state
  const [choicesList, setChoicesList] = useState<OutcomeChoice[]>([]);

  // App screens and statuses
  const [activeScreen, setActiveScreen] = useState<'setup' | 'arena'>('setup');
  const [players, setPlayers] = useState<Player[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);

  // Spinning slot rolling indexes for each player
  const [rollingIndexes, setRollingIndexes] = useState<Record<string, number>>({});

  // Validation feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load initial settings on mount
  useEffect(() => {
    const savedPlayers = localStorage.getItem('spinx_players_raw');
    const savedChoices = localStorage.getItem('spinx_choices_raw_list');
    const savedMuted = localStorage.getItem('spinx_muted');

    if (savedPlayers) {
      setPlayersInput(savedPlayers);
    } else {
      setPlayersInput(SAMPLE_PLAYERS.join('\n'));
    }

    if (savedChoices) {
      try {
        const parsed = JSON.parse(savedChoices);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Add default weight: 10 to choices parsed from older save if they don't have it
          const sanitized = parsed.map(c => ({
            ...c,
            weight: typeof c.weight === 'number' ? c.weight : 10
          }));
          setChoicesList(sanitized);
        } else {
          setChoicesList(CHOICE_PRESETS[0].items);
        }
      } catch (e) {
        setChoicesList(CHOICE_PRESETS[0].items);
      }
    } else {
      setChoicesList(CHOICE_PRESETS[0].items);
    }

    if (savedMuted) {
      setIsMuted(savedMuted === 'true');
    }
  }, []);

  // Save choices helper
  const saveChoicesAndSync = (newChoices: OutcomeChoice[]) => {
    setChoicesList(newChoices);
    localStorage.setItem('spinx_choices_raw_list', JSON.stringify(newChoices));
  };

  // Choice creation / deletion / edit functions
  const handleAddChoice = () => {
    const trimmed = newChoiceText.trim();
    if (!trimmed) return;

    const newChoice: OutcomeChoice = {
      id: `choice-${Math.random().toString(36).substring(2, 7)}`,
      text: trimmed,
      tier: newChoiceTier,
      weight: newChoiceWeight
    };

    const updated = [...choicesList, newChoice];
    saveChoicesAndSync(updated);
    setNewChoiceText('');
    setNewChoiceTier('normal');
    setNewChoiceWeight(10);
    if (!isMuted) playWoosh();
  };

  const startEditingChoice = (choice: OutcomeChoice) => {
    setEditingChoiceId(choice.id);
    setEditChoiceText(choice.text);
    setEditChoiceTier(choice.tier);
    setEditChoiceWeight(choice.weight || 10);
  };

  const handleSaveEditChoice = () => {
    if (!editingChoiceId) return;
    const trimmed = editChoiceText.trim();
    if (!trimmed) return;

    const updated = choicesList.map((c) => {
      if (c.id === editingChoiceId) {
        return {
          ...c,
          text: trimmed,
          tier: editChoiceTier,
          weight: Number(editChoiceWeight) || 10
        };
      }
      return c;
    });

    saveChoicesAndSync(updated);
    setEditingChoiceId(null);
    setEditChoiceText('');
    setEditChoiceTier('normal');
    setEditChoiceWeight(10);
    if (!isMuted) playWoosh();
  };

  const handleCancelEditChoice = () => {
    setEditingChoiceId(null);
    setEditChoiceText('');
    setEditChoiceTier('normal');
    setEditChoiceWeight(10);
  };

  const handleRemoveChoice = (id: string) => {
    // If we're deleting the choice we are currently editing, cancel editing
    if (editingChoiceId === id) {
      handleCancelEditChoice();
    }
    const updated = choicesList.filter(c => c.id !== id);
    saveChoicesAndSync(updated);
  };

  const loadPresetChoices = (items: OutcomeChoice[]) => {
    handleCancelEditChoice();
    saveChoicesAndSync(items);
    if (!isMuted) playWoosh();
  };

  const loadSamplePlayers = () => {
    setPlayersInput(SAMPLE_PLAYERS.join('\n'));
    if (!isMuted) playWoosh();
  };

  const handleClearPlayers = () => {
    setPlayersInput('');
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const handleShuffleSetupPlayers = () => {
    const lines = playersInput.split('\n');
    // Filter, shuffle, and join
    const shuffledLines = shuffleArray(lines);
    setPlayersInput(shuffledLines.join('\n'));
    if (!isMuted) playWoosh();
  };

  const handleShuffleArenaPlayers = () => {
    if (isSpinning) return;
    const shuffledPlayers = shuffleArray(players);
    setPlayers(shuffledPlayers);
    if (!isMuted) playWoosh();
  };

  const handleClearChoices = () => {
    handleCancelEditChoice();
    saveChoicesAndSync([]);
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    localStorage.setItem('spinx_muted', String(next));
  };

  // Live total weights calculation for probability preview
  const totalWeightSum = choicesList.reduce((sum, c) => sum + (c.weight || 0), 0);

  const getCalculatedPercent = (currentWeight: number, isEditingThisItem: boolean = false, itemIdToReplace: string | null = null) => {
    let total = 0;
    choicesList.forEach(c => {
      if (itemIdToReplace && c.id === itemIdToReplace) {
        total += currentWeight;
      } else {
        total += c.weight || 0;
      }
    });

    if (!isEditingThisItem && !itemIdToReplace) {
      total += currentWeight;
    }

    if (total === 0) return 0;
    return (currentWeight / total) * 100;
  };

  // Validate and shift to Arena
  const handleProceedToSpin = () => {
    setErrorMsg(null);

    // Parse players
    const parsedPlayers = playersInput
      .split('\n')
      .map((name) => name.trim())
      .filter((name) => name.length > 0)
      .map((name, idx) => ({
        id: `player-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        name,
        resultId: null
      }));

    // Validation checks
    if (parsedPlayers.length === 0) {
      setErrorMsg('กรุณาป้อนรายชื่อผู้เล่นอย่างน้อย 1 คน');
      return;
    }
    if (choicesList.length === 0) {
      setErrorMsg('กรุณาเพิ่มตัวเลือกในการสุ่มอย่างน้อย 1 รายการ');
      return;
    }

    // Save configuration
    localStorage.setItem('spinx_players_raw', playersInput);

    setPlayers(parsedPlayers);
    setHasSpun(false);
    setActiveScreen('arena');
    if (!isMuted) playWoosh();
  };

  // Run the randomizer spin with Slot Machine visual effect
  const handleStartSpin = () => {
    if (isSpinning || players.length === 0 || choicesList.length === 0) return;
    
    setIsSpinning(true);
    setHasSpun(false);
    if (!isMuted) playSpinStart();

    // Reset current active result IDs
    setPlayers(prev => prev.map(p => ({ ...p, resultId: null })));

    const totalRollDuration = 2200; // ms
    const tickInterval = 90; // ms
    
    const startTime = Date.now();
    const intervalId = setInterval(() => {
      const timeElapsed = Date.now() - startTime;
      
      // Update rolling state indices to make choices cycle
      setRollingIndexes(() => {
        const next: Record<string, number> = {};
        players.forEach((p) => {
          next[p.id] = Math.floor(Math.random() * choicesList.length);
        });
        return next;
      });

      // Periodic tick audios
      if (!isMuted && Math.random() > 0.3) {
        playTick(0.8 + Math.random() * 0.4);
      }

      if (timeElapsed >= totalRollDuration) {
        clearInterval(intervalId);
        finalizeSpinResults();
      }
    }, tickInterval);
  };

  // Lock in final randomized choices using weighted random logic
  const finalizeSpinResults = () => {
    const outcomes = players.map((p) => {
      const selectedChoice = getWeightedRandomChoice(choicesList);
      return {
        ...p,
        resultId: selectedChoice.id
      };
    });

    setPlayers(outcomes);
    setIsSpinning(false);
    setHasSpun(true);

    if (!isMuted) {
      playFanfare();
    }
  };

  // Trigger spin instantly when entering the Arena Screen
  useEffect(() => {
    if (activeScreen === 'arena' && players.length > 0 && !hasSpun && !isSpinning) {
      handleStartSpin();
    }
  }, [activeScreen]);

  // Find lucky (LUCKY MVP) and unlucky (ดวงซวย) players based on results
  const getLuckyAndUnluckyPlayers = () => {
    if (!hasSpun || isSpinning) return { lucky: [], unlucky: [] };

    const lucky: Player[] = [];
    const unlucky: Player[] = [];

    players.forEach((player) => {
      if (player.resultId) {
        const choice = choicesList.find(c => c.id === player.resultId);
        if (choice) {
          if (choice.tier === 'lucky') lucky.push(player);
          if (choice.tier === 'unlucky') unlucky.push(player);
        }
      }
    });

    return { lucky, unlucky };
  };

  const { lucky: luckyWinners, unlucky: unluckyLosers } = getLuckyAndUnluckyPlayers();

  return (
    <div className="min-h-screen bg-[#07080D] text-slate-100 font-sans flex flex-col justify-between selection:bg-indigo-500/30 selection:text-indigo-200" id="main-app-container">
      
      {/* Top Header Panel */}
      <header className="border-b border-white/5 bg-[#07080D]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
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
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex glass px-3 py-1 rounded-full items-center gap-2 border-indigo-500/20">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[9px] font-mono tracking-wider text-slate-400 uppercase">SYSTEM STABLE</span>
            </div>

            {/* Sound Toggler */}
            <button
              onClick={toggleMute}
              className="p-2 rounded-xl bg-slate-900/60 border border-white/5 text-slate-400 hover:text-slate-100 transition-all cursor-pointer flex items-center justify-center"
              title={isMuted ? 'เปิดเสียง' : 'ปิดเสียง'}
              id="btn-toggle-mute"
            >
              {isMuted ? <VolumeX className="w-4.5 h-4.5 text-rose-400" /> : <Volume2 className="w-4.5 h-4.5 text-indigo-400" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Area */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 md:py-10 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          
          {/* SCREEN 1: SETUP SCREEN */}
          {activeScreen === 'setup' && (
            <motion.div
              key="setup-screen"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6 w-full"
              id="setup-screen-container"
            >
              {/* Title Header */}
              <div className="text-center max-w-xl mx-auto space-y-2 mb-2">
                <span className="text-[10px] tracking-widest font-extrabold text-indigo-400 bg-indigo-500/15 border border-indigo-500/20 px-3 py-1 rounded-full uppercase">
                  Let's Gooo
                </span>
              </div>

              {/* Error messages display */}
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl text-xs flex items-center gap-2.5 max-w-md mx-auto justify-center"
                >
                  <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                  <span className="font-semibold">{errorMsg}</span>
                </motion.div>
              )}

              {/* Config Area columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                
                {/* COLUMN LEFT: Play List Box */}
                <div className="glass rounded-2xl p-5 border border-white/5 flex flex-col justify-between min-h-[380px]" id="setup-players-col">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-400" />
                        <h3 className="text-xs uppercase font-extrabold text-slate-200 tracking-wider">รายชื่อผู้เล่น</h3>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={loadSamplePlayers}
                          className="text-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-bold px-2 py-1 rounded border border-indigo-500/20 cursor-pointer flex items-center gap-1 transition-all"
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>ตัวอย่าง</span>
                        </button>
                        <button
                          onClick={handleShuffleSetupPlayers}
                          className="text-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-bold px-2 py-1 rounded border border-indigo-500/20 cursor-pointer flex items-center gap-1 transition-all"
                          title="สลับลำดับผู้เล่น (เขย่า)"
                        >
                          <Shuffle className="w-3 h-3" />
                          <span>เขย่า</span>
                        </button>
                        <button
                          onClick={handleClearPlayers}
                          className="text-[10px] bg-slate-900/60 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 font-bold p-1 rounded border border-white/5 cursor-pointer transition-all"
                          title="ล้างรายชื่อทั้งหมด"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500">ใส่ชื่อผู้เล่นที่นี่ (คั่นด้วยการเว้นบรรทัด 1 บรรทัดต่อ 1 คน)</p>
                  </div>

                  <textarea
                    value={playersInput}
                    onChange={(e) => setPlayersInput(e.target.value)}
                    placeholder="ป้อนรายชื่อผู้เล่น เช่น:&#10;สมชาย&#10;สมหญิง&#10;มานี&#10;ปิติ"
                    className="w-full flex-1 min-h-[220px] text-sm bg-slate-950/50 border border-white/10 rounded-xl px-3.5 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 font-sans resize-none mt-3.5 transition-all"
                    id="players-textarea"
                  />
                  <div className="mt-2 text-right">
                    <span className="text-[10px] font-mono font-bold text-slate-500">
                      ผู้เล่นทั้งหมด: {playersInput.split('\n').filter(n => n.trim().length > 0).length} คน
                    </span>
                  </div>
                </div>

                {/* COLUMN RIGHT: Choice Builder Box (ITEMIZED ADD SYSTEM) */}
                <div className="glass rounded-2xl p-5 border border-white/5 flex flex-col justify-between min-h-[380px]" id="setup-choices-col">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-400" />
                        <h3 className="text-xs uppercase font-extrabold text-slate-200 tracking-wider">ตัวเลือกผลลัพธ์ที่จะสุ่ม</h3>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={handleClearChoices}
                          className="text-[10px] bg-slate-900/60 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 font-bold p-1 rounded border border-white/5 cursor-pointer transition-all"
                          title="ล้างตัวเลือกทั้งหมด"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Itemized Form (Adds or Edits) */}
                  <div className={`border rounded-xl p-3.5 space-y-3 mt-3 transition-all duration-300 ${
                    editingChoiceId 
                      ? 'bg-indigo-950/20 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.15)]' 
                      : 'bg-slate-950/40 border-white/5'
                  }`}>
                    {editingChoiceId ? (
                      // EDIT MODE
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                          <span className="text-[10px] text-indigo-400 font-extrabold uppercase flex items-center gap-1">
                            <Edit3 className="w-3.5 h-3.5" /> กำลังแก้ไขตัวเลือก
                          </span>
                          <button
                            onClick={handleCancelEditChoice}
                            className="text-[10px] text-slate-500 hover:text-slate-300 font-bold uppercase flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-900 rounded border border-white/5 cursor-pointer"
                          >
                            <X className="w-3 h-3" /> ยกเลิก
                          </button>
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editChoiceText}
                            onChange={(e) => setEditChoiceText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveEditChoice()}
                            placeholder="พิมพ์ชื่อตัวเลือกที่แก้ไข..."
                            className="flex-1 text-xs bg-slate-900 border border-indigo-500/30 rounded-lg px-2.5 py-1.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                          />
                          <button
                            onClick={handleSaveEditChoice}
                            disabled={!editChoiceText.trim()}
                            className="px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                          >
                            <span>บันทึก</span>
                          </button>
                        </div>

                        {/* Choice Status Picker for Edit */}
                        <div className="flex items-center gap-2 justify-between">
                          <span className="text-[10px] text-slate-500 font-bold uppercase">ความโชคดี:</span>
                          <div className="flex items-center gap-1 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setEditChoiceTier('lucky')}
                              className={`px-2 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                                editChoiceTier === 'lucky'
                                  ? 'bg-pink-500/20 border-pink-500 text-pink-400 font-extrabold'
                                  : 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-slate-300'
                              }`}
                            >
                              <Crown className="w-3 h-3" />
                              <span>ดวงดี</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditChoiceTier('normal')}
                              className={`px-2 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                                editChoiceTier === 'normal'
                                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-extrabold'
                                  : 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-slate-300'
                              }`}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>ปกติ</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditChoiceTier('unlucky')}
                              className={`px-2 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                                editChoiceTier === 'unlucky'
                                  ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-extrabold'
                                  : 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-slate-300'
                              }`}
                            >
                              <Skull className="w-3 h-3" />
                              <span>ดวงซวย</span>
                            </button>
                          </div>
                        </div>

                        {/* Weight setting for Edit */}
                        <div className="space-y-1.5 border-t border-white/5 pt-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">โอกาสการออกสุ่ม:</span>
                            <span className="text-[11px] font-mono font-black text-indigo-400">
                              น้ำหนัก: {editChoiceWeight} ({getCalculatedPercent(editChoiceWeight, true, editingChoiceId).toFixed(1)}%)
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="100"
                            value={editChoiceWeight}
                            onChange={(e) => setEditChoiceWeight(Number(e.target.value))}
                            className="w-full accent-indigo-500 h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      </div>
                    ) : (
                      // ADD MODE
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newChoiceText}
                            onChange={(e) => setNewChoiceText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddChoice()}
                            placeholder="พิมพ์ตัวเลือกใหม่ เช่น: x1.7 โคตรบอส 🔥"
                            className="flex-1 text-xs bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                          />
                          <button
                            onClick={handleAddChoice}
                            disabled={!newChoiceText.trim()}
                            className="px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>เพิ่ม</span>
                          </button>
                        </div>

                        {/* Choice Status Picker for Add */}
                        <div className="flex items-center gap-2 justify-between">
                          <span className="text-[10px] text-slate-500 font-bold uppercase">ความโชคดี:</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setNewChoiceTier('lucky')}
                              className={`px-2 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                                newChoiceTier === 'lucky'
                                  ? 'bg-pink-500/20 border-pink-500 text-pink-400'
                                  : 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-slate-300'
                              }`}
                            >
                              <Crown className="w-3 h-3" />
                              <span>ดวงดี</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewChoiceTier('normal')}
                              className={`px-2 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                                newChoiceTier === 'normal'
                                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                  : 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-slate-300'
                              }`}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>ปกติ</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewChoiceTier('unlucky')}
                              className={`px-2 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                                newChoiceTier === 'unlucky'
                                  ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                                  : 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-slate-300'
                              }`}
                            >
                              <Skull className="w-3 h-3" />
                              <span>ดวงซวย</span>
                            </button>
                          </div>
                        </div>

                        {/* Weight setting for Add */}
                        <div className="space-y-1.5 border-t border-white/5 pt-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">โอกาสการออกสุ่ม:</span>
                            <span className="text-[11px] font-mono font-black text-indigo-400">
                              น้ำหนัก: {newChoiceWeight} ({getCalculatedPercent(newChoiceWeight).toFixed(1)}%)
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="100"
                            value={newChoiceWeight}
                            onChange={(e) => setNewChoiceWeight(Number(e.target.value))}
                            className="w-full accent-indigo-500 h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Added Choices Scrollable list */}
                  <div className="flex-1 overflow-y-auto max-h-[140px] mt-3 space-y-1.5 pr-1.5 custom-scrollbar" id="added-choices-list">
                    {choicesList.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-center text-slate-600 text-xs py-8">
                        ยังไม่มีตัวเลือก... กรุณาเพิ่มด้านบน
                      </div>
                    ) : (
                      choicesList.map((choice) => (
                        <div
                          key={choice.id}
                          className={`flex items-center justify-between border rounded-lg px-3 py-1.5 hover:border-indigo-500/20 transition-all text-xs ${
                            editingChoiceId === choice.id 
                              ? 'bg-indigo-500/10 border-indigo-500/30 shadow-[0_0_8px_rgba(99,102,241,0.1)]' 
                              : 'bg-slate-950/30 border-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {/* Tier Badge */}
                            {choice.tier === 'lucky' && (
                              <span className="px-1.5 py-0.5 rounded bg-pink-500/15 border border-pink-500/30 text-pink-400 text-[8px] font-extrabold flex items-center gap-0.5 uppercase shrink-0">
                                <Crown className="w-2 h-2 fill-pink-400" /> LUCKY
                              </span>
                            )}
                            {choice.tier === 'unlucky' && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[8px] font-extrabold flex items-center gap-0.5 uppercase shrink-0">
                                <Skull className="w-2 h-2" /> WORST
                              </span>
                            )}
                            {choice.tier === 'normal' && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-white/5 text-slate-400 text-[8px] font-semibold shrink-0">
                                NORMAL
                              </span>
                            )}
                            <span className="text-slate-200 truncate font-semibold">{choice.text}</span>
                          </div>
                          
                          {/* Right Controls */}
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Probability Percentage Badge */}
                            <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded" title="โอกาสการออกสุ่ม (%)">
                              🎯 {totalWeightSum > 0 ? ((choice.weight || 0) / totalWeightSum * 100).toFixed(1) : '0.0'}%
                            </span>

                            {/* Edit Button */}
                            <button
                              onClick={() => startEditingChoice(choice)}
                              className={`p-1 cursor-pointer transition-colors ${
                                editingChoiceId === choice.id ? 'text-indigo-400' : 'text-slate-500 hover:text-indigo-400'
                              }`}
                              title="แก้ไขตัวเลือกนี้"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleRemoveChoice(choice.id)}
                              className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer transition-colors"
                              title="ลบตัวเลือกนี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-2 text-right">
                    <span className="text-[10px] font-mono font-bold text-slate-500">
                      ตัวเลือกทั้งหมด: {choicesList.length} รายการ
                    </span>
                  </div>
                </div>

              </div>

              {/* Big Action Submit setup button */}
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleProceedToSpin}
                  className="w-full sm:w-auto px-12 py-4.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-display font-extrabold tracking-wide shadow-xl shadow-indigo-950/20 border border-indigo-400/20 hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 cursor-pointer flex items-center justify-center gap-3 text-base"
                  id="btn-submit-setup"
                >
                  <Play className="w-5 h-5 fill-white text-white animate-pulse" />
                  <span>เข้าสู่หน้าสุ่มผลลัพธ์พร้อมกัน! (START ARENA)</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* SCREEN 2: SPINNING ARENA (BIG & SPECTACULAR VIEW) */}
          {activeScreen === 'arena' && (
            <motion.div
              key="arena-screen"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6 sm:space-y-8 w-full"
              id="arena-screen-container"
            >
              {/* Arena Header Status Panel */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveScreen('setup')}
                    className="p-1.5 rounded-lg bg-slate-900 border border-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer mr-1"
                    title="ย้อนกลับหน้าตั้งค่า"
                    id="btn-back-to-setup"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
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
                  <button
                    onClick={handleShuffleArenaPlayers}
                    disabled={isSpinning}
                    className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/20 cursor-pointer flex items-center gap-1.5 transition-all disabled:opacity-40"
                    title="สลับตำแหน่ง/ลำดับผู้เล่น (เขย่า)"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>เขย่าลำดับ</span>
                  </button>
                  <span className="bg-slate-950/80 px-3 py-1.5 rounded-xl border border-white/5">
                    ผู้เล่น {players.length} คน • สุ่มคัดเลือกจาก {choicesList.length} ผลลัพธ์
                  </span>
                </div>
              </div>

              {/* Dynamic Grid Results Board */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="arena-cards-grid">
                {players.map((player, idx) => {
                  const isRolling = isSpinning;
                  
                  // Pick rolling options vs landed options
                  let displayedText = 'รอลุ้นผลลัพธ์...';
                  let activeChoice: OutcomeChoice | undefined;

                  if (isRolling) {
                    const currentRollIdx = rollingIndexes[player.id];
                    if (currentRollIdx !== undefined && choicesList[currentRollIdx]) {
                      activeChoice = choicesList[currentRollIdx];
                      displayedText = activeChoice.text;
                    }
                  } else if (player.resultId) {
                    activeChoice = choicesList.find(c => c.id === player.resultId);
                    if (activeChoice) displayedText = activeChoice.text;
                  }

                  const isLuckyMatch = !isRolling && activeChoice && activeChoice.tier === 'lucky';
                  const isUnluckyMatch = !isRolling && activeChoice && activeChoice.tier === 'unlucky';

                  return (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, scale: 0.92, y: 10 }}
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
                          : 'rgba(255, 255, 255, 0.02)'
                      }}
                      transition={{ duration: 0.3, delay: idx * 0.04 }}
                      className={`relative overflow-hidden p-6 rounded-2xl border-2 backdrop-blur-md flex flex-col justify-between min-h-[140px] transition-all duration-300 ${
                        isLuckyMatch ? 'shadow-[0_0_20px_rgba(236,72,153,0.1)]' : isUnluckyMatch ? 'shadow-[0_0_20px_rgba(245,158,11,0.08)]' : ''
                      }`}
                      id={`arena-card-${player.id}`}
                    >
                      {/* Laser scanning strip when rolling */}
                      {isRolling && (
                        <div className="absolute inset-x-0 h-[2px] bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,1)] top-1/2 -translate-y-1/2 animate-bounce pointer-events-none opacity-40" />
                      )}

                      {/* Header containing player rank/order & name */}
                      <div className="flex items-start justify-between z-10">
                        <div className="space-y-1 min-w-0">
                          <span className="text-[10px] text-slate-500 font-mono font-bold tracking-widest uppercase block">
                            PLAYER #{idx + 1}
                          </span>
                          <h3 className="text-base sm:text-lg font-black text-white font-sans truncate pr-4">
                            {player.name}
                          </h3>
                        </div>

                        {/* Special Crown / Skull Status Icon Reveal */}
                        {!isRolling && activeChoice && (
                          <div className="shrink-0">
                            {activeChoice.tier === 'lucky' && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="bg-pink-500 text-white p-1.5 rounded-lg shadow-md flex items-center justify-center animate-bounce"
                                title="ได้รางวัลใหญ่ โคตรดวงดี! 👑"
                              >
                                <Crown className="w-4 h-4 fill-white" />
                              </motion.div>
                            )}
                            {activeChoice.tier === 'unlucky' && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="bg-amber-500 text-slate-950 p-1.5 rounded-lg shadow-md flex items-center justify-center animate-pulse"
                                title="ดวงกุด ดวงซวยที่สุดรอบนี้! 💀"
                              >
                                <Skull className="w-4 h-4 fill-slate-950" />
                              </motion.div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Giant Outcome Reveal Segment */}
                      <div className="mt-4.5 pt-3.5 border-t border-white/5 flex items-center justify-between z-10">
                        <div className="min-w-0 flex-1">
                          <AnimatePresence mode="wait">
                            <motion.div
                              key={displayedText}
                              initial={{ y: isRolling ? 8 : 0, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              exit={{ y: isRolling ? -8 : 0, opacity: 0 }}
                              transition={{ duration: 0.08 }}
                              className={`text-xs sm:text-sm font-extrabold tracking-tight truncate ${
                                isRolling 
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
                                {!isRolling && activeChoice && (
                                  <span className="text-[9px] font-mono bg-white/5 border border-white/10 px-1 py-0.5 rounded text-slate-400 font-medium">
                                    {totalWeightSum > 0 ? ((activeChoice.weight || 0) / totalWeightSum * 100).toFixed(0) : 0}%
                                  </span>
                                )}
                              </div>
                            </motion.div>
                          </AnimatePresence>
                        </div>

                        {/* Right-sided status indicator label */}
                        <div className="shrink-0 font-mono text-[9px] font-bold tracking-widest text-slate-500 ml-3">
                          {isRolling ? (
                            <span className="text-indigo-400 animate-pulse uppercase">CYCLING</span>
                          ) : (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse inline-block" />
                              <span>LOCKED</span>
                            </span>
                          )}
                        </div>
                      </div>

                    </motion.div>
                  );
                })}
              </div>

              {/* Special Lucky / Unlucky MVPs announcement card */}
              {hasSpun && (luckyWinners.length > 0 || unluckyLosers.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-slate-950/80 border border-white/5 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
                  id="mvps-announcement"
                >
                  <div className="absolute inset-0 bg-grid-white/[0.01] pointer-events-none" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 divide-y md:divide-y-0 md:divide-x divide-white/5">
                    
                    {/* Lucky MVP Side */}
                    <div className="flex flex-col items-center justify-center text-center p-2 space-y-3">
                      <div className="w-10 h-10 bg-pink-500/20 border border-pink-500/30 rounded-full flex items-center justify-center text-pink-400 animate-bounce">
                        <Crown className="w-5 h-5 fill-pink-400" />
                      </div>
                      <div>
                        <h4 className="text-[10px] tracking-widest font-extrabold text-pink-400 uppercase">
                          👑 LUCKY MVP (ผู้โชคดีพิเศษ)
                        </h4>
                        <div className="mt-2 space-y-1">
                          {luckyWinners.length > 0 ? (
                            luckyWinners.map(winner => (
                              <p key={winner.id} className="text-base font-black text-white">
                                คุณ <span className="text-pink-400">{winner.name}</span> ได้รับโชคดีสุดแจ่ม! 🎉
                              </p>
                            ))
                          ) : (
                            <p className="text-xs text-slate-500">ไม่มีใครได้รางวัลโชคดีรอบนี้</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Unlucky Worst Side */}
                    <div className="flex flex-col items-center justify-center text-center p-2 space-y-3 pt-6 md:pt-2">
                      <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/30 rounded-full flex items-center justify-center text-amber-400 animate-pulse">
                        <Skull className="w-5 h-5 fill-amber-400" />
                      </div>
                      <div>
                        <h4 className="text-[10px] tracking-widest font-extrabold text-amber-400 uppercase">
                          💀 UNLUCKY GANG (ผู้ประสบภัยดวงซวย)
                        </h4>
                        <div className="mt-2 space-y-1">
                          {unluckyLosers.length > 0 ? (
                            unluckyLosers.map(loser => (
                              <p key={loser.id} className="text-base font-black text-white">
                                คุณ <span className="text-amber-400">{loser.name}</span> ดวงซวยที่สุดแล้วรอบนี้... 💀
                              </p>
                            ))
                          ) : (
                            <p className="text-xs text-slate-500">รอบนี้สงบสุข ไม่มีใครดวงกุด!</p>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                </motion.div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
                
                {/* Edit Config */}
                <button
                  onClick={() => setActiveScreen('setup')}
                  disabled={isSpinning}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-slate-900 border border-white/5 hover:border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 font-semibold text-sm disabled:opacity-50"
                  id="btn-nav-edit"
                >
                  <Settings className="w-4.5 h-4.5" />
                  <span>แก้ไขรายชื่อ / ตัวเลือก (Edit)</span>
                </button>

                {/* Spin Again */}
                <button
                  onClick={handleStartSpin}
                  disabled={isSpinning}
                  className="w-full sm:w-auto px-9 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-display font-extrabold tracking-wide shadow-lg shadow-indigo-950/20 border border-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2.5 text-sm disabled:opacity-50"
                  id="btn-spin-again"
                >
                  <RefreshCw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
                  <span>สุ่มใหม่อีกครั้ง! (SPIN AGAIN)</span>
                </button>

              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Footer bar */}
      <footer className="border-t border-white/5 bg-[#07080D] py-5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-12">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <p>
            © DEV/g0d • All Rights Reserved
          </p>
          <div className="flex items-center gap-3 text-slate-500">
            <span>v5.8 // Weighted Probability Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
