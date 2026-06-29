/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useMemo, useState} from 'react';
import {
  ArrowLeft,
  BookmarkPlus,
  CheckCircle2,
  Crown,
  Edit3,
  Layers,
  Play,
  Plus,
  Save,
  Shuffle,
  Skull,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {motion} from 'motion/react';
import {ChoicePreset, ChoiceTier, OutcomeChoice, Player} from '../types';
import {playWoosh} from '../utils/audio';
import {shuffleArray} from '../utils/random';
import {deletePreset, getPresets, savePreset} from '../lib/presets';

const SAMPLE_PLAYERS = ['สมชาย', 'สมหญิง', 'สมศักดิ์', 'มานะ', 'ชูใจ'];

const CHOICE_PRESETS: {name: string; items: OutcomeChoice[]}[] = [
  {
    name: 'สเกลขนาดตัวละคร',
    items: [
      {id: 'size-1', text: 'x1.0 (ปกติ) 🟢', tier: 'normal', weight: 50},
      {id: 'size-2', text: 'x1.0 (เหลี่ยม) 🕶️', tier: 'unlucky', weight: 15},
      {id: 'size-3', text: 'x1.4 (ยักษ์ใหญ่) 🟡', tier: 'normal', weight: 25},
      {id: 'size-4', text: 'x1.7 (มหาเทพโคตรบอส) 🔥', tier: 'lucky', weight: 10},
    ],
  },
  {
    name: 'เกรดระดับเกลือ (Gacha)',
    items: [
      {id: 'gacha-1', text: '👑 SSR (Legendary)', tier: 'lucky', weight: 5},
      {id: 'gacha-2', text: '⭐ SR (Rare)', tier: 'normal', weight: 20},
      {id: 'gacha-3', text: '💎 R (Common)', tier: 'normal', weight: 50},
      {id: 'gacha-4', text: '💩 เกลือบริสุทธิ์ (Trash)', tier: 'unlucky', weight: 25},
    ],
  },
  {
    name: 'จัดฝั่ง / แบ่งสีทีม',
    items: [
      {id: 'team-1', text: 'ทีมสีแดง 🔴 (โคตรบุก)', tier: 'lucky', weight: 30},
      {id: 'team-2', text: 'ทีมสีน้ำเงิน 🔵 (สมดุล)', tier: 'normal', weight: 50},
      {id: 'team-3', text: 'ทีมสีดำ ⚫ (ดวงซวยมาก)', tier: 'unlucky', weight: 20},
    ],
  },
];

export const DEFAULT_CHOICES = CHOICE_PRESETS[0].items;

interface SetupScreenProps {
  initialPlayersText: string;
  initialChoices: OutcomeChoice[];
  isMuted: boolean;
  canGoBack: boolean;
  onBack: () => void;
  onProceed: (players: Player[], choices: OutcomeChoice[]) => void;
}

export default function SetupScreen({
  initialPlayersText,
  initialChoices,
  isMuted,
  canGoBack,
  onBack,
  onProceed,
}: SetupScreenProps) {
  const [playersInput, setPlayersInput] = useState(
    initialPlayersText || SAMPLE_PLAYERS.join('\n'),
  );
  const [choicesList, setChoicesList] = useState<OutcomeChoice[]>(
    initialChoices.length > 0 ? initialChoices : DEFAULT_CHOICES,
  );

  const [newChoiceText, setNewChoiceText] = useState('');
  const [newChoiceTier, setNewChoiceTier] = useState<ChoiceTier>('normal');
  const [newChoiceWeight, setNewChoiceWeight] = useState(10);

  const [editingChoiceId, setEditingChoiceId] = useState<string | null>(null);
  const [editChoiceText, setEditChoiceText] = useState('');
  const [editChoiceTier, setEditChoiceTier] = useState<ChoiceTier>('normal');
  const [editChoiceWeight, setEditChoiceWeight] = useState(10);

  const [presets, setPresets] = useState<ChoicePreset[]>(() => getPresets());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const totalWeightSum = useMemo(
    () => choicesList.reduce((sum, c) => sum + (c.weight || 0), 0),
    [choicesList],
  );

  const getCalculatedPercent = (
    currentWeight: number,
    isEditingThisItem = false,
    itemIdToReplace: string | null = null,
  ) => {
    let total = 0;
    choicesList.forEach((c) => {
      if (itemIdToReplace && c.id === itemIdToReplace) {
        total += currentWeight;
      } else {
        total += c.weight || 0;
      }
    });
    if (!isEditingThisItem && !itemIdToReplace) total += currentWeight;
    if (total === 0) return 0;
    return (currentWeight / total) * 100;
  };

  const handleAddChoice = () => {
    const trimmed = newChoiceText.trim();
    if (!trimmed) return;
    setChoicesList((prev) => [
      ...prev,
      {
        id: `choice-${Math.random().toString(36).substring(2, 7)}`,
        text: trimmed,
        tier: newChoiceTier,
        weight: newChoiceWeight,
      },
    ]);
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
    setChoicesList((prev) =>
      prev.map((c) =>
        c.id === editingChoiceId
          ? {
              ...c,
              text: trimmed,
              tier: editChoiceTier,
              weight: Number(editChoiceWeight) || 10,
            }
          : c,
      ),
    );
    handleCancelEditChoice();
    if (!isMuted) playWoosh();
  };

  const handleCancelEditChoice = () => {
    setEditingChoiceId(null);
    setEditChoiceText('');
    setEditChoiceTier('normal');
    setEditChoiceWeight(10);
  };

  const handleRemoveChoice = (id: string) => {
    if (editingChoiceId === id) handleCancelEditChoice();
    setChoicesList((prev) => prev.filter((c) => c.id !== id));
  };

  const loadPresetChoices = (items: OutcomeChoice[]) => {
    handleCancelEditChoice();
    setChoicesList(items.map((c) => ({...c})));
    if (!isMuted) playWoosh();
  };

  const handleSaveCurrentPreset = () => {
    if (choicesList.length === 0) {
      setErrorMsg('ยังไม่มีตัวเลือกให้บันทึกเป็น Preset');
      return;
    }
    const name = window.prompt('ตั้งชื่อ Preset นี้:', `Preset ${presets.length + 1}`);
    if (name === null) return;
    setPresets(savePreset(name, choicesList));
    if (!isMuted) playWoosh();
  };

  const handleDeletePreset = (id: string) => {
    setPresets(deletePreset(id));
  };

  const handleProceed = () => {
    setErrorMsg(null);
    const parsedPlayers: Player[] = playersInput
      .split('\n')
      .map((name) => name.trim())
      .filter((name) => name.length > 0)
      .map((name, idx) => ({
        id: `player-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        name,
        resultId: null,
      }));

    if (parsedPlayers.length === 0) {
      setErrorMsg('กรุณาป้อนรายชื่อผู้เล่นอย่างน้อย 1 คน');
      return;
    }
    if (choicesList.length === 0) {
      setErrorMsg('กรุณาเพิ่มตัวเลือกในการสุ่มอย่างน้อย 1 รายการ');
      return;
    }
    localStorage.setItem('spinx_players_raw', playersInput);
    localStorage.setItem('spinx_choices_raw_list', JSON.stringify(choicesList));
    if (!isMuted) playWoosh();
    onProceed(parsedPlayers, choicesList);
  };

  const tierButton = (
    active: boolean,
    onClick: () => void,
    icon: React.ReactNode,
    label: string,
    activeClass: string,
  ) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
        active
          ? activeClass
          : 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-slate-300'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <motion.div
      key="setup-screen"
      initial={{opacity: 0, y: 15}}
      animate={{opacity: 1, y: 0}}
      exit={{opacity: 0, y: -15}}
      transition={{duration: 0.25}}
      className="space-y-6 w-full"
    >
      <div className="flex items-center justify-center gap-2 max-w-xl mx-auto">
        {canGoBack && (
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg bg-slate-900 border border-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="ย้อนกลับ"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <span className="text-[10px] tracking-widest font-extrabold text-indigo-400 bg-indigo-500/15 border border-indigo-500/20 px-3 py-1 rounded-full uppercase">
          ตั้งค่าห้อง (เจ้าของห้อง)
        </span>
      </div>

      {errorMsg && (
        <motion.div
          initial={{opacity: 0, scale: 0.95}}
          animate={{opacity: 1, scale: 1}}
          className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl text-xs flex items-center gap-2.5 max-w-md mx-auto justify-center"
        >
          <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />
          <span className="font-semibold">{errorMsg}</span>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* PLAYERS */}
        <div className="glass rounded-2xl p-5 border border-white/5 flex flex-col justify-between min-h-[380px]">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs uppercase font-extrabold text-slate-200 tracking-wider">
                  รายชื่อผู้เล่น
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setPlayersInput(SAMPLE_PLAYERS.join('\n'));
                    if (!isMuted) playWoosh();
                  }}
                  className="text-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-bold px-2 py-1 rounded border border-indigo-500/20 cursor-pointer flex items-center gap-1 transition-all"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>ตัวอย่าง</span>
                </button>
                <button
                  onClick={() => {
                    setPlayersInput(
                      shuffleArray(playersInput.split('\n')).join('\n'),
                    );
                    if (!isMuted) playWoosh();
                  }}
                  className="text-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-bold px-2 py-1 rounded border border-indigo-500/20 cursor-pointer flex items-center gap-1 transition-all"
                  title="สลับลำดับผู้เล่น (เขย่า)"
                >
                  <Shuffle className="w-3 h-3" />
                  <span>เขย่า</span>
                </button>
                <button
                  onClick={() => setPlayersInput('')}
                  className="text-[10px] bg-slate-900/60 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 font-bold p-1 rounded border border-white/5 cursor-pointer transition-all"
                  title="ล้างรายชื่อทั้งหมด"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-500">
              ใส่ชื่อผู้เล่นที่นี่ (คั่นด้วยการเว้นบรรทัด 1 บรรทัดต่อ 1 คน)
            </p>
          </div>

          <textarea
            value={playersInput}
            onChange={(e) => setPlayersInput(e.target.value)}
            placeholder={'ป้อนรายชื่อผู้เล่น เช่น:\nสมชาย\nสมหญิง\nมานี\nปิติ'}
            className="w-full flex-1 min-h-[220px] text-sm bg-slate-950/50 border border-white/10 rounded-xl px-3.5 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 font-sans resize-none mt-3.5 transition-all"
          />
          <div className="mt-2 text-right">
            <span className="text-[10px] font-mono font-bold text-slate-500">
              ผู้เล่นทั้งหมด:{' '}
              {playersInput.split('\n').filter((n) => n.trim().length > 0).length}{' '}
              คน
            </span>
          </div>
        </div>

        {/* CHOICES */}
        <div className="glass rounded-2xl p-5 border border-white/5 flex flex-col justify-between min-h-[380px]">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs uppercase font-extrabold text-slate-200 tracking-wider">
                  ตัวเลือกผลลัพธ์ที่จะสุ่ม
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleSaveCurrentPreset}
                  className="text-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-bold px-2 py-1 rounded border border-indigo-500/20 cursor-pointer flex items-center gap-1 transition-all"
                  title="บันทึกตัวเลือกชุดนี้เป็น Preset"
                >
                  <BookmarkPlus className="w-3 h-3" />
                  <span>เซฟ Preset</span>
                </button>
                <button
                  onClick={() => {
                    handleCancelEditChoice();
                    setChoicesList([]);
                  }}
                  className="text-[10px] bg-slate-900/60 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 font-bold p-1 rounded border border-white/5 cursor-pointer transition-all"
                  title="ล้างตัวเลือกทั้งหมด"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Itemized add/edit form */}
          <div
            className={`border rounded-xl p-3.5 space-y-3 mt-3 transition-all duration-300 ${
              editingChoiceId
                ? 'bg-indigo-950/20 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                : 'bg-slate-950/40 border-white/5'
            }`}
          >
            {editingChoiceId ? (
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
                <div className="flex items-center gap-2 justify-between">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">
                    ความโชคดี:
                  </span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {tierButton(
                      editChoiceTier === 'lucky',
                      () => setEditChoiceTier('lucky'),
                      <Crown className="w-3 h-3" />,
                      'ดวงดี',
                      'bg-pink-500/20 border-pink-500 text-pink-400 font-extrabold',
                    )}
                    {tierButton(
                      editChoiceTier === 'normal',
                      () => setEditChoiceTier('normal'),
                      <CheckCircle2 className="w-3 h-3" />,
                      'ปกติ',
                      'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-extrabold',
                    )}
                    {tierButton(
                      editChoiceTier === 'unlucky',
                      () => setEditChoiceTier('unlucky'),
                      <Skull className="w-3 h-3" />,
                      'ดวงซวย',
                      'bg-amber-500/20 border-amber-500 text-amber-400 font-extrabold',
                    )}
                  </div>
                </div>
                <div className="space-y-1.5 border-t border-white/5 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">
                      โอกาสการออกสุ่ม:
                    </span>
                    <span className="text-[11px] font-mono font-black text-indigo-400">
                      น้ำหนัก: {editChoiceWeight} (
                      {getCalculatedPercent(
                        editChoiceWeight,
                        true,
                        editingChoiceId,
                      ).toFixed(1)}
                      %)
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
                <div className="flex items-center gap-2 justify-between">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">
                    ความโชคดี:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {tierButton(
                      newChoiceTier === 'lucky',
                      () => setNewChoiceTier('lucky'),
                      <Crown className="w-3 h-3" />,
                      'ดวงดี',
                      'bg-pink-500/20 border-pink-500 text-pink-400',
                    )}
                    {tierButton(
                      newChoiceTier === 'normal',
                      () => setNewChoiceTier('normal'),
                      <CheckCircle2 className="w-3 h-3" />,
                      'ปกติ',
                      'bg-emerald-500/20 border-emerald-500 text-emerald-400',
                    )}
                    {tierButton(
                      newChoiceTier === 'unlucky',
                      () => setNewChoiceTier('unlucky'),
                      <Skull className="w-3 h-3" />,
                      'ดวงซวย',
                      'bg-amber-500/20 border-amber-500 text-amber-400',
                    )}
                  </div>
                </div>
                <div className="space-y-1.5 border-t border-white/5 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">
                      โอกาสการออกสุ่ม:
                    </span>
                    <span className="text-[11px] font-mono font-black text-indigo-400">
                      น้ำหนัก: {newChoiceWeight} (
                      {getCalculatedPercent(newChoiceWeight).toFixed(1)}%)
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

          {/* Preset chips */}
          <div className="mt-3 space-y-1.5">
            <span className="text-[9px] uppercase tracking-widest font-bold text-slate-600">
              Preset สำเร็จรูป
            </span>
            <div className="flex flex-wrap gap-1.5">
              {CHOICE_PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => loadPresetChoices(p.items)}
                  className="text-[10px] bg-slate-900/60 hover:bg-indigo-500/15 text-slate-300 hover:text-indigo-300 font-bold px-2 py-1 rounded border border-white/5 hover:border-indigo-500/30 cursor-pointer transition-all"
                >
                  {p.name}
                </button>
              ))}
            </div>
            {presets.length > 0 && (
              <>
                <span className="text-[9px] uppercase tracking-widest font-bold text-slate-600 flex items-center gap-1 pt-1">
                  <Save className="w-2.5 h-2.5" /> Preset ที่บันทึกไว้
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {presets.map((p) => (
                    <span
                      key={p.id}
                      className="text-[10px] bg-emerald-500/10 text-emerald-300 font-bold pl-2 pr-1 py-1 rounded border border-emerald-500/20 flex items-center gap-1.5"
                    >
                      <button
                        onClick={() => loadPresetChoices(p.items)}
                        className="cursor-pointer hover:underline"
                        title="โหลด Preset นี้"
                      >
                        {p.name}
                      </button>
                      <button
                        onClick={() => handleDeletePreset(p.id)}
                        className="text-emerald-500/60 hover:text-rose-400 cursor-pointer"
                        title="ลบ Preset นี้"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Added choices list */}
          <div className="flex-1 overflow-y-auto max-h-[140px] mt-3 space-y-1.5 pr-1.5 custom-scrollbar">
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
                    <span className="text-slate-200 truncate font-semibold">
                      {choice.text}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded"
                      title="โอกาสการออกสุ่ม (%)"
                    >
                      🎯{' '}
                      {totalWeightSum > 0
                        ? (((choice.weight || 0) / totalWeightSum) * 100).toFixed(1)
                        : '0.0'}
                      %
                    </span>
                    <button
                      onClick={() => startEditingChoice(choice)}
                      className={`p-1 cursor-pointer transition-colors ${
                        editingChoiceId === choice.id
                          ? 'text-indigo-400'
                          : 'text-slate-500 hover:text-indigo-400'
                      }`}
                      title="แก้ไขตัวเลือกนี้"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
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

      <div className="flex justify-center pt-2">
        <button
          onClick={handleProceed}
          className="w-full sm:w-auto px-12 py-4.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-display font-extrabold tracking-wide shadow-xl shadow-indigo-950/20 border border-indigo-400/20 hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 cursor-pointer flex items-center justify-center gap-3 text-base"
        >
          <Play className="w-5 h-5 fill-white text-white animate-pulse" />
          <span>เข้าสู่ห้องสุ่มผลลัพธ์! (START ARENA)</span>
        </button>
      </div>
    </motion.div>
  );
}
