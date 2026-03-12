import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
    UserCircle, Mail, Phone, ExternalLink, School,
    GraduationCap, Briefcase, Hash, Calendar, ShieldCheck, X, Loader2
} from 'lucide-react';

const ROLE_THEMES = {
    Ignite: { label: 'Ignite Student', accent: '#FF6B35', bg: '#FFF7ED', border: '#FED7AA' },
    Spark: { label: 'Spark Student', accent: '#D97706', bg: '#FEFCE8', border: '#FDE68A' },
    Alumni: { label: 'Alumni', accent: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
    Faculty: { label: 'Faculty', accent: '#7C3AED', bg: '#FAF5FF', border: '#E9D5FF' },
    Coordinator: { label: 'Coordinator', accent: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
    Admin: { label: 'Admin', accent: '#007FAA', bg: '#E0F8FF', border: '#b3e9ff' },
};

const BRANCHES = ['CSE', 'ECE', 'IT', 'Mechanical', 'Civil', 'EEE', 'Chemical'];
const BATCHES = ['2025-2029', '2026-2030', '2027-2031', '2028-2032', '2029-2033', '2030-2034'];
const GRAD_YEARS = ['2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015'];
const FACULTY_DESIGS = ['Professor', 'Associate Professor', 'Assistant Professor', 'HOD', 'Lecturer', 'Senior Lecturer'];

/* ── Info Item Helper ── */
const InfoRow = ({ icon: Icon, label, value, href }) => {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0 last:pb-0">
            <div className="mt-0.5 p-1.5 rounded-lg bg-sky-light text-sky border border-[#b3e9ff]">
                <Icon size={14} />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium mb-0.5">{label}</p>
                {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-semibold text-sky hover:underline flex items-center gap-1">
                        {value} <ExternalLink size={12} />
                    </a>
                ) : (
                    <p className="text-sm font-semibold text-gray-900 truncate">{value}</p>
                )}
            </div>
        </div>
    );
};

/* ── Form Built-ins ── */
const Field = ({ label, children }) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-semibold text-slate-700">{label}</label>
        {children}
    </div>
);

const Inp = ({ cls = '', ...p }) => (
    <input {...p} className={`w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-[13px] bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#00BFFF]/20 focus:border-[#00BFFF] outline-none transition-all ${cls}`} />
);

const Sel = ({ children, cls = '', ...p }) => (
    <select {...p} className={`w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-[13px] bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#00BFFF]/20 focus:border-[#00BFFF] outline-none transition-all ${cls}`}>
        {children}
    </select>
);


export default function Profile() {
    const { user, setUserFromGoogle } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({});
    const [loading, setLoading] = useState(false);

    // Initialize form when opening modal
    useEffect(() => {
        if (isEditing && user) {
            setForm({ ...user });
        }
    }, [isEditing, user]);

    if (!user) return null;

    const theme = ROLE_THEMES[user.role] || ROLE_THEMES.Ignite;
    const isPending = user.status === 'pending';
    const Initial = user.name ? user.name.charAt(0).toUpperCase() : '?';

    const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await axios.put('/auth/profile', form);
            setUserFromGoogle(data.user); // Update context instantly
            toast.success('Profile updated successfully!');
            setIsEditing(false);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const modalContent = (
        <AnimatePresence>
            {isEditing && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm shadow-2xl">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Modal Header */}
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-10">
                            <h3 className="text-xl font-bold text-gray-900">Edit Profile</h3>
                            <button onClick={() => setIsEditing(false)} className="p-2 -mr-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#00BFFF]/30">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body (Scrollable) */}
                        <form id="profile-edit-form" onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                            
                            {/* Always Editable Fields */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <Field label="Full Name"><Inp value={form.name || ''} onChange={e => f('name', e.target.value)} required /></Field>
                                <Field label="Phone Number"><Inp value={form.phone || ''} onChange={e => f('phone', e.target.value)} /></Field>
                            </div>
                            <Field label="LinkedIn URL"><Inp value={form.linkedIn || ''} onChange={e => f('linkedIn', e.target.value)} type="url" placeholder="https://linkedin.com/in/..." /></Field>

                            <hr className="border-gray-100 my-1" />

                            {/* Student Edits */}
                            {(user.role === 'Ignite' || user.role === 'Spark') && (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <Field label="Nickname (Leaderboard)"><Inp value={form.nickname || ''} onChange={e => f('nickname', e.target.value)} required /></Field>
                                        <Field label="Roll Number"><Inp value={form.rollNumber || ''} onChange={e => f('rollNumber', e.target.value)} /></Field>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <Field label="Branch">
                                            <Sel value={form.branch || ''} onChange={e => f('branch', e.target.value)}>
                                                <option value="">Select Branch</option>
                                                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                                            </Sel>
                                        </Field>
                                        <Field label="Batch">
                                            <Sel value={form.batch || ''} onChange={e => f('batch', e.target.value)}>
                                                <option value="">Select Batch</option>
                                                {BATCHES.map(b => <option key={b} value={b}>{b}</option>)}
                                            </Sel>
                                        </Field>
                                    </div>
                                </>
                            )}

                            {/* Alumni Edits */}
                            {user.role === 'Alumni' && (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <Field label="Current Company"><Inp value={form.currentCompany || ''} onChange={e => f('currentCompany', e.target.value)} /></Field>
                                        <Field label="Current Designation"><Inp value={form.currentDesignation || ''} onChange={e => f('currentDesignation', e.target.value)} /></Field>
                                    </div>
                                    <Field label="Placed via ANITS (Company)"><Inp value={form.placedCompany || ''} onChange={e => f('placedCompany', e.target.value)} required /></Field>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <Field label="Branch">
                                            <Sel value={form.branch || ''} onChange={e => f('branch', e.target.value)} required>
                                                <option value="">Select Branch</option>
                                                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                                            </Sel>
                                        </Field>
                                        <Field label="Graduation Year">
                                            <Sel value={form.batch || ''} onChange={e => f('batch', e.target.value)} required>
                                                <option value="">Select Year</option>
                                                {GRAD_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                            </Sel>
                                        </Field>
                                    </div>
                                    <Field label="Roll Number (Optional)"><Inp value={form.rollNumber || ''} onChange={e => f('rollNumber', e.target.value)} /></Field>
                                </>
                            )}

                            {/* Faculty Edits */}
                            {user.role === 'Faculty' && (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <Field label="Department">
                                            <Sel value={form.department || ''} onChange={e => f('department', e.target.value)} required>
                                                <option value="">Select Dept.</option>
                                                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                                            </Sel>
                                        </Field>
                                        <Field label="Designation">
                                            <Sel value={form.designation || ''} onChange={e => f('designation', e.target.value)} required>
                                                <option value="">Select Designation</option>
                                                {FACULTY_DESIGS.map(d => <option key={d} value={d}>{d}</option>)}
                                            </Sel>
                                        </Field>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <Field label="Years of Exp."><Inp type="number" value={form.yearsOfExperience || ''} onChange={e => f('yearsOfExperience', e.target.value)} /></Field>
                                        <Field label="Employee ID"><Inp value={form.employeeId || ''} onChange={e => f('employeeId', e.target.value)} /></Field>
                                    </div>
                                </>
                            )}
                        </form>

                        {/* Modal Footer */}
                        <div className="px-6 py-5 border-t border-gray-100 bg-gray-50/80 flex justify-end gap-3 sticky bottom-0">
                            <button type="button" onClick={() => setIsEditing(false)} className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-gray-200">
                                Cancel
                            </button>
                            <button type="submit" form="profile-edit-form" disabled={loading} className="btn-primary py-2.5 px-6 min-w-[120px] shadow-sm flex items-center justify-center">
                                {loading ? <Loader2 size={18} className="animate-spin text-white" /> : 'Save Changes'}
                            </button>
                        </div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return (
        <>
            <div className="max-w-4xl mx-auto space-y-5 animate-fade-up relative">

                {/* ── Settings Header ── */}
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Your Profile</h1>
                        <p className="text-sm text-gray-500 mt-1">Manage your account details and status.</p>
                    </div>
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="btn-secondary text-xs px-4 py-2 hover:border-[#00BFFF] hover:text-[#00BFFF]">
                        Edit Profile
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                    {/* ── Left Column: Summary Card ── */}
                    <div className="md:col-span-1 space-y-5">
                        <div className="card p-6 flex flex-col items-center text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-24" style={{ background: theme.bg }} />
                            <div className="relative z-10 w-24 h-24 rounded-full border-4 border-white flex items-center justify-center shadow-sm mb-4 bg-white">
                                <div className="w-full h-full rounded-full flex items-center justify-center text-3xl font-black"
                                    style={{ background: theme.bg, color: theme.accent }}>
                                    {Initial}
                                </div>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-1">{user.name || 'Anonymous User'}</h2>
                            <p className="text-sm text-gray-500 mb-4">{user.email}</p>
                            <div className="badge px-3 py-1 mb-6" style={{ background: theme.bg, color: theme.accent, border: `1px solid ${theme.border}` }}>
                                {theme.label}
                            </div>
                            <div className="w-full p-3 rounded-xl flex items-center gap-2 border"
                                style={{ background: isPending ? '#FEFCE8' : '#F0FDF4', borderColor: isPending ? '#FEF08A' : '#BBF7D0' }}>
                                <ShieldCheck size={16} color={isPending ? '#CA8A04' : '#16A34A'} />
                                <div className="text-left">
                                    <p className="text-xs font-semibold" style={{ color: isPending ? '#854D0E' : '#166534' }}>{isPending ? 'Verification Pending' : 'Account Verified'}</p>
                                    <p className="text-[10px]" style={{ color: isPending ? '#A16207' : '#15803D' }}>{isPending ? 'An admin will review your role.' : 'You have full access.'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Right Column: Detailed Info Card ── */}
                    <div className="md:col-span-2 space-y-5">
                        <div className="card p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <UserCircle size={18} className="text-sky" /> Contact Information
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                                <InfoRow icon={Mail} label="Email Address" value={user.email} />
                                <InfoRow icon={Phone} label="Phone Number" value={user.phone || 'Not provided'} />
                                <InfoRow icon={ExternalLink} label="LinkedIn" value={user.linkedIn ? "View Profile" : "Not provided"} href={user.linkedIn} />
                            </div>
                        </div>

                        <div className="card p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                {user.role === 'Faculty' ? <School size={18} className="text-sky" /> : <GraduationCap size={18} className="text-sky" />}
                                {user.role === 'Faculty' ? 'Academic Details' : 'Education & Career'}
                            </h3>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                                {(user.role === 'Ignite' || user.role === 'Spark') && (
                                    <>
                                        <InfoRow icon={Hash} label="Roll Number" value={user.rollNumber} />
                                        <InfoRow icon={School} label="College" value={user.college} />
                                        <InfoRow icon={Briefcase} label="Branch" value={user.branch} />
                                        <InfoRow icon={Calendar} label="Batch" value={user.batch} />
                                        {user.nickname && <InfoRow icon={UserCircle} label="Nickname" value={user.nickname} />}
                                    </>
                                )}

                                {user.role === 'Alumni' && (
                                    <>
                                        <InfoRow icon={Briefcase} label="Branch" value={user.branch} />
                                        <InfoRow icon={Calendar} label="Graduation Year" value={user.batch} />
                                        <InfoRow icon={School} label="Placed via ANITS" value={user.placedCompany} />
                                        <InfoRow icon={Briefcase} label="Current Company" value={user.currentCompany || 'Not updated'} />
                                        <InfoRow icon={UserCircle} label="Designation" value={user.currentDesignation || 'Not updated'} />
                                        {user.rollNumber && <InfoRow icon={Hash} label="Roll Number" value={user.rollNumber} />}
                                    </>
                                )}

                                {user.role === 'Faculty' && (
                                    <>
                                        <InfoRow icon={Briefcase} label="Department" value={user.department} />
                                        <InfoRow icon={UserCircle} label="Designation" value={user.designation} />
                                        <InfoRow icon={Calendar} label="Years of Experience" value={user.yearsOfExperience ? `${user.yearsOfExperience} Years` : null} />
                                        <InfoRow icon={Hash} label="Employee ID" value={user.employeeId} />
                                        <InfoRow icon={School} label="College" value="ANITS" />
                                    </>
                                )}
                                
                                {(user.role === 'Admin' || user.role === 'Coordinator') && (
                                    <InfoRow icon={UserCircle} label="Role Permissions" value="Full System Access" />
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
            
            {/* Render Modal via Portal to avoid CSS transform bounding box issues */}
            {typeof document !== 'undefined' && createPortal(modalContent, document.body)}
        </>
    );
}
