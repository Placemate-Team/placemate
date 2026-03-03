import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';
import Contest from '../models/Contest.js';
import Registration from '../models/Registration.js';
import Score from '../models/Score.js';
import User from '../models/User.js';
import DSA from '../models/DSA.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ── Helpers ─────────────────────────────────────────────────────────────────

function fuzzyMatch(a = '', b = '') {
    a = a.toLowerCase().trim();
    b = b.toLowerCase().trim();
    if (a === b) return 100;
    if (a.includes(b) || b.includes(a)) return 80;
    // Levenshtein distance simplified
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    if (longer.length === 0) return 100;
    const editDistance = levenshtein(longer, shorter);
    return Math.round(((longer.length - editDistance) / longer.length) * 100);
}

function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) =>
        Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}

// ── GET /api/contests?tab=upcoming ───────────────────────────────────────────
router.get('/contests', verifyToken, async (req, res) => {
    try {
        const { tab = 'upcoming' } = req.query;
        const { role } = req.user;

        let filter = { status: tab };

        // Spark users only see major contests
        if (role === 'Spark') {
            filter.type = 'major';
        }

        const contests = await Contest.find(filter).sort({ startDate: 1 });

        // Attach registration status for each contest
        const contestIds = contests.map(c => c._id);
        const regs = await Registration.find({ userId: req.user._id, contestId: { $in: contestIds } });
        const regMap = new Set(regs.map(r => r.contestId.toString()));

        const result = contests.map(c => ({
            ...c.toObject(),
            isRegistered: regMap.has(c._id.toString()),
        }));

        // Summary counts
        const upcomingCount = await Contest.countDocuments({
            status: 'upcoming',
            ...(role === 'Spark' ? { type: 'major' } : {}),
        });
        const pastCount = await Contest.countDocuments({
            status: 'past',
            ...(role === 'Spark' ? { type: 'major' } : {}),
        });

        res.json({ contests: result, upcomingCount, pastCount });
    } catch (err) {
        console.error('[Contests] GET error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ── GET /api/user/eligibility?contestId= ────────────────────────────────────
router.get('/user/eligibility', verifyToken, async (req, res) => {
    try {
        const { contestId } = req.query;
        const contest = await Contest.findById(contestId);
        if (!contest) return res.status(404).json({ message: 'Contest not found' });

        const { role } = req.user;

        // View-only roles
        if (['Alumni', 'Faculty'].includes(role)) {
            return res.json({ eligible: false, reason: 'View-only access for your role', viewOnly: true });
        }

        // 4th Year
        if (role === 'Ignite' && req.user.batch) {
            // Could check graduation year here if needed
        }

        // Spark can only register for major contests
        if (role === 'Spark' && contest.type === 'monthly') {
            return res.json({ eligible: false, reason: 'Monthly contests are for Ignite students only' });
        }

        // For major contests — everyone eligible (admin/coordinator always eligible)
        if (contest.type === 'major') {
            return res.json({ eligible: true });
        }

        // For monthly contests — check 75% DSA completion for Ignite
        if (role === 'Ignite' || role === 'Coordinator' || role === 'Admin') {
            const dsaData = await DSA.findOne({}).lean();
            if (!dsaData) return res.json({ eligible: true });

            // Count total problems
            const totalProblems = dsaData.levels?.reduce((acc, lv) =>
                acc + lv.topics.reduce((a, t) => a + t.problems.length, 0), 0
            ) || 0;

            const userDoc = await User.findById(req.user._id).select('completedProblems');
            const completedCount = userDoc?.completedProblems?.length || 0;
            const pct = totalProblems > 0 ? Math.round((completedCount / totalProblems) * 100) : 0;

            if (pct >= 75 || role === 'Coordinator' || role === 'Admin') {
                return res.json({ eligible: true, dsaPct: pct });
            }

            return res.json({
                eligible: false,
                reason: `Need 75% DSA completion (you have ${pct}%)`,
                dsaPct: pct,
            });
        }

        res.json({ eligible: false, reason: 'Contact coordinator' });
    } catch (err) {
        console.error('[Eligibility] error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ── POST /api/contests/register ──────────────────────────────────────────────
router.post('/contests/register', verifyToken, async (req, res) => {
    try {
        const { contestId, hackerRankUsername } = req.body;
        if (!contestId || !hackerRankUsername) {
            return res.status(400).json({ message: 'contestId and hackerRankUsername are required' });
        }

        const contest = await Contest.findById(contestId);
        if (!contest) return res.status(404).json({ message: 'Contest not found' });
        if (contest.status !== 'upcoming') {
            return res.status(400).json({ message: 'Registration is closed for this contest' });
        }

        // Check eligibility
        const { role } = req.user;
        if (['Alumni', 'Faculty'].includes(role)) {
            return res.status(403).json({ message: 'View-only access for your role' });
        }
        if (role === 'Spark' && contest.type === 'monthly') {
            return res.status(403).json({ message: 'Monthly contests are for Ignite students only' });
        }

        const existing = await Registration.findOne({ contestId, userId: req.user._id });
        if (existing) return res.status(409).json({ message: 'Already registered' });

        const reg = await Registration.create({
            contestId,
            userId: req.user._id,
            hackerRankUsername: hackerRankUsername.trim(),
        });

        // Increment participant count & emit update
        await Contest.findByIdAndUpdate(contestId, { $inc: { participantCount: 1 } });
        req.io?.emit('contest-update', { contestId, participantCount: contest.participantCount + 1 });

        res.status(201).json({ message: 'Registered successfully', registration: reg });
    } catch (err) {
        if (err.code === 11000) return res.status(409).json({ message: 'Already registered' });
        console.error('[Register] error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ── GET /api/contests/leaderboard/:id ───────────────────────────────────────
router.get('/contests/leaderboard/:id', verifyToken, async (req, res) => {
    try {
        const scores = await Score.find({ contestId: req.params.id })
            .sort({ rank: 1 })
            .populate('userId', 'name nickname branch')
            .lean();
        res.json({ scores });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ── POST /api/contests/create (Coordinator / Admin) ─────────────────────────
router.post('/contests/create', verifyToken, requireRole('Coordinator', 'Admin'), async (req, res) => {
    try {
        const contest = await Contest.create(req.body);
        res.status(201).json({ contest });
    } catch (err) {
        console.error('[Create Contest] error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ── PATCH /api/contests/:id (Coordinator / Admin) ───────────────────────────
router.patch('/contests/:id', verifyToken, requireRole('Coordinator', 'Admin'), async (req, res) => {
    try {
        const contest = await Contest.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!contest) return res.status(404).json({ message: 'Contest not found' });
        res.json({ contest });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ── DELETE /api/contests/:id (Coordinator / Admin) ──────────────────────────
router.delete('/contests/:id', verifyToken, requireRole('Coordinator', 'Admin'), async (req, res) => {
    try {
        await Contest.findByIdAndDelete(req.params.id);
        await Registration.deleteMany({ contestId: req.params.id });
        await Score.deleteMany({ contestId: req.params.id });
        res.json({ message: 'Contest deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ── POST /api/contests/upload-scores (CSV) ───────────────────────────────────
router.post('/contests/upload-scores', verifyToken, requireRole('Coordinator', 'Admin'), upload.single('csv'), async (req, res) => {
    try {
        const { contestId } = req.body;
        if (!req.file || !contestId) {
            return res.status(400).json({ message: 'CSV file and contestId required' });
        }

        // Get all users for fuzzy matching
        const users = await User.find({}, 'name nickname hackerRankUsername').lean();

        const rows = [];
        await new Promise((resolve, reject) => {
            const stream = Readable.from(req.file.buffer.toString());
            stream.pipe(csv())
                .on('data', (row) => rows.push(row))
                .on('end', resolve)
                .on('error', reject);
        });

        const parsed = rows.map((row, i) => {
            const hackerRankUsername = row.username || row.Username || row.hackerrank_username || '';
            const score = parseInt(row.score || row.Score || '0', 10);
            const rank = parseInt(row.rank || row.Rank || String(i + 1), 10);
            const nickname = row.name || row.Name || hackerRankUsername;

            // Fuzzy match to user
            let matchedUser = null;
            let bestScore = 0;
            for (const u of users) {
                const s1 = fuzzyMatch(hackerRankUsername, u.nickname);
                const s2 = fuzzyMatch(hackerRankUsername, u.name);
                const best = Math.max(s1, s2);
                if (best > bestScore && best >= 70) {
                    bestScore = best;
                    matchedUser = u;
                }
            }

            return {
                rank,
                hackerRankUsername,
                nickname,
                score,
                userId: matchedUser?._id || null,
                matchStatus: matchedUser ? 'matched' : 'unmatched',
                matchedName: matchedUser ? matchedUser.name : null,
                matchScore: bestScore,
            };
        });

        res.json({ parsed, totalRows: parsed.length });
    } catch (err) {
        console.error('[Upload Scores] error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ── POST /api/contests/save-scores ──────────────────────────────────────────
router.post('/contests/save-scores', verifyToken, requireRole('Coordinator', 'Admin'), async (req, res) => {
    try {
        const { contestId, scores } = req.body;
        if (!contestId || !scores?.length) {
            return res.status(400).json({ message: 'contestId and scores required' });
        }

        await Score.deleteMany({ contestId });
        const docs = scores.map(s => ({
            contestId,
            userId: s.userId || null,
            nickname: s.nickname,
            hackerRankUsername: s.hackerRankUsername,
            score: s.score,
            rank: s.rank,
            matchStatus: s.matchStatus || 'matched',
        }));
        await Score.insertMany(docs);

        res.json({ message: `${docs.length} scores saved` });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ── POST /api/contests/notify ────────────────────────────────────────────────
router.post('/contests/notify', verifyToken, requireRole('Coordinator', 'Admin'), async (req, res) => {
    try {
        const { contestId, message } = req.body;
        if (!contestId || !message) {
            return res.status(400).json({ message: 'contestId and message required' });
        }

        const contest = await Contest.findById(contestId, 'title').lean();
        req.io?.emit('notification', {
            type: 'contest',
            contestId,
            contestTitle: contest?.title,
            message,
            timestamp: new Date().toISOString(),
        });

        res.json({ message: 'Notification sent' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ── GET /api/admin/contest-analytics ────────────────────────────────────────
router.get('/admin/contest-analytics', verifyToken, requireRole('Admin', 'Coordinator'), async (req, res) => {
    try {
        const contests = await Contest.find({}, 'title startDate participantCount status type').lean();
        const totalContests = contests.length;

        // Average participation for past contests
        const pastContests = contests.filter(c => c.status === 'past');
        const avgParticipation = pastContests.length
            ? Math.round(pastContests.reduce((a, c) => a + c.participantCount, 0) / pastContests.length)
            : 0;

        // Chart data — last 6 contests by date
        const chartContests = [...contests]
            .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
            .slice(0, 6)
            .reverse();

        const chartData = {
            labels: chartContests.map(c => c.title.split('–')[0].trim().slice(0, 20)),
            datasets: [
                {
                    label: 'Participants',
                    data: chartContests.map(c => c.participantCount),
                },
            ],
        };

        res.json({ totalContests, avgParticipation, chartData, contests });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
