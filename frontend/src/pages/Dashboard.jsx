import { useAuth } from '../context/AuthContext';
import {
    TrendingUp, ArrowRight, Briefcase,
    Bell, CheckCircle2, Clock, Users, Star,
} from 'lucide-react';

const ROLE_CONFIG = {
    Ignite: { greeting: 'Ready to ignite your career? 🔥', accent: '#FF6B35', bg: '#FFF7ED', bar: '#FED7AA', cards: ['Applied', 'Drives Open', 'Profile Score'], vals: ['3', '7', '78%'] },
    Spark: { greeting: 'Keep your spark alive! ⚡', accent: '#D97706', bg: '#FEFCE8', bar: '#FDE68A', cards: ['Applied', 'Shortlisted', 'Interviews'], vals: ['12', '4', '2'] },
    Alumni: { greeting: 'Welcome back, Alumnus! 🎓', accent: '#059669', bg: '#F0FDF4', bar: '#BBF7D0', cards: ['Referrals', 'Mentees', 'Events'], vals: ['5', '3', '2'] },
    Faculty: { greeting: 'Empowering placements 📚', accent: '#7C3AED', bg: '#FAF5FF', bar: '#E9D5FF', cards: ['Students', 'Reports Due', 'Pending'], vals: ['240', '3', '8'] },
    Coordinator: { greeting: 'Coordinating excellence 🏆', accent: '#1D4ED8', bg: '#EFF6FF', bar: '#BFDBFE', cards: ['Active Drives', 'Companies', 'Offers'], vals: ['5', '18', '23'] },
    Admin: { greeting: 'System Overview — All Clear ✅', accent: '#007FAA', bg: '#E0F8FF', bar: '#b3e9ff', cards: ['Total Users', 'Active Drives', 'Offers'], vals: ['1,245', '9', '67'] },
};

const ACTIVITY = [
    { icon: Briefcase, text: 'TCS NQT application submitted', time: '2h ago', done: true },
    { icon: Bell, text: 'Infosys shortlist results live', time: '5h ago', done: false },
    { icon: CheckCircle2, text: 'Resume verified by Coordinator', time: 'Yesterday', done: true },
    { icon: Clock, text: 'Wipro interview scheduled', time: 'Tomorrow', done: false },
];

const COMPANIES = ['TCS', 'Infosys', 'Wipro', 'Cognizant', 'HCL', 'Accenture'];

export default function Dashboard() {
    const { user } = useAuth();
    const cfg = ROLE_CONFIG[user?.role] || ROLE_CONFIG.Admin;

    return (
        <div className="space-y-5 animate-fade-up">

            {/* ── Welcome banner ── */}
            <div className="relative rounded-2xl overflow-hidden p-6" style={{ background: cfg.bg }}>
                {/* Decorative stripe */}
                <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                    style={{ background: `linear-gradient(90deg, ${cfg.accent}, ${cfg.accent}80)` }} />

                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm font-semibold mb-1" style={{ color: cfg.accent }}>{cfg.greeting}</p>
                        <h2 className="text-2xl font-black text-gray-900">
                            Hello, {user?.name?.split(' ')[0]} 👋
                        </h2>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-sm text-gray-500">{user?.email}</span>
                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                            <span className="badge" style={{ background: cfg.bg, color: cfg.accent, border: `1px solid ${cfg.bar}` }}>
                                {user?.role}
                            </span>
                        </div>
                    </div>
                    <div className="hidden sm:flex flex-col items-end text-right flex-shrink-0">
                        <p className="text-xs text-gray-400">Today</p>
                        <p className="text-sm font-bold text-gray-700 mt-0.5">
                            {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">Placement Season 2025–26</p>
                    </div>
                </div>
            </div>

            {/* ── Stat cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {cfg.cards.map((label, i) => (
                    <div key={label} className="card p-5 animate-fade-up" style={{ animationDelay: `${(i + 1) * 0.06}s` }}>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
                        <p className="text-3xl font-black text-gray-900 mb-3">{cfg.vals[i]}</p>
                        {/* Progress bar */}
                        <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700 ease-spring"
                                style={{ width: `${30 + i * 22}%`, background: '#00BFFF' }} />
                        </div>
                        <div className="flex items-center gap-1 mt-2">
                            <TrendingUp size={12} className="text-emerald-500" />
                            <span className="text-xs text-emerald-600 font-medium">+{8 + i * 4}% this week</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid lg:grid-cols-5 gap-4">

                {/* ── Activity feed ── */}
                <div className="card p-5 lg:col-span-3">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="font-bold text-gray-900">Recent Activity</h3>
                        <button className="text-xs font-semibold flex items-center gap-1" style={{ color: '#00BFFF' }}>
                            View all <ArrowRight size={12} />
                        </button>
                    </div>
                    <ul className="space-y-3.5">
                        {ACTIVITY.map(({ icon: Icon, text, time, done }) => (
                            <li key={text} className="flex items-center gap-3.5 group">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:scale-110"
                                    style={{ background: done ? '#F0FDF4' : '#E0F8FF', color: done ? '#059669' : '#00BFFF' }}>
                                    <Icon size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">{text}</p>
                                    <p className="text-xs text-gray-400">{time}</p>
                                </div>
                                <span className="badge flex-shrink-0"
                                    style={done
                                        ? { background: '#F0FDF4', color: '#059669', border: '1px solid #BBF7D0' }
                                        : { background: '#E0F8FF', color: '#007FAA', border: '1px solid #b3e9ff' }}>
                                    {done ? 'Done' : 'Pending'}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* ── Right col ── */}
                <div className="lg:col-span-2 flex flex-col gap-4">

                    {/* Quick actions */}
                    <div className="card p-5">
                        <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {['Browse Jobs', 'Update Resume', 'View Drives', 'Reports'].map((a) => (
                                <button key={a}
                                    className="text-xs font-semibold py-2.5 px-3 rounded-xl border border-gray-100 text-gray-600
                             hover:border-[#00BFFF] hover:text-[#00BFFF] hover:bg-sky-lighter transition-all duration-200">
                                    {a}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Hiring companies */}
                    <div className="card p-5 flex-1">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-900">Active Companies</h3>
                            <Star size={14} style={{ color: '#00BFFF' }} />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {COMPANIES.map((c) => (
                                <span key={c}
                                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 border border-gray-100
                             hover:border-[#00BFFF] hover:text-[#00BFFF] hover:bg-sky-lighter cursor-pointer transition-all duration-200">
                                    {c}
                                </span>
                            ))}
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                            <Users size={13} className="text-gray-300" />
                            <span className="text-xs text-gray-400">6 companies actively hiring this week</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
