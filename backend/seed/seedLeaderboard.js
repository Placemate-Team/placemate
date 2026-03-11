/**
 * Seed script: Creates 5 major contests + scores for 50 users across all years.
 * Run: node seed/seedLeaderboard.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Contest from '../models/Contest.js';
import ContestScore from '../models/ContestScore.js';
import User from '../models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/placemate';

const branches = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT'];
const colleges = ['ANITS', 'GVP', 'RGUKT', 'AU', 'MVSR'];
const years = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

const sampleNicknames = [
    'Rohan99', 'Priya2028', 'ArjunX', 'SnehaK', 'VenkatR',
    'DeepikaSP', 'RahulM', 'AnjaliB', 'KiranT', 'MaheshG',
    'Sravanthi21', 'Aditya_CSE', 'PavithraE', 'Suresh_K', 'LalithaN',
    'HarshaV', 'RamyaP', 'NareshC', 'DivyaS', 'SaiCharan',
    'BhavanaR', 'AbhishekM', 'NaveenK', 'ThrilokA', 'GeethaP',
    'SanthoshB', 'ManasaG', 'RaghuramD', 'PriyankaN', 'AkashV',
    'VarunT', 'NithinS', 'ShaliniR', 'AmarnathK', 'PoojaM',
    'HaripriyaD', 'MohanR', 'ChandanaP', 'SrinivasL', 'YaswanthB',
    'AnuradhaV', 'TarunG', 'SweethaSR', 'VijayN', 'KavyaM',
    'PrashanthK', 'RituP', 'SairaamC', 'JyothiV', 'ArvindB',
];

const majorContestTemplates = [
    {
        title: 'Ignite Major Q1 2025',
        topic: 'Data Structures & Algorithms',
        startDate: new Date('2025-01-15'),
        endDate: new Date('2025-01-15'),
        status: 'past',
    },
    {
        title: 'Ignite Major Q2 2025',
        topic: 'Dynamic Programming',
        startDate: new Date('2025-04-10'),
        endDate: new Date('2025-04-10'),
        status: 'past',
    },
    {
        title: 'Ignite Major Q3 2025',
        topic: 'Graph Theory',
        startDate: new Date('2025-07-20'),
        endDate: new Date('2025-07-20'),
        status: 'past',
    },
    {
        title: 'Ignite Major Q4 2025',
        topic: 'System Design Basics',
        startDate: new Date('2025-10-05'),
        endDate: new Date('2025-10-05'),
        status: 'past',
    },
    {
        title: 'Ignite Major Q1 2026',
        topic: 'Advanced Algorithms',
        startDate: new Date('2026-01-18'),
        endDate: new Date('2026-01-18'),
        status: 'past',
    },
];

async function seed() {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Remove old leaderboard data
    await ContestScore.deleteMany({});
    console.log('🗑️  Cleared old ContestScore data');

    // Upsert major contests
    const contests = [];
    for (const tmpl of majorContestTemplates) {
        const existing = await Contest.findOne({ title: tmpl.title });
        if (existing) {
            contests.push(existing);
        } else {
            const c = await Contest.create({
                ...tmpl,
                type: 'major',
                eligibleYears: years,
                problemCount: 10,
                durationHours: 3,
                participantCount: 50,
            });
            contests.push(c);
            console.log(`  Created contest: ${tmpl.title}`);
        }
    }

    // Generate scores for 50 users
    const scores = [];
    const existingUsers = await User.find({}).select('_id nickname name branch college role').lean();

    for (let i = 0; i < 50; i++) {
        const nickname = sampleNicknames[i];
        const college = i < 30 ? 'ANITS' : colleges[i % colleges.length];
        const branch = branches[i % branches.length];
        const year = years[i % years.length];
        const role = college === 'ANITS' ? 'Ignite' : 'Spark';

        // Try to find a matching real user
        const matchedUser = existingUsers.find(
            (u) => u.nickname === nickname || (u.name && u.name.toLowerCase().includes(nickname.toLowerCase().slice(0, 4)))
        );

        for (const contest of contests) {
            // ~80% participation rate — some miss contests (score = 0 for missed)
            const participated = Math.random() > 0.2;
            const score = participated ? Math.floor(Math.random() * 950) + 50 : 0;

            scores.push({
                contestId: contest._id,
                userId: matchedUser?._id || null,
                nickname,
                score,
                maxScore: 1000,
                branch,
                college,
                year,
                role,
            });
        }
    }

    await ContestScore.insertMany(scores);
    console.log(`✅ Inserted ${scores.length} contest scores for 50 users × ${contests.length} contests`);

    console.log('\n🎉 Leaderboard seed complete!');
    process.exit(0);
}

seed().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
