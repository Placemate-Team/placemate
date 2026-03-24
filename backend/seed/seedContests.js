import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../.env') });

import Contest from '../models/Contest.js';

const now = new Date();

const contests = [
    {
        title: 'March 2026 Monthly Contest – DP (1st & 2nd Year)',
        type: 'monthly',
        eligibleYears: ['1st Year', '2nd Year'],
        description:
            'This monthly contest focuses on Dynamic Programming. Solve 10 handpicked DP problems in 2 hours. Problems range from Tabulation basics to Bitmasking DP.',
        rules: [
            'Only ANITS Ignite students in 1st & 2nd year are eligible.',
            'Use your registered HackerRank username — no impersonation.',
            'Languages allowed: C++, Java, Python.',
            'No plagiarism — auto-checked by HackerRank.',
            'Scoring based on test cases passed; time is tiebreaker.',
            'Problems sourced from HackerRank problem set.',
        ],
        hackerRankLink: 'https://www.hackerrank.com/contests/anits-march-2026',
        status: 'upcoming',
        startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5, 18, 0, 0),
        endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5, 20, 0, 0),
        participantCount: 47,
        topic: 'Dynamic Programming',
        problemCount: 10,
        durationHours: 2,
    },
    {
        title: 'ANITS Alliance Major Contest – April 2026',
        type: 'major',
        eligibleYears: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
        description:
            'The ANITS Alliance Major Contest is open to all alliance college students (Spark). Compete across 4 topics: Arrays, Stacks, Graphs, and DP. 15 problems, 3 hours.',
        rules: [
            'Open to all Ignite and Spark registered students.',
            'Use your registered HackerRank username.',
            'Languages: C++, Java, Python, JavaScript (ES6).',
            'External assistance or plagiarism leads to disqualification.',
            'Leaderboard updates in real-time on HackerRank.',
            'Top 10 win PlaceMate digital certificates.',
        ],
        hackerRankLink: 'https://www.hackerrank.com/contests/anits-alliance-april-2026',
        status: 'upcoming',
        startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 18, 10, 0, 0),
        endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 18, 13, 0, 0),
        participantCount: 198,
        topic: 'Mixed (Arrays, Stacks, Graphs, DP)',
        problemCount: 15,
        durationHours: 3,
    },
    {
        title: 'Feb 2026 Monthly Contest – Graphs & Trees',
        type: 'monthly',
        eligibleYears: ['1st Year', '2nd Year', '3rd Year'],
        description:
            'Past monthly contest focused on Graph Traversal and Tree algorithms. BFS, DFS, Dijkstra, and Binary Tree problems.',
        rules: [
            'Open to ANITS Ignite students with 75% DSA completion.',
            'Registered HackerRank username required.',
            'No external help allowed.',
            'C++, Java, Python supported.',
            'Score = correct test cases. Ties broken by submission time.',
        ],
        hackerRankLink: 'https://www.hackerrank.com/contests/anits-feb-2026',
        status: 'past',
        startDate: new Date(2026, 1, 10, 18, 0, 0),
        endDate: new Date(2026, 1, 10, 20, 0, 0),
        participantCount: 112,
        topic: 'Graphs & Trees',
        problemCount: 10,
        durationHours: 2,
    },
    {
        title: 'Jan 2026 Alliance Major Contest – Kickoff',
        type: 'major',
        eligibleYears: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
        description:
            'Alliance kickoff contest for Jan 2026 — a warm-up contest covering Arrays, Strings, and Sorting.',
        rules: [
            'Open to all alliance college students (Ignite + Spark).',
            'No plagiarism.',
            'HackerRank username must match registration.',
        ],
        hackerRankLink: 'https://www.hackerrank.com/contests/anits-jan-2026',
        status: 'past',
        startDate: new Date(2026, 0, 15, 14, 0, 0),
        endDate: new Date(2026, 0, 15, 16, 0, 0),
        participantCount: 245,
        topic: 'Arrays, Strings, Sorting',
        problemCount: 8,
        durationHours: 2,
    },
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        await Contest.deleteMany({});
        console.log('🗑️  Cleared existing contests');

        const inserted = await Contest.insertMany(contests);
        console.log(`🚀 Seeded ${inserted.length} contests`);

        inserted.forEach(c => console.log(`   • [${c.status.toUpperCase()}] ${c.title}`));
    } catch (err) {
        console.error('❌ Seed failed:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected');
    }
}

seed();
