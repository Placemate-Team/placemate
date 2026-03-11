import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Users, Briefcase, Plus, Search, ChevronDown, ChevronUp,
    X, Trash2, CheckCircle, XCircle, ExternalLink, Clock, Edit3,
    ShieldCheck, AlertCircle,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import InfiniteScroll from 'react-infinite-scroll-component';

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmtDate(d) {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
const WAVE_CSS = `
  .wave-bg { position:absolute;inset:0;background:linear-gradient(120deg,rgba(255,255,255,1) 0%,rgba(0,191,255,0.07) 30%,rgba(255,255,255,1) 60%,rgba(0,191,255,0.05) 100%);background-size:300% 300%;animation:waveMove 20s ease-in-out infinite;opacity:0.5; }
  @keyframes waveMove{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
  .scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}
`;

// ─── Role flags ──────────────────────────────────────────────────────────────
function useFlags(user) {
    const role = user?.role || '';
    return {
        isSpark: role === 'Spark',
        isIgnite: role === 'Ignite',
        isAdmin: ['Coordinator', 'Admin'].includes(role),
        readOnly: ['Alumni', 'Faculty'].includes(role),
        role,
    };
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function Skeleton({ rows = 4 }) {
    return (
        <div className="space-y-4">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-3xl border border-slate-100 p-5 bg-white shadow-sm">
                    <div className="h-4 bg-slate-200 rounded-full w-2/3 mb-3" />
                    <div className="h-3 bg-slate-100 rounded-full w-full mb-2" />
                    <div className="h-3 bg-slate-100 rounded-full w-4/5" />
                </div>
            ))}
        </div>
    );
}

// ─── Remove Modal ────────────────────────────────────────────────────────────
function ConfirmModal({ open, title, children, onClose, onConfirm, confirmLabel = 'Confirm', danger = false }) {
    return (
        <AnimatePresence>
            {open && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
                    onClick={onClose}>
                    <motion.div initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }}
                        className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 w-full max-w-sm"
                        onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-900 mb-3">{title}</h3>
                        {children}
                        <div className="flex gap-2 justify-end mt-4">
                            <button onClick={onClose}
                                className="rounded-full px-5 py-2 text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                                Cancel
                            </button>
                            <button onClick={onConfirm}
                                className={`rounded-full px-5 py-2 text-sm font-semibold text-white transition-colors ${danger ? 'bg-red-500 hover:bg-red-600' : ''}`}
                                style={!danger ? { background: '#00BFFF' } : {}}>
                                {confirmLabel}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// COLLAB TAB
// ══════════════════════════════════════════════════════════════════════════════
function CollabTab({ flags }) {
    const { user } = useAuth();
    const qc = useQueryClient();
    const [search, setSearch] = useState('');
    const [dSearch, setDSearch] = useState('');
    const [page, setPage] = useState(1);
    const [items, setItems] = useState([]);
    const [hasMore, setHasMore] = useState(true);
    const [expanded, setExpanded] = useState(null);
    const [postModal, setPostModal] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [applyModal, setApplyModal] = useState(null); // { post, role }
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [removeTarget, setRemoveTarget] = useState(null);
    const [removeReason, setRemoveReason] = useState('');
    const [form, setForm] = useState({ title: '', description: '', roles: [{ name: '', needed: 1 }], contactDetails: '' });

    useEffect(() => { const t = setTimeout(() => setDSearch(search), 400); return () => clearTimeout(t); }, [search]);
    useEffect(() => { setPage(1); setItems([]); setHasMore(true); }, [dSearch]);

    const { isFetching } = useQuery({
        queryKey: ['collab', dSearch, page],
        queryFn: async () => {
            const { data } = await axios.get(`/opportunities/collab?search=${dSearch}&page=${page}&limit=10`);
            return data;
        },
        onSuccess: d => {
            if (page === 1) setItems(d.items);
            else setItems(p => [...p, ...d.items]);
            setHasMore(d.hasMore);
        },
        onError: () => toast.error('Failed to load collab posts.'),
    });

    const mutate = useMutation({
        mutationFn: ({ id, body }) => id
            ? axios.patch(`/opportunities/collab/${id}`, body)
            : axios.post('/opportunities/collab', body),
        onSuccess: ({ data }, vars) => {
            if (!vars.id) {
                toast.success('Project posted!');
                setItems(p => [data.post, ...p]);
            } else if (vars.body.action === 'edit') {
                toast.success('Updated!');
                setItems(p => p.map(i => i._id === vars.id ? data.post : i));
            } else if (vars.body.action === 'mark-closed') {
                toast.success('Marked as closed.');
                setItems(p => p.map(i => i._id === vars.id ? { ...i, status: 'closed' } : i));
            } else if (vars.body.action === 'delete') {
                toast.success('Post deleted.');
                setItems(p => p.filter(i => i._id !== vars.id));
            } else if (vars.body.action === 'admin-remove') {
                toast.success('Post removed.');
                setItems(p => p.filter(i => i._id !== vars.id));
            }
            setPostModal(false); setEditTarget(null); setDeleteTarget(null); setRemoveTarget(null);
        },
        onError: err => toast.error(err?.response?.data?.message || 'Action failed.'),
    });

    const openEdit = (post) => {
        setEditTarget(post);
        setForm({ title: post.title, description: post.description, roles: post.roles.length ? post.roles : [{ name: '', needed: 1 }], contactDetails: post.contactDetails });
        setPostModal(true);
    };

    const handleSubmit = e => {
        e.preventDefault();
        const body = editTarget
            ? { action: 'edit', ...form }
            : form;
        mutate.mutate({ id: editTarget?._id, body });
    };

    const addRole = () => setForm(f => ({ ...f, roles: [...f.roles, { name: '', needed: 1 }] }));
    const removeRole = i => setForm(f => ({ ...f, roles: f.roles.filter((_, idx) => idx !== i) }));
    const updateRole = (i, key, val) => setForm(f => ({ ...f, roles: f.roles.map((r, idx) => idx === i ? { ...r, [key]: val } : r) }));

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div>
                    <h2 className="text-2xl font-semibold text-slate-900">Project Collab – Find or Build Teams</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Connect with students to build projects together</p>
                </div>
                {flags.isIgnite && (
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
                        onClick={() => { setEditTarget(null); setForm({ title: '', description: '', roles: [{ name: '', needed: 1 }], contactDetails: '' }); setPostModal(true); }}
                        className="flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white shadow-md"
                        style={{ background: '#00BFFF' }}>
                        <Plus size={14} /> Post Project Idea
                    </motion.button>
                )}
            </div>

            {/* Search */}
            <div className="relative mb-5">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name/description…"
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#00BFFF] outline-none text-sm text-slate-800 transition-colors bg-white" />
            </div>

            {/* List */}
            {isFetching && items.length === 0 ? <Skeleton /> : (
                <InfiniteScroll dataLength={items.length} next={() => setPage(p => p + 1)} hasMore={hasMore}
                    loader={<div className="py-5 text-center"><div className="inline-block w-5 h-5 border-2 border-[#00BFFF] border-t-transparent rounded-full animate-spin" /></div>}
                    endMessage={items.length > 0 && <p className="text-center text-slate-400 text-sm py-5">All posts loaded ✓</p>}>
                    <div className="space-y-4">
                        {items.map(post => {
                            const isOwner = post.authorId === user?._id || post.authorId?.toString?.() === user?._id?.toString?.();
                            const isOpen = expanded === post._id;
                            return (
                                <motion.div key={post._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                    className="rounded-3xl shadow-[0_10px_15px_-3px_rgb(0_0_0/0.1)] border border-slate-100 bg-white overflow-hidden">
                                    {/* Card header */}
                                    <div className="p-5 cursor-pointer" onClick={() => setExpanded(isOpen ? null : post._id)}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="text-lg font-bold text-slate-900">{post.title}</h3>
                                                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${post.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                        {post.status === 'open' ? `Open (${post.roles.reduce((a, r) => a + r.needed, 0)} spots)` : 'Closed'}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-600 mt-1 line-clamp-2">{post.description.slice(0, 100)}{post.description.length > 100 ? '…' : ''}</p>
                                                <p className="text-xs text-slate-400 mt-2">Posted by {post.authorNickname} • {post.authorBranch} {post.authorBatch}</p>
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                {flags.isAdmin && (
                                                    <button onClick={e => { e.stopPropagation(); setRemoveTarget(post._id); setRemoveReason(''); }}
                                                        className="p-2 rounded-xl text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors"><Trash2 size={13} /></button>
                                                )}
                                                {isOpen ? <ChevronUp size={16} className="text-slate-300" /> : <ChevronDown size={16} className="text-slate-300" />}
                                            </div>
                                        </div>

                                        {/* Roles preview */}
                                        {post.roles.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-3">
                                                {post.roles.slice(0, 3).map((r, i) => (
                                                    <span key={i} className="text-xs rounded-full bg-[#00BFFF]/10 text-[#00BFFF] px-3 py-1 font-medium">
                                                        {r.name} ×{r.needed}
                                                    </span>
                                                ))}
                                                {post.roles.length > 3 && <span className="text-xs text-slate-400 px-2 py-1">+{post.roles.length - 3} more</span>}
                                            </div>
                                        )}
                                    </div>

                                    {/* Expanded */}
                                    <AnimatePresence>
                                        {isOpen && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                                                className="overflow-hidden border-t border-[#E2E8F0]">
                                                <div className="p-5 space-y-4">
                                                    <p className="text-sm text-slate-700 leading-relaxed">{post.description}</p>

                                                    {post.roles.length > 0 && (
                                                        <div>
                                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Roles Needed</p>
                                                            <ul className="space-y-1">
                                                                {post.roles.map((r, i) => (
                                                                    <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-[#00BFFF] flex-shrink-0" />
                                                                        {r.name} – {r.needed} needed
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {/* Apply button — only Ignite, non-owner, open */}
                                                        {flags.isIgnite && !isOwner && post.status === 'open' && (
                                                            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                                                                onClick={() => setApplyModal({ post, role: post.roles[0]?.name || '' })}
                                                                className="rounded-full px-5 py-2 text-sm font-semibold text-white"
                                                                style={{ background: '#00BFFF' }}>
                                                                Apply to Contact Poster
                                                            </motion.button>
                                                        )}
                                                        {/* Owner controls */}
                                                        {isOwner && (
                                                            <>
                                                                <button onClick={() => openEdit(post)}
                                                                    className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                                                                    <Edit3 size={13} /> Edit
                                                                </button>
                                                                {post.status === 'open' && (
                                                                    <button onClick={() => mutate.mutate({ id: post._id, body: { action: 'mark-closed' } })}
                                                                        className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                                                                        <Clock size={13} /> Mark Closed
                                                                    </button>
                                                                )}
                                                                <button onClick={() => setDeleteTarget(post._id)}
                                                                    className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium border border-red-100 text-red-400 hover:bg-red-50 transition-colors">
                                                                    <Trash2 size={13} /> Delete
                                                                </button>
                                                            </>
                                                        )}
                                                        {/* Admin always sees contact */}
                                                        {flags.isAdmin && (
                                                            <p className="text-xs text-slate-400 ml-auto">Contact: {post.contactDetails}</p>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-400">Posted: {fmtDate(post.createdAt)}</p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}

                        {!isFetching && items.length === 0 && (
                            <div className="rounded-3xl border border-slate-100 p-10 text-center bg-white shadow-sm">
                                <Users size={40} className="mx-auto mb-3 text-slate-200" />
                                <p className="text-slate-500">No collab posts yet. {flags.isIgnite ? 'Post your project idea!' : ''}</p>
                            </div>
                        )}
                    </div>
                </InfiniteScroll>
            )}

            {/* Post/Edit Modal */}
            <AnimatePresence>
                {postModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
                        onClick={() => setPostModal(false)}>
                        <motion.div initial={{ scale: 0.95, y: 14 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 14 }}
                            className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-slate-900">{editTarget ? 'Edit Post' : 'Post Project Idea'}</h2>
                                <button onClick={() => setPostModal(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"><X size={15} /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Project Name *</label>
                                    <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                        placeholder="e.g. AI Resume Screener"
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#00BFFF] transition-colors" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Description *</label>
                                    <textarea required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                        rows={4} placeholder="What is this project about? What are you building?"
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#00BFFF] resize-none transition-colors" />
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-medium text-slate-500">Roles Needed</label>
                                        <button type="button" onClick={addRole}
                                            className="text-xs text-[#00BFFF] hover:underline font-medium">+ Add Role</button>
                                    </div>
                                    <div className="space-y-2">
                                        {form.roles.map((r, i) => (
                                            <div key={i} className="flex gap-2 items-center">
                                                <input value={r.name} onChange={e => updateRole(i, 'name', e.target.value)}
                                                    placeholder="Role name (e.g. Frontend Dev)"
                                                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#00BFFF] transition-colors" />
                                                <input type="number" min={1} max={10} value={r.needed} onChange={e => updateRole(i, 'needed', parseInt(e.target.value) || 1)}
                                                    className="w-16 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#00BFFF] transition-colors text-center" />
                                                {form.roles.length > 1 && (
                                                    <button type="button" onClick={() => removeRole(i)} className="text-slate-300 hover:text-red-400 transition-colors"><X size={14} /></button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Contact Details * <span className="font-normal text-slate-400">(email or Discord – shown only to applicants)</span></label>
                                    <input required value={form.contactDetails} onChange={e => setForm(f => ({ ...f, contactDetails: e.target.value }))}
                                        placeholder="your@email.com | Discord: username#0000"
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#00BFFF] transition-colors" />
                                </div>
                                <div className="flex gap-2 justify-end pt-1">
                                    <button type="button" onClick={() => setPostModal(false)}
                                        className="rounded-full px-5 py-2 text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button>
                                    <motion.button type="submit" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                                        disabled={mutate.isLoading}
                                        className="rounded-full px-6 py-2 text-sm font-semibold text-white disabled:opacity-60"
                                        style={{ background: '#00BFFF' }}>
                                        {mutate.isLoading ? 'Posting…' : editTarget ? 'Update' : 'Post Now'}
                                    </motion.button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Apply Modal */}
            <ConfirmModal open={!!applyModal} title="Apply to Collab"
                onClose={() => setApplyModal(null)}
                onConfirm={() => {
                    if (applyModal) {
                        toast.success(`Contact the poster: ${applyModal.post.contactDetails}`, { duration: 6000, icon: '📬' });
                        setApplyModal(null);
                    }
                }}
                confirmLabel="Got it!">
                {applyModal && (
                    <div className="space-y-3">
                        <p className="text-sm text-slate-600">You're applying for <strong>{applyModal.role || 'a role'}</strong> in <strong>{applyModal.post.title}</strong>.</p>
                        <div className="rounded-xl bg-[#00BFFF]/5 border border-[#00BFFF]/20 p-4">
                            <p className="text-xs font-semibold text-slate-500 mb-1">Contact the poster directly:</p>
                            <p className="text-sm font-medium text-slate-800">{applyModal.post.contactDetails}</p>
                        </div>
                    </div>
                )}
            </ConfirmModal>

            {/* Delete confirm */}
            <ConfirmModal open={!!deleteTarget} title="Delete Post?" danger
                onClose={() => setDeleteTarget(null)}
                onConfirm={() => mutate.mutate({ id: deleteTarget, body: { action: 'delete' } })}
                confirmLabel="Delete">
                <p className="text-sm text-slate-600">This will permanently remove your post. This cannot be undone.</p>
            </ConfirmModal>

            {/* Admin remove */}
            <ConfirmModal open={!!removeTarget} title="Remove Post" danger
                onClose={() => setRemoveTarget(null)}
                onConfirm={() => mutate.mutate({ id: removeTarget, body: { action: 'admin-remove', reason: removeReason } })}
                confirmLabel="Remove">
                <textarea value={removeReason} onChange={e => setRemoveReason(e.target.value)}
                    placeholder="Reason for removal…" rows={3}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#00BFFF] resize-none transition-colors mb-1" />
            </ConfirmModal>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// INTERNSHIPS TAB
// ══════════════════════════════════════════════════════════════════════════════
function InternshipsTab({ flags }) {
    const qc = useQueryClient();
    const [search, setSearch] = useState('');
    const [dSearch, setDSearch] = useState('');
    const [page, setPage] = useState(1);
    const [items, setItems] = useState([]);
    const [hasMore, setHasMore] = useState(true);
    const [expanded, setExpanded] = useState(null);
    const [shareModal, setShareModal] = useState(false);
    const [pendingView, setPendingView] = useState(false);
    const [pendingItems, setPendingItems] = useState([]);
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [removeTarget, setRemoveTarget] = useState(null);
    const [removeReason, setRemoveReason] = useState('');
    const [form, setForm] = useState({ title: '', description: '', link: '', stipendInfo: '' });

    useEffect(() => { const t = setTimeout(() => setDSearch(search), 400); return () => clearTimeout(t); }, [search]);
    useEffect(() => { setPage(1); setItems([]); setHasMore(true); }, [dSearch, pendingView]);

    // Main list query
    const { isFetching } = useQuery({
        queryKey: ['internships', dSearch, page, pendingView],
        queryFn: async () => {
            const status = pendingView ? 'pending' : undefined;
            const p = new URLSearchParams({ search: dSearch, page, limit: 10 });
            if (status) p.set('status', status);
            const { data } = await axios.get(`/opportunities/internships?${p}`);
            return data;
        },
        onSuccess: d => {
            if (page === 1) setItems(d.items);
            else setItems(p => [...p, ...d.items]);
            setHasMore(d.hasMore);
        },
        onError: () => toast.error('Failed to load internships.'),
    });

    // Pending count for coordinator badge
    const { data: pendingCount } = useQuery({
        queryKey: ['internship-pending-count'],
        queryFn: async () => {
            const { data } = await axios.get('/opportunities/pending-count');
            return data.count;
        },
        enabled: flags.isAdmin,
        refetchInterval: 30000,
    });

    const mutate = useMutation({
        mutationFn: ({ id, body }) => axios.patch(`/opportunities/internships/${id}`, body),
        onSuccess: ({ data }, vars) => {
            if (vars.body.action === 'approve') {
                toast.success('Internship approved and published!');
                setItems(p => p.filter(i => i._id !== vars.id));
                qc.invalidateQueries(['internship-pending-count']);
            } else if (vars.body.action === 'reject') {
                toast.success('Internship rejected.');
                setItems(p => p.filter(i => i._id !== vars.id));
                setRejectTarget(null);
                qc.invalidateQueries(['internship-pending-count']);
            } else if (vars.body.action === 'admin-remove') {
                toast.success('Post removed.');
                setItems(p => p.filter(i => i._id !== vars.id));
                setRemoveTarget(null);
            }
        },
        onError: err => toast.error(err?.response?.data?.message || 'Action failed.'),
    });

    const shareMutate = useMutation({
        mutationFn: body => axios.post('/opportunities/internships', body),
        onSuccess: () => {
            toast.success('Submitted for review! Coordinator will verify shortly.', { duration: 5000 });
            setShareModal(false);
            setForm({ title: '', description: '', link: '', stipendInfo: '' });
        },
        onError: err => toast.error(err?.response?.data?.message || 'Submit failed.'),
    });

    const handleShare = e => {
        e.preventDefault();
        if (!form.title || !form.description || !form.link) { toast.error('Title, description, and link required.'); return; }
        shareMutate.mutate(form);
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div>
                    <h2 className="text-2xl font-semibold text-slate-900">Internships – Verified Opportunities</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Genuine internships verified by PlaceMate coordinators</p>
                </div>
                <div className="flex items-center gap-2">
                    {flags.isAdmin && (
                        <button onClick={() => { setPendingView(!pendingView); setExpanded(null); }}
                            className={`relative flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium border transition-all ${pendingView ? 'bg-amber-500 text-white border-amber-500' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                            <Clock size={13} /> Pending Queue
                            {pendingCount > 0 && !pendingView && (
                                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                                    {pendingCount}
                                </span>
                            )}
                        </button>
                    )}
                    {flags.isIgnite && !pendingView && (
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
                            onClick={() => setShareModal(true)}
                            className="flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white shadow-md"
                            style={{ background: '#00BFFF' }}>
                            <Plus size={14} /> Share Internship
                        </motion.button>
                    )}
                </div>
            </div>

            {/* Pending notice */}
            {pendingView && flags.isAdmin && (
                <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 mb-4 flex items-center gap-3">
                    <AlertCircle size={16} className="text-amber-500 flex-shrink-0" />
                    <p className="text-sm text-amber-700">Showing <strong>pending internships</strong> for review. Approve genuine opportunities, reject scams/courses.</p>
                </div>
            )}

            {/* Search */}
            <div className="relative mb-5">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search internships by name/description…"
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#00BFFF] outline-none text-sm text-slate-800 transition-colors bg-white" />
            </div>

            {/* List */}
            {isFetching && items.length === 0 ? <Skeleton /> : (
                <InfiniteScroll dataLength={items.length} next={() => setPage(p => p + 1)} hasMore={hasMore}
                    loader={<div className="py-5 text-center"><div className="inline-block w-5 h-5 border-2 border-[#00BFFF] border-t-transparent rounded-full animate-spin" /></div>}
                    endMessage={items.length > 0 && <p className="text-center text-slate-400 text-sm py-5">All internships loaded ✓</p>}>
                    <div className="space-y-4">
                        {items.map(post => {
                            const isOpen = expanded === post._id;
                            return (
                                <motion.div key={post._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                    className="rounded-3xl shadow-[0_10px_15px_-3px_rgb(0_0_0/0.1)] border border-slate-100 bg-white overflow-hidden">
                                    <div className="p-5 cursor-pointer" onClick={() => setExpanded(isOpen ? null : post._id)}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="text-lg font-bold text-slate-900">{post.title}</h3>
                                                    {post.status === 'approved' && (
                                                        <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#00BFFF]/10 text-[#00BFFF]">
                                                            <ShieldCheck size={11} /> Verified by PlaceMate
                                                        </span>
                                                    )}
                                                    {post.status === 'pending' && (
                                                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Pending Review</span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-600 mt-1 line-clamp-2">{post.description.slice(0, 100)}{post.description.length > 100 ? '…' : ''}</p>
                                                <p className="text-xs text-slate-400 mt-2">
                                                    {post.status === 'approved'
                                                        ? `Coordinator Approved • ${fmtDate(post.approvedAt)}`
                                                        : `Posted by ${post.authorNickname} • ${fmtDate(post.createdAt)}`}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                {flags.isAdmin && !pendingView && (
                                                    <button onClick={e => { e.stopPropagation(); setRemoveTarget(post._id); setRemoveReason(''); }}
                                                        className="p-2 rounded-xl text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors"><Trash2 size={13} /></button>
                                                )}
                                                {isOpen ? <ChevronUp size={16} className="text-slate-300" /> : <ChevronDown size={16} className="text-slate-300" />}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded */}
                                    <AnimatePresence>
                                        {isOpen && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                                                className="overflow-hidden border-t border-[#E2E8F0]">
                                                <div className="p-5 space-y-4">
                                                    <p className="text-sm text-slate-700 leading-relaxed">{post.description}</p>
                                                    {post.stipendInfo && (
                                                        <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
                                                            <p className="text-xs font-semibold text-emerald-700">Stipend: {post.stipendInfo} • Genuine opportunity (not a course)</p>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-3 flex-wrap">
                                                        <a href={post.link} target="_blank" rel="noopener noreferrer">
                                                            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                                                                className="flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white"
                                                                style={{ background: '#00BFFF' }}>
                                                                Apply Now <ExternalLink size={13} />
                                                            </motion.button>
                                                        </a>
                                                        {flags.isAdmin && pendingView && (
                                                            <>
                                                                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                                                                    onClick={() => mutate.mutate({ id: post._id, body: { action: 'approve' } })}
                                                                    className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors">
                                                                    <CheckCircle size={14} /> Approve
                                                                </motion.button>
                                                                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                                                                    onClick={() => setRejectTarget(post._id)}
                                                                    className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors">
                                                                    <XCircle size={14} /> Reject
                                                                </motion.button>
                                                            </>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-400">Posted: {fmtDate(post.createdAt)}</p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}

                        {!isFetching && items.length === 0 && (
                            <div className="rounded-3xl border border-slate-100 p-10 text-center bg-white shadow-sm">
                                <Briefcase size={40} className="mx-auto mb-3 text-slate-200" />
                                <p className="text-slate-500">
                                    {pendingView ? 'No pending internships to review.' : 'No verified internships yet. Check back soon!'}
                                </p>
                            </div>
                        )}
                    </div>
                </InfiniteScroll>
            )}

            {/* Share Modal */}
            <AnimatePresence>
                {shareModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
                        onClick={() => setShareModal(false)}>
                        <motion.div initial={{ scale: 0.95, y: 14 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 14 }}
                            className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 w-full max-w-md"
                            onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-slate-900">Share Internship</h2>
                                <button onClick={() => setShareModal(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"><X size={15} /></button>
                            </div>
                            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 mb-4">
                                <p className="text-xs text-amber-700"><strong>Note:</strong> Coordinator will verify before publishing. Ensure it's a real internship with genuine stipend/free offering — not an online course.</p>
                            </div>
                            <form onSubmit={handleShare} className="space-y-4">
                                {[
                                    { label: 'Internship Name *', key: 'title', placeholder: 'e.g. SDE Intern – Google' },
                                    { label: 'Application Link *', key: 'link', placeholder: 'https://…' },
                                    { label: 'Stipend / Compensation', key: 'stipendInfo', placeholder: 'e.g. ₹15,000/month or Unpaid' },
                                ].map(({ label, key, placeholder }) => (
                                    <div key={key}>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
                                        <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                            placeholder={placeholder}
                                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#00BFFF] transition-colors" />
                                    </div>
                                ))}
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Description * <span className="font-normal text-slate-400">(include details, duration, skills needed)</span></label>
                                    <textarea required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                        rows={4} placeholder="Describe the internship — what you'll work on, eligibility, duration…"
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#00BFFF] resize-none transition-colors" />
                                </div>
                                <div className="flex gap-2 justify-end pt-1">
                                    <button type="button" onClick={() => setShareModal(false)}
                                        className="rounded-full px-5 py-2 text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button>
                                    <motion.button type="submit" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                                        disabled={shareMutate.isLoading}
                                        className="rounded-full px-6 py-2 text-sm font-semibold text-white disabled:opacity-60"
                                        style={{ background: '#00BFFF' }}>
                                        {shareMutate.isLoading ? 'Submitting…' : 'Submit for Review'}
                                    </motion.button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Reject Modal */}
            <ConfirmModal open={!!rejectTarget} title="Reject Internship" danger
                onClose={() => setRejectTarget(null)}
                onConfirm={() => mutate.mutate({ id: rejectTarget, body: { action: 'reject', reason: rejectReason } })}
                confirmLabel="Reject">
                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                    placeholder="Reason for rejection (will be sent to poster)…" rows={3}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#00BFFF] resize-none transition-colors mb-1" />
            </ConfirmModal>

            {/* Admin remove */}
            <ConfirmModal open={!!removeTarget} title="Remove Post" danger
                onClose={() => setRemoveTarget(null)}
                onConfirm={() => mutate.mutate({ id: removeTarget, body: { action: 'admin-remove', reason: removeReason } })}
                confirmLabel="Remove">
                <textarea value={removeReason} onChange={e => setRemoveReason(e.target.value)}
                    placeholder="Reason for removal…" rows={3}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#00BFFF] resize-none transition-colors mb-1" />
            </ConfirmModal>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
const TABS = [
    { key: 'collab', label: 'Collab', icon: Users },
    { key: 'internships', label: 'Internships', icon: Briefcase },
];

export default function Opportunities() {
    const { user } = useAuth();
    const flags = useFlags(user);
    const qc = useQueryClient();
    const [activeTab, setActiveTab] = useState('collab');

    // Socket.io
    useEffect(() => {
        const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', { transports: ['websocket'] });
        socket.on('new-opportunity', d => {
            toast(`New ${d.type}: "${d.title}" by ${d.author}`, { icon: '🚀', duration: 4000 });
            qc.invalidateQueries(['collab']);
            qc.invalidateQueries(['internships']);
        });
        socket.on('pending-internship', () => qc.invalidateQueries(['internship-pending-count']));
        socket.on(`internship-approved-${user?._id}`, d => toast.success(`Your internship "${d.title}" was approved!`));
        socket.on(`internship-rejected-${user?._id}`, d => toast.error(`Your internship "${d.title}" was rejected: ${d.reason}`));
        socket.on(`opportunity-removed-${user?._id}`, d => toast.error(`Your post was removed. ${d.reason ? 'Reason: ' + d.reason : ''}`));
        return () => socket.disconnect();
    }, [qc, user]);

    if (flags.isSpark) {
        return (
            <div className="relative min-h-screen">
                <div className="pointer-events-none fixed inset-0 z-[-1]"><div className="wave-bg" /></div>
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
                    <h1 className="text-4xl font-bold mb-6 text-slate-900">Opportunities</h1>
                    <div className="rounded-3xl shadow-[0_10px_15px_-3px_rgb(0_0_0/0.1)] border border-slate-100 bg-white p-10 text-center">
                        <AlertCircle size={48} className="mx-auto mb-4 text-[#00BFFF]/40" />
                        <h2 className="text-xl font-bold text-slate-900 mb-2">ANITS Ignite Exclusive</h2>
                        <p className="text-slate-500 max-w-md mx-auto">Collab projects and Internship listings are available to ANITS Ignite students only.</p>
                    </div>
                </div>
                <style>{WAVE_CSS}</style>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen">
            <Toaster position="top-right" />
            <div className="pointer-events-none fixed inset-0 z-[-1]"><div className="wave-bg" /></div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
                {/* Header */}
                <div className="mb-7">
                    <h1 className="text-4xl font-bold text-slate-900">Opportunities</h1>
                    <p className="text-sm text-slate-500 mt-1">Collab projects and verified internships for ANITS students</p>
                </div>

                {/* Tab selector */}
                <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1 scrollbar-hide">
                    {TABS.map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            className={`flex-shrink-0 flex items-center gap-1.5 rounded-full px-6 py-2 text-sm font-medium border transition-all duration-200 ${activeTab === tab.key
                                    ? 'bg-[#00BFFF] text-white border-[#00BFFF] shadow-md'
                                    : 'border-slate-200 text-slate-600 hover:border-[#00BFFF] hover:text-[#00BFFF]'
                                }`}>
                            <tab.icon size={14} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                <AnimatePresence mode="wait">
                    <motion.div key={activeTab}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.22 }}>
                        {activeTab === 'collab' && <CollabTab flags={flags} />}
                        {activeTab === 'internships' && <InternshipsTab flags={flags} />}
                    </motion.div>
                </AnimatePresence>
            </div>

            <style>{WAVE_CSS}</style>
        </div>
    );
}
