import express from 'express';
import Blog from '../models/Blog.js';
import Story from '../models/Story.js';
import HRQuestion from '../models/HRQuestion.js';
import User from '../models/User.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────
function extractYtId(url = '') {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?/\s]{11})/);
    return m ? m[1] : null;
}
function ytThumbnail(url) {
    const id = extractYtId(url);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '';
}
function buildSearch(query) {
    if (!query) return {};
    const re = new RegExp(query, 'i');
    return re;
}

// ─── GET /api/placement-stories?tab=blogs&search=&sort=recent&page=1&limit=10 ──
router.get('/', verifyToken, async (req, res) => {
    try {
        const { tab = 'blogs', search = '', sort = 'recent', page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        if (tab === 'blogs') {
            const filter = { isHidden: false };
            if (search) filter.$or = [
                { title: buildSearch(search) },
                { content: buildSearch(search) },
                { company: buildSearch(search) },
            ];
            const total = await Blog.countDocuments(filter);
            const blogs = await Blog.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean();
            return res.json({ items: blogs, total, hasMore: skip + blogs.length < total });
        }

        if (tab === 'stories') {
            const filter = { isHidden: false };
            if (search) filter.$or = [
                { title: buildSearch(search) },
                { company: buildSearch(search) },
            ];
            const total = await Story.countDocuments(filter);
            const stories = await Story.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean();
            return res.json({ items: stories, total, hasMore: skip + stories.length < total });
        }

        if (tab === 'hr-questions') {
            const filter = { isHidden: false };
            if (search) filter.$or = [
                { question: buildSearch(search) },
                { company: buildSearch(search) },
            ];
            // Auto-hide net score < -5
            filter.$expr = { $gt: [{ $subtract: ['$votes.up', '$votes.down'] }, -5] };
            const sortClause = sort === 'upvotes'
                ? { 'votes.up': -1 }
                : { createdAt: -1 };
            const total = await HRQuestion.countDocuments(filter);
            const questions = await HRQuestion.find(filter)
                .sort(sortClause)
                .skip(skip)
                .limit(parseInt(limit))
                .lean();
            const withNet = questions.map(q => ({
                ...q,
                netScore: (q.votes?.up || 0) - (q.votes?.down || 0),
                myVote: req.user?._id
                    ? q.votes?.upVoters?.some(v => v.toString() === req.user._id.toString())
                        ? 'up'
                        : q.votes?.downVoters?.some(v => v.toString() === req.user._id.toString())
                            ? 'down'
                            : null
                    : null,
            }));
            return res.json({ items: withNet, total, hasMore: skip + questions.length < total });
        }

        return res.status(400).json({ message: 'Invalid tab' });
    } catch (err) {
        console.error('[PlacementStories GET]', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ─── POST /api/placement-stories/blogs ────────────────────────────────────────
router.post('/blogs', verifyToken, async (req, res) => {
    try {
        const { role, batch } = req.user;

        // Eligibility: 3rd/4th Ignite or Alumni or Coordinator/Admin
        const batchYear = parseInt(batch);
        const currentYear = new Date().getFullYear();
        const yearInCollege = batchYear ? currentYear - (batchYear - 4) : 0;
        const isSeniorIgnite = role === 'Ignite' && yearInCollege >= 3;
        const eligible = isSeniorIgnite || ['Alumni', 'Coordinator', 'Admin'].includes(role);

        if (!eligible) {
            return res.status(403).json({ message: 'Only 3rd/4th year Ignite, Alumni, or Admin can post blogs.' });
        }

        const { title, content, company } = req.body;
        if (!title || !content) return res.status(400).json({ message: 'Title and content required.' });

        const blog = await Blog.create({
            title: title.trim(),
            content,
            company: company?.trim() || '',
            authorId: req.user._id,
            authorNickname: req.user.nickname || req.user.name,
            authorBatch: req.user.batch || '',
            authorBranch: req.user.branch || '',
        });

        // Notify relevant users via Socket.io
        req.io?.emit('new-post', {
            type: 'blog',
            title: blog.title,
            company: blog.company,
            author: blog.authorNickname,
            id: blog._id,
        });

        return res.status(201).json({ blog });
    } catch (err) {
        console.error('[PlacementStories POST blog]', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ─── POST /api/placement-stories/stories ──────────────────────────────────────
router.post(
    '/stories',
    verifyToken,
    requireRole('Coordinator', 'Admin'),
    async (req, res) => {
        try {
            const { title, company, type, year, ytLink, description } = req.body;
            if (!title || !company || !type || !ytLink)
                return res.status(400).json({ message: 'title, company, type and ytLink required.' });

            const story = await Story.create({
                title: title.trim(),
                company: company.trim(),
                type,
                year: year || String(new Date().getFullYear()),
                ytLink: ytLink.trim(),
                ytThumbnail: ytThumbnail(ytLink.trim()),
                description: description?.trim().slice(0, 300) || '',
                authorId: req.user._id,
                authorNickname: req.user.nickname || req.user.name,
            });

            req.io?.emit('new-post', {
                type: 'story',
                title: story.title,
                company: story.company,
                author: story.authorNickname,
                id: story._id,
            });

            return res.status(201).json({ story });
        } catch (err) {
            console.error('[PlacementStories POST story]', err);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

// ─── POST /api/placement-stories/hr-questions ─────────────────────────────────
router.post('/hr-questions', verifyToken, async (req, res) => {
    try {
        const { role, batch } = req.user;
        const batchYear = parseInt(batch);
        const currentYear = new Date().getFullYear();
        const yearInCollege = batchYear ? currentYear - (batchYear - 4) : 0;
        const isSeniorIgnite = role === 'Ignite' && yearInCollege >= 3;
        const eligible = isSeniorIgnite || ['Alumni', 'Coordinator', 'Admin'].includes(role);

        if (!eligible) {
            return res.status(403).json({ message: 'Only 3rd/4th year Ignite, Alumni, or Admin can add HR questions.' });
        }

        const { question, company } = req.body;
        if (!question) return res.status(400).json({ message: 'Question is required.' });

        const hrq = await HRQuestion.create({
            question: question.trim(),
            company: company?.trim() || '',
            authorId: req.user._id,
            authorNickname: req.user.nickname || req.user.name,
            authorBatch: req.user.batch || '',
            authorBranch: req.user.branch || '',
            votes: { up: 0, down: 0, upVoters: [], downVoters: [] },
        });

        req.io?.emit('new-post', {
            type: 'hr-question',
            company: hrq.company,
            author: hrq.authorNickname,
            id: hrq._id,
        });

        return res.status(201).json({ hrQuestion: hrq });
    } catch (err) {
        console.error('[PlacementStories POST hr-question]', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ─── PATCH /api/placement-stories/hr-vote?id=&vote=up/down ───────────────────
router.patch('/hr-vote', verifyToken, async (req, res) => {
    try {
        const { id, vote } = req.query;
        if (!id || !['up', 'down'].includes(vote))
            return res.status(400).json({ message: 'id and vote (up/down) required.' });

        const userId = req.user._id;
        const hrq = await HRQuestion.findById(id);
        if (!hrq) return res.status(404).json({ message: 'Question not found.' });

        const hasUp = hrq.votes.upVoters.some(v => v.toString() === userId.toString());
        const hasDown = hrq.votes.downVoters.some(v => v.toString() === userId.toString());

        if (vote === 'up') {
            if (hasUp) {
                // Toggle off
                hrq.votes.up -= 1;
                hrq.votes.upVoters = hrq.votes.upVoters.filter(v => v.toString() !== userId.toString());
            } else {
                hrq.votes.up += 1;
                hrq.votes.upVoters.push(userId);
                if (hasDown) {
                    hrq.votes.down -= 1;
                    hrq.votes.downVoters = hrq.votes.downVoters.filter(v => v.toString() !== userId.toString());
                }
            }
        } else {
            if (hasDown) {
                // Toggle off
                hrq.votes.down -= 1;
                hrq.votes.downVoters = hrq.votes.downVoters.filter(v => v.toString() !== userId.toString());
            } else {
                hrq.votes.down += 1;
                hrq.votes.downVoters.push(userId);
                if (hasUp) {
                    hrq.votes.up -= 1;
                    hrq.votes.upVoters = hrq.votes.upVoters.filter(v => v.toString() !== userId.toString());
                }
            }
        }

        await hrq.save();

        const net = hrq.votes.up - hrq.votes.down;
        const myVote = hrq.votes.upVoters.some(v => v.toString() === userId.toString())
            ? 'up'
            : hrq.votes.downVoters.some(v => v.toString() === userId.toString())
                ? 'down'
                : null;

        return res.json({ netScore: net, up: hrq.votes.up, down: hrq.votes.down, myVote });
    } catch (err) {
        console.error('[HRVote]', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ─── PATCH /api/placement-stories/remove?id=&tab=&reason= ────────────────────
router.patch(
    '/remove',
    verifyToken,
    requireRole('Coordinator', 'Admin'),
    async (req, res) => {
        try {
            const { id, tab, reason = '' } = req.query;
            if (!id || !tab) return res.status(400).json({ message: 'id and tab required.' });

            let doc;
            if (tab === 'blogs') doc = await Blog.findByIdAndUpdate(id, { isHidden: true, hideReason: reason, hiddenBy: req.user._id }, { new: true });
            else if (tab === 'stories') doc = await Story.findByIdAndUpdate(id, { isHidden: true, hideReason: reason, hiddenBy: req.user._id }, { new: true });
            else if (tab === 'hr-questions') doc = await HRQuestion.findByIdAndUpdate(id, { isHidden: true, hideReason: reason, hiddenBy: req.user._id }, { new: true });

            if (!doc) return res.status(404).json({ message: 'Post not found.' });

            // Notify author
            req.io?.emit(`post-removed-${doc.authorId}`, {
                id,
                tab,
                reason,
                removedBy: req.user.nickname || req.user.name,
            });

            return res.json({ message: 'Post hidden successfully.' });
        } catch (err) {
            console.error('[PlacementStories REMOVE]', err);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

// ─── PATCH /api/placement-stories/stories/:id (Admin edit) ───────────────────
router.patch(
    '/stories/:id',
    verifyToken,
    requireRole('Coordinator', 'Admin'),
    async (req, res) => {
        try {
            const { title, company, type, year, ytLink, description } = req.body;
            const updates = {};
            if (title) updates.title = title.trim();
            if (company) updates.company = company.trim();
            if (type) updates.type = type;
            if (year) updates.year = year;
            if (ytLink) { updates.ytLink = ytLink.trim(); updates.ytThumbnail = ytThumbnail(ytLink.trim()); }
            if (description !== undefined) updates.description = description.slice(0, 300);

            const story = await Story.findByIdAndUpdate(req.params.id, updates, { new: true });
            if (!story) return res.status(404).json({ message: 'Story not found.' });
            return res.json({ story });
        } catch (err) {
            res.status(500).json({ message: 'Server error' });
        }
    }
);

export default router;
