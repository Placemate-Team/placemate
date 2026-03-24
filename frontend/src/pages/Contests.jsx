import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy, ChevronUp, Check, AlertTriangle, Pencil, Trash2,
    Upload, Bell, X, Circle, ExternalLink, BarChart3,
    Calendar, Users, Clock, Zap,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend,
} from 'chart.js';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

// ── Socket singleton ────────────────────────────────────────────────────────
let socket = null;
function getSocket() {
    if (!socket) {
        socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
            autoConnect: true, withCredentials: true,
        });
    }
    return socket;
}

// ── API helpers ──────────────────────────────────────────────────────────────
const api = {
    getContests: (tab) => axios.get(`/contests?tab=${tab}`).then(r => r.data),
    getEligibility: (contestId) => axios.get(`/user/eligibility?contestId=${contestId}`).then(r => r.data),
    register: (data) => axios.post('/contests/register', data).then(r => r.data),
    uploadCSV: (data) => axios.post('/contests/upload-scores', data, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
    saveScores: (data) => axios.post('/contests/save-scores', data).then(r => r.data),
    notify: (data) => axios.post('/contests/notify', data).then(r => r.data),
    getLeaderboard: (id) => axios.get(`/contests/leaderboard/${id}`).then(r => r.data),
    getAnalytics: () => axios.get('/admin/contest-analytics').then(r => r.data),
    deleteContest: (id) => axios.delete(`/contests/${id}`).then(r => r.data),
    editContest: (data) => axios.patch(`/contests/${data._id}`, data).then(r => r.data),
};

// ── Countdown hook ───────────────────────────────────────────────────────────
function useCountdown(targetDate, prefix = 'Starts') {
    const [label, setLabel] = useState('');
    useEffect(() => {
        if (!targetDate) return;
        const calc = () => {
            const diff = new Date(targetDate) - new Date();
            if (diff <= 0) { setLabel(''); return; }
            const d = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            if (d > 0) setLabel(`${prefix} in ${d}d ${h}h`);
            else if (h > 0) setLabel(`${prefix} in ${h}h ${m}m`);
            else setLabel(`${prefix} in ${m}m`);
        };
        calc();
        const t = setInterval(calc, 30000);
        return () => clearInterval(t);
    }, [targetDate, prefix]);
    return label;
}

// ── Countdown Cell ───────────────────────────────────────────────────────────
function CountdownBadge({ contest }) {
    const startLabel = useCountdown(contest.startDate, 'Starts');
    const endLabel = useCountdown(contest.endDate, 'Ends');
    const label = contest.status === 'ongoing' ? endLabel : startLabel;
    if (!label) return null;
    return (
        <span className="text-sm font-semibold" style={{ color: '#00BFFF' }}>
            ⏱ {label}
        </span>
    );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function TypeBadge({ type }) {
    return type === 'monthly' ? (
        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: 'rgba(0,191,255,0.15)', color: '#00BFFF' }}>
            Monthly
        </span>
    ) : (
        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-purple-100 text-purple-700">
            Major
        </span>
    );
}

// ── Loading Skeleton ─────────────────────────────────────────────────────────
function ContestSkeleton() {
    return (
        <div className="rounded-3xl border border-slate-100 mb-4 p-6 bg-white animate-pulse"
            style={{ boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}>
            <div className="flex items-start gap-3 mb-4">
                <div className="h-6 w-16 bg-slate-200 rounded-full" />
                <div className="flex-1">
                    <div className="h-5 bg-slate-200 rounded-lg w-3/4 mb-2" />
                    <div className="h-4 bg-slate-100 rounded-lg w-1/2" />
                </div>
            </div>
            <div className="h-10 bg-slate-100 rounded-full w-32 mt-4" />
        </div>
    );
}

// ── Registration Form ────────────────────────────────────────────────────────
function RegistrationForm({ contest, user, onSuccess }) {
    const [agreed, setAgreed] = useState(false);
    const [hrUsername, setHrUsername] = useState(user?.nickname || '');

    const regMut = useMutation({
        mutationFn: api.register,
        onSuccess: () => {
            toast.success('🎉 Registered! Good luck!', {
                style: { borderRadius: '16px', fontWeight: 600 },
            });
            onSuccess?.();
        },
        onError: (e) => toast.error(e?.response?.data?.message || 'Registration failed'),
    });

    const handleSubmit = (e) => {
        e?.preventDefault();
        if (!agreed) return toast.error('Please agree to the rules first');
        if (!hrUsername.trim()) return toast.error('HackerRank username is required');
        regMut.mutate({ contestId: contest._id, hackerRankUsername: hrUsername.trim() });
    };

    return (
        <form onSubmit={handleSubmit} className="rounded-2xl p-5 bg-slate-50 mt-4 border border-slate-100">
            <p className="text-sm font-semibold text-slate-800 mb-3">Complete Registration</p>
            <div className="mb-3">
                <label className="text-xs font-medium text-slate-500 mb-1 block">HackerRank Username *</label>
                <input
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-white"
                    style={{ '--tw-ring-color': '#00BFFF' }}
                    placeholder="your_hackerrank_id"
                    value={hrUsername}
                    onChange={e => setHrUsername(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    required
                />
            </div>
            <label className="flex items-center gap-3 cursor-pointer group mb-4">
                <div
                    onClick={() => setAgreed(a => !a)}
                    className="w-5 h-5 rounded-md border-2 border-slate-300 flex items-center justify-center flex-shrink-0 transition-all duration-200 cursor-pointer"
                    style={agreed ? { background: '#00BFFF', borderColor: '#00BFFF' } : {}}
                >
                    {agreed && <Check size={12} className="text-white" strokeWidth={3} />}
                </div>
                <span className="text-sm text-slate-600">I have read and agree to all contest rules.</span>
            </label>
            <motion.button
                type="submit"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                disabled={regMut.isPending}
                className="px-6 py-2.5 rounded-full text-white text-sm font-semibold transition-all disabled:opacity-50"
                style={{ background: '#00BFFF' }}
            >
                {regMut.isPending ? 'Registering…' : 'Register'}
            </motion.button>
        </form>
    );
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
function Leaderboard({ contestId }) {
    const { data, isLoading } = useQuery({
        queryKey: ['leaderboard', contestId],
        queryFn: () => api.getLeaderboard(contestId),
    });

    const medals = ['🥇', '🥈', '🥉'];

    if (isLoading) return (
        <div className="mt-4 space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
    );

    const scores = data?.scores || [];
    if (!scores.length) return (
        <p className="text-slate-500 text-sm mt-4 text-center">No scores uploaded yet. Check back later!</p>
    );

    return (
        <div className="mt-4">
            <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Trophy size={14} style={{ color: '#00BFFF' }} /> Leaderboard
            </p>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 text-slate-400 text-xs uppercase tracking-wide">
                            <th className="py-3 px-4 text-left w-16">Rank</th>
                            <th className="py-3 px-4 text-left">Participant</th>
                            <th className="py-3 px-4 text-right">Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        {scores.map(s => (
                            <tr key={s._id} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                                <td className="py-3 px-4 font-bold text-slate-700">
                                    {medals[s.rank - 1] || `#${s.rank}`}
                                </td>
                                <td className="py-3 px-4 font-medium text-slate-800">
                                    {s.userId?.name || s.nickname}
                                    <span className="text-xs text-slate-400 ml-2">({s.hackerRankUsername})</span>
                                </td>
                                <td className="py-3 px-4 text-right font-bold" style={{ color: '#00BFFF' }}>
                                    {s.score}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* Mobile cards */}
            <div className="sm:hidden space-y-2">
                {scores.map(s => (
                    <div key={s._id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-3">
                            <span className="text-lg">{medals[s.rank - 1] || `#${s.rank}`}</span>
                            <div>
                                <p className="font-semibold text-sm text-slate-800">{s.userId?.name || s.nickname}</p>
                                <p className="text-xs text-slate-400">{s.hackerRankUsername}</p>
                            </div>
                        </div>
                        <span className="font-bold text-base" style={{ color: '#00BFFF' }}>{s.score}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Upload Scores Modal ───────────────────────────────────────────────────────
function UploadScoresModal({ contest, onClose }) {
    const [parsed, setParsed] = useState(null);
    const [uploading, setUploading] = useState(false);
    const queryClient = useQueryClient();

    const saveMut = useMutation({
        mutationFn: api.saveScores,
        onSuccess: () => {
            toast.success('Scores saved successfully!');
            queryClient.invalidateQueries({ queryKey: ['leaderboard', contest._id] });
            onClose();
        },
        onError: () => toast.error('Failed to save scores'),
    });

    const onDrop = useCallback(async (acceptedFiles) => {
        const file = acceptedFiles[0];
        if (!file) return;
        setUploading(true);
        try {
            const form = new FormData();
            form.append('csv', file);
            form.append('contestId', contest._id);
            const data = await api.uploadCSV(form);
            setParsed(data.parsed);
            toast.success(`Parsed ${data.totalRows} rows`);
        } catch {
            toast.error('CSV parse failed');
        } finally {
            setUploading(false);
        }
    }, [contest._id]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop, accept: { 'text/csv': ['.csv'] }, multiple: false,
    });

    const handleUserChange = (idx, userId) => {
        setParsed(prev => prev.map((r, i) => i === idx
            ? { ...r, userId, matchStatus: userId ? 'manual' : 'unmatched' }
            : r
        ));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 overflow-y-auto">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: -20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 w-full max-w-2xl z-10 mb-16"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Upload size={18} style={{ color: '#00BFFF' }} /> Upload Scores
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
                        <X size={16} />
                    </button>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                    CSV format: <code className="bg-slate-100 px-1.5 py-0.5 rounded">rank, username, score, name</code>
                </p>

                <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all mb-4 ${isDragActive ? 'border-[#00BFFF] bg-[#00BFFF]/5' : 'border-slate-200 hover:border-[#00BFFF]/50'}`}>
                    <input {...getInputProps()} />
                    <Upload size={28} className="mx-auto mb-2 text-slate-300" />
                    {uploading
                        ? <p className="text-sm text-slate-500">Parsing CSV…</p>
                        : isDragActive
                            ? <p className="text-sm font-semibold" style={{ color: '#00BFFF' }}>Drop it here!</p>
                            : <p className="text-sm text-slate-500">Drag & drop CSV or <span className="font-semibold" style={{ color: '#00BFFF' }}>click to browse</span></p>
                    }
                </div>

                {parsed && (
                    <>
                        <div className="overflow-x-auto rounded-xl border border-slate-100 mb-4 max-h-64">
                            <table className="w-full text-xs">
                                <thead className="bg-slate-50 sticky top-0">
                                    <tr className="text-slate-500 uppercase tracking-wide">
                                        <th className="py-2 px-3 text-left">Rank</th>
                                        <th className="py-2 px-3 text-left">HackerRank</th>
                                        <th className="py-2 px-3 text-left">Score</th>
                                        <th className="py-2 px-3 text-left">Match</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsed.map((r, i) => (
                                        <tr key={i} className="border-t border-slate-50">
                                            <td className="py-2 px-3 font-bold text-slate-700">{r.rank}</td>
                                            <td className="py-2 px-3 text-slate-600">{r.hackerRankUsername}</td>
                                            <td className="py-2 px-3 font-semibold" style={{ color: '#00BFFF' }}>{r.score}</td>
                                            <td className="py-2 px-3">
                                                {r.matchStatus === 'matched'
                                                    ? <span className="text-emerald-600 font-medium">✓ {r.matchedName}</span>
                                                    : <span className="text-amber-600 font-medium">⚠ Unmatched</span>
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex gap-2 mt-2">
                            <button onClick={onClose}
                                className="flex-1 py-2 rounded-full border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                                Cancel
                            </button>
                            <motion.button
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                onClick={() => saveMut.mutate({ contestId: contest._id, scores: parsed })}
                                disabled={saveMut.isPending}
                                className="flex-1 py-2 rounded-full text-white text-sm font-semibold disabled:opacity-50"
                                style={{ background: '#00BFFF' }}
                            >
                                {saveMut.isPending ? 'Saving…' : 'Confirm & Save'}
                            </motion.button>
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
}

// ── Push Notification Modal ───────────────────────────────────────────────────
function NotifyModal({ contest, onClose }) {
    const [msg, setMsg] = useState('');
    const notifyMut = useMutation({
        mutationFn: api.notify,
        onSuccess: () => { toast.success('Notification sent!'); onClose(); },
        onError: () => toast.error('Failed to send notification'),
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 w-full max-w-md z-10"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Bell size={18} style={{ color: '#00BFFF' }} /> Push Notification
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100"><X size={16} /></button>
                </div>
                <p className="text-sm text-slate-500 mb-4">Send reminder to all registered users for: <strong>{contest.title}</strong></p>
                <textarea
                    className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 resize-none"
                    style={{ '--tw-ring-color': '#00BFFF' }}
                    placeholder="e.g. Contest starts in 1 hour! Make sure you're ready."
                    rows={3}
                    value={msg}
                    onChange={e => setMsg(e.target.value)}
                />
                <div className="flex gap-2 mt-4">
                    <button onClick={onClose}
                        className="flex-1 py-2.5 rounded-full border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
                        Cancel
                    </button>
                    <motion.button
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        onClick={() => notifyMut.mutate({ contestId: contest._id, message: msg })}
                        disabled={!msg.trim() || notifyMut.isPending}
                        className="flex-1 py-2.5 rounded-full text-white text-sm font-semibold disabled:opacity-50"
                        style={{ background: '#00BFFF' }}
                    >
                        {notifyMut.isPending ? 'Sending…' : 'Send'}
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );
}

// ── Edit Contest Modal ────────────────────────────────────────────────────────
function EditContestModal({ contest, onClose }) {
    const queryClient = useQueryClient();
    const [form, setForm] = useState({
        title: contest.title,
        description: contest.description,
        hackerRankLink: contest.hackerRankLink,
        status: contest.status,
        startDate: contest.startDate?.slice(0, 16) || '',
        endDate: contest.endDate?.slice(0, 16) || '',
    });

    const editMut = useMutation({
        mutationFn: api.editContest,
        onSuccess: () => {
            toast.success('Contest updated!');
            queryClient.invalidateQueries({ queryKey: ['contests'] });
            onClose();
        },
        onError: () => toast.error('Update failed'),
    });

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 w-full max-w-lg z-10"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold text-slate-900">Edit Contest</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100"><X size={16} /></button>
                </div>
                <div className="space-y-3">
                    {[
                        { label: 'Title', key: 'title' },
                        { label: 'HackerRank Link', key: 'hackerRankLink' },
                    ].map(({ label, key }) => (
                        <div key={key}>
                            <label className="text-xs font-medium text-slate-500 mb-1 block">{label}</label>
                            <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
                                value={form[key]} onChange={e => set(key, e.target.value)} />
                        </div>
                    ))}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium text-slate-500 mb-1 block">Start Date</label>
                            <input type="datetime-local" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                                value={form.startDate} onChange={e => set('startDate', e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 mb-1 block">End Date</label>
                            <input type="datetime-local" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                                value={form.endDate} onChange={e => set('endDate', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Status</label>
                        <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 bg-white"
                            value={form.status} onChange={e => set('status', e.target.value)}>
                            {['upcoming', 'ongoing', 'past'].map(s => <option key={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Description</label>
                        <textarea className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 resize-none"
                            rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
                    </div>
                </div>
                <div className="flex gap-2 mt-5">
                    <button onClick={onClose}
                        className="flex-1 py-2.5 rounded-full border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
                        Cancel
                    </button>
                    <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={() => editMut.mutate({ _id: contest._id, ...form })}
                        disabled={editMut.isPending}
                        className="flex-1 py-2.5 rounded-full text-white text-sm font-semibold disabled:opacity-50"
                        style={{ background: '#00BFFF' }}
                    >
                        {editMut.isPending ? 'Saving…' : 'Save Changes'}
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );
}

// ── Contest Card ──────────────────────────────────────────────────────────────
function ContestCard({ contest, user, role, isCoordinator, isAdmin, queryClient }) {
    const [expanded, setExpanded] = useState(false);
    const [eligibility, setEligibility] = useState(null);
    const [regDone, setRegDone] = useState(contest.isRegistered);
    const [showUpload, setShowUpload] = useState(false);
    const [showNotify, setShowNotify] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [participantCount, setParticipantCount] = useState(contest.participantCount);

    const isViewOnly = ['Alumni', 'Faculty'].includes(role);
    const canManage = isCoordinator || isAdmin;

    // Fetch eligibility when expanded
    useEffect(() => {
        if (expanded && !eligibility && contest.status !== 'past') {
            api.getEligibility(contest._id)
                .then(setEligibility)
                .catch(() => setEligibility({ eligible: false, reason: 'Check failed' }));
        }
    }, [expanded, eligibility, contest._id, contest.status]);

    // Socket live participant count
    useEffect(() => {
        const s = getSocket();
        const handler = ({ contestId, participantCount: count }) => {
            if (contestId === contest._id) setParticipantCount(count);
        };
        s.on('contest-update', handler);
        return () => s.off('contest-update', handler);
    }, [contest._id]);

    const deleteMut = useMutation({
        mutationFn: api.deleteContest,
        onSuccess: () => {
            toast.success('Contest deleted');
            queryClient.invalidateQueries({ queryKey: ['contests'] });
        },
        onError: () => toast.error('Delete failed'),
    });

    const handleDelete = () => {
        if (confirm('Delete this contest? This cannot be undone.')) {
            deleteMut.mutate(contest._id);
        }
    };

    const formatDate = (d) => {
        if (!d) return '';
        const dt = new Date(d);
        return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
            ' • ' + dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    return (
        <>
            <AnimatePresence>
                {showUpload && <UploadScoresModal contest={contest} onClose={() => setShowUpload(false)} />}
                {showNotify && <NotifyModal contest={contest} onClose={() => setShowNotify(false)} />}
                {showEdit && <EditContestModal contest={contest} onClose={() => setShowEdit(false)} />}
            </AnimatePresence>

            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-slate-100 mb-4 bg-white overflow-hidden transition-all duration-300"
                style={{ boxShadow: expanded ? '0 20px 25px -5px rgb(0 0 0 / 0.12)' : '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                whileHover={{ boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.12)' }}
            >
                {/* ── Preview ── */}
                <div className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                                <TypeBadge type={contest.type} />
                                {contest.status === 'ongoing' && (
                                    <span className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                                        LIVE
                                    </span>
                                )}
                                {regDone && (
                                    <span className="rounded-full px-3 py-1 text-xs font-semibold bg-[#00BFFF]/15 text-[#00BFFF]">
                                        ✓ Registered
                                    </span>
                                )}
                            </div>

                            <h3 className="text-xl font-semibold text-slate-900 mb-2 leading-snug">{contest.title}</h3>

                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                                <span className="flex items-center gap-1.5">
                                    <Calendar size={13} /> {formatDate(contest.startDate)}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Users size={13} /> Registered: <strong>{participantCount}</strong>
                                </span>
                                {contest.eligibleYears?.length > 0 && contest.type === 'monthly' && (
                                    <span className="flex items-center gap-1.5">
                                        <Zap size={13} /> {contest.eligibleYears.join(', ')}
                                    </span>
                                )}
                            </div>

                            {/* Countdown */}
                            <div className="mt-2">
                                <CountdownBadge contest={contest} />
                            </div>
                        </div>

                        {/* Right side actions */}
                        <div className="flex flex-col gap-2 flex-shrink-0">
                            {/* CTA button */}
                            {contest.status === 'upcoming' && (
                                <motion.button
                                    whileHover={!isViewOnly && !regDone ? { scale: 1.05 } : {}}
                                    whileTap={!isViewOnly && !regDone ? { scale: 0.97 } : {}}
                                    onClick={() => setExpanded(e => !e)}
                                    disabled={isViewOnly || regDone}
                                    className="px-6 py-2.5 rounded-full text-white text-sm font-semibold transition-all disabled:opacity-60"
                                    style={{ background: '#00BFFF' }}
                                >
                                    {regDone ? 'Registered ✓' : isViewOnly ? 'View Only' : 'Register Now'}
                                </motion.button>
                            )}
                            {contest.status === 'ongoing' && (
                                <a
                                    href={contest.hackerRankLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-6 py-2.5 rounded-full text-white text-sm font-semibold text-center inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
                                    style={{ background: '#00BFFF' }}
                                >
                                    <ExternalLink size={14} /> Join Now
                                </a>
                            )}
                            {contest.status === 'past' && (
                                <motion.button
                                    whileHover={{ scale: 1.03 }}
                                    onClick={() => setExpanded(e => !e)}
                                    className="px-6 py-2.5 rounded-full text-sm font-semibold border-2 transition-all"
                                    style={{ borderColor: '#00BFFF', color: '#00BFFF' }}
                                >
                                    View Leaderboard
                                </motion.button>
                            )}

                            {/* Coordinator tools */}
                            {canManage && (
                                <div className="flex items-center gap-1.5">
                                    <button onClick={() => setShowEdit(true)}
                                        className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-[#00BFFF] hover:border-[#00BFFF]/30 transition-all"
                                        title="Edit">
                                        <Pencil size={14} />
                                    </button>
                                    {contest.status === 'upcoming' && (
                                        <button onClick={handleDelete}
                                            className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 transition-all"
                                            title="Delete">
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                    {contest.status === 'past' && (
                                        <button onClick={() => setShowUpload(true)}
                                            className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-[#00BFFF] hover:border-[#00BFFF]/30 transition-all"
                                            title="Upload Scores">
                                            <Upload size={14} />
                                        </button>
                                    )}
                                    <button onClick={() => setShowNotify(true)}
                                        className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-[#00BFFF] hover:border-[#00BFFF]/30 transition-all"
                                        title="Push Notification">
                                        <Bell size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Eligibility snapshot + HackerRank note */}
                    {eligibility && !expanded && (
                        <p className={`text-xs mt-3 flex items-center gap-1.5 ${eligibility.eligible ? 'text-emerald-600' : 'text-red-500'}`}>
                            {eligibility.eligible ? <Check size={12} /> : <AlertTriangle size={12} />}
                            {eligibility.eligible ? 'Eligible ✓' : `Not Eligible ⚠️ (${eligibility.reason})`}
                        </p>
                    )}

                    <p className="text-xs text-slate-400 mt-3">
                        Hosted on HackerRank — Use your saved username
                    </p>
                </div>

                {/* ── Expanded content ── */}
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="border-t border-slate-100 overflow-hidden"
                        >
                            <div className="p-6 relative">
                                {/* Collapse button */}
                                <button
                                    onClick={() => setExpanded(false)}
                                    className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-[#00BFFF] hover:bg-[#00BFFF]/10 transition-all"
                                >
                                    <ChevronUp size={18} />
                                </button>

                                {/* Description */}
                                <p className="text-base text-slate-800 mb-4 leading-relaxed pr-8">
                                    {contest.description}
                                </p>

                                {/* Eligibility inline */}
                                {eligibility && (
                                    <div className={`flex items-center gap-2 text-sm font-medium mb-4 ${eligibility.eligible ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {eligibility.eligible
                                            ? <><Check size={16} /> You are eligible for this contest</>
                                            : <><AlertTriangle size={16} /> {eligibility.reason}</>
                                        }
                                    </div>
                                )}

                                {/* Rules */}
                                {contest.rules?.length > 0 && (
                                    <div className="mb-4">
                                        <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                            <Clock size={14} style={{ color: '#00BFFF' }} /> Rules & Instructions
                                        </p>
                                        <ul className="space-y-1.5">
                                            {contest.rules.map((rule, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                                    <Circle size={6} className="mt-2 flex-shrink-0 text-slate-400" fill="currentColor" />
                                                    {rule}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Content by status */}
                                {contest.status === 'upcoming' && !regDone && !isViewOnly && (
                                    eligibility?.eligible !== false
                                        ? <RegistrationForm contest={contest} user={user} onSuccess={() => setRegDone(true)} />
                                        : eligibility?.eligible === false && (
                                            <div className="rounded-2xl p-4 bg-red-50 border border-red-100 mt-4">
                                                <p className="text-sm text-red-600 font-medium flex items-center gap-2">
                                                    <AlertTriangle size={16} /> {eligibility.reason || 'You are not eligible for this contest.'}
                                                </p>
                                            </div>
                                        )
                                )}

                                {contest.status === 'ongoing' && (
                                    <a
                                        href={contest.hackerRankLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-semibold mt-2 hover:opacity-90 transition-opacity"
                                        style={{ background: '#00BFFF' }}
                                    >
                                        <ExternalLink size={16} /> Open on HackerRank
                                    </a>
                                )}

                                {contest.status === 'past' && (
                                    <Leaderboard contestId={contest._id} />
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </>
    );
}

// ── Admin Analytics Card ──────────────────────────────────────────────────────
function AdminAnalyticsCard() {
    const { data, isLoading } = useQuery({
        queryKey: ['contest-analytics'],
        queryFn: api.getAnalytics,
        staleTime: 60000,
    });

    if (isLoading) return (
        <div className="rounded-3xl border border-slate-100 p-6 mb-6 bg-white animate-pulse"
            style={{ boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}>
            <div className="h-6 bg-slate-200 rounded-lg w-48 mb-4" />
            <div className="h-40 bg-slate-100 rounded-2xl" />
        </div>
    );

    if (!data) return null;

    const chartData = {
        labels: data.chartData?.labels || [],
        datasets: [{
            label: 'Participants',
            data: data.chartData?.datasets?.[0]?.data || [],
            backgroundColor: 'rgba(0,191,255,0.5)',
            borderColor: '#00BFFF',
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
        }],
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => `${ctx.raw} participants` } },
        },
        scales: {
            y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { color: '#94a3b8', font: { size: 11 } } },
            x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } },
        },
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="rounded-3xl border border-slate-100 p-6 mb-6 bg-white"
            style={{ boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
        >
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <BarChart3 size={18} style={{ color: '#00BFFF' }} /> Contest Analytics
                </h2>
                <div className="flex items-center gap-4 text-sm">
                    <span className="text-slate-500">
                        Avg: <strong className="text-slate-800">{data.avgParticipation} students</strong>
                    </span>
                    <span className="text-slate-500">
                        Total: <strong className="text-slate-800">{data.totalContests}</strong>
                    </span>
                </div>
            </div>
            {chartData.labels.length > 0 ? (
                <Bar data={chartData} options={chartOptions} height={120} />
            ) : (
                <p className="text-slate-400 text-sm text-center py-8">No data yet</p>
            )}
        </motion.div>
    );
}

// ── Main Contests Page ────────────────────────────────────────────────────────
const TABS = [
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'ongoing', label: 'Ongoing' },
    { key: 'past', label: 'Past' },
];

export default function Contests() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const role = user?.role || 'Ignite';
    const isCoordinator = role === 'Coordinator';
    const isAdmin = role === 'Admin';
    const [activeTab, setActiveTab] = useState('upcoming');

    const { data, isLoading, isError } = useQuery({
        queryKey: ['contests', activeTab],
        queryFn: () => api.getContests(activeTab),
        staleTime: 30000,
    });

    // Socket.io: receive notifications
    useEffect(() => {
        const s = getSocket();
        const handler = (payload) => {
            if (payload.type === 'contest') {
                toast(payload.message, {
                    icon: '🔔',
                    duration: 6000,
                    style: { borderRadius: '16px', fontWeight: 500 },
                });
            }
        };
        s.on('notification', handler);
        return () => s.off('notification', handler);
    }, []);

    const contests = data?.contests || [];
    const upcomingCount = data?.upcomingCount ?? 0;
    const pastCount = data?.pastCount ?? 0;

    return (
        <div className="min-h-screen relative" style={{ background: '#FFFFFF' }}>
            <Toaster position="top-right" toastOptions={{ style: { borderRadius: '16px' } }} />

            {/* Animated wave background */}
            <div className="contests-wave-bg" />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 relative">

                {/* ── Page Title ── */}
                <motion.div
                    initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <h1 className="text-4xl font-bold text-slate-900">Contests</h1>
                    <p className="text-slate-500 text-sm mt-1">Compete, earn ranks, and grow your problem-solving skills</p>
                </motion.div>

                {/* ── Admin Analytics ── */}
                {(isAdmin || isCoordinator) && <AdminAnalyticsCard />}

                {/* ── Summary Card ── */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}
                    className="rounded-3xl border border-slate-100 p-6 mb-6 bg-white"
                    style={{ boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                >
                    <p className="text-xl font-semibold text-slate-900">
                        Upcoming contests: {upcomingCount} &nbsp;|&nbsp; Past: {pastCount}
                    </p>
                    <p className="text-sm text-slate-500 mt-2">
                        Monthly contests for Ignite students &nbsp;|&nbsp; Major contests open to alliance colleges (Spark users)
                    </p>
                    {role === 'Ignite' && (
                        <p className="text-sm mt-2 font-medium" style={{ color: '#00BFFF' }}>
                            You are eligible for {upcomingCount} upcoming contest{upcomingCount !== 1 ? 's' : ''}
                        </p>
                    )}
                    {role === 'Spark' && (
                        <p className="text-sm mt-2 font-medium" style={{ color: '#00BFFF' }}>
                            You can participate in Major contests open to all alliance colleges
                        </p>
                    )}
                    {['Alumni', 'Faculty'].includes(role) && (
                        <p className="text-sm mt-2 text-amber-600 font-medium">
                            View-only access — You can browse contests and leaderboards
                        </p>
                    )}
                </motion.div>

                {/* ── Tab switcher ── */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
                    className="flex gap-2 mb-8 overflow-x-auto pb-1 scrollbar-hide"
                >
                    {TABS.map(tab => (
                        <motion.button
                            key={tab.key}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setActiveTab(tab.key)}
                            className="flex-shrink-0 px-6 py-2 rounded-full border text-sm font-medium transition-all duration-200"
                            style={
                                activeTab === tab.key
                                    ? { background: '#00BFFF', color: '#fff', borderColor: '#00BFFF', boxShadow: '0 4px 12px rgba(0,191,255,0.3)' }
                                    : { background: '#fff', color: '#475569', borderColor: '#E2E8F0' }
                            }
                        >
                            {tab.label}
                        </motion.button>
                    ))}
                </motion.div>

                {/* ── Contest list ── */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                    >
                        {isLoading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => <ContestSkeleton key={i} />)}
                            </div>
                        ) : isError ? (
                            <div className="flex items-center gap-3 p-5 rounded-2xl bg-red-50 border border-red-100 text-red-600">
                                <AlertTriangle size={20} />
                                <p className="font-medium">Failed to load contests. Please refresh the page.</p>
                            </div>
                        ) : contests.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.97 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center rounded-3xl border border-slate-100 p-12 bg-white"
                                style={{ boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            >
                                <p className="text-5xl mb-4">🚀</p>
                                <p className="text-xl font-semibold text-slate-700 mb-2">
                                    No {activeTab} contests
                                </p>
                                <p className="text-slate-500 text-sm">
                                    {activeTab === 'upcoming'
                                        ? 'New contests will appear here when announced. Stay tuned!'
                                        : activeTab === 'ongoing'
                                            ? 'No contests are running right now. Check upcoming!'
                                            : 'Past contests and leaderboards will be shown here.'}
                                </p>
                            </motion.div>
                        ) : (
                            <div>
                                {contests.map((contest, idx) => (
                                    <motion.div
                                        key={contest._id}
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.06 }}
                                    >
                                        <ContestCard
                                            contest={contest}
                                            user={user}
                                            role={role}
                                            isCoordinator={isCoordinator}
                                            isAdmin={isAdmin}
                                            queryClient={queryClient}
                                        />
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
