import { Link } from 'react-router-dom';
import {
    GraduationCap, Briefcase, Users, BarChart2,
    ArrowRight, CheckCircle, ChevronRight, Zap,
} from 'lucide-react';

const FEATURES = [
    { icon: Briefcase, title: 'Live Job Drives', desc: 'Real-time placement drives, internships, and off-campus opportunities from top MNCs.', delay: 'stagger-1' },
    { icon: Users, title: 'Alumni Network', desc: 'Connect with ANITS alumni for mentorship, direct referrals, and mock interviews.', delay: 'stagger-2' },
    { icon: BarChart2, title: 'Deep Analytics', desc: 'Track placement stats, company trends, offer rates, and role-wise performance.', delay: 'stagger-3' },
    { icon: GraduationCap, 'title': 'Role Dashboards', desc: 'Separate portals for Ignite, Spark, Alumni, Faculty, Coordinator, and Admin.', delay: 'stagger-4' },
];

const HIGHLIGHTS = [
    'One-click apply & real-time application tracking',
    'Resume builder with ATS score & suggestions',
    'Live placement notifications via Socket.io',
    'Coordinator approval & offer-letter workflows',
];

const STATS = [
    { val: '850+', label: 'Students Placed' },
    { val: '120+', label: 'Partner Companies' },
    { val: '98%', label: 'Offer Acceptance' },
];

export default function Landing() {
    return (
        <div className="min-h-screen bg-white flex flex-col overflow-hidden">

            {/* ─── Navbar ─────────────────────────────── */}
            <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 animate-fade-in">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#00BFFF', boxShadow: '0 4px 12px rgba(0,191,255,.35)' }}>
                            <GraduationCap className="text-white" size={17} />
                        </div>
                        <span className="text-base font-bold text-gray-900 tracking-tight">PlaceMate</span>
                        <span className="hidden sm:inline ml-0.5 text-[10px] font-bold text-gray-300 uppercase tracking-[.15em]">· ANITS</span>
                    </div>
                    <div className="flex items-center gap-2 animate-fade-in">
                        <Link to="/auth" className="btn-ghost text-sm">Login</Link>
                        <Link to="/auth?tab=register" className="btn-primary text-sm px-5 py-2">
                            Get Started <ArrowRight size={14} />
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ─── Hero ────────────────────────────────── */}
            <section className="relative flex flex-col items-center text-center px-4 pt-24 pb-20 overflow-hidden">
                {/* Orbs */}
                <div className="orb w-96 h-96 -top-24 -left-24" />
                <div className="orb w-80 h-80 -bottom-20 -right-20" style={{ opacity: .08 }} />

                {/* Live badge */}
                <div className="animate-fade-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-7 border"
                    style={{ background: '#E0F8FF', borderColor: '#b3e9ff', color: '#007FAA' }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: '#00BFFF' }} />
                    Placement Season 2025–26 is Live
                </div>

                {/* Heading */}
                <h1 className="animate-fade-up [animation-delay:.05s] text-[2.75rem] sm:text-[3.5rem] lg:text-[4.25rem] font-black text-gray-900 leading-[1.08] tracking-tight max-w-4xl mb-6">
                    Your Campus Placement<br />
                    <span className="text-gradient">Made Effortless.</span>
                </h1>

                <p className="animate-fade-up [animation-delay:.10s] text-lg text-gray-400 max-w-xl mb-10 leading-relaxed">
                    PlaceMate connects ANITS students, alumni, faculty, and coordinators in one intelligent platform — from job listing to offer letter.
                </p>

                {/* CTAs */}
                <div className="animate-fade-up [animation-delay:.15s] flex flex-col sm:flex-row items-center gap-3 mb-16">
                    <Link to="/auth?tab=register" className="btn-primary text-base px-8 py-3 rounded-2xl">
                        Start Free <ArrowRight size={18} />
                    </Link>
                    <Link to="/auth" className="btn-secondary text-base px-8 py-3 rounded-2xl">
                        Login to Portal
                    </Link>
                </div>

                {/* Stats strip */}
                <div className="animate-fade-up [animation-delay:.20s] flex items-center gap-10 sm:gap-16 p-5 rounded-2xl bg-gray-50 border border-gray-100 mb-20">
                    {STATS.map(({ val, label }, i) => (
                        <div key={label} className={`text-center ${i < STATS.length - 1 ? 'pr-10 sm:pr-16 border-r border-gray-200' : ''}`}>
                            <p className="text-2xl font-black text-gray-900">{val}</p>
                            <p className="text-xs text-gray-400 mt-0.5 font-medium">{label}</p>
                        </div>
                    ))}
                </div>

                {/* Feature cards */}
                <div className="w-full max-w-6xl grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-20 text-left">
                    {FEATURES.map(({ icon: Icon, title, desc, delay }) => (
                        <div key={title} className={`card p-6 cursor-default animate-fade-up ${delay}`}>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 flex-shrink-0"
                                style={{ background: '#E0F8FF' }}>
                                <Icon style={{ color: '#00BFFF' }} size={19} />
                            </div>
                            <h3 className="font-bold text-gray-900 mb-1.5 text-sm">{title}</h3>
                            <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
                        </div>
                    ))}
                </div>

                {/* Highlights */}
                <div className="animate-fade-up stagger-5 card max-w-2xl w-full p-8 text-left">
                    <div className="flex items-center gap-2 mb-6">
                        <Zap style={{ color: '#00BFFF' }} size={18} />
                        <h2 className="text-lg font-bold text-gray-900">Everything in one place</h2>
                    </div>
                    <ul className="space-y-3.5 mb-7">
                        {HIGHLIGHTS.map((h) => (
                            <li key={h} className="flex items-start gap-3 text-sm text-gray-600">
                                <CheckCircle style={{ color: '#00BFFF' }} className="flex-shrink-0 mt-0.5" size={16} />
                                {h}
                            </li>
                        ))}
                    </ul>
                    <Link to="/auth?tab=register" className="btn-primary w-full py-3 rounded-2xl text-base">
                        Join PlaceMate <ChevronRight size={17} />
                    </Link>
                </div>
            </section>

            {/* ─── Footer ──────────────────────────────── */}
            <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-300 mt-auto">
                © {new Date().getFullYear()} PlaceMate · ANITS. Built for placement excellence.
            </footer>
        </div>
    );
}
