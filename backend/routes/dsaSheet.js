import express from 'express';
import { DSALevel, UserDSAProgress, MonthlyFocus, BatchGuidance } from '../models/DSA.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// ── GET /api/code-league/dsa-sheet ───────────────────────────────────────────
// Returns all DSA levels + topics + problems, plus user progress
router.get('/dsa-sheet', verifyToken, async (req, res) => {
    try {
        const levels = await DSALevel.find().sort({ level: 1 });

        // User progress
        const progress = await UserDSAProgress.findOne({ userId: req.user._id });
        const completed = progress ? progress.completedProblems.map(id => id.toString()) : [];

        // Monthly focus
        const focus = await MonthlyFocus.findOne({ active: true }).sort({ createdAt: -1 });

        // Batch guidance
        const guidance = await BatchGuidance.findOne({ batch: req.user.batch || 'default' })
            || await BatchGuidance.findOne({ batch: 'default' });

        res.json({
            levels,
            completedProblems: completed,
            monthlyFocus: focus,
            batchGuidance: guidance?.guidance || 'Complete Level 2 by end of 3-1 semester',
        });
    } catch (err) {
        console.error('[DSA Sheet] GET error:', err);
        res.status(500).json({ message: 'Failed to fetch DSA sheet.' });
    }
});

// ── GET /api/code-league/dsa-topics?level=1 ─────────────────────────────────
router.get('/dsa-topics', verifyToken, async (req, res) => {
    try {
        const level = parseInt(req.query.level) || 1;
        const dsaLevel = await DSALevel.findOne({ level });
        if (!dsaLevel) return res.status(404).json({ message: 'Level not found.' });
        res.json({ topics: dsaLevel.topics });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch topics.' });
    }
});

// ── PATCH /api/code-league/tick ──────────────────────────────────────────────
// Toggle problem completion for the current user
router.patch('/tick', verifyToken, requireRole('Ignite', 'Coordinator', 'Admin'), async (req, res) => {
    try {
        const { problemId, checked } = req.body;
        if (!problemId) return res.status(400).json({ message: 'problemId required.' });

        let progress = await UserDSAProgress.findOne({ userId: req.user._id });
        if (!progress) {
            progress = await UserDSAProgress.create({ userId: req.user._id, completedProblems: [] });
        }

        const pid = problemId.toString();
        const alreadyDone = progress.completedProblems.map(id => id.toString()).includes(pid);

        if (checked && !alreadyDone) {
            progress.completedProblems.push(problemId);
        } else if (!checked && alreadyDone) {
            progress.completedProblems = progress.completedProblems.filter(
                id => id.toString() !== pid
            );
        }

        await progress.save();

        // Compute overall counts for live update
        const levels = await DSALevel.find();
        const total = levels.reduce((acc, l) =>
            acc + l.topics.reduce((a, t) => a + t.problems.length, 0), 0
        );
        const done = progress.completedProblems.length;

        // Emit Socket.io event
        req.io.emit('dsa-update', {
            userId: req.user._id,
            completedProblems: progress.completedProblems.map(id => id.toString()),
            total,
            done,
        });

        res.json({
            message: 'Progress updated!',
            completedProblems: progress.completedProblems.map(id => id.toString()),
            total,
            done,
        });
    } catch (err) {
        console.error('[DSA Tick] error:', err);
        res.status(500).json({ message: 'Failed to update progress.' });
    }
});

// ── POST /api/code-league/add-topic ─────────────────────────────────────────
router.post('/add-topic', verifyToken, requireRole('Coordinator', 'Admin'), async (req, res) => {
    try {
        const { level, name } = req.body;
        if (!level || !name) return res.status(400).json({ message: 'level and name required.' });

        const dsaLevel = await DSALevel.findOne({ level: parseInt(level) });
        if (!dsaLevel) return res.status(404).json({ message: 'Level not found.' });

        dsaLevel.topics.push({ name, problems: [], isNew: true, order: dsaLevel.topics.length });
        await dsaLevel.save();

        // Notify users about new topic
        req.io.emit('dsa-new-topic', { level, topicName: name });

        res.json({ message: 'Topic added.', topics: dsaLevel.topics });
    } catch (err) {
        res.status(500).json({ message: 'Failed to add topic.' });
    }
});

// ── PATCH /api/code-league/edit-topic ───────────────────────────────────────
router.patch('/edit-topic', verifyToken, requireRole('Coordinator', 'Admin'), async (req, res) => {
    try {
        const { level, topicId, name } = req.body;
        const dsaLevel = await DSALevel.findOne({ level: parseInt(level) });
        if (!dsaLevel) return res.status(404).json({ message: 'Level not found.' });

        const topic = dsaLevel.topics.id(topicId);
        if (!topic) return res.status(404).json({ message: 'Topic not found.' });

        if (name) topic.name = name;
        await dsaLevel.save();

        res.json({ message: 'Topic updated.', topics: dsaLevel.topics });
    } catch (err) {
        res.status(500).json({ message: 'Failed to edit topic.' });
    }
});

// ── DELETE /api/code-league/delete-topic ────────────────────────────────────
router.delete('/delete-topic', verifyToken, requireRole('Coordinator', 'Admin'), async (req, res) => {
    try {
        const { level, topicId } = req.body;
        const dsaLevel = await DSALevel.findOne({ level: parseInt(level) });
        if (!dsaLevel) return res.status(404).json({ message: 'Level not found.' });

        dsaLevel.topics = dsaLevel.topics.filter(t => t._id.toString() !== topicId);
        await dsaLevel.save();

        res.json({ message: 'Topic deleted.', topics: dsaLevel.topics });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete topic.' });
    }
});

// ── POST /api/code-league/add-problem ───────────────────────────────────────
router.post('/add-problem', verifyToken, requireRole('Coordinator', 'Admin'), async (req, res) => {
    try {
        const { level, topicId, title, link, resourceLink, practiceLink, difficulty } = req.body;
        if (!level || !topicId || !title) {
            return res.status(400).json({ message: 'level, topicId, title required.' });
        }

        const dsaLevel = await DSALevel.findOne({ level: parseInt(level) });
        if (!dsaLevel) return res.status(404).json({ message: 'Level not found.' });

        const topic = dsaLevel.topics.id(topicId);
        if (!topic) return res.status(404).json({ message: 'Topic not found.' });

        topic.problems.push({
            title, link: link || '', resourceLink: resourceLink || '',
            practiceLink: practiceLink || '', difficulty: difficulty || 'Easy',
            order: topic.problems.length,
        });
        topic.isNew = true;
        await dsaLevel.save();

        // Notify users
        req.io.emit('dsa-new-problem', { level, topicId, title });

        res.json({ message: 'Problem added.', topics: dsaLevel.topics });
    } catch (err) {
        res.status(500).json({ message: 'Failed to add problem.' });
    }
});

// ── PATCH /api/code-league/edit-problem ─────────────────────────────────────
router.patch('/edit-problem', verifyToken, requireRole('Coordinator', 'Admin'), async (req, res) => {
    try {
        const { level, topicId, problemId, updates } = req.body;
        const dsaLevel = await DSALevel.findOne({ level: parseInt(level) });
        if (!dsaLevel) return res.status(404).json({ message: 'Level not found.' });

        const topic = dsaLevel.topics.id(topicId);
        if (!topic) return res.status(404).json({ message: 'Topic not found.' });

        const problem = topic.problems.id(problemId);
        if (!problem) return res.status(404).json({ message: 'Problem not found.' });

        Object.assign(problem, updates);
        await dsaLevel.save();

        res.json({ message: 'Problem updated.', topics: dsaLevel.topics });
    } catch (err) {
        res.status(500).json({ message: 'Failed to edit problem.' });
    }
});

// ── DELETE /api/code-league/delete-problem ───────────────────────────────────
router.delete('/delete-problem', verifyToken, requireRole('Coordinator', 'Admin'), async (req, res) => {
    try {
        const { level, topicId, problemId } = req.body;
        const dsaLevel = await DSALevel.findOne({ level: parseInt(level) });
        if (!dsaLevel) return res.status(404).json({ message: 'Level not found.' });

        const topic = dsaLevel.topics.id(topicId);
        if (!topic) return res.status(404).json({ message: 'Topic not found.' });

        topic.problems = topic.problems.filter(p => p._id.toString() !== problemId);
        await dsaLevel.save();

        res.json({ message: 'Problem deleted.', topics: dsaLevel.topics });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete problem.' });
    }
});

// ── PATCH /api/code-league/clear-new ────────────────────────────────────────
// Clear "New" badge when user expands a topic
router.patch('/clear-new', verifyToken, async (req, res) => {
    try {
        const { topicId, level } = req.body;
        const dsaLevel = await DSALevel.findOne({ level: parseInt(level) });
        if (!dsaLevel) return res.status(404).json({ message: 'Level not found.' });

        const topic = dsaLevel.topics.id(topicId);
        if (topic) { topic.isNew = false; await dsaLevel.save(); }

        res.json({ message: 'Badge cleared.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to clear badge.' });
    }
});

// ── GET /api/admin/batch-guidance?batch=3-1 ─────────────────────────────────
router.get('/batch-guidance', verifyToken, async (req, res) => {
    try {
        const { batch } = req.query;
        const guidance = await BatchGuidance.findOne({ batch: batch || 'default' })
            || await BatchGuidance.findOne({ batch: 'default' });
        res.json({ guidance: guidance?.guidance || 'Complete Level 2 by end of semester.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch guidance.' });
    }
});

// ── PATCH /api/admin/batch-guidance ─────────────────────────────────────────
router.patch('/batch-guidance', verifyToken, requireRole('Admin'), async (req, res) => {
    try {
        const { batch, guidance } = req.body;
        await BatchGuidance.findOneAndUpdate(
            { batch: batch || 'default' },
            { guidance },
            { upsert: true, new: true }
        );
        res.json({ message: 'Guidance updated.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update guidance.' });
    }
});

export default router;
