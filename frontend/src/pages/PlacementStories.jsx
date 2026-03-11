import { useState, useEffect, useRef, useCallback } from 'react';
import { Tab } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
    BookOpen, Video, HelpCircle, Search, Plus, Trash2,
    ThumbsUp, ThumbsDown, ChevronDown, ChevronUp,
    Pencil, X, Play, AlertCircle, User,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import InfiniteScroll from 'react-infinite-scroll-component';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import YouTube from 'react-youtube';

// ─── Helpers ────────────────────────────────────────────────────────────────
const COMPANIES = ['TCS', 'Infosys', 'Wipro', 'Capgemini', 'Accenture', 'Amazon', 'Deloitte', 'HCL', 'CTS', 'Hexaware', 'Other'];
const STORY_TYPES = ['On-Campus', 'Off-Campus', 'Internship'];
const YEARS = ['2026', '2025', '2024', '2023'];

function fmtDate(d) {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function extractYtId(url = '') {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?/\s]{11})/);
    return m ? m[1] : null;
}
function ytThumb(url) {
    const id = extractYtId(url);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '';
}

// ─── Role helpers ────────────────────────────────────────────────────────────
function useRoleFlags(user) {
    const role = user?.role || '';
    const batchYear = parseInt(user?.batch) || 0;
    const currentYear = new Date().getFullYear();
    const yearInCollege = batchYear ? currentYear - (batchYear - 4) : 0;
    return {
        isSpark: role === 'Spark',
        isIgnite: role === 'Ignite',
        isAlumni: role === 'Alumni',
        isFaculty: role === 'Faculty',
        isAdmin: ['Coordinator', 'Admin'].includes(role),
        isSeniorIgnite: role === 'Ignite' && yearInCollege >= 3,
        canPostBlog: role === 'Ignite' ? yearInCollege >= 3 : ['Alumni', 'Coordinator', 'Admin'].includes(role),
        canPostHR: role === 'Ignite' ? yearInCollege >= 3 : ['Alumni', 'Coordinator', 'Admin'].includes(role),
        canVote: !['Faculty', 'Spark'].includes(role),
        readOnly: role === 'Faculty',
    };
}

// ─── Loading Skeleton ────────────────────────────────────────────────────────
function CardSkeleton({ count = 5 }) {
    return (
        <div className="space-y-4">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-3xl border border-slate-100 p-6 bg-white shadow-sm">
                    <div className="h-5 bg-slate-200 rounded-full w-2/3 mb-3" />
                    <div className="h-3.5 bg-slate-100 rounded-full w-1/3 mb-4" />
                    <div className="space-y-2">
                        <div className="h-3 bg-slate-100 rounded-full w-full" />
                        <div className="h-3 bg-slate-100 rounded-full w-5/6" />
                        <div className="h-3 bg-slate-100 rounded-full w-4/6" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Remove Modal ────────────────────────────────────────────────────────────
function RemoveModal({ open, onClose, onConfirm }) {
    const [reason, setReason] = useState('');
    return (
        <AnimatePresence>
            {open && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
                    onClick={onClose}>
                    <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 w-full max-w-sm"
                        onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-900 mb-3">Remove Post</h3>
                        <textarea
                            value={reason} onChange={e => setReason(e.target.value)}
                            placeholder="Reason for removal (optional)..."
                            rows={3}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#00BFFF] resize-none mb-4 transition-colors"
                        />
                        <div className="flex gap-2 justify-end">
                            <button onClick={onClose}
                                className="rounded-full px-5 py-2 text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                                Cancel
                            </button>
                            <button onClick={() => { onConfirm(reason); setReason(''); }}
                                className="rounded-full px-5 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors">
                                Remove
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ─── BLOGS TAB ───────────────────────────────────────────────────────────────
function BlogsTab({ flags }) {
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [allItems, setAllItems] = useState([]);
    const [hasMore, setHasMore] = useState(true);
    const [postModal, setPostModal] = useState(false);
    const [removeTarget, setRemoveTarget] = useState(null);
    const [form, setForm] = useState({ title: '', content: '', company: '' });
    const queryClient = useQueryClient();

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => { setPage(1); setAllItems([]); setHasMore(true); }, [debouncedSearch]);

    const { isFetching } = useQuery({
        queryKey: ['ps-blogs', debouncedSearch, page],
        queryFn: async () => {
            const p = new URLSearchParams({ tab: 'blogs', search: debouncedSearch, page, limit: 10 });
            const { data } = await axios.get(`/placement-stories?${p}`);
            return data;
        },
        keepPreviousData: true,
        onSuccess: (data) => {
            if (page === 1) setAllItems(data.items || []);
            else setAllItems(prev => [...prev, ...(data.items || [])]);
            setHasMore(data.hasMore);
        },
        onError: () => toast.error('Failed to load blogs.'),
    });

    const postMutation = useMutation({
        mutationFn: (body) => axios.post('/placement-stories/blogs', body),
        onSuccess: ({ data }) => {
            toast.success('Blog posted!');
            setPostModal(false);
            setForm({ title: '', content: '', company: '' });
            setAllItems(prev => [data.blog, ...prev]);
        },
        onError: (err) => toast.error(err?.response?.data?.message || 'Post failed.'),
    });

    const removeMutation = useMutation({
        mutationFn: ({ id, reason }) => axios.patch(`/placement-stories/remove?id=${id}&tab=blogs&reason=${encodeURIComponent(reason)}`),
        onSuccess: (_, { id }) => {
            toast.success('Post removed.');
            setAllItems(prev => prev.filter(i => i._id !== id));
            setRemoveTarget(null);
        },
        onError: () => toast.error('Remove failed.'),
    });

    const handlePost = (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.content || form.content === '<p><br></p>') {
            toast.error('Title and content are required.');
            return;
        }
        postMutation.mutate(form);
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <h2 className="text-2xl font-semibold" style={{ color: '#0F172A' }}>Placement Blogs</h2>
                {flags.canPostBlog && (
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => setPostModal(true)}
                        className="flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white"
                        style={{ background: '#00BFFF', boxShadow: '0 4px 12px rgba(0,191,255,0.25)' }}>
                        <Plus size={15} /> Post Blog
                    </motion.button>
                )}
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={15} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search blogs by title, company…"
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#00BFFF] outline-none text-sm text-slate-800 transition-colors bg-white" />
            </div>

            {/* List */}
            {isFetching && allItems.length === 0 ? <CardSkeleton /> : (
                <InfiniteScroll dataLength={allItems.length} next={() => setPage(p => p + 1)} hasMore={hasMore}
                    loader={<div className="py-6 text-center"><div className="inline-block w-5 h-5 border-2 border-[#00BFFF] border-t-transparent rounded-full animate-spin" /></div>}
                    endMessage={<p className="text-center text-slate-400 text-sm py-6">All blogs loaded ✓</p>}>
                    <div className="space-y-6">
                        {allItems.map(blog => (
                            <motion.div key={blog._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                                className="rounded-3xl shadow-[0_10px_15px_-3px_rgb(0_0_0/0.1)] border border-slate-100 p-6 bg-white">
                                <div className="flex items-start justify-between gap-3">
                                    <h3 className="text-xl font-bold text-slate-900 leading-snug">{blog.title}</h3>
                                    {flags.isAdmin && (
                                        <button onClick={() => setRemoveTarget(blog._id)} title="Remove post"
                                            className="flex-shrink-0 p-2 rounded-xl text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors">
                                            <Trash2 size={15} />
                                        </button>
                                    )}
                                </div>
                                <p className="text-sm text-slate-500 mt-1">
                                    Posted by <span className="font-medium">{blog.authorNickname}</span>
                                    {blog.authorBranch && ` • ${blog.authorBranch}`}
                                    {blog.authorBatch && ` ${blog.authorBatch}`}
                                </p>
                                {blog.company && (
                                    <span className="inline-block mt-2 rounded-full bg-[#00BFFF]/10 text-[#00BFFF] text-xs font-medium px-3 py-1">
                                        {blog.company}
                                    </span>
                                )}
                                <div className="mt-4 prose prose-sm max-w-none text-slate-700"
                                    dangerouslySetInnerHTML={{ __html: blog.content }} />
                                <p className="text-xs text-slate-400 mt-5">Posted: {fmtDate(blog.createdAt)}</p>
                            </motion.div>
                        ))}
                        {!isFetching && allItems.length === 0 && (
                            <div className="rounded-3xl border border-slate-100 p-10 text-center bg-white shadow-sm">
                                <BookOpen size={40} className="mx-auto mb-3 text-slate-200" />
                                <p className="text-slate-500">No blogs found. {flags.canPostBlog ? 'Be the first to post!' : ''}</p>
                            </div>
                        )}
                    </div>
                </InfiniteScroll>
            )}

            {/* Post Modal */}
            <AnimatePresence>
                {postModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
                        onClick={() => setPostModal(false)}>
                        <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
                            className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-slate-900">Post a Blog</h2>
                                <button onClick={() => setPostModal(false)}
                                    className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"><X size={16} /></button>
                            </div>
                            <form onSubmit={handlePost} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Title *</label>
                                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                        required placeholder="Blog title"
                                        onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#00BFFF] transition-colors" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Company (optional)</label>
                                    <select value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#00BFFF] transition-colors bg-white">
                                        <option value="">Select company…</option>
                                        {COMPANIES.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Blog Content *</label>
                                    <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:border-[#00BFFF] transition-colors">
                                        <ReactQuill value={form.content} onChange={v => setForm(f => ({ ...f, content: v }))}
                                            modules={{ toolbar: [['bold', 'italic'], [{ list: 'ordered' }, { list: 'bullet' }], ['clean']] }}
                                            formats={['bold', 'italic', 'list', 'bullet']}
                                            placeholder="Write your blog here…"
                                            className="min-h-[180px]" />
                                    </div>
                                </div>
                                <div className="flex gap-2 justify-end pt-2">
                                    <button type="button" onClick={() => setPostModal(false)}
                                        className="rounded-full px-5 py-2 text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button>
                                    <motion.button type="submit" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                                        disabled={postMutation.isLoading}
                                        className="rounded-full px-6 py-2 text-sm font-semibold text-white disabled:opacity-60"
                                        style={{ background: '#00BFFF' }}>
                                        {postMutation.isLoading ? 'Posting…' : 'Post Blog'}
                                    </motion.button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Remove modal */}
            <RemoveModal open={!!removeTarget} onClose={() => setRemoveTarget(null)}
                onConfirm={(reason) => removeMutation.mutate({ id: removeTarget, reason })} />
        </div>
    );
}

// ─── STORIES TAB ─────────────────────────────────────────────────────────────
function StoriesTab({ flags }) {
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [allItems, setAllItems] = useState([]);
    const [hasMore, setHasMore] = useState(true);
    const [addModal, setAddModal] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [removeTarget, setRemoveTarget] = useState(null);
    const [playingId, setPlayingId] = useState(null);
    const [form, setForm] = useState({ title: '', company: '', type: 'On-Campus', year: '2025', ytLink: '', description: '' });
    const queryClient = useQueryClient();

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => { setPage(1); setAllItems([]); setHasMore(true); }, [debouncedSearch]);

    const { isFetching } = useQuery({
        queryKey: ['ps-stories', debouncedSearch, page],
        queryFn: async () => {
            const p = new URLSearchParams({ tab: 'stories', search: debouncedSearch, page, limit: 10 });
            const { data } = await axios.get(`/placement-stories?${p}`);
            return data;
        },
        keepPreviousData: true,
        onSuccess: (data) => {
            if (page === 1) setAllItems(data.items || []);
            else setAllItems(prev => [...prev, ...(data.items || [])]);
            setHasMore(data.hasMore);
        },
        onError: () => toast.error('Failed to load stories.'),
    });

    const postMutation = useMutation({
        mutationFn: (body) => axios.post('/placement-stories/stories', body),
        onSuccess: ({ data }) => {
            toast.success('Story added!');
            setAddModal(false);
            setEditTarget(null);
            setForm({ title: '', company: '', type: 'On-Campus', year: '2025', ytLink: '', description: '' });
            setAllItems(prev => [data.story, ...prev]);
        },
        onError: (err) => toast.error(err?.response?.data?.message || 'Post failed.'),
    });

    const editMutation = useMutation({
        mutationFn: ({ id, body }) => axios.patch(`/placement-stories/stories/${id}`, body),
        onSuccess: ({ data }, { id }) => {
            toast.success('Story updated!');
            setEditTarget(null);
            setAllItems(prev => prev.map(i => i._id === id ? data.story : i));
        },
        onError: () => toast.error('Update failed.'),
    });

    const removeMutation = useMutation({
        mutationFn: ({ id, reason }) => axios.patch(`/placement-stories/remove?id=${id}&tab=stories&reason=${encodeURIComponent(reason)}`),
        onSuccess: (_, { id }) => {
            toast.success('Story removed.');
            setAllItems(prev => prev.filter(i => i._id !== id));
            setRemoveTarget(null);
        },
        onError: () => toast.error('Remove failed.'),
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.title || !form.company || !form.ytLink) { toast.error('Title, company and YouTube link required.'); return; }
        if (editTarget) editMutation.mutate({ id: editTarget._id, body: form });
        else postMutation.mutate(form);
    };

    const openEdit = (story) => {
        setEditTarget(story);
        setForm({ title: story.title, company: story.company, type: story.type, year: story.year, ytLink: story.ytLink, description: story.description });
        setAddModal(true);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <h2 className="text-2xl font-semibold" style={{ color: '#0F172A' }}>Placement Stories</h2>
                {flags.isAdmin && (
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => { setEditTarget(null); setForm({ title: '', company: '', type: 'On-Campus', year: '2025', ytLink: '', description: '' }); setAddModal(true); }}
                        className="flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white"
                        style={{ background: '#00BFFF', boxShadow: '0 4px 12px rgba(0,191,255,0.25)' }}>
                        <Plus size={15} /> Add New Story
                    </motion.button>
                )}
            </div>

            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={15} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search stories by company…"
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#00BFFF] outline-none text-sm text-slate-800 transition-colors bg-white" />
            </div>

            {isFetching && allItems.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="animate-pulse rounded-3xl border border-slate-100 p-4 bg-white shadow-sm">
                            <div className="w-full h-40 rounded-xl bg-slate-200 mb-4" />
                            <div className="h-4 bg-slate-200 rounded-full w-3/4 mb-2" />
                            <div className="h-3 bg-slate-100 rounded-full w-1/2" />
                        </div>
                    ))}
                </div>
            ) : (
                <InfiniteScroll dataLength={allItems.length} next={() => setPage(p => p + 1)} hasMore={hasMore}
                    loader={<div className="py-6 text-center col-span-2"><div className="inline-block w-5 h-5 border-2 border-[#00BFFF] border-t-transparent rounded-full animate-spin" /></div>}
                    endMessage={allItems.length > 0 ? <p className="text-center text-slate-400 text-sm py-6 col-span-2">All stories loaded ✓</p> : null}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {allItems.map(story => {
                            const ytId = extractYtId(story.ytLink);
                            const thumb = story.ytThumbnail || ytThumb(story.ytLink);
                            return (
                                <motion.div key={story._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                                    className="rounded-3xl shadow-[0_10px_15px_-3px_rgb(0_0_0/0.1)] border border-slate-100 p-4 bg-white">
                                    {/* Thumbnail / Player */}
                                    {playingId === story._id && ytId ? (
                                        <div className="rounded-xl overflow-hidden mb-4">
                                            <YouTube videoId={ytId} className="w-full"
                                                opts={{ width: '100%', height: '220', playerVars: { autoplay: 1, controls: 1 } }} />
                                        </div>
                                    ) : (
                                        <div className="relative rounded-xl overflow-hidden mb-4 cursor-pointer group"
                                            onClick={() => setPlayingId(story._id)}>
                                            <img src={thumb || `https://placehold.co/640x360/00BFFF/FFF?text=Watch`}
                                                alt={story.title} className="w-full h-44 object-cover" />
                                            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition flex items-center justify-center">
                                                <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                                    <Play size={20} className="text-[#00BFFF] ml-1" />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <h3 className="text-lg font-semibold text-slate-900 leading-snug">{story.title}</h3>
                                    <p className="text-sm text-slate-500 mt-1">{story.company} • {story.type} {story.year}</p>
                                    {story.description && <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">{story.description}</p>}
                                    <p className="text-xs text-slate-400 mt-2">Posted by {story.authorNickname} • {fmtDate(story.createdAt)}</p>

                                    <div className="flex items-center gap-2 mt-4">
                                        {playingId !== story._id && (
                                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                                onClick={() => setPlayingId(story._id)}
                                                className="rounded-full px-4 py-1.5 text-sm font-semibold text-white"
                                                style={{ background: '#00BFFF' }}>
                                                Watch Video
                                            </motion.button>
                                        )}
                                        {playingId === story._id && (
                                            <button onClick={() => setPlayingId(null)}
                                                className="rounded-full px-4 py-1.5 text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                                                Close
                                            </button>
                                        )}
                                        {flags.isAdmin && (
                                            <>
                                                <button onClick={() => openEdit(story)}
                                                    className="p-2 rounded-xl text-slate-300 hover:text-[#00BFFF] hover:bg-[#00BFFF]/10 transition-colors">
                                                    <Pencil size={14} />
                                                </button>
                                                <button onClick={() => setRemoveTarget(story._id)}
                                                    className="p-2 rounded-xl text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors">
                                                    <Trash2 size={14} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                        {!isFetching && allItems.length === 0 && (
                            <div className="col-span-2 rounded-3xl border border-slate-100 p-10 text-center bg-white shadow-sm">
                                <Video size={40} className="mx-auto mb-3 text-slate-200" />
                                <p className="text-slate-500">No stories yet. {flags.isAdmin ? 'Add the first story!' : 'Check back soon!'}</p>
                            </div>
                        )}
                    </div>
                </InfiniteScroll>
            )}

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {addModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
                        onClick={() => setAddModal(false)}>
                        <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
                            className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-slate-900">{editTarget ? 'Edit Story' : 'Add New Story'}</h2>
                                <button onClick={() => setAddModal(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"><X size={16} /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-3">
                                {[
                                    { label: 'Title *', key: 'title', placeholder: 'Story title' },
                                    { label: 'YouTube Link *', key: 'ytLink', placeholder: 'https://youtube.com/watch?v=...' },
                                    { label: 'Short Description', key: 'description', placeholder: 'Brief description (100 chars)' },
                                ].map(({ label, key, placeholder }) => (
                                    <div key={key}>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
                                        <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                            placeholder={placeholder}
                                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#00BFFF] transition-colors" />
                                    </div>
                                ))}
                                {form.ytLink && extractYtId(form.ytLink) && (
                                    <div className="rounded-xl overflow-hidden">
                                        <img src={ytThumb(form.ytLink)} alt="thumbnail" className="w-full h-36 object-cover" />
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Company *</label>
                                        <select value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#00BFFF] bg-white transition-colors">
                                            <option value="">Select…</option>
                                            {COMPANIES.map(c => <option key={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                                        <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#00BFFF] bg-white transition-colors">
                                            {STORY_TYPES.map(t => <option key={t}>{t}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Year</label>
                                    <select value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#00BFFF] bg-white transition-colors">
                                        {YEARS.map(y => <option key={y}>{y}</option>)}
                                    </select>
                                </div>
                                <div className="flex gap-2 justify-end pt-2">
                                    <button type="button" onClick={() => setAddModal(false)}
                                        className="rounded-full px-5 py-2 text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button>
                                    <motion.button type="submit" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                                        disabled={postMutation.isLoading || editMutation.isLoading}
                                        className="rounded-full px-6 py-2 text-sm font-semibold text-white disabled:opacity-60"
                                        style={{ background: '#00BFFF' }}>
                                        {editTarget ? 'Update' : 'Add Story'}
                                    </motion.button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <RemoveModal open={!!removeTarget} onClose={() => setRemoveTarget(null)}
                onConfirm={(reason) => removeMutation.mutate({ id: removeTarget, reason })} />
        </div>
    );
}

// ─── HR QUESTIONS TAB ─────────────────────────────────────────────────────────
function HRQuestionsTab({ flags }) {
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [sort, setSort] = useState('upvotes');
    const [page, setPage] = useState(1);
    const [allItems, setAllItems] = useState([]);
    const [hasMore, setHasMore] = useState(true);
    const [expanded, setExpanded] = useState(null);
    const [addModal, setAddModal] = useState(false);
    const [removeTarget, setRemoveTarget] = useState(null);
    const [form, setForm] = useState({ question: '', company: '' });
    const queryClient = useQueryClient();

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => { setPage(1); setAllItems([]); setHasMore(true); }, [debouncedSearch, sort]);

    const { isFetching } = useQuery({
        queryKey: ['ps-hr', debouncedSearch, sort, page],
        queryFn: async () => {
            const p = new URLSearchParams({ tab: 'hr-questions', search: debouncedSearch, sort, page, limit: 15 });
            const { data } = await axios.get(`/placement-stories?${p}`);
            return data;
        },
        keepPreviousData: true,
        onSuccess: (data) => {
            if (page === 1) setAllItems(data.items || []);
            else setAllItems(prev => [...prev, ...(data.items || [])]);
            setHasMore(data.hasMore);
        },
        onError: () => toast.error('Failed to load HR questions.'),
    });

    const voteMutation = useMutation({
        mutationFn: ({ id, vote }) => axios.patch(`/placement-stories/hr-vote?id=${id}&vote=${vote}`),
        onSuccess: (res, { id }) => {
            const { netScore, up, down, myVote } = res.data;
            setAllItems(prev => prev.map(q => q._id === id ? { ...q, netScore, votes: { ...q.votes, up, down }, myVote } : q));
        },
        onError: () => toast.error('Vote failed.'),
    });

    const postMutation = useMutation({
        mutationFn: (body) => axios.post('/placement-stories/hr-questions', body),
        onSuccess: ({ data }) => {
            toast.success('Question added!');
            setAddModal(false);
            setForm({ question: '', company: '' });
            setAllItems(prev => [{ ...data.hrQuestion, netScore: 0, myVote: null }, ...prev]);
        },
        onError: (err) => toast.error(err?.response?.data?.message || 'Post failed.'),
    });

    const removeMutation = useMutation({
        mutationFn: ({ id, reason }) => axios.patch(`/placement-stories/remove?id=${id}&tab=hr-questions&reason=${encodeURIComponent(reason)}`),
        onSuccess: (_, { id }) => {
            toast.success('Question removed.');
            setAllItems(prev => prev.filter(i => i._id !== id));
            setRemoveTarget(null);
        },
        onError: () => toast.error('Remove failed.'),
    });

    return (
        <div>
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <h2 className="text-2xl font-semibold" style={{ color: '#0F172A' }}>HR Questions</h2>
                {flags.canPostHR && (
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => setAddModal(true)}
                        className="flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white"
                        style={{ background: '#00BFFF', boxShadow: '0 4px 12px rgba(0,191,255,0.25)' }}>
                        <Plus size={15} /> Add HR Question
                    </motion.button>
                )}
            </div>

            <div className="flex items-center gap-3 mb-6 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={15} />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search questions…"
                        className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#00BFFF] outline-none text-sm text-slate-800 transition-colors bg-white" />
                </div>
                <select value={sort} onChange={e => setSort(e.target.value)}
                    className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#00BFFF] bg-white text-slate-700 transition-colors">
                    <option value="upvotes">Most Upvoted</option>
                    <option value="recent">Recent</option>
                </select>
            </div>

            {isFetching && allItems.length === 0 ? (
                <div className="space-y-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="animate-pulse rounded-3xl border border-slate-100 p-4 bg-white shadow-sm flex items-center gap-4">
                            <div className="w-16 h-8 bg-slate-200 rounded-full flex-shrink-0" />
                            <div className="flex-1 h-4 bg-slate-200 rounded-full" />
                        </div>
                    ))}
                </div>
            ) : (
                <InfiniteScroll dataLength={allItems.length} next={() => setPage(p => p + 1)} hasMore={hasMore}
                    loader={<div className="py-6 text-center"><div className="inline-block w-5 h-5 border-2 border-[#00BFFF] border-t-transparent rounded-full animate-spin" /></div>}
                    endMessage={allItems.length > 0 ? <p className="text-center text-slate-400 text-sm py-6">All questions loaded ✓</p> : null}>
                    <div className="space-y-3">
                        {allItems.map(q => {
                            const net = typeof q.netScore === 'number' ? q.netScore : (q.votes?.up || 0) - (q.votes?.down || 0);
                            const isExpanded = expanded === q._id;
                            return (
                                <div key={q._id}
                                    className="rounded-3xl shadow-[0_10px_15px_-3px_rgb(0_0_0/0.1)] border border-slate-100 bg-white overflow-hidden">
                                    <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : q._id)}>
                                        {/* Votes */}
                                        <div className="flex flex-col items-center gap-1 flex-shrink-0 min-w-[3rem]">
                                            <button onClick={e => { e.stopPropagation(); if (!flags.canVote) return; voteMutation.mutate({ id: q._id, vote: 'up' }); }}
                                                disabled={!flags.canVote}
                                                className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${q.myVote === 'up' ? 'text-emerald-500 bg-emerald-50' : 'text-slate-300 hover:text-emerald-500 hover:bg-emerald-50'}`}>
                                                <ThumbsUp size={15} />
                                            </button>
                                            <span className={`text-sm font-bold ${net > 0 ? 'text-[#00BFFF]' : net < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                                                {net > 0 ? '+' : ''}{net}
                                            </span>
                                            <button onClick={e => { e.stopPropagation(); if (!flags.canVote) return; voteMutation.mutate({ id: q._id, vote: 'down' }); }}
                                                disabled={!flags.canVote}
                                                className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${q.myVote === 'down' ? 'text-red-400 bg-red-50' : 'text-slate-300 hover:text-red-400 hover:bg-red-50'}`}>
                                                <ThumbsDown size={15} />
                                            </button>
                                        </div>

                                        {/* Question */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-base font-semibold text-slate-900 leading-snug">{q.question}</p>
                                            <p className="text-xs text-slate-400 mt-1.5">Posted: {fmtDate(q.createdAt)}</p>
                                        </div>

                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            {flags.isAdmin && (
                                                <button onClick={e => { e.stopPropagation(); setRemoveTarget(q._id); }}
                                                    className="p-2 rounded-xl text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors">
                                                    <Trash2 size={13} />
                                                </button>
                                            )}
                                            {isExpanded ? <ChevronUp size={16} className="text-slate-300" /> : <ChevronDown size={16} className="text-slate-300" />}
                                        </div>
                                    </div>

                                    {/* Expanded content */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                                                className="overflow-hidden border-t border-[#E2E8F0]">
                                                <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
                                                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                                                        <User size={13} />
                                                        <span>Posted by <span className="font-medium">{q.authorNickname}</span></span>
                                                        {q.authorBranch && <span>• {q.authorBranch}</span>}
                                                        {q.authorBatch && <span>{q.authorBatch}</span>}
                                                    </div>
                                                    {q.company && (
                                                        <span className="rounded-full bg-slate-100 text-slate-600 text-xs font-medium px-3 py-1">
                                                            {q.company}
                                                        </span>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}

                        {!isFetching && allItems.length === 0 && (
                            <div className="rounded-3xl border border-slate-100 p-10 text-center bg-white shadow-sm">
                                <HelpCircle size={40} className="mx-auto mb-3 text-slate-200" />
                                <p className="text-slate-500">No questions yet. {flags.canPostHR ? 'Add the first one!' : ''}</p>
                            </div>
                        )}
                    </div>
                </InfiniteScroll>
            )}

            {/* Add Modal */}
            <AnimatePresence>
                {addModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
                        onClick={() => setAddModal(false)}>
                        <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
                            className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 w-full max-w-md"
                            onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-slate-900">Add HR Question</h2>
                                <button onClick={() => setAddModal(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"><X size={16} /></button>
                            </div>
                            <form onSubmit={e => { e.preventDefault(); if (!form.question.trim()) { toast.error('Question required.'); return; } postMutation.mutate(form); }}
                                className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Question *</label>
                                    <textarea value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                                        required placeholder="Enter an HR interview question…" rows={4}
                                        onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (!form.question.trim()) { toast.error('Question required.'); return; } postMutation.mutate(form); } }}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#00BFFF] resize-none transition-colors" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Company (optional)</label>
                                    <select value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#00BFFF] bg-white transition-colors">
                                        <option value="">Select company…</option>
                                        {COMPANIES.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <button type="button" onClick={() => setAddModal(false)}
                                        className="rounded-full px-5 py-2 text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button>
                                    <motion.button type="submit" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                                        disabled={postMutation.isLoading}
                                        className="rounded-full px-6 py-2 text-sm font-semibold text-white disabled:opacity-60"
                                        style={{ background: '#00BFFF' }}>
                                        {postMutation.isLoading ? 'Adding…' : 'Add Question'}
                                    </motion.button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <RemoveModal open={!!removeTarget} onClose={() => setRemoveTarget(null)}
                onConfirm={(reason) => removeMutation.mutate({ id: removeTarget, reason })} />
        </div>
    );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const TABS_CONFIG = [
    { key: 'blogs', label: 'Blogs', icon: BookOpen, sparkHidden: true },
    { key: 'stories', label: 'Stories', icon: Video, sparkHidden: false },
    { key: 'hr-questions', label: 'HR Questions', icon: HelpCircle, sparkHidden: true },
];

export default function PlacementStories() {
    const { user } = useAuth();
    const flags = useRoleFlags(user);
    const queryClient = useQueryClient();
    const [selectedTab, setSelectedTab] = useState(0);
    const [notification, setNotification] = useState(null);

    // Socket.io real-time new-post notifications
    useEffect(() => {
        const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', { transports: ['websocket'] });
        socket.on('new-post', (data) => {
            setNotification(`New ${data.type}: "${data.title || data.company}" by ${data.author}`);
            setTimeout(() => setNotification(null), 5000);
            queryClient.invalidateQueries({ queryKey: ['ps-blogs'] });
            queryClient.invalidateQueries({ queryKey: ['ps-stories'] });
            queryClient.invalidateQueries({ queryKey: ['ps-hr'] });
        });
        socket.on(`post-removed-${user?._id}`, (data) => {
            toast.error(`Your post was removed: ${data.reason || 'No reason given'}`);
        });
        return () => socket.disconnect();
    }, [queryClient, user]);

    // Spark users see a limited view
    if (flags.isSpark) {
        return (
            <div className="relative min-h-screen">
                <div className="pointer-events-none fixed inset-0 z-[-1]" style={{ background: '#FFFFFF' }}>
                    <div className="wave-bg" />
                </div>
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
                    <h1 className="text-4xl font-bold mb-6" style={{ color: '#0F172A' }}>Placement Stories</h1>
                    <div className="rounded-3xl shadow-[0_10px_15px_-3px_rgb(0_0_0/0.1)] border border-slate-100 bg-white p-10 text-center">
                        <AlertCircle size={48} className="mx-auto mb-4 text-[#00BFFF]/40" />
                        <h2 className="text-xl font-bold text-slate-900 mb-2">ANITS Ignite Exclusive</h2>
                        <p className="text-slate-500 text-base max-w-md mx-auto leading-relaxed">
                            Placement Blogs, Stories, and HR Questions are exclusive for ANITS Ignite students and Alumni.
                            You can still view Placement Stories videos — check the Stories tab!
                        </p>
                        <div className="mt-6 flex justify-center">
                            <button onClick={() => setSelectedTab(1)}
                                className="rounded-full px-6 py-2.5 text-sm font-semibold text-white"
                                style={{ background: '#00BFFF' }}>
                                Watch Stories
                            </button>
                        </div>
                    </div>
                    {/* Spark gets Stories tab only */}
                    <div className="mt-8">
                        <StoriesTab flags={flags} />
                    </div>
                </div>
                <style>{waveCSS}</style>
            </div>
        );
    }

    const visibleTabs = TABS_CONFIG.filter(t => !flags.isSpark || !t.sparkHidden);

    return (
        <div className="relative min-h-screen">
            <Toaster position="top-right" />

            {/* Wave BG */}
            <div className="pointer-events-none fixed inset-0 z-[-1]" style={{ background: '#FFFFFF' }}>
                <div className="wave-bg" />
            </div>

            {/* Live notification banner */}
            <AnimatePresence>
                {notification && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-full px-5 py-2.5 text-sm font-medium text-white shadow-lg"
                        style={{ background: '#00BFFF' }}>
                        🔔 {notification}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
                {/* Page header */}
                <div className="mb-7">
                    <h1 className="text-4xl font-bold" style={{ color: '#0F172A' }}>Placement Stories</h1>
                    <p className="text-sm text-slate-500 mt-1">Blogs, videos, and HR questions from placed students</p>
                </div>

                {/* Tab group */}
                <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
                    <Tab.List className="flex items-center gap-2 overflow-x-auto pb-1 mb-8 scrollbar-hide">
                        {visibleTabs.map((tab) => (
                            <Tab key={tab.key} as="button"
                                className={({ selected }) =>
                                    `flex-shrink-0 flex items-center gap-1.5 rounded-full px-6 py-2 text-sm font-medium border outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#00BFFF]/50 ${selected
                                        ? 'bg-[#00BFFF] text-white border-[#00BFFF] shadow-md'
                                        : 'border-slate-200 text-slate-600 hover:border-[#00BFFF] hover:text-[#00BFFF]'
                                    }`
                                }>
                                <tab.icon size={14} />
                                {tab.label}
                            </Tab>
                        ))}
                    </Tab.List>

                    <Tab.Panels>
                        <AnimatePresence mode="wait">
                            {visibleTabs.map((tab, idx) => (
                                selectedTab === idx && (
                                    <Tab.Panel key={tab.key} static>
                                        <motion.div
                                            key={tab.key}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 8 }}
                                            transition={{ duration: 0.25 }}>
                                            {tab.key === 'blogs' && <BlogsTab flags={flags} />}
                                            {tab.key === 'stories' && <StoriesTab flags={flags} />}
                                            {tab.key === 'hr-questions' && <HRQuestionsTab flags={flags} />}
                                        </motion.div>
                                    </Tab.Panel>
                                )
                            ))}
                        </AnimatePresence>
                    </Tab.Panels>
                </Tab.Group>
            </div>

            <style>{waveCSS}</style>
        </div>
    );
}

const waveCSS = `
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
  .ql-toolbar { border-radius: 0.75rem 0.75rem 0 0 !important; border-color: transparent !important; background: #F8FAFC; }
  .ql-container { border-radius: 0 0 0.75rem 0.75rem !important; border-color: transparent !important; font-size: 14px; }
  .ql-editor { min-height: 150px; }
`;
