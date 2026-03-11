import express from 'express';
import CollabPost from '../models/CollabPost.js';
import InternshipPost from '../models/InternshipPost.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────
function searchFilter(query) {
    if (!query) return {};
    const re = new RegExp(query, 'i');
    return { $or: [{ title: re }, { description: re }] };
}

// ══════════════════════════════════════════════════════════════════════════════
// COLLAB ROUTES
// ══════════════════════════════════════════════════════════════════════════════

// ─── GET /api/opportunities/collab ────────────────────────────────────────────
router.get('/collab', verifyToken, async (req, res) => {
    try {
        const { search = '', page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const filter = { isHidden: false, ...searchFilter(search) };
        const total = await CollabPost.countDocuments(filter);
        const posts = await CollabPost.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        return res.json({ items: posts, total, hasMore: skip + posts.length < total });
    } catch (err) {
        console.error('[Collab GET]', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ─── POST /api/opportunities/collab ───────────────────────────────────────────
router.post('/collab', verifyToken, async (req, res) => {
    try {
        const { role } = req.user;
        if (role !== 'Ignite') {
            return res.status(403).json({ message: 'Only Ignite students can post collab projects.' });
        }

        const { title, description, roles, contactDetails } = req.body;
        if (!title || !description || !contactDetails) {
            return res.status(400).json({ message: 'Title, description, and contact details required.' });
        }

        const post = await CollabPost.create({
            title: title.trim(),
            description: description.trim(),
            roles: Array.isArray(roles) ? roles : [],
            contactDetails: contactDetails.trim(),
            authorId: req.user._id,
            authorNickname: req.user.nickname || req.user.name,
            authorBranch: req.user.branch || '',
            authorBatch: req.user.batch || '',
        });

        req.io?.emit('new-opportunity', {
            type: 'collab',
            title: post.title,
            author: post.authorNickname,
            id: post._id,
        });

        return res.status(201).json({ post });
    } catch (err) {
        console.error('[Collab POST]', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ─── PATCH /api/opportunities/collab/:id ──────────────────────────────────────
// Actions: edit | mark-closed | delete | admin-remove
router.patch('/collab/:id', verifyToken, async (req, res) => {
    try {
        const { action, title, description, roles, contactDetails, reason } = req.body;
        const { role } = req.user;
        const post = await CollabPost.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found.' });

        const isOwner = post.authorId.toString() === req.user._id.toString();
        const isAdmin = ['Coordinator', 'Admin'].includes(role);

        if (action === 'edit') {
            if (!isOwner) return res.status(403).json({ message: 'Only the poster can edit this post.' });
            if (title) post.title = title.trim();
            if (description) post.description = description.trim();
            if (roles) post.roles = roles;
            if (contactDetails) post.contactDetails = contactDetails.trim();
            await post.save();
            return res.json({ post });
        }

        if (action === 'mark-closed') {
            if (!isOwner) return res.status(403).json({ message: 'Only the poster can close this post.' });
            post.status = 'closed';
            post.closedAt = new Date();
            await post.save();
            return res.json({ post });
        }

        if (action === 'delete') {
            if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Only the poster or admin can delete.' });
            await CollabPost.findByIdAndDelete(req.params.id);
            return res.json({ message: 'Post deleted.' });
        }

        if (action === 'admin-remove') {
            if (!isAdmin) return res.status(403).json({ message: 'Coordinator/Admin only.' });
            post.isHidden = true;
            post.hideReason = reason || '';
            post.hiddenBy = req.user._id;
            await post.save();
            // Notify poster
            req.io?.emit(`opportunity-removed-${post.authorId}`, { id: post._id, reason });
            return res.json({ message: 'Post hidden.' });
        }

        return res.status(400).json({ message: 'Invalid action.' });
    } catch (err) {
        console.error('[Collab PATCH]', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// INTERNSHIP ROUTES
// ══════════════════════════════════════════════════════════════════════════════

// ─── GET /api/opportunities/internships ───────────────────────────────────────
router.get('/internships', verifyToken, async (req, res) => {
    try {
        const { search = '', page = 1, limit = 10, status } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const { role } = req.user;

        // Only coordinators/admins can view pending/rejected
        let statusFilter;
        if (['Coordinator', 'Admin'].includes(role)) {
            statusFilter = status ? { status } : { status: { $in: ['pending', 'approved'] } };
        } else {
            statusFilter = { status: 'approved' };
        }

        const filter = { isHidden: false, ...statusFilter, ...searchFilter(search) };
        const total = await InternshipPost.countDocuments(filter);
        const posts = await InternshipPost.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        return res.json({ items: posts, total, hasMore: skip + posts.length < total });
    } catch (err) {
        console.error('[Internships GET]', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ─── POST /api/opportunities/internships ──────────────────────────────────────
router.post('/internships', verifyToken, async (req, res) => {
    try {
        const { role } = req.user;
        if (role !== 'Ignite') {
            return res.status(403).json({ message: 'Only Ignite students can share internships.' });
        }

        const { title, description, link, stipendInfo } = req.body;
        if (!title || !description || !link) {
            return res.status(400).json({ message: 'Title, description, and link required.' });
        }

        const post = await InternshipPost.create({
            title: title.trim(),
            description: description.trim(),
            link: link.trim(),
            stipendInfo: stipendInfo?.trim() || '',
            authorId: req.user._id,
            authorNickname: req.user.nickname || req.user.name,
            authorBranch: req.user.branch || '',
            authorBatch: req.user.batch || '',
        });

        // Notify coordinators
        req.io?.emit('pending-internship', {
            id: post._id,
            title: post.title,
            author: post.authorNickname,
        });

        return res.status(201).json({ post });
    } catch (err) {
        console.error('[Internships POST]', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ─── PATCH /api/opportunities/internships/:id ─────────────────────────────────
// Actions: approve | reject | admin-remove
router.patch(
    '/internships/:id',
    verifyToken,
    async (req, res) => {
        try {
            const { action, reason } = req.body;
            const { role } = req.user;
            const post = await InternshipPost.findById(req.params.id);
            if (!post) return res.status(404).json({ message: 'Post not found.' });

            const isAdmin = ['Coordinator', 'Admin'].includes(role);

            if (action === 'approve') {
                if (!isAdmin) return res.status(403).json({ message: 'Coordinator/Admin only.' });
                post.status = 'approved';
                post.approvedBy = req.user._id;
                post.approvedAt = new Date();
                post.approverNickname = req.user.nickname || req.user.name;
                await post.save();

                req.io?.emit(`internship-approved-${post.authorId}`, {
                    id: post._id,
                    title: post.title,
                });
                req.io?.emit('new-opportunity', {
                    type: 'internship',
                    title: post.title,
                    author: post.authorNickname,
                    id: post._id,
                });
                return res.json({ post });
            }

            if (action === 'reject') {
                if (!isAdmin) return res.status(403).json({ message: 'Coordinator/Admin only.' });
                post.status = 'rejected';
                post.rejectionReason = reason || '';
                await post.save();

                req.io?.emit(`internship-rejected-${post.authorId}`, {
                    id: post._id,
                    title: post.title,
                    reason: reason || '',
                });
                return res.json({ post });
            }

            if (action === 'admin-remove') {
                if (!isAdmin) return res.status(403).json({ message: 'Coordinator/Admin only.' });
                post.isHidden = true;
                post.hideReason = reason || '';
                post.hiddenBy = req.user._id;
                await post.save();
                return res.json({ message: 'Post removed.' });
            }

            return res.status(400).json({ message: 'Invalid action.' });
        } catch (err) {
            console.error('[Internships PATCH]', err);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

// ─── GET /api/opportunities/pending-count ─────────────────────────────────────
// For coordinator badge notification
router.get('/pending-count', verifyToken, requireRole('Coordinator', 'Admin'), async (req, res) => {
    try {
        const count = await InternshipPost.countDocuments({ status: 'pending', isHidden: false });
        return res.json({ count });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ─── Cron-style cleanup endpoint (call from a scheduled task or server startup) ─
// DELETE /api/opportunities/cleanup-collab (Admin-protected)
router.delete('/cleanup-collab', verifyToken, requireRole('Admin', 'Coordinator'), async (req, res) => {
    try {
        const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
        const { deletedCount } = await CollabPost.deleteMany({
            status: 'closed',
            closedAt: { $lte: tenDaysAgo },
        });
        return res.json({ message: `Cleaned up ${deletedCount} stale collab posts.` });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
