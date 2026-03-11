import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, User, Briefcase, Bell, LogOut,
    ChevronDown, Menu, X, GraduationCap, Users,
    Settings, Award, Search, Code2, Trophy, BarChart2, BookOpen, Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ROLE_BADGE_STYLE = {
    Ignite: { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
    Spark: { bg: '#FEFCE8', color: '#A16207', border: '#FDE68A' },
    Alumni: { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
    Faculty: { bg: '#FAF5FF', color: '#7C3AED', border: '#E9D5FF' },
    Coordinator: { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
    Admin: { bg: '#E0F8FF', color: '#007FAA', border: '#b3e9ff' },
};

const NAV = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/profile', icon: User, label: 'Profile' },
    { to: '/jobs', icon: Briefcase, label: 'Jobs' },
    { to: '/contests', icon: Trophy, label: 'Contests' },
    { to: '/leaderboards', icon: BarChart2, label: 'Leaderboards' },
    { to: '/placement-stories', icon: BookOpen, label: 'Placement Stories' },
    { to: '/opportunities', icon: Zap, label: 'Opportunities' },
    { to: '/code-league/dsa-sheet', icon: Code2, label: 'DSA Sheet', roles: ['Ignite', 'Coordinator', 'Admin'] },
    { to: '/students', icon: GraduationCap, label: 'Students', roles: ['Faculty', 'Coordinator', 'Admin'] },
    { to: '/team', icon: Users, label: 'Team', roles: ['Coordinator', 'Admin'] },
    { to: '/settings', icon: Settings, label: 'Settings', roles: ['Admin'] },
];

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);

    const handleLogout = () => { logout(); navigate('/auth'); };
    const visibleLinks = NAV.filter((l) => !l.roles || l.roles.includes(user?.role));
    const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '??';
    const roleStyle = ROLE_BADGE_STYLE[user?.role] || ROLE_BADGE_STYLE.Admin;

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50/60">

            {/* ── Mobile overlay ── */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-20 bg-black/20 backdrop-blur-sm lg:hidden animate-fade-in"
                    onClick={() => setSidebarOpen(false)} />
            )}

            {/* ── Sidebar ─────────────────────────────── */}
            <aside className={`
        fixed inset-y-0 left-0 z-30 w-60 bg-white border-r border-gray-100 flex flex-col
        transition-transform duration-300 ease-spring
        ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:shadow-none
      `}>
                {/* Logo */}
                <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-100">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: '#00BFFF', boxShadow: '0 4px 12px rgba(0,191,255,.30)' }}>
                        <GraduationCap className="text-white" size={16} />
                    </div>
                    <span className="font-bold text-gray-900 text-base tracking-tight">PlaceMate</span>
                    <span className="ml-auto text-[9px] font-bold text-gray-300 tracking-widest uppercase">ANITS</span>
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 scrollbar-hide">
                    <p className="px-3 text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-3">Menu</p>
                    {visibleLinks.map(({ to, icon: Icon, label }) => (
                        <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <Icon size={16} />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                {/* User card */}
                <div className="p-3 border-t border-gray-100">
                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ background: roleStyle.bg, color: roleStyle.color, border: `1.5px solid ${roleStyle.border}` }}>
                            {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">{user?.name}</p>
                            <p className="text-[10px] font-medium mt-0.5" style={{ color: roleStyle.color }}>{user?.role}</p>
                        </div>
                        <button onClick={handleLogout} title="Logout"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400">
                            <LogOut size={14} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── Main ─────────────────────────────────── */}
            <div className="flex-1 flex flex-col overflow-hidden">

                {/* Header */}
                <header className="bg-white border-b border-gray-100 h-14 flex items-center px-4 gap-3 flex-shrink-0">
                    {/* Hamburger */}
                    <button className="lg:hidden p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors"
                        onClick={() => setSidebarOpen(!sidebarOpen)}>
                        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>

                    {/* Search */}
                    <div className="flex-1 max-w-xs">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                            <input type="search" placeholder="Search…" className="input pl-9 py-2 text-sm h-9 rounded-lg" />
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 ml-auto">
                        {/* Achievement pin */}
                        <button className="p-2 rounded-xl text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-all duration-200">
                            <Award size={18} />
                        </button>

                        {/* Bell */}
                        <div className="relative">
                            <button className="p-2 rounded-xl text-gray-400 hover:bg-gray-50 transition-all duration-200"
                                onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}>
                                <Bell size={18} />
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2 border-white"
                                    style={{ background: '#00BFFF' }} />
                            </button>

                            {notifOpen && (
                                <div className="absolute right-0 top-full mt-2 w-72 card p-0 z-50 overflow-hidden animate-scale-in">
                                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                                        <p className="text-sm font-semibold text-gray-800">Notifications</p>
                                        <button className="text-xs font-medium" style={{ color: '#00BFFF' }}>Mark all read</button>
                                    </div>
                                    {[
                                        { text: 'TCS NQT shortlist released', time: '2h ago' },
                                        { text: 'New drive: Infosys Systems Engineer', time: '5h ago' },
                                        { text: 'Your resume was approved', time: '1d ago' },
                                    ].map((n) => (
                                        <div key={n.text} className="px-4 py-3 border-b border-gray-50 hover:bg-sky-lighter transition-colors cursor-pointer">
                                            <p className="text-sm text-gray-800 font-medium">{n.text}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                                        </div>
                                    ))}
                                    <div className="px-4 py-2.5 text-center">
                                        <button className="text-xs font-semibold" style={{ color: '#00BFFF' }}>View all notifications</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Profile */}
                        <div className="relative">
                            <button onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
                                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                                    style={{ background: roleStyle.bg, color: roleStyle.color, border: `1.5px solid ${roleStyle.border}` }}>
                                    {initials}
                                </div>
                                <span className="hidden sm:block text-sm font-semibold text-gray-700">{user?.name?.split(' ')[0]}</span>
                                <ChevronDown size={13} className={`text-gray-400 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {profileOpen && (
                                <div className="absolute right-0 top-full mt-2 w-52 card p-1.5 z-50 animate-scale-in">
                                    <div className="px-3 py-2 mb-1">
                                        <p className="text-xs font-semibold text-gray-800 truncate">{user?.name}</p>
                                        <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
                                    </div>
                                    <hr className="border-gray-100 mx-1 mb-1" />
                                    <button onClick={() => { navigate('/profile'); setProfileOpen(false); }}
                                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors flex items-center gap-2">
                                        <User size={14} className="text-gray-400" /> My Profile
                                    </button>
                                    <button onClick={() => { navigate('/settings'); setProfileOpen(false); }}
                                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors flex items-center gap-2">
                                        <Settings size={14} className="text-gray-400" /> Settings
                                    </button>
                                    <hr className="border-gray-100 mx-1 my-1" />
                                    <button onClick={handleLogout}
                                        className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2">
                                        <LogOut size={14} /> Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-hide">
                    <div className="page-enter max-w-6xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
