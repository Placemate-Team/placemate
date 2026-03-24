import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import {
    GraduationCap, UserCircle, School, ChevronLeft,
    Loader2, Check, AlertCircle, ExternalLink, ShieldCheck
} from 'lucide-react';

/* ─── Constants ──────────────────────────────────────────────── */
const BRANCHES = ['CSE', 'ECE', 'IT', 'Mechanical', 'Civil', 'EEE', 'Chemical'];
const BATCHES = ['2025-2029', '2026-2030', '2027-2031', '2028-2032', '2029-2033', '2030-2034'];
const GRAD_YEARS = ['2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015'];
const FACULTY_DESIGS = ['Professor', 'Associate Professor', 'Assistant Professor', 'HOD', 'Lecturer', 'Senior Lecturer'];

/* ─── Animation Variants ─────────────────────────────────────── */
const fadeScale = {
    initial: { opacity: 0, scale: 0.96, y: 8 },
    animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, scale: 0.96, y: -8, transition: { duration: 0.2, ease: 'easeIn' } },
};
const slideIn = {
    initial: { opacity: 0, x: 40 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, x: -40, transition: { duration: 0.2, ease: 'easeIn' } },
};
const collapseDown = {
    initial: { opacity: 0, height: 0, marginTop: 0 },
    animate: { opacity: 1, height: 'auto', marginTop: 16, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, height: 0, marginTop: 0, transition: { duration: 0.2, ease: 'easeIn' } },
};

/* ─── Google "G" SVG ──────────────────────────────────────────── */
const GoogleG = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.61z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

/* ─── Field Wrapper ───────────────────────────────────────────── */
const Field = ({ label, required, children, error, hint }) => (
    <div className="flex flex-col gap-1">
        <label className="text-[13px] font-medium text-slate-700 leading-none">
            {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        {children}
        {hint && !error && <p className="text-[11px] text-slate-400 leading-tight">{hint}</p>}
        <AnimatePresence>
            {error && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="text-[11px] text-red-500 flex items-center gap-1 leading-tight">
                    <AlertCircle size={10} />{error}
                </motion.p>
            )}
        </AnimatePresence>
    </div>
);

/* ─── Input ───────────────────────────────────────────────────── */
const Inp = ({ cls = '', ...p }) => (
    <input {...p}
        className={`w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] text-[#0F172A]
            placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00BFFF]/50
            focus:border-[#00BFFF] transition-all duration-150 bg-white ${cls}`} />
);

/* ─── Select ──────────────────────────────────────────────────── */
const Sel = ({ children, cls = '', ...p }) => (
    <select {...p}
        className={`w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] text-[#0F172A]
            focus:outline-none focus:ring-2 focus:ring-[#00BFFF]/50 focus:border-[#00BFFF]
            transition-all duration-150 bg-white cursor-pointer ${cls}`}>
        {children}
    </select>
);

/* ─── Role Card ───────────────────────────────────────────────── */
const RoleCard = ({ id, icon: Icon, label, sub, selected, onClick }) => (
    <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => onClick(id)}
        className={`relative flex flex-col items-center gap-1.5 p-3.5 rounded-2xl border-2 w-full text-center
            transition-colors duration-200 cursor-pointer
            ${selected ? 'border-[#00BFFF] bg-[#00BFFF]/5' : 'border-[#E2E8F0] bg-white hover:border-slate-300'}`}>
        {selected && (
            <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#00BFFF] flex items-center justify-center">
                <Check size={9} className="text-white" strokeWidth={3.5} />
            </span>
        )}
        <span className={`p-2 rounded-xl transition-colors ${selected ? 'bg-[#00BFFF]/15' : 'bg-slate-100'}`}>
            <Icon size={20} className={selected ? 'text-[#00BFFF]' : 'text-slate-400'} />
        </span>
        <span className={`text-[12px] font-semibold leading-none ${selected ? 'text-[#00BFFF]' : 'text-slate-700'}`}>{label}</span>
        <span className="text-[10px] text-slate-400 leading-tight">{sub}</span>
    </motion.button>
);

/* ══════════════ MAIN AUTH COMPONENT ══════════════════════════ */
export default function Auth() {
    const navigate = useNavigate();

    // UI state
    const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'profile'
    const [googleLoading, setGLoad] = useState(false);
    const [submitLoading, setSLoad] = useState(false);

    // Profile form state
    const [googleEmail, setGEmail] = useState('');
    const [role, setRole] = useState('');
    const [form, setForm] = useState({});
    const [errs, setErrs] = useState({});
    const [shake, setShake] = useState(false);

    const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

    /* ── Validation ────────────────────────────────────────── */
    const validate = () => {
        const e = {};
        if (!role) { e.role = 'Please choose a role'; }
        if (role === 'Student') {
            if (!form.name?.trim()) e.name = 'Full name is required';
            if (!form.nickname?.trim()) e.nickname = 'Nickname is required';
            if (!form.college) e.college = 'Select your college';
            if (form.college === 'ANITS') {
                if (!form.rollNumber?.trim()) e.rollNumber = 'Roll number is required';
                if (!form.branch) e.branch = 'Branch is required';
                if (!form.batch) e.batch = 'Batch is required';
                if (form.linkedIn && !/^https?:\/\//.test(form.linkedIn))
                    e.linkedIn = 'Must start with https://';
            }
        } else if (role === 'Alumni') {
            if (!form.name?.trim()) e.name = 'Full name is required';
            if (!form.branch) e.branch = 'Branch is required';
            if (!form.batch) e.batch = 'Graduation year is required';
            if (!form.linkedIn?.trim()) e.linkedIn = 'LinkedIn URL is required';
            else if (!/^https?:\/\//.test(form.linkedIn)) e.linkedIn = 'Must start with https://';
            if (!form.placedCompany?.trim()) e.placedCompany = 'Company name is required';
        } else if (role === 'Faculty') {
            if (!form.name?.trim()) e.name = 'Full name is required';
            if (!form.department) e.department = 'Department is required';
            if (!form.designation) e.designation = 'Designation is required';
            if (!form.phone?.trim()) e.phone = 'Phone number is required';
        }
        setErrs(e);
        return Object.keys(e).length === 0;
    };

    /* ── Google Token → Backend → Route Decision ───────────── */
    const handleGoogleSuccess = async (codeResponse) => {
        setGLoad(true);
        try {
            // Note: axios.defaults.baseURL = '/api' (set in AuthContext)
            // So we use '/auth/google-code' NOT '/api/auth/google-code'
            const { data } = await axios.post('/auth/google-code', { code: codeResponse.code });

            // Backend returns isNewUser=true when this is a brand-new account, false for returning users
            const { isNewUser } = data;

            if (mode === 'login') {
                // ── Login mode: only accept EXISTING users ──────────
                if (isNewUser) {
                    // Brand new account — reject and tell them to sign up
                    toast('No account found. Please sign up first.', {
                        icon: '🔐',
                        style: { background: '#0F172A', color: '#fff' },
                        duration: 3500,
                    });
                    setMode('signup');
                    setGLoad(false);
                    return;
                }
                if (data.profileComplete) {
                    // Existing user, profile done → dashboard
                    localStorage.setItem('pm_token', data.token);
                    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
                    toast.success('Welcome back! Redirecting…', { duration: 2000 });
                    setTimeout(() => navigate('/dashboard', { replace: true }), 600);
                } else {
                    // Existing user, profile incomplete → show form
                    localStorage.setItem('pm_token', data.token);
                    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
                    setGEmail(data.user?.email || '');
                    setMode('profile');
                }
            } else {
                // ── Signup mode: allow new AND returning users ──────
                localStorage.setItem('pm_token', data.token);
                axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;

                if (data.profileComplete) {
                    // Already complete → dashboard with welcome back
                    toast('Email already registered — logging you in', {
                        icon: '🔑',
                        style: { background: '#0F172A', color: '#fff' },
                        duration: 2500,
                    });
                    setTimeout(() => navigate('/dashboard', { replace: true }), 600);
                } else {
                    // New or incomplete → profile form
                    setGEmail(data.user?.email || '');
                    setMode('profile');
                }
            }
        } catch (err) {
            const msg = err?.response?.data?.message || 'Google sign-in failed. Try again.';
            toast.error(msg);
        } finally {
            setGLoad(false);
        }
    };

    /* ── useGoogleLogin ─────────────────────────────────────── */
    const triggerGoogle = useGoogleLogin({
        flow: 'auth-code',
        onSuccess: handleGoogleSuccess,
        onError: () => {
            setGLoad(false);
            toast.error('Google sign-in was cancelled.');
        },
    });

    const handleGoogleClick = () => {
        setGLoad(true);
        triggerGoogle();
    };

    /* ── Profile Submit ─────────────────────────────────────── */
    const handleSubmit = async (ev) => {
        ev.preventDefault();
        if (!validate()) {
            setShake(true);
            setTimeout(() => setShake(false), 600);
            toast.error('Please fix the errors above.', { duration: 2000 });
            return;
        }
        setSLoad(true);
        try {
            // baseURL is '/api', so path is '/auth/complete-profile'
            const { data } = await axios.post('/auth/complete-profile', {
                ...form,
                selectedRole: role,
            });

            localStorage.setItem('pm_token', data.token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;

            if (data.redirectMessage) {
                toast.success(data.redirectMessage, { duration: 4000 });
            } else if (data.status === 'pending') {
                toast("Your request is pending. We'll verify via LinkedIn shortly.", {
                    icon: '⌛',
                    style: { background: '#0F172A', color: '#fff' },
                    duration: 4000,
                });
            } else {
                toast.success('🎉 Welcome to PlaceMate!', { duration: 2500 });
            }

            setTimeout(() => navigate('/dashboard', { replace: true }), 900);
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to save profile. Try again.');
        } finally {
            setSLoad(false);
        }
    };

    /* ── Render ─────────────────────────────────────────────── */
    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center relative overflow-hidden">

            {/* ── Animated Gradient Background ─────────────────── */}
            <div className="auth-bg-wave" aria-hidden="true" />

            <Toaster position="top-center" toastOptions={{
                style: { borderRadius: '14px', background: '#0F172A', color: '#fff', fontSize: '13px', padding: '12px 18px' },
                success: { iconTheme: { primary: '#00BFFF', secondary: '#fff' } },
                error: { iconTheme: { primary: '#F87171', secondary: '#fff' } },
            }} />

            {/* ── Card ─────────────────────────────────────────── */}
            <div className="w-full flex items-center justify-center px-4 py-8 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-md"
                >
                    <div className="rounded-3xl bg-white shadow-[0_10px_15px_-3px_rgb(0_0_0/0.10),0_4px_6px_-4px_rgb(0_0_0/0.05)] border border-[#E2E8F0] overflow-hidden">

                        {/* Brand strip */}
                        <div className="flex items-center gap-2.5 px-7 pt-7 pb-1">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ background: 'linear-gradient(135deg,#00BFFF 0%,#007FBF 100%)', boxShadow: '0 3px 10px rgba(0,191,255,.35)' }}>
                                <GraduationCap size={16} className="text-white" />
                            </div>
                            <span className="font-bold text-[#0F172A] text-[15px] tracking-tight">PlaceMate</span>
                            <span className="ml-auto text-[11px] text-slate-400 font-medium">ANITS · VZM</span>
                        </div>

                        <div className="px-7 pb-7 pt-5">
                            <AnimatePresence mode="wait">

                                {/* ══ LOGIN / SIGNUP ══ */}
                                {(mode === 'login' || mode === 'signup') && (
                                    <motion.div key="auth-pane" variants={fadeScale} initial="initial" animate="animate" exit="exit">

                                        {/* Heading */}
                                        <div className="mb-7">
                                            <h1 className="text-3xl font-semibold tracking-tight text-[#0F172A] leading-tight">
                                                {mode === 'login' ? 'Welcome to PlaceMate' : 'Join PlaceMate'}
                                            </h1>
                                            <p className="text-slate-500 text-sm mt-1">
                                                {mode === 'login' ? 'Your ANITS placement companion' : 'Create your account to get started'}
                                            </p>
                                            <AnimatePresence>
                                                {mode === 'signup' && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                        animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
                                                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                                        transition={{ duration: 0.25 }}
                                                        className="overflow-hidden">
                                                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-[#E2E8F0]">
                                                            <ShieldCheck size={13} className="text-[#00BFFF] flex-shrink-0" />
                                                            <p className="text-[11px] text-slate-500">We only use Google to verify your email address</p>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* Google Button */}
                                        <button
                                            type="button"
                                            id="google-signin-btn"
                                            onClick={handleGoogleClick}
                                            disabled={googleLoading}
                                            className="w-full h-[52px] flex items-center justify-center gap-3 rounded-2xl
                                                bg-white border-2 border-[#E2E8F0] shadow-sm font-medium text-[#0F172A]
                                                hover:border-[#00BFFF] hover:shadow-md transition-all duration-200 text-sm
                                                disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {googleLoading
                                                ? <><Loader2 size={18} className="animate-spin text-[#00BFFF]" /><span>Signing in…</span></>
                                                : <><GoogleG /><span>{mode === 'login' ? 'Sign in with Google' : 'Continue with Google'}</span></>
                                            }
                                        </button>

                                        {/* Toggle link */}
                                        <div className="mt-5 text-center">
                                            {mode === 'login' ? (
                                                <p className="text-sm text-slate-500">
                                                    New user?{' '}
                                                    <button type="button" onClick={() => setMode('signup')}
                                                        className="text-[#00BFFF] font-semibold hover:underline underline-offset-2 cursor-pointer">
                                                        Sign up here
                                                    </button>
                                                </p>
                                            ) : (
                                                <p className="text-sm text-slate-500">
                                                    Already have an account?{' '}
                                                    <button type="button" onClick={() => setMode('login')}
                                                        className="text-[#00BFFF] font-semibold hover:underline underline-offset-2 cursor-pointer">
                                                        Sign in
                                                    </button>
                                                </p>
                                            )}
                                        </div>

                                        <div className="mt-7 pt-5 border-t border-[#E2E8F0] text-center">
                                            <p className="text-[11px] text-slate-400 leading-relaxed">
                                                By continuing you agree to PlaceMate's Terms &amp; Privacy Policy.
                                            </p>
                                        </div>
                                    </motion.div>
                                )}

                                {/* ══ COMPLETE PROFILE ══ */}
                                {mode === 'profile' && (
                                    <motion.div key="profile-pane" variants={slideIn} initial="initial" animate="animate" exit="exit">

                                        {/* Back */}
                                        <button type="button"
                                            onClick={() => { setMode('login'); setRole(''); setForm({}); setErrs({}); setGEmail(''); }}
                                            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-[13px] mb-5 transition-colors">
                                            <ChevronLeft size={15} /> Back
                                        </button>

                                        {/* Header */}
                                        <div className="mb-6">
                                            <h2 className="text-3xl font-semibold tracking-tight text-[#0F172A]">Complete your profile</h2>
                                            {googleEmail && (
                                                <p className="text-slate-500 text-sm mt-1">
                                                    Verified email:{' '}
                                                    <span className="font-semibold text-[#0F172A]">{googleEmail}</span>{' '}
                                                    <span className="text-slate-400">(secured by Google)</span>
                                                </p>
                                            )}
                                        </div>

                                        <form onSubmit={handleSubmit} className="space-y-5">

                                            {/* Role Selection */}
                                            <div className="space-y-2">
                                                <p className="text-[13px] font-medium text-slate-700">
                                                    I am a… <span className="text-red-400">*</span>
                                                </p>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <RoleCard id="Student" icon={UserCircle} label="Student" sub="Current student" selected={role === 'Student'} onClick={setRole} />
                                                    <RoleCard id="Alumni" icon={GraduationCap} label="Alumni" sub="ANITS graduate" selected={role === 'Alumni'} onClick={setRole} />
                                                    <RoleCard id="Faculty" icon={School} label="Faculty" sub="Teaching staff" selected={role === 'Faculty'} onClick={setRole} />
                                                </div>
                                                {errs.role && (
                                                    <p className="text-[11px] text-red-500 flex items-center gap-1">
                                                        <AlertCircle size={10} />{errs.role}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Conditional Fields */}
                                            <motion.div animate={shake ? { x: [0, -7, 7, -5, 5, -2, 2, 0] } : {}} transition={{ duration: 0.5 }}>
                                                <AnimatePresence mode="wait">

                                                    {/* ── STUDENT ── */}
                                                    {role === 'Student' && (
                                                        <motion.div key="student" variants={collapseDown} initial="initial" animate="animate" exit="exit"
                                                            className="space-y-4 overflow-hidden">

                                                            <Field label="Full Name" required error={errs.name} hint="As per college ID card">
                                                                <Inp type="text" placeholder="Your full name" value={form.name || ''} onChange={e => f('name', e.target.value)} />
                                                            </Field>

                                                            <Field label="Nickname" required error={errs.nickname} hint="For Code League leaderboards">
                                                                <Inp type="text" placeholder="e.g. Ace_Coder" value={form.nickname || ''} onChange={e => f('nickname', e.target.value)} />
                                                            </Field>

                                                            <Field label="Phone Number" hint="Optional — kept private">
                                                                <Inp type="tel" placeholder="+91 98765 43210" value={form.phone || ''} onChange={e => f('phone', e.target.value)} />
                                                            </Field>

                                                            <Field label="College" required error={errs.college}>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    {['ANITS', 'Other College'].map(c => (
                                                                        <button key={c} type="button" onClick={() => f('college', c)}
                                                                            className={`py-2.5 px-3 rounded-xl border-2 text-[12px] font-semibold transition-all duration-150
                                                                                ${form.college === c
                                                                                    ? 'border-[#00BFFF] bg-[#00BFFF]/5 text-[#00BFFF]'
                                                                                    : 'border-[#E2E8F0] text-slate-600 hover:border-slate-300'}`}>
                                                                            {c}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </Field>

                                                            <AnimatePresence>
                                                                {form.college === 'ANITS' && (
                                                                    <motion.div key="anits"
                                                                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                                                        exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.28 }}
                                                                        className="space-y-4 overflow-hidden">
                                                                        <Field label="Roll Number" required error={errs.rollNumber}>
                                                                            <Inp placeholder="e.g. 21A51A0501" value={form.rollNumber || ''} onChange={e => f('rollNumber', e.target.value)} />
                                                                        </Field>
                                                                        <div className="grid grid-cols-2 gap-3">
                                                                            <Field label="Branch" required error={errs.branch}>
                                                                                <Sel value={form.branch || ''} onChange={e => f('branch', e.target.value)}>
                                                                                    <option value="">Branch</option>
                                                                                    {BRANCHES.map(b => <option key={b}>{b}</option>)}
                                                                                </Sel>
                                                                            </Field>
                                                                            <Field label="Batch" required error={errs.batch}>
                                                                                <Sel value={form.batch || ''} onChange={e => f('batch', e.target.value)}>
                                                                                    <option value="">Batch</option>
                                                                                    {BATCHES.map(b => <option key={b}>{b}</option>)}
                                                                                </Sel>
                                                                            </Field>
                                                                        </div>
                                                                        <Field label="LinkedIn URL" hint="Optional — https://linkedin.com/in/..." error={errs.linkedIn}>
                                                                            <div className="relative">
                                                                                <Inp placeholder="https://linkedin.com/in/..." value={form.linkedIn || ''} onChange={e => f('linkedIn', e.target.value)} cls="pr-8" />
                                                                                <ExternalLink size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" />
                                                                            </div>
                                                                        </Field>
                                                                    </motion.div>
                                                                )}
                                                                {form.college === 'Other College' && (
                                                                    <motion.div key="other"
                                                                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                                                        exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}
                                                                        className="overflow-hidden">
                                                                        <div className="bg-slate-50 border border-[#E2E8F0] rounded-xl p-4 text-slate-500 text-sm mt-4">
                                                                            We'll ask for branch, batch, and college name when you register for a contest.
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </motion.div>
                                                    )}

                                                    {/* ── ALUMNI ── */}
                                                    {role === 'Alumni' && (
                                                        <motion.div key="alumni" variants={collapseDown} initial="initial" animate="animate" exit="exit"
                                                            className="space-y-4 overflow-hidden">

                                                            <Field label="Full Name" required error={errs.name}>
                                                                <Inp placeholder="Your full name" value={form.name || ''} onChange={e => f('name', e.target.value)} />
                                                            </Field>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <Field label="Branch" required error={errs.branch}>
                                                                    <Sel value={form.branch || ''} onChange={e => f('branch', e.target.value)}>
                                                                        <option value="">Branch</option>
                                                                        {BRANCHES.map(b => <option key={b}>{b}</option>)}
                                                                    </Sel>
                                                                </Field>
                                                                <Field label="Graduation Year" required error={errs.batch}>
                                                                    <Sel value={form.batch || ''} onChange={e => f('batch', e.target.value)}>
                                                                        <option value="">Year</option>
                                                                        {GRAD_YEARS.map(y => <option key={y}>{y}</option>)}
                                                                    </Sel>
                                                                </Field>
                                                            </div>
                                                            <Field label="Roll Number" hint="Optional">
                                                                <Inp placeholder="e.g. 21A51A0501" value={form.rollNumber || ''} onChange={e => f('rollNumber', e.target.value)} />
                                                            </Field>
                                                            <Field label="LinkedIn Profile URL" required error={errs.linkedIn}>
                                                                <div className="relative">
                                                                    <Inp placeholder="https://linkedin.com/in/..." value={form.linkedIn || ''} onChange={e => f('linkedIn', e.target.value)} cls="pr-8" />
                                                                    <ExternalLink size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" />
                                                                </div>
                                                            </Field>
                                                            <Field label="Placed via ANITS (Company)" required error={errs.placedCompany}>
                                                                <Inp placeholder="e.g. TCS, Infosys, Wipro…" value={form.placedCompany || ''} onChange={e => f('placedCompany', e.target.value)} />
                                                            </Field>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <Field label="Current Company" hint="Optional">
                                                                    <Inp placeholder="Current employer" value={form.currentCompany || ''} onChange={e => f('currentCompany', e.target.value)} />
                                                                </Field>
                                                                <Field label="Designation" hint="Optional">
                                                                    <Inp placeholder="e.g. SDE II" value={form.currentDesignation || ''} onChange={e => f('currentDesignation', e.target.value)} />
                                                                </Field>
                                                            </div>
                                                            <div className="rounded-xl p-3.5 text-[12px] leading-relaxed text-amber-700 bg-amber-50 border border-amber-200">
                                                                ⌛ Alumni profiles require verification. You'll be notified once approved.
                                                            </div>
                                                        </motion.div>
                                                    )}

                                                    {/* ── FACULTY ── */}
                                                    {role === 'Faculty' && (
                                                        <motion.div key="faculty" variants={collapseDown} initial="initial" animate="animate" exit="exit"
                                                            className="space-y-4 overflow-hidden">

                                                            <Field label="Full Name" required error={errs.name}>
                                                                <Inp placeholder="Your full name" value={form.name || ''} onChange={e => f('name', e.target.value)} />
                                                            </Field>
                                                            <Field label="College">
                                                                <div className="px-3 py-2.5 rounded-xl border border-[#E2E8F0] bg-slate-50 text-[13px] text-slate-700 font-medium">
                                                                    ANITS — Anil Neerukonda Institute of Technology &amp; Sciences
                                                                </div>
                                                            </Field>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <Field label="Department" required error={errs.department}>
                                                                    <Sel value={form.department || ''} onChange={e => f('department', e.target.value)}>
                                                                        <option value="">Dept.</option>
                                                                        {BRANCHES.map(b => <option key={b}>{b}</option>)}
                                                                    </Sel>
                                                                </Field>
                                                                <Field label="Designation" required error={errs.designation}>
                                                                    <Sel value={form.designation || ''} onChange={e => f('designation', e.target.value)}>
                                                                        <option value="">Designation</option>
                                                                        {FACULTY_DESIGS.map(d => <option key={d}>{d}</option>)}
                                                                    </Sel>
                                                                </Field>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <Field label="Years at College" hint="Optional">
                                                                    <Inp type="number" min="0" max="50" placeholder="e.g. 5" value={form.yearsOfExperience || ''} onChange={e => f('yearsOfExperience', e.target.value)} />
                                                                </Field>
                                                                <Field label="Employee ID" hint="Optional">
                                                                    <Inp placeholder="Staff ID" value={form.employeeId || ''} onChange={e => f('employeeId', e.target.value)} />
                                                                </Field>
                                                            </div>
                                                            <Field label="Phone Number" required error={errs.phone}>
                                                                <Inp type="tel" placeholder="+91 98765 43210" value={form.phone || ''} onChange={e => f('phone', e.target.value)} />
                                                            </Field>
                                                            <div className="rounded-xl p-3.5 text-[12px] leading-relaxed text-amber-700 bg-amber-50 border border-amber-200">
                                                                ⌛ Faculty profiles require admin approval. You'll be notified once approved.
                                                            </div>
                                                        </motion.div>
                                                    )}

                                                </AnimatePresence>
                                            </motion.div>

                                            {/* Submit Button */}
                                            <AnimatePresence>
                                                {role && (
                                                    <motion.button
                                                        type="submit"
                                                        disabled={submitLoading}
                                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                                        whileHover={submitLoading ? {} : { scale: 1.02 }}
                                                        whileTap={submitLoading ? {} : { scale: 0.99 }}
                                                        className="w-full h-[52px] flex items-center justify-center gap-2 rounded-2xl
                                                            bg-[#00BFFF] hover:bg-[#00AEED] text-white font-medium text-[13px]
                                                            transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed
                                                            shadow-[0_4px_14px_rgba(0,191,255,0.35)]"
                                                    >
                                                        {submitLoading
                                                            ? <><Loader2 size={16} className="animate-spin" /> Saving…</>
                                                            : <><Check size={15} /> Complete Profile &amp; Continue</>}
                                                    </motion.button>
                                                )}
                                            </AnimatePresence>

                                        </form>
                                    </motion.div>
                                )}

                            </AnimatePresence>
                        </div>
                    </div>

                    <p className="text-center text-[11px] text-slate-400 mt-5">
                        © {new Date().getFullYear()} PlaceMate · ANITS, Visakhapatnam
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
