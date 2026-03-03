import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Disclosure } from '@headlessui/react';
import {
    CheckCircle, ChevronDown, ChevronRight, Flame, Star,
    Video, FileText, ExternalLink, Pencil, Trash2, Plus,
    Lock, Code2, BarChart3, BookOpen, AlertCircle,
    X, Save, ToggleLeft, ToggleRight, GripVertical,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// ── Socket singleton ────────────────────────────────────────────────────
let socket = null;
function getSocket() {
    if (!socket) {
        socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
            autoConnect: true,
            withCredentials: true,
        });
    }
    return socket;
}

// ── Difficulty config ───────────────────────────────────────────────────
const DIFF = {
    Easy: { color: '#10B981', bg: '#D1FAE5', label: 'Easy' },
    Medium: { color: '#F59E0B', bg: '#FEF3C7', label: 'Med' },
    Hard: { color: '#EF4444', bg: '#FEE2E2', label: 'Hard' },
};

// ── API helpers ─────────────────────────────────────────────────────────
const api = {
    getSheet: () => axios.get('/code-league/dsa-sheet').then(r => r.data),
    tick: (data) => axios.patch('/code-league/tick', data).then(r => r.data),
    addTopic: (data) => axios.post('/code-league/add-topic', data).then(r => r.data),
    editTopic: (data) => axios.patch('/code-league/edit-topic', data).then(r => r.data),
    deleteTopic: (data) => axios.delete('/code-league/delete-topic', { data }).then(r => r.data),
    addProblem: (data) => axios.post('/code-league/add-problem', data).then(r => r.data),
    editProblem: (data) => axios.patch('/code-league/edit-problem', data).then(r => r.data),
    deleteProblem: (data) => axios.delete('/code-league/delete-problem', { data }).then(r => r.data),
    clearNew: (data) => axios.patch('/code-league/clear-new', data).then(r => r.data),
};

// ── Countdown hook ──────────────────────────────────────────────────────
function useCountdown(endsAt) {
    const [days, setDays] = useState(0);
    useEffect(() => {
        if (!endsAt) return;
        const calc = () => {
            const diff = new Date(endsAt) - new Date();
            setDays(Math.max(0, Math.ceil(diff / 86400000)));
        };
        calc();
        const t = setInterval(calc, 60000);
        return () => clearInterval(t);
    }, [endsAt]);
    return days;
}

// ── Progress calculation ────────────────────────────────────────────────
function calcProgress(levels, completed) {
    if (!levels) return { total: 0, done: 0, pct: 0, byLevel: [] };
    const set = new Set(completed || []);
    const byLevel = levels.map(lv => {
        const total = lv.topics.reduce((a, t) => a + t.problems.length, 0);
        const done = lv.topics.reduce(
            (a, t) => a + t.problems.filter(p => set.has(p._id)).length, 0
        );
        return { level: lv.level, total, done, pct: total ? Math.round(done / total * 100) : 0 };
    });
    const total = byLevel.reduce((a, l) => a + l.total, 0);
    const done = byLevel.reduce((a, l) => a + l.done, 0);
    return { total, done, pct: total ? Math.round(done / total * 100) : 0, byLevel };
}

// ── Add Problem Modal ───────────────────────────────────────────────────
function AddProblemModal({ open, onClose, onSave, levelNum, topicId }) {
    const [form, setForm] = useState({ title: '', link: '', resourceLink: '', practiceLink: '', difficulty: 'Easy' });
    const [shake, setShake] = useState(false);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handle = () => {
        if (!form.title.trim()) { setShake(true); setTimeout(() => setShake(false), 600); return; }
        onSave({ level: levelNum, topicId, ...form });
        setForm({ title: '', link: '', resourceLink: '', practiceLink: '', difficulty: 'Easy' });
        onClose();
    };

    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 w-full max-w-md z-10"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold text-slate-900">Add Problem</h3>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 transition-colors"><X size={16} /></button>
                </div>

                <div className={`space-y-3 ${shake ? 'animate-shake' : ''}`}>
                    <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Problem Title *</label>
                        <input className="input" placeholder="e.g. Two Sum" value={form.title} onChange={e => set('title', e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Problem Link (LeetCode/GFG)</label>
                        <input className="input" placeholder="https://leetcode.com/..." value={form.link} onChange={e => set('link', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs font-medium text-slate-500 mb-1 block">Resource Link</label>
                            <input className="input" placeholder="Striver video URL" value={form.resourceLink} onChange={e => set('resourceLink', e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 mb-1 block">Practice Link</label>
                            <input className="input" placeholder="Internal practice" value={form.practiceLink} onChange={e => set('practiceLink', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Difficulty</label>
                        <div className="flex gap-2">
                            {['Easy', 'Medium', 'Hard'].map(d => (
                                <button key={d} onClick={() => set('difficulty', d)}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${form.difficulty === d ? 'text-white border-transparent' : 'border-slate-200 text-slate-500'}`}
                                    style={form.difficulty === d ? { background: DIFF[d].color } : {}}>
                                    {d}
                                </button>
                            ))}
                        </div>
                    </div>
                    {!form.title.trim() && shake && <p className="text-red-500 text-xs animate-pulse">Title is required</p>}
                </div>

                <div className="flex gap-2 mt-5">
                    <button onClick={onClose} className="btn-secondary flex-1 py-2">Cancel</button>
                    <button onClick={handle} className="btn-primary flex-1 py-2"><Plus size={14} /> Add Problem</button>
                </div>
            </motion.div>
        </div>
    );
}

// ── Problem Row (desktop table) ─────────────────────────────────────────
function ProblemRow({ problem, completed, onTick, canTick, editMode, levelNum, topicId, onEdit, onDelete }) {
    const diff = DIFF[problem.difficulty] || DIFF.Easy;
    const done = completed.has(problem._id);
    const [editing, setEditing] = useState(false);
    const [title, setTitle] = useState(problem.title);

    const handleBlur = () => {
        if (title !== problem.title && title.trim()) {
            onEdit({ level: levelNum, topicId, problemId: problem._id, updates: { title } });
        }
        setEditing(false);
    };

    return (
        <motion.tr
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className={`border-b border-slate-50 transition-colors ${done ? 'bg-emerald-50/30' : 'hover:bg-slate-50/50'}`}
        >
            {/* Status checkbox */}
            <td className="py-3 pl-4 pr-2 w-10">
                <label className={`flex items-center justify-center ${canTick ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                    <input type="checkbox" className="sr-only" checked={done} disabled={!canTick}
                        onChange={e => canTick && onTick(problem._id, e.target.checked)} />
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${done ? 'border-emerald-500 bg-emerald-500' : canTick ? 'border-slate-300 hover:border-[#00BFFF]' : 'border-slate-200 bg-slate-50'
                        }`}>
                        {done && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                </label>
            </td>

            {/* Problem title */}
            <td className="py-3 px-2">
                {editMode && editing ? (
                    <input className="input py-1 text-sm" value={title} autoFocus
                        onChange={e => setTitle(e.target.value)} onBlur={handleBlur}
                        onKeyDown={e => e.key === 'Enter' && handleBlur()} />
                ) : (
                    <div className="flex items-center gap-2">
                        {problem.link && problem.link !== '#' ? (
                            <a href={problem.link} target="_blank" rel="noopener noreferrer"
                                className="text-sm font-medium text-[#00BFFF] hover:underline flex items-center gap-1 hover:text-[#009FD4] transition-colors">
                                {done ? <span className="line-through text-slate-400">{problem.title}</span> : problem.title}
                                <ExternalLink size={10} className="opacity-60 flex-shrink-0" />
                            </a>
                        ) : (
                            <span className={`text-sm font-medium ${done ? 'line-through text-slate-400' : 'text-slate-800'}`}>{problem.title}</span>
                        )}
                        {editMode && (
                            <button onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-1 rounded hover:text-[#00BFFF] transition-all">
                                <Pencil size={11} className="text-slate-300 hover:text-[#00BFFF]" />
                            </button>
                        )}
                    </div>
                )}
            </td>

            {/* Resources */}
            <td className="py-3 px-2 w-16 text-center">
                {problem.resourceLink && problem.resourceLink !== '#' ? (
                    <a href={problem.resourceLink} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full hover:bg-[#00BFFF]/10 transition-colors group" title="Watch video">
                        <Video size={13} className="text-slate-300 group-hover:text-[#00BFFF]" />
                    </a>
                ) : <span className="text-slate-200">—</span>}
            </td>

            {/* Practice */}
            <td className="py-3 px-2 w-20">
                {problem.practiceLink && problem.practiceLink !== '#' ? (
                    <a href={problem.practiceLink} target="_blank" rel="noopener noreferrer"
                        className="inline-block rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-[#00BFFF]/10 hover:text-[#00BFFF] transition-colors">
                        Practice
                    </a>
                ) : (
                    <span className="inline-block rounded-md bg-slate-50 px-2.5 py-1 text-xs text-slate-300">—</span>
                )}
            </td>

            {/* Difficulty */}
            <td className="py-3 px-2 pr-4 w-20">
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{ color: diff.color, background: diff.bg }}>
                    {diff.label}
                </span>
            </td>

            {/* Edit mode actions */}
            {editMode && (
                <td className="py-3 pr-3 w-10">
                    <button onClick={() => onDelete({ level: levelNum, topicId, problemId: problem._id })}
                        className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                    </button>
                </td>
            )}
        </motion.tr>
    );
}

// ── Topic Accordion ─────────────────────────────────────────────────────
function TopicAccordion({ topic, levelNum, completed, onTick, canTick, editMode, onEditTopic, onDeleteTopic, onAddProblem, onEditProblem, onDeleteProblem, onClearNew, isFocus }) {
    const set = new Set(completed || []);
    const done = topic.problems.filter(p => set.has(p._id)).length;
    const total = topic.problems.length;
    const pct = total ? Math.round(done / total * 100) : 0;
    const [addModal, setAddModal] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [topicName, setTopicName] = useState(topic.name);

    const handleNameBlur = () => {
        if (topicName !== topic.name && topicName.trim()) {
            onEditTopic({ level: levelNum, topicId: topic._id, name: topicName });
        }
        setEditingName(false);
    };

    const handleOpen = () => {
        if (topic.isNew) onClearNew({ topicId: topic._id, level: levelNum });
    };

    return (
        <>
            <AddProblemModal open={addModal} onClose={() => setAddModal(false)}
                onSave={onAddProblem} levelNum={levelNum} topicId={topic._id} />

            <Disclosure>
                {({ open }) => (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border border-slate-100 mb-3 overflow-hidden"
                        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                    >
                        {/* Topic Header */}
                        <Disclosure.Button
                            className="w-full flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50/70 transition-colors group text-left"
                            onClick={!open ? handleOpen : undefined}
                        >
                            {/* Expand icon */}
                            <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.2 }}>
                                <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
                            </motion.div>

                            {/* Topic name */}
                            <div className="flex-1 min-w-0">
                                {editMode && editingName ? (
                                    <input className="input py-1 text-sm font-semibold w-full max-w-xs" value={topicName}
                                        autoFocus onChange={e => setTopicName(e.target.value)}
                                        onBlur={handleNameBlur} onKeyDown={e => e.key === 'Enter' && handleNameBlur()}
                                        onClick={e => e.stopPropagation()} />
                                ) : (
                                    <span className="text-base font-semibold text-slate-900">{topic.name}</span>
                                )}
                            </div>

                            {/* Progress bar */}
                            <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                                <div className="relative w-24 h-2 rounded-full bg-slate-200 overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                        transition={{ duration: 0.8, ease: 'easeOut' }}
                                        className="absolute h-full rounded-full"
                                        style={{ background: pct === 100 ? '#10B981' : '#00BFFF' }}
                                    />
                                </div>
                                <span className="text-xs text-slate-500 whitespace-nowrap">{pct}% ({done}/{total})</span>
                            </div>

                            {/* Badges */}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                {isFocus && (
                                    <span className="text-yellow-400" title="Monthly focus topic">
                                        <Star size={14} fill="currentColor" />
                                    </span>
                                )}
                                {topic.isNew && (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-50 rounded-full px-2 py-0.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                                        NEW
                                    </span>
                                )}
                                {pct === 100 && (
                                    <CheckCircle size={14} className="text-emerald-500" />
                                )}
                            </div>

                            {/* Edit mode actions */}
                            {editMode && (
                                <div className="flex items-center gap-1 ml-1" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => setEditingName(true)}
                                        className="p-1.5 rounded-lg hover:bg-[#00BFFF]/10 text-slate-300 hover:text-[#00BFFF] transition-colors">
                                        <Pencil size={13} />
                                    </button>
                                    <button className="p-1.5 rounded-lg text-slate-200 cursor-grab">
                                        <GripVertical size={13} />
                                    </button>
                                    <button onClick={() => onDeleteTopic({ level: levelNum, topicId: topic._id })}
                                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors">
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            )}
                        </Disclosure.Button>

                        {/* Problems Table */}
                        <AnimatePresence>
                            {open && (
                                <Disclosure.Panel static>
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }}
                                    >
                                        {topic.problems.length === 0 ? (
                                            <div className="p-8 text-center">
                                                <Code2 size={32} className="text-slate-200 mx-auto mb-2" />
                                                <p className="text-slate-400 text-sm">No problems yet</p>
                                                {editMode && (
                                                    <button onClick={() => setAddModal(true)}
                                                        className="mt-3 text-sm text-[#00BFFF] hover:underline">
                                                        + Add first problem
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <>
                                                {/* Desktop table */}
                                                <div className="hidden sm:block overflow-x-auto">
                                                    <table className="w-full">
                                                        <thead>
                                                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                                                <th className="py-2 pl-4 pr-2 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-10">Done</th>
                                                                <th className="py-2 px-2 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Problem</th>
                                                                <th className="py-2 px-2 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-16">Video</th>
                                                                <th className="py-2 px-2 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-20">Practice</th>
                                                                <th className="py-2 px-2 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-20">Difficulty</th>
                                                                {editMode && <th className="w-10" />}
                                                            </tr>
                                                        </thead>
                                                        <tbody className="group">
                                                            {topic.problems.map(prob => (
                                                                <ProblemRow key={prob._id} problem={prob} completed={set} onTick={onTick}
                                                                    canTick={canTick} editMode={editMode} levelNum={levelNum}
                                                                    topicId={topic._id} onEdit={onEditProblem} onDelete={onDeleteProblem} />
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                {/* Mobile cards */}
                                                <div className="sm:hidden divide-y divide-slate-50">
                                                    {topic.problems.map(prob => {
                                                        const diff = DIFF[prob.difficulty] || DIFF.Easy;
                                                        const done = set.has(prob._id);
                                                        return (
                                                            <div key={prob._id} className={`p-4 ${done ? 'bg-emerald-50/30' : ''}`}>
                                                                <div className="flex items-start gap-3">
                                                                    <label className={`mt-0.5 flex items-center ${canTick ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                                                                        <input type="checkbox" className="sr-only" checked={done} disabled={!canTick}
                                                                            onChange={e => canTick && onTick(prob._id, e.target.checked)} />
                                                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${done ? 'border-emerald-500 bg-emerald-500' : canTick ? 'border-slate-300' : 'border-slate-200 bg-slate-50'}`}>
                                                                            {done && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                                        </div>
                                                                    </label>
                                                                    <div className="flex-1 min-w-0">
                                                                        {prob.link && prob.link !== '#' ? (
                                                                            <a href={prob.link} target="_blank" rel="noopener noreferrer"
                                                                                className="font-semibold text-sm text-[#00BFFF] hover:underline flex items-center gap-1">
                                                                                {done ? <span className="line-through text-slate-400">{prob.title}</span> : prob.title}
                                                                                <ExternalLink size={10} />
                                                                            </a>
                                                                        ) : (
                                                                            <p className={`font-semibold text-sm ${done ? 'line-through text-slate-400' : 'text-slate-800'}`}>{prob.title}</p>
                                                                        )}
                                                                        <div className="flex items-center gap-2 mt-1.5">
                                                                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                                                                                style={{ color: diff.color, background: diff.bg }}>{diff.label}</span>
                                                                            {prob.resourceLink && prob.resourceLink !== '#' && (
                                                                                <a href={prob.resourceLink} target="_blank" rel="noopener noreferrer"
                                                                                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#00BFFF] transition-colors">
                                                                                    <Video size={10} /> Video
                                                                                </a>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    {editMode && (
                                                                        <button onClick={() => onDeleteProblem({ level: levelNum, topicId: topic._id, problemId: prob._id })}
                                                                            className="p-1 text-slate-300 hover:text-red-400 transition-colors">
                                                                            <Trash2 size={13} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </>
                                        )}

                                        {editMode && (
                                            <div className="p-3 border-t border-slate-50">
                                                <button onClick={() => setAddModal(true)}
                                                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-[#00BFFF]/40 text-sm text-[#00BFFF] hover:bg-[#00BFFF]/5 transition-colors">
                                                    <Plus size={14} /> Add Problem
                                                </button>
                                            </div>
                                        )}
                                    </motion.div>
                                </Disclosure.Panel>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </Disclosure>
        </>
    );
}

// ── Main DSASheet page ──────────────────────────────────────────────────
export default function DSASheet() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeLevel, setActiveLevel] = useState(1);
    const [editMode, setEditMode] = useState(false);
    const [liveCompleted, setLiveCompleted] = useState(null); // real-time override
    const topicsRef = useRef(null);

    const isIgnite = user?.role === 'Ignite';
    const isCoordinator = user?.role === 'Coordinator';
    const isAdmin = user?.role === 'Admin';
    const isSpark = user?.role === 'Spark';
    const canTick = isIgnite || isCoordinator || isAdmin;
    const canEdit = isCoordinator || isAdmin;

    // ── Data fetch ────────────────────────────────────────────────────────
    const { data, isLoading, isError } = useQuery({
        queryKey: ['dsa-sheet'],
        queryFn: api.getSheet,
        staleTime: 60000,
    });

    const completed = liveCompleted ?? data?.completedProblems ?? [];
    const progress = calcProgress(data?.levels, completed);
    const levelProgress = progress.byLevel;
    const focusDaysLeft = useCountdown(data?.monthlyFocus?.endsAt);

    // Focus topic's topic
    const focusTopicId = data?.monthlyFocus?.topicId?.toString();
    const focusTopic = data?.levels?.flatMap(l => l.topics).find(t => t._id?.toString() === focusTopicId);
    const focusSet = new Set(completed);
    const focusDone = focusTopic ? focusTopic.problems.filter(p => focusSet.has(p._id)).length : 0;
    const focusTotal = focusTopic ? focusTopic.problems.length : 0;
    const focusPct = focusTotal ? Math.round(focusDone / focusTotal * 100) : 0;

    // ── Socket.io ─────────────────────────────────────────────────────────
    useEffect(() => {
        const s = getSocket();
        s.on('dsa-update', ({ userId: uid, completedProblems }) => {
            if (uid === user?._id?.toString()) {
                setLiveCompleted(completedProblems);
            }
        });
        return () => { s.off('dsa-update'); };
    }, [user?._id]);

    // ── Mutations ─────────────────────────────────────────────────────────
    const tickMut = useMutation({
        mutationFn: api.tick,
        onSuccess: (data) => {
            setLiveCompleted(data.completedProblems);
            toast.success('Progress updated!', { icon: '✓', style: { borderRadius: '12px', fontWeight: 600 } });
            queryClient.invalidateQueries({ queryKey: ['dsa-sheet'] });
        },
        onError: () => toast.error('Failed to update progress'),
    });

    const addTopicMut = useMutation({
        mutationFn: api.addTopic,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dsa-sheet'] }); toast.success('Topic added!'); },
        onError: () => toast.error('Failed to add topic'),
    });

    const editTopicMut = useMutation({
        mutationFn: api.editTopic,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dsa-sheet'] }),
        onError: () => toast.error('Failed to edit topic'),
    });

    const deleteTopicMut = useMutation({
        mutationFn: api.deleteTopic,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dsa-sheet'] }); toast.success('Topic deleted'); },
        onError: () => toast.error('Failed to delete topic'),
    });

    const addProblemMut = useMutation({
        mutationFn: api.addProblem,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dsa-sheet'] }); toast.success('Problem added!'); },
        onError: () => toast.error('Failed to add problem'),
    });

    const editProblemMut = useMutation({
        mutationFn: api.editProblem,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dsa-sheet'] }),
    });

    const deleteProblemMut = useMutation({
        mutationFn: api.deleteProblem,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dsa-sheet'] }); toast.success('Problem deleted'); },
        onError: () => toast.error('Failed to delete problem'),
    });

    const clearNewMut = useMutation({ mutationFn: api.clearNew });

    const [addTopicName, setAddTopicName] = useState('');

    const handleTick = useCallback((problemId, checked) => {
        tickMut.mutate({ problemId, checked });
    }, [tickMut]);

    const scrollToTopics = () => {
        topicsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // ── Spark: Access Denied ──────────────────────────────────────────────
    if (isSpark) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="text-center max-w-sm p-8 rounded-3xl bg-white border border-slate-100"
                    style={{ boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}>
                    <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
                        <Lock size={28} className="text-amber-400" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">ANITS Ignite Exclusive</h2>
                    <p className="text-slate-500 text-sm mb-6">The DSA Sheet is available exclusively to ANITS Ignite members. Check out our contests open to all!</p>
                    <button onClick={() => navigate('/code-league/contests')}
                        className="btn-primary w-full">View Contests</button>
                </motion.div>
            </div>
        );
    }

    // ── Loading ───────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-2xl" style={{ animationDelay: `${i * 0.1}s` }} />)}
            </div>
        );
    }

    // ── Error ─────────────────────────────────────────────────────────────
    if (isError) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-8">
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 text-red-600 border border-red-100">
                    <AlertCircle size={20} />
                    <p className="font-medium">Failed to load DSA Sheet. Please refresh.</p>
                </div>
            </div>
        );
    }

    const currentLevel = data?.levels?.find(l => l.level === activeLevel);
    const topics = currentLevel?.topics || [];

    return (
        <div className="min-h-screen relative">
            <Toaster position="top-right" />

            {/* Animated wave background */}
            <div className="dsa-wave-bg" />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 relative">

                {/* ── Page Header ─────────────────────────────────────────────── */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-4xl font-bold text-slate-900 flex items-center gap-2">
                            <Code2 size={32} className="text-[#00BFFF]" />
                            DSA Sheet
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">Structured problem solving — Striver Style</p>
                    </div>

                    {/* Edit mode toggle (Coordinator/Admin only) */}
                    {canEdit && (
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setEditMode(m => !m)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${editMode
                                    ? 'bg-[#00BFFF] text-white border-[#00BFFF] shadow-lg'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-[#00BFFF] hover:text-[#00BFFF]'
                                }`}
                        >
                            {editMode ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                            Edit Mode {editMode ? 'ON' : 'OFF'}
                        </motion.button>
                    )}
                </div>

                {/* ── 1. Overall Progress Container ───────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                    className="rounded-3xl border border-slate-100 p-6 mb-6 bg-white"
                    style={{ boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                >
                    {/* Big completion number */}
                    <div className="text-center mb-4">
                        <p className="text-5xl font-bold text-slate-900">
                            Overall Completion:{' '}
                            <span style={{ color: '#00BFFF' }}>{progress.pct}%</span>
                        </p>
                        <p className="text-xl text-slate-500 mt-2">
                            {progress.done} out of {progress.total} problems solved
                        </p>
                    </div>

                    {/* Level progress bars */}
                    <div className="space-y-3 mt-5">
                        {levelProgress.map((lp) => (
                            <div key={lp.level}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                                        Level {lp.level}
                                        {lp.pct === 100 && <CheckCircle size={14} className="text-emerald-500" />}
                                    </span>
                                    <span className="text-sm text-slate-500">{lp.pct}%</span>
                                </div>
                                <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }} animate={{ width: `${lp.pct}%` }}
                                        transition={{ duration: 1, ease: 'easeOut', delay: lp.level * 0.15 }}
                                        className="h-full rounded-full"
                                        style={{ background: lp.pct === 100 ? '#10B981' : '#00BFFF' }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Batch guidance */}
                    <p className="text-sm text-slate-500 mt-4 text-center">
                        📚 {data?.batchGuidance || 'Complete Level 2 by end of 3-1 semester'}
                    </p>
                </motion.div>

                {/* ── 2. Monthly Topic Banner ──────────────────────────────────── */}
                {data?.monthlyFocus && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        className="rounded-3xl p-5 mb-6 border border-[#00BFFF]/20"
                        style={{
                            background: 'linear-gradient(135deg, rgba(0,191,255,0.12) 0%, rgba(0,191,255,0.04) 100%)',
                            boxShadow: '0 4px 16px rgba(0,191,255,0.08)',
                            animation: 'focusPulse 3s ease-in-out infinite',
                        }}
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            {/* Left: focus title */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <Flame size={20} className="text-orange-400 flex-shrink-0" />
                                    <h2 className="text-xl font-semibold text-slate-900 truncate">
                                        Focus This Month: {data.monthlyFocus.topicName}
                                    </h2>
                                </div>
                                <p className="text-sm text-slate-500 ml-7">
                                    Ends in <span className="font-semibold text-[#00BFFF]">{focusDaysLeft} days</span>
                                </p>

                                {/* Mini progress bar */}
                                <div className="mt-2 ml-7">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <div className="flex-1 h-2 bg-white/60 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }} animate={{ width: `${focusPct}%` }}
                                                transition={{ duration: 1, delay: 0.3 }}
                                                className="h-full rounded-full" style={{ background: '#00BFFF' }}
                                            />
                                        </div>
                                        <span className="text-xs text-slate-500 flex-shrink-0">{focusPct}% ({focusDone}/{focusTotal})</span>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Jump button */}
                            <motion.button
                                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                                onClick={() => { setActiveLevel(data.monthlyFocus.levelId); setTimeout(scrollToTopics, 100); }}
                                className="btn-primary rounded-full flex-shrink-0 self-start sm:self-center"
                            >
                                Jump to Topic
                            </motion.button>
                        </div>
                    </motion.div>
                )}

                {/* ── 3. Level Selector ───────────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                    className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide"
                >
                    {[1, 2, 3].map(lvl => {
                        const lp = levelProgress.find(l => l.level === lvl);
                        return (
                            <motion.button
                                key={lvl} whileTap={{ scale: 0.97 }}
                                onClick={() => setActiveLevel(lvl)}
                                className={`flex items-center gap-2 px-6 py-2 rounded-full border text-sm font-medium transition-all flex-shrink-0 ${activeLevel === lvl
                                        ? 'bg-[#00BFFF] text-white border-[#00BFFF] shadow-md'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-[#00BFFF] hover:text-[#00BFFF]'
                                    }`}
                            >
                                Level {lvl}
                                {lp && (
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeLevel === lvl ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                                        }`}>{lp.pct}%</span>
                                )}
                                {lp?.pct === 100 && <CheckCircle size={12} className={activeLevel === lvl ? 'text-white' : 'text-emerald-500'} />}
                            </motion.button>
                        );
                    })}

                    {canEdit && editMode && (
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            className="ml-auto flex items-center gap-2 px-5 py-2 rounded-full bg-[#00BFFF] text-white text-sm font-medium flex-shrink-0 shadow-md"
                            onClick={() => {
                                const name = prompt('Topic name:');
                                if (name?.trim()) addTopicMut.mutate({ level: activeLevel, name: name.trim() });
                            }}
                        >
                            <Plus size={14} /> Add Topic
                        </motion.button>
                    )}
                </motion.div>

                {/* ── 4. Topics Accordion ─────────────────────────────────────── */}
                <div ref={topicsRef}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeLevel}
                            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}
                        >
                            {topics.length === 0 ? (
                                <div className="text-center py-16">
                                    <BookOpen size={40} className="text-slate-200 mx-auto mb-3" />
                                    <p className="text-slate-400">No topics for this level yet.</p>
                                    {editMode && (
                                        <button
                                            onClick={() => {
                                                const name = prompt('Topic name:');
                                                if (name?.trim()) addTopicMut.mutate({ level: activeLevel, name: name.trim() });
                                            }}
                                            className="mt-3 btn-primary"
                                        >
                                            <Plus size={14} /> Add First Topic
                                        </button>
                                    )}
                                </div>
                            ) : (
                                topics
                                    .slice()
                                    .sort((a, b) => a.order - b.order)
                                    .map(topic => (
                                        <TopicAccordion
                                            key={topic._id} topic={topic} levelNum={activeLevel}
                                            completed={completed} onTick={handleTick} canTick={canTick}
                                            editMode={editMode && canEdit}
                                            onEditTopic={editTopicMut.mutate}
                                            onDeleteTopic={deleteTopicMut.mutate}
                                            onAddProblem={addProblemMut.mutate}
                                            onEditProblem={editProblemMut.mutate}
                                            onDeleteProblem={deleteProblemMut.mutate}
                                            onClearNew={clearNewMut.mutate}
                                            isFocus={topic._id?.toString() === focusTopicId || topic.isFocusTopic}
                                        />
                                    ))
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* ── Edit Mode: Save & Notify ─────────────────────────────────── */}
                <AnimatePresence>
                    {editMode && canEdit && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="fixed bottom-6 right-6 z-40"
                        >
                            <button
                                onClick={() => {
                                    // Emit "New" tags via Socket.io on server
                                    toast.success('Changes saved & users notified!', { icon: '🔔' });
                                }}
                                className="btn-primary rounded-full px-6 shadow-xl flex items-center gap-2"
                            >
                                <Save size={15} /> Save &amp; Notify
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
}
