import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy, ChevronDown, User, Download, Upload,
    RefreshCw, BarChart2, Medal, Crown, Star,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';

// ─── Constants ────────────────────────────────────────────────────────────────
const YEAR_OPTIONS = [2026, 2025, 2024, 2023, 2022];
const YEAR_FILTERS = [
    { key: '1stYear', label: '1st Year' },
    { key: '2ndYear', label: '2nd Year' },
    { key: '3rdYear', label: '3rd Year' },
    { key: '4thYear', label: '4th Year' },
];
const TABS = [
    { key: 'all-time-overall', label: 'All-Time Overall' },
    { key: 'ignite-only', label: 'All-Time Ignite Only', igniteOnly: true },
    { key: 'major', label: 'Major Contests', hasDropdown: true },
];

// ─── Medal helpers ─────────────────────────────────────────────────────────────
const MEDAL = {
    1: { color: '#FFD700', shadow: 'rgba(255,215,0,0.35)' },
    2: { color: '#C0C0C0', shadow: 'rgba(192,192,192,0.35)' },
    3: { color: '#CD7F32', shadow: 'rgba(205,127,50,0.35)' },
};

function RankBadge({ rank }) {
    const medal = MEDAL[rank];
    if (medal) {
        return (
            <span
                className="inline-flex items-center justify-center w-9 h-9 rounded-full font-bold text-sm shadow-lg"
                style={{ background: medal.color, boxShadow: `0 4px 14px ${medal.shadow}`, color: '#fff' }}
            >
                {rank === 1 ? <Crown size={16} /> : rank === 2 ? <Medal size={14} /> : <Star size={13} />}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 text-slate-600 font-semibold text-sm">
            {rank}
        </span>
    );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function TableSkeleton() {
    return (
        <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="w-9 h-9 rounded-full bg-slate-200 flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 bg-slate-200 rounded-full w-1/3" />
                        <div className="h-2.5 bg-slate-100 rounded-full w-1/4" />
                    </div>
                    <div className="h-3.5 bg-slate-200 rounded-full w-16" />
                </div>
            ))}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Leaderboards() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const isAdmin = ['Coordinator', 'Admin'].includes(user?.role);
    const isSpark = user?.role === 'Spark';

    // State
    const [selectedYear, setSelectedYear] = useState(2025);
    const [yearOpen, setYearOpen] = useState(false);
    const [activeOverall, setActiveOverall] = useState(true); // "Overall" vs specific year
    const [activeFilter, setActiveFilter] = useState(() => {
        // Default to user's own year if available
        const yearMap = { '1': '1stYear', '2': '2ndYear', '3': '3rdYear', '4': '4thYear' };
        const batch = user?.batch;
        return 'all';
    });
    const [activeTab, setActiveTab] = useState('all-time-overall');
    const [contestsOpen, setContestsOpen] = useState(false);
    const [selectedContest, setSelectedContest] = useState(null);
    const [page, setPage] = useState(1);
    const [allRows, setAllRows] = useState([]);
    const [uploadModal, setUploadModal] = useState(false);
    const [uploadJson, setUploadJson] = useState('');
    const [uploadContestId, setUploadContestId] = useState('');
    const [recalcLoading, setRecalcLoading] = useState(false);
    const [allYears, setAllYears] = useState(false);

    const yearDropRef = useRef(null);
    const contestDropRef = useRef(null);

    // ── Socket.io live updates ──────────────────────────────────────────────────
    useEffect(() => {
        const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
            transports: ['websocket'],
        });
        socket.on('leaderboard-update', () => {
            toast.success('Leaderboard updated live!', { icon: '🏆' });
            queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
        });
        return () => socket.disconnect();
    }, [queryClient]);

    // ── Query params ────────────────────────────────────────────────────────────
    const queryParams = {
        year: activeOverall ? undefined : String(selectedYear),
        filter: activeFilter === 'all' ? 'all' : activeFilter,
        tab: activeTab,
        contestId: selectedContest || undefined,
        page,
        limit: 50,
    };

    // ── TanStack Query ──────────────────────────────────────────────────────────
    const { data, isLoading, isError } = useQuery({
        queryKey: ['leaderboard', queryParams],
        queryFn: async () => {
            const params = new URLSearchParams();
            Object.entries(queryParams).forEach(([k, v]) => { if (v !== undefined) params.set(k, v); });
            const { data } = await axios.get(`/leaderboards?${params}`);
            return data;
        },
        keepPreviousData: true,
        staleTime: 30_000,
        onError: () => toast.error('Failed to load leaderboard.'),
    });

    // Accumulate rows for Load More
    useEffect(() => {
        if (data?.rows) {
            if (page === 1) {
                setAllRows(data.rows);
            } else {
                setAllRows((prev) => [...prev, ...data.rows]);
            }
        }
    }, [data, page]);

    // Reset rows when filter/tab/year changes
    useEffect(() => {
        setPage(1);
        setAllRows([]);
    }, [activeFilter, activeTab, selectedYear, activeOverall, selectedContest]);

    // ── Outside click to close dropdowns ───────────────────────────────────────
    useEffect(() => {
        const handler = (e) => {
            if (yearDropRef.current && !yearDropRef.current.contains(e.target)) setYearOpen(false);
            if (contestDropRef.current && !contestDropRef.current.contains(e.target)) setContestsOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Recalculate ─────────────────────────────────────────────────────────────
    const handleRecalculate = async () => {
        setRecalcLoading(true);
        try {
            await axios.post('/leaderboards/recalculate');
            toast.success('Leaderboard recalculated!');
            queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
        } catch {
            toast.error('Recalculation failed.');
        } finally {
            setRecalcLoading(false);
        }
    };

    // ── Upload Scores (JSON) ─────────────────────────────────────────────────────
    const handleUpload = async () => {
        try {
            const scores = JSON.parse(uploadJson);
            await axios.post('/leaderboards/upload', { contestId: uploadContestId, scores });
            toast.success('Scores uploaded!');
            setUploadModal(false);
            setUploadJson('');
            queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
        } catch {
            toast.error('Upload failed. Check JSON format.');
        }
    };

    // ── Export CSV ──────────────────────────────────────────────────────────────
    const handleExport = () => {
        const params = new URLSearchParams({ ...queryParams });
        window.open(`/api/leaderboards/export?${params}`, '_blank');
    };

    // ── Tab switch validation ───────────────────────────────────────────────────
    const handleTabSwitch = (tab) => {
        if (tab.igniteOnly && isSpark) {
            toast.error('Ignite Only tab is not available for Spark users.');
            return;
        }
        setActiveTab(tab.key);
        if (tab.hasDropdown) setContestsOpen(true);
    };

    // ── Load More (keyboard + click) ─────────────────────────────────────────────
    const handleLoadMore = () => setPage((p) => p + 1);
    const handleLoadMoreKey = (e) => { if (e.key === 'Enter') handleLoadMore(); };

    const majorContests = data?.majorContests || [];
    const hasMore = data?.hasMore;
    const totalContests = data?.totalContests;
    const currentUserRow = data?.currentUserRow;
    const isEmpty = !isLoading && allRows.length === 0;

    return (
        <div className="relative min-h-screen">
            {/* ── Toaster ───────────────────────────────────────────────────────────*/}
            <Toaster position="top-right" />

            {/* ── Animated Wave Background ─────────────────────────────────────────*/}
            <div
                className="pointer-events-none fixed inset-0 z-[-1]"
                aria-hidden="true"
                style={{ background: '#FFFFFF' }}
            >
                <div className="wave-bg" />
            </div>

            {/* ── Page Container ───────────────────────────────────────────────────*/}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

                {/* ── Page Header ──────────────────────────────────────────────────── */}
                <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
                    <div>
                        <h1 className="text-4xl font-bold" style={{ color: '#0F172A' }}>
                            Leaderboards
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Track contest rankings across all years and colleges
                        </p>
                    </div>

                    {/* Admin controls */}
                    {isAdmin && (
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* All Years Toggle */}
                            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                                <div
                                    onClick={() => setAllYears(!allYears)}
                                    className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${allYears ? 'bg-[#00BFFF]' : 'bg-slate-200'}`}
                                >
                                    <span
                                        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${allYears ? 'translate-x-5' : ''}`}
                                    />
                                </div>
                                All Years
                            </label>

                            <button
                                onClick={() => setUploadModal(true)}
                                className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-105 active:scale-95"
                                style={{ background: '#00BFFF', boxShadow: '0 4px 12px rgba(0,191,255,0.25)' }}
                            >
                                <Upload size={14} /> Upload Scores
                            </button>

                            <button
                                onClick={handleRecalculate}
                                disabled={recalcLoading}
                                className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all duration-200 hover:scale-105"
                            >
                                <RefreshCw size={14} className={recalcLoading ? 'animate-spin' : ''} />
                                Recalculate
                            </button>

                            <button
                                onClick={handleExport}
                                className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all duration-200 hover:scale-105"
                            >
                                <Download size={14} /> Export
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Year Selector Row ─────────────────────────────────────────────── */}
                <div className="flex items-center gap-3 mb-6 flex-wrap">
                    {/* Year dropdown */}
                    <div ref={yearDropRef} className="relative">
                        <button
                            onClick={() => { setYearOpen(!yearOpen); setActiveOverall(false); }}
                            className="flex items-center gap-2 text-3xl font-semibold transition-colors hover:opacity-80"
                            style={{ color: activeOverall ? '#94A3B8' : '#0F172A' }}
                        >
                            {selectedYear}
                            <ChevronDown size={20} className={`transition-transform duration-200 ${yearOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                            {yearOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 min-w-[7rem]"
                                >
                                    {YEAR_OPTIONS.map((y) => (
                                        <button
                                            key={y}
                                            onClick={() => { setSelectedYear(y); setYearOpen(false); setActiveOverall(false); }}
                                            className={`w-full px-5 py-2.5 text-left text-sm font-medium transition-colors hover:bg-[#00BFFF]/10 ${y === selectedYear && !activeOverall ? 'text-[#00BFFF]' : 'text-slate-700'}`}
                                        >
                                            {y}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Overall button */}
                    <button
                        onClick={() => { setActiveOverall(true); setYearOpen(false); }}
                        className={`rounded-full px-6 py-2 text-sm font-semibold shadow-md transition-all duration-200 hover:scale-105 active:scale-95 ${activeOverall
                                ? 'text-white'
                                : 'bg-white border border-slate-200 text-slate-600 hover:border-[#00BFFF] hover:text-[#00BFFF]'
                            }`}
                        style={activeOverall ? { background: '#00BFFF', boxShadow: '0 4px 14px rgba(0,191,255,0.30)' } : {}}
                    >
                        Overall
                    </button>
                </div>

                {/* ── Year Filter Bars ──────────────────────────────────────────────── */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide">
                    <button
                        onClick={() => setActiveFilter('all')}
                        className={`flex-shrink-0 rounded-full px-6 py-2 text-sm font-medium border transition-all duration-200 ${activeFilter === 'all'
                                ? 'bg-[#00BFFF] text-white border-[#00BFFF] shadow-md'
                                : 'border-slate-200 text-slate-600 hover:border-[#00BFFF] hover:text-[#00BFFF]'
                            }`}
                    >
                        All Years
                    </button>
                    {YEAR_FILTERS.map((f) => (
                        <button
                            key={f.key}
                            onClick={() => setActiveFilter(f.key)}
                            className={`flex-shrink-0 rounded-full px-6 py-2 text-sm font-medium border transition-all duration-200 ${activeFilter === f.key
                                    ? 'bg-[#00BFFF] text-white border-[#00BFFF] shadow-md'
                                    : 'border-slate-200 text-slate-600 hover:border-[#00BFFF] hover:text-[#00BFFF]'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* ── Tab Row ───────────────────────────────────────────────────────── */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-6 scrollbar-hide">
                    {TABS.map((tab) => {
                        if (tab.igniteOnly && isSpark) return null;
                        const isActive = activeTab === tab.key;
                        return (
                            <div key={tab.key} className="relative flex-shrink-0" ref={tab.hasDropdown ? contestDropRef : null}>
                                <button
                                    onClick={() => handleTabSwitch(tab)}
                                    className={`flex items-center gap-1.5 rounded-full px-6 py-2 text-sm font-medium border transition-all duration-200 ${isActive
                                            ? 'bg-[#00BFFF] text-white border-[#00BFFF] shadow-md'
                                            : 'border-slate-200 text-slate-600 hover:border-[#00BFFF] hover:text-[#00BFFF]'
                                        }`}
                                >
                                    <Trophy size={13} />
                                    {tab.label}
                                    {tab.hasDropdown && <ChevronDown size={13} className={`transition-transform duration-200 ${contestsOpen ? 'rotate-180' : ''}`} />}
                                </button>

                                {/* Major Contests dropdown */}
                                {tab.hasDropdown && (
                                    <AnimatePresence>
                                        {contestsOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                                transition={{ duration: 0.15 }}
                                                className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 min-w-[13rem]"
                                            >
                                                <button
                                                    onClick={() => { setSelectedContest(null); setContestsOpen(false); }}
                                                    className={`w-full px-5 py-2.5 text-left text-sm font-medium transition-colors hover:bg-[#00BFFF]/10 ${!selectedContest ? 'text-[#00BFFF]' : 'text-slate-700'}`}
                                                >
                                                    All Major Contests
                                                </button>
                                                {majorContests.map((c) => (
                                                    <button
                                                        key={c._id}
                                                        onClick={() => { setSelectedContest(c._id); setContestsOpen(false); }}
                                                        className={`w-full px-5 py-2.5 text-left text-sm font-medium transition-colors hover:bg-[#00BFFF]/10 ${selectedContest === c._id ? 'text-[#00BFFF]' : 'text-slate-700'}`}
                                                    >
                                                        {c.title}
                                                    </button>
                                                ))}
                                                {majorContests.length === 0 && (
                                                    <p className="px-5 py-3 text-sm text-slate-400">No major contests yet</p>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* ── Table / Content ───────────────────────────────────────────────── */}
                <AnimatePresence mode="wait">
                    {isLoading && page === 1 ? (
                        <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <TableSkeleton />
                        </motion.div>
                    ) : isError ? (
                        <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="rounded-3xl shadow-xl border border-slate-100 p-8 text-center"
                        >
                            <Trophy size={40} className="mx-auto mb-3 text-slate-200" />
                            <p className="text-slate-500 font-medium">Failed to load leaderboard. Please try again.</p>
                        </motion.div>
                    ) : isEmpty ? (
                        <motion.div key="empty" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="rounded-3xl shadow-xl border border-slate-100 p-10 text-center bg-white"
                        >
                            <BarChart2 size={48} className="mx-auto mb-4 text-[#00BFFF]/40" />
                            <p className="text-slate-500 text-base font-medium leading-relaxed">
                                No contest happened for{' '}
                                {activeFilter !== 'all' ? YEAR_FILTERS.find((f) => f.key === activeFilter)?.label : 'selected'} students yet.
                                <br />
                                We will update the leaderboard soon – thank you!
                            </p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key={`table-${activeTab}-${activeFilter}-${selectedYear}-${activeOverall}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {/* ── Desktop Table ─────────────────────────────────────────── */}
                            <div className="hidden sm:block overflow-hidden rounded-3xl shadow-[0_10px_15px_-3px_rgb(0_0_0/0.1)] border border-slate-100 bg-white">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-[#00BFFF]/5 to-white border-b border-[#E2E8F0]">
                                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-16">Rank</th>
                                            <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Participant</th>
                                            <th className="px-4 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Score</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E2E8F0]">
                                        {/* Current user pinned row (if not in view) */}
                                        {currentUserRow && (
                                            <tr className="bg-yellow-50 border-y border-yellow-100">
                                                <td className="px-6 py-3.5">
                                                    <RankBadge rank={currentUserRow.rank} />
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full">
                                                            <User size={9} /> You
                                                        </span>
                                                        <span className="font-semibold text-sm" style={{ color: '#0F172A' }}>
                                                            {currentUserRow.nickname}
                                                        </span>
                                                        <span className="text-xs text-slate-400">
                                                            • {currentUserRow.branch} {currentUserRow.college}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 text-right">
                                                    <span className="font-bold text-sm" style={{ color: '#00BFFF' }}>
                                                        {currentUserRow.displayScore}
                                                    </span>
                                                </td>
                                            </tr>
                                        )}

                                        {allRows.map((row, idx) => {
                                            const isTopThree = row.rank <= 3;
                                            const isCurrentUser = row.userId && user?._id && row.userId.toString() === user._id?.toString();
                                            return (
                                                <tr
                                                    key={`${row.nickname}-${row.rank}-${idx}`}
                                                    className={`transition-colors duration-150 ${isTopThree
                                                            ? 'bg-[#00BFFF]/[0.04] hover:bg-[#00BFFF]/[0.08]'
                                                            : isCurrentUser
                                                                ? 'bg-yellow-50 hover:bg-yellow-100'
                                                                : idx % 2 === 0
                                                                    ? 'bg-white hover:bg-slate-50'
                                                                    : 'bg-slate-50/50 hover:bg-slate-50'
                                                        }`}
                                                >
                                                    <td className="px-6 py-4">
                                                        <RankBadge rank={row.rank} />
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            {isCurrentUser && (
                                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full">
                                                                    <User size={9} /> You
                                                                </span>
                                                            )}
                                                            <span className="font-semibold text-sm" style={{ color: '#0F172A' }}>
                                                                {row.nickname}
                                                            </span>
                                                            <span className="text-xs text-slate-400">
                                                                • {row.branch} {row.college}
                                                            </span>
                                                            {row.year && (
                                                                <span className="text-[10px] text-slate-300 hidden lg:inline">• {row.year}</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-right">
                                                        <span
                                                            className={`font-bold text-sm ${row.average >= 700 ? 'text-[#00BFFF]' : 'text-slate-500'}`}
                                                        >
                                                            {row.displayScore}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* ── Mobile Card Stack ─────────────────────────────────────── */}
                            <div className="sm:hidden space-y-3">
                                {allRows.map((row, idx) => {
                                    const medal = MEDAL[row.rank];
                                    const isCurrentUser = row.userId && user?._id && row.userId.toString() === user._id?.toString();
                                    return (
                                        <div
                                            key={`${row.nickname}-${row.rank}-m`}
                                            className={`flex items-center gap-3 p-4 rounded-2xl border shadow-sm ${isCurrentUser ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-[#E2E8F0]'
                                                }`}
                                            style={row.rank <= 3 ? { boxShadow: `0 4px 12px ${medal.shadow}` } : {}}
                                        >
                                            <RankBadge rank={row.rank} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {isCurrentUser && (
                                                        <span className="text-[10px] font-bold bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded-full">You</span>
                                                    )}
                                                    <span className="font-bold text-sm text-slate-900 truncate">{row.nickname}</span>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-0.5 truncate">{row.branch} • {row.college} • {row.year}</p>
                                            </div>
                                            <span className={`font-bold text-sm flex-shrink-0 ${row.average >= 700 ? 'text-[#00BFFF]' : 'text-slate-500'}`}>
                                                {row.displayScore}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* ── Footer note ───────────────────────────────────────────── */}
                            <p className="text-sm text-slate-400 mt-4 text-center">
                                Overall ranked by average score across all conducted major contests
                                {totalContests ? ` (${totalContests} contest${totalContests !== 1 ? 's' : ''})` : ''}
                            </p>

                            {/* ── Load More ─────────────────────────────────────────────── */}
                            {hasMore && (
                                <div className="flex justify-center mt-6">
                                    <motion.button
                                        onClick={handleLoadMore}
                                        onKeyDown={handleLoadMoreKey}
                                        tabIndex={0}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        disabled={isLoading}
                                        className="rounded-full px-8 py-2.5 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60"
                                        style={{ background: '#00BFFF', boxShadow: '0 4px 14px rgba(0,191,255,0.30)' }}
                                    >
                                        {isLoading ? 'Loading…' : 'Load More'}
                                    </motion.button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Upload Modal ──────────────────────────────────────────────────────*/}
            <AnimatePresence>
                {uploadModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
                        onClick={() => setUploadModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 16 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 w-full max-w-lg"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-xl font-bold text-slate-900 mb-4">Upload / Update Scores</h2>

                            <div className="space-y-3 mb-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Contest ID</label>
                                    <input
                                        value={uploadContestId}
                                        onChange={(e) => setUploadContestId(e.target.value)}
                                        placeholder="MongoDB ObjectId of the contest"
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#00BFFF] transition-colors"
                                    />
                                </div>

                                {/* Contest selector from list */}
                                {majorContests.length > 0 && (
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Or select a contest</label>
                                        <select
                                            onChange={(e) => setUploadContestId(e.target.value)}
                                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#00BFFF] transition-colors bg-white"
                                        >
                                            <option value="">Select…</option>
                                            {majorContests.map((c) => (
                                                <option key={c._id} value={c._id}>{c.title}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Scores JSON</label>
                                    <textarea
                                        value={uploadJson}
                                        onChange={(e) => setUploadJson(e.target.value)}
                                        rows={8}
                                        placeholder={`[\n  { "nickname": "Rohan99", "score": 850, "branch": "CSE", "college": "ANITS", "year": "2nd Year" },\n  ...\n]`}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 outline-none focus:border-[#00BFFF] transition-colors resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 justify-end">
                                <button
                                    onClick={() => setUploadModal(false)}
                                    className="rounded-full px-5 py-2 text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpload}
                                    className="rounded-full px-6 py-2 text-sm font-semibold text-white transition-all hover:scale-105"
                                    style={{ background: '#00BFFF' }}
                                >
                                    Upload
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Wave BG CSS ───────────────────────────────────────────────────────*/}
            <style>{`
        .wave-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            120deg,
            rgba(255,255,255,1) 0%,
            rgba(0,191,255,0.07) 30%,
            rgba(255,255,255,1) 60%,
            rgba(0,191,255,0.05) 100%
          );
          background-size: 300% 300%;
          animation: waveMove 20s ease-in-out infinite;
          opacity: 0.5;
        }
        @keyframes waveMove {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
        </div>
    );
}
