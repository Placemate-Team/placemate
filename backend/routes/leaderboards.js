import express from 'express';
import ContestScore from '../models/ContestScore.js';
import Contest from '../models/Contest.js';
import User from '../models/User.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// ─── Helper: compute overall leaderboard ──────────────────────────────────────
// Overall = sum of all major contest marks / total major contests conducted (missing = 0)
async function computeOverall({ year, tab, contestId, page = 1, limit = 50, currentUserId }) {
    // 1) Find relevant major contests
    const contestFilter = { type: 'major' };
    if (contestId) contestFilter._id = contestId;

    const majorContests = await Contest.find(contestFilter).select('_id title').lean();
    const contestIds = majorContests.map((c) => c._id);
    const totalContests = contestIds.length;

    if (totalContests === 0) return { rows: [], total: 0, totalContests: 0, currentUserRow: null };

    // 2) Score filter
    const scoreFilter = { contestId: { $in: contestIds } };
    if (year) scoreFilter.year = year;
    if (tab === 'ignite-only') scoreFilter.college = 'ANITS';

    // 3) Aggregate: group by userId / nickname
    const pipeline = [
        { $match: scoreFilter },
        {
            $group: {
                _id: { $ifNull: ['$userId', '$nickname'] },
                nickname: { $first: '$nickname' },
                branch: { $first: '$branch' },
                college: { $first: '$college' },
                year: { $first: '$year' },
                userId: { $first: '$userId' },
                role: { $first: '$role' },
                totalScore: { $sum: '$score' },
                appeared: { $sum: 1 },
                scores: { $push: { contestId: '$contestId', score: '$score' } },
            },
        },
        {
            $addFields: {
                // average = totalScore / totalContests (missed contests count as 0)
                average: { $divide: ['$totalScore', totalContests] },
            },
        },
        // sort by average DESC, then appeared DESC (tie-breaker)
        { $sort: { average: -1, appeared: -1 } },
        {
            $facet: {
                metadata: [{ $count: 'total' }],
                data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
            },
        },
    ];

    const [result] = await ContestScore.aggregate(pipeline);
    const rows = result.data || [];
    const total = result.metadata[0]?.total || 0;

    // Assign ranks
    const startRank = (page - 1) * limit + 1;
    const rankedRows = rows.map((r, i) => ({
        rank: startRank + i,
        userId: r.userId,
        nickname: r.nickname,
        branch: r.branch,
        college: r.college,
        year: r.year,
        role: r.role,
        totalScore: r.totalScore,
        appeared: r.appeared,
        average: Math.round(r.average * 100) / 100,
        displayScore: `${Math.round(r.average)}/1000`,
    }));

    // Find current user's row if not in current page
    let currentUserRow = null;
    if (currentUserId) {
        const userInPage = rankedRows.find(
            (r) => r.userId && r.userId.toString() === currentUserId.toString()
        );
        if (!userInPage) {
            // Compute user's rank
            const userScorePipeline = [
                { $match: scoreFilter },
                {
                    $group: {
                        _id: { $ifNull: ['$userId', '$nickname'] },
                        nickname: { $first: '$nickname' },
                        branch: { $first: '$branch' },
                        college: { $first: '$college' },
                        year: { $first: '$year' },
                        userId: { $first: '$userId' },
                        role: { $first: '$role' },
                        totalScore: { $sum: '$score' },
                        appeared: { $sum: 1 },
                    },
                },
                {
                    $addFields: { average: { $divide: ['$totalScore', totalContests] } },
                },
                { $sort: { average: -1, appeared: -1 } },
            ];
            const allRows = await ContestScore.aggregate(userScorePipeline);
            const userIdx = allRows.findIndex(
                (r) => r.userId && r.userId.toString() === currentUserId.toString()
            );
            if (userIdx !== -1) {
                const r = allRows[userIdx];
                currentUserRow = {
                    rank: userIdx + 1,
                    userId: r.userId,
                    nickname: r.nickname,
                    branch: r.branch,
                    college: r.college,
                    year: r.year,
                    role: r.role,
                    totalScore: r.totalScore,
                    appeared: r.appeared,
                    average: Math.round(r.average * 100) / 100,
                    displayScore: `${Math.round(r.average)}/1000`,
                    isCurrentUser: true,
                };
            }
        }
    }

    return { rows: rankedRows, total, totalContests, currentUserRow };
}

// ─── GET /api/leaderboards ─────────────────────────────────────────────────────
// Query params: year, filter (1stYear|2ndYear|3rdYear|4thYear|all), tab (all-time-overall|ignite-only|major), contestId, page
router.get('/', verifyToken, async (req, res) => {
    try {
        const {
            year,
            filter = 'all',
            tab = 'all-time-overall',
            contestId,
            page = 1,
            limit = 50,
        } = req.query;

        const currentUserId = req.user._id;
        const userRole = req.user.role;

        // Spark users cannot access ignite-only tab
        if (tab === 'ignite-only' && userRole === 'Spark') {
            return res.status(403).json({ message: 'Access denied for Spark users.' });
        }

        // Map filter to year value
        const yearFilterMap = {
            '1stYear': '1st Year',
            '2ndYear': '2nd Year',
            '3rdYear': '3rd Year',
            '4thYear': '4th Year',
        };
        const yearFilter = filter !== 'all' ? yearFilterMap[filter] : undefined;

        const tabMap = {
            'all-time-overall': 'overall',
            'ignite-only': 'ignite-only',
            major: 'overall',
        };

        const { rows, total, totalContests, currentUserRow } = await computeOverall({
            year,
            tab: tabMap[tab] || 'overall',
            contestId: contestId || undefined,
            page: parseInt(page),
            limit: parseInt(limit),
            currentUserId,
        });

        // Also get list of major contests for the Major Contests dropdown
        const majorContests = await Contest.find({ type: 'major' })
            .select('_id title startDate')
            .sort({ startDate: -1 })
            .lean();

        return res.json({
            rows,
            total,
            totalContests,
            currentUserRow,
            majorContests,
            page: parseInt(page),
            limit: parseInt(limit),
            hasMore: parseInt(page) * parseInt(limit) < total,
        });
    } catch (error) {
        console.error('[Leaderboard GET]', error);
        res.status(500).json({ message: 'Server error fetching leaderboard.' });
    }
});

// ─── POST /api/leaderboards/recalculate ───────────────────────────────────────
// Coordinator/Admin only — triggers re-rank via Socket.io broadcast
router.post(
    '/recalculate',
    verifyToken,
    requireRole('Coordinator', 'Admin'),
    async (req, res) => {
        try {
            // Recalculation is done live on the GET endpoint already (no cached ranks).
            // Here we just emit a socket event so clients refresh.
            req.io.emit('leaderboard-update', { timestamp: new Date().toISOString() });
            return res.json({ message: 'Leaderboard recalculated and broadcasted.' });
        } catch (error) {
            console.error('[Leaderboard Recalculate]', error);
            res.status(500).json({ message: 'Server error during recalculation.' });
        }
    }
);

// ─── POST /api/leaderboards/upload ────────────────────────────────────────────
// Coordinator/Admin only — upload/update scores for a major contest (JSON for now)
router.post(
    '/upload',
    verifyToken,
    requireRole('Coordinator', 'Admin'),
    async (req, res) => {
        try {
            const { contestId, scores } = req.body;
            if (!contestId || !Array.isArray(scores)) {
                return res.status(400).json({ message: 'contestId and scores array required.' });
            }

            const contest = await Contest.findById(contestId);
            if (!contest) return res.status(404).json({ message: 'Contest not found.' });

            // Upsert scores
            const ops = scores.map((s) => ({
                updateOne: {
                    filter: { contestId, nickname: s.nickname },
                    update: {
                        $set: {
                            contestId,
                            nickname: s.nickname,
                            score: s.score ?? 0,
                            maxScore: s.maxScore ?? 1000,
                            branch: s.branch ?? '',
                            college: s.college ?? '',
                            year: s.year ?? '',
                            role: s.role ?? 'Ignite',
                        },
                    },
                    upsert: true,
                },
            }));

            await ContestScore.bulkWrite(ops);

            // Broadcast update
            req.io.emit('leaderboard-update', { timestamp: new Date().toISOString() });

            return res.json({ message: `${ops.length} scores uploaded successfully.` });
        } catch (error) {
            console.error('[Leaderboard Upload]', error);
            res.status(500).json({ message: 'Server error uploading scores.' });
        }
    }
);

// ─── GET /api/leaderboards/export ─────────────────────────────────────────────
// Coordinator/Admin only — export leaderboard as CSV
router.get(
    '/export',
    verifyToken,
    requireRole('Coordinator', 'Admin'),
    async (req, res) => {
        try {
            const { year, filter = 'all', tab = 'all-time-overall' } = req.query;

            const yearFilterMap = {
                '1stYear': '1st Year',
                '2ndYear': '2nd Year',
                '3rdYear': '3rd Year',
                '4thYear': '4th Year',
            };
            const yearFilter = filter !== 'all' ? yearFilterMap[filter] : undefined;

            const { rows, totalContests } = await computeOverall({
                year,
                tab: tab === 'ignite-only' ? 'ignite-only' : 'overall',
                page: 1,
                limit: 5000,
            });

            const header = 'Rank,Nickname,Branch,College,Year,Average Score,Contests Appeared,Total Score\n';
            const csvRows = rows
                .map(
                    (r) =>
                        `${r.rank},"${r.nickname}","${r.branch}","${r.college}","${r.year}",${r.average},${r.appeared},${r.totalScore}`
                )
                .join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="leaderboard.csv"');
            return res.send(header + csvRows);
        } catch (error) {
            console.error('[Leaderboard Export]', error);
            res.status(500).json({ message: 'Server error exporting leaderboard.' });
        }
    }
);

export default router;
