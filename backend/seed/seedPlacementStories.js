/**
 * Seed script: Creates sample Blogs, Stories, and HR Questions.
 * Run: node seed/seedPlacementStories.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Blog from '../models/Blog.js';
import Story from '../models/Story.js';
import HRQuestion from '../models/HRQuestion.js';
import User from '../models/User.js';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/placemate';

const COMPANIES = ['TCS', 'Infosys', 'Wipro', 'Capgemini', 'Accenture', 'Amazon', 'Deloitte', 'HCL', 'CTS', 'Hexaware'];
const BRANCHES = ['CSE', 'ECE', 'EEE', 'IT'];
const BATCHES = ['2024', '2025', '2026', '2027'];
const NICKNAMES = [
    'Karthik99', 'Rohan2026', 'PriyaCSE', 'Anjali_ECE', 'VenkatR',
    'SnehaB', 'ArjunIT', 'DeepikaSP', 'RahulM', 'MaheshG',
];

const BLOG_DATA = [
    {
        title: 'How I Cracked TCS NQT in One Week',
        company: 'TCS',
        content: `<p><strong>Preparation Strategy</strong></p><ul><li>Practiced 200+ quantitative aptitude questions</li><li>Focused on verbal ability and logical reasoning</li><li>Solved previous year TCS NQT papers daily</li></ul><p>The key is consistency. Don't panic in the last week — revise what you know.</p>`,
    },
    {
        title: 'Infosys InfyTQ Journey – From Zero to Offer',
        company: 'Infosys',
        content: `<p>Getting an <strong>Infosys</strong> offer through InfyTQ was one of my most satisfying experiences.</p><p>The platform itself tests you on Python, databases, and problem solving. Practice at least 2 months in advance.</p><ul><li>Complete all InfyTQ modules</li><li>Score 65%+ in each certification</li><li>Attempt mock tests daily</li></ul>`,
    },
    {
        title: 'Accenture Off-Campus Drive – Complete Process',
        company: 'Accenture',
        content: `<p>Accenture's hiring process consists of 4 rounds:</p><ol><li>Online assessment (cognitive + technical)</li><li>Communication assessment</li><li>Technical interview</li><li>HR interview</li></ol><p><strong>Tip:</strong> Focus on data structures, OOPS concepts, and soft skills equally.</p>`,
    },
    {
        title: 'Amazon SDE Internship – Grinding Leetcode Paid Off',
        company: 'Amazon',
        content: `<p>Landing an Amazon SDE internship required <strong>6 months of consistent DSA practice</strong>.</p><p>The key topics to focus on:</p><ul><li>Arrays and Strings</li><li>Trees and Graphs</li><li>Dynamic Programming</li><li>System Design Basics</li></ul><p>Don't underestimate the behavioral interview — Amazon's Leadership Principles are taken very seriously.</p>`,
    },
    {
        title: 'Wipro WILP vs Wipro Elite NTH – My Experience',
        company: 'Wipro',
        content: `<p>I appeared for both programs. Here's a comparison:</p><p><strong>WILP:</strong> For working professionals. Part-time study while you work. Challenging but rewarding.</p><p><strong>Elite NTH:</strong> Fresh campus hiring. Tests aptitude, coding (2 programs), and verbal. Much more competitive in 2025.</p>`,
    },
    {
        title: 'Capgemini Hiring Process 2025 – Detailed Breakdown',
        company: 'Capgemini',
        content: `<p>Capgemini's process for 2025 batch involves:</p><ul><li>Game-based assessment (unusual but fun)</li><li>Technical MCQ test</li><li>Coding round (2 problems)</li><li>Technical + HR interview</li></ul><p>The game-based round tests cognitive ability. Don't stress — just play naturally and quickly.</p>`,
    },
    {
        title: 'Deloitte UST Hiring – Tips from a Placed Student',
        company: 'Deloitte',
        content: `<p>Deloitte focuses a LOT on problem solving and logical reasoning. The aptitude test is time-pressured.</p><p>For the case study interview:</p><ul><li>Structure your thinking before speaking</li><li>Use MECE framework</li><li>Always quantify your answers</li></ul>`,
    },
    {
        title: 'HCL Tech Bee Internship – Is It Worth It?',
        company: 'HCL',
        content: `<p>HCL's Tech Bee program is one of the best industrial training programs available for CSE/IT students.</p><p><strong>Pros:</strong> Decent stipend, real project work, PPO chance, strong brand name.</p><p><strong>Cons:</strong> 1-year bond, relocation required, niche tech stack.</p><p>Overall verdict: <strong>Go for it if you want early work experience.</strong></p>`,
    },
    {
        title: 'CTS (Cognizant) GenC Next – Full Process Guide',
        company: 'CTS',
        content: `<p>GenC Next is for top performers with CGPA > 7.5. The process:</p><ol><li>Aptitude + Coding Test</li><li>Technical Interview – DSA heavy</li><li>Managerial Interview</li><li>HR Interview</li></ol><p>Prepare well on Java/Python, REST APIs, and SQL. They go deep in the technical round.</p>`,
    },
    {
        title: 'My Hexaware Interview Experience – 3 Rounds Explained',
        company: 'Hexaware',
        content: `<p>Hexaware surprised me with how smooth their process was. 3 rounds total:</p><ul><li><strong>Round 1:</strong> Online test – Java MCQ + logical reasoning</li><li><strong>Round 2:</strong> Technical interview – Projects and basics</li><li><strong>Round 3:</strong> HR – Simple cultural fit questions</li></ul><p>Result: Selected! 🎉 Key tip: Know your resume projects inside out.</p>`,
    },
];

const STORY_DATA = [
    { title: 'Cracked TCS On-Campus – My Journey', company: 'TCS', type: 'On-Campus', year: '2025', ytLink: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', description: 'Full interview experience from aptitude to HR round.' },
    { title: 'Infosys Off-Campus Selection Story', company: 'Infosys', type: 'Off-Campus', year: '2025', ytLink: 'https://www.youtube.com/watch?v=9bZkp7q19f0', description: 'How I cleared Infosys InfyTQ without coaching.' },
    { title: 'Amazon SDE Intern – Leetcode Grind Paid Off', company: 'Amazon', type: 'Internship', year: '2025', ytLink: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk', description: 'My internship selection story at Amazon.' },
    { title: 'Accenture Walk-in Drive – Step by Step', company: 'Accenture', type: 'Off-Campus', year: '2024', ytLink: 'https://www.youtube.com/watch?v=fRh_vgS2dFE', description: 'Complete walkthrough of Accenture hiring process.' },
    { title: 'Wipro On-Campus Selection – ANITS 2025', company: 'Wipro', type: 'On-Campus', year: '2025', ytLink: 'https://www.youtube.com/watch?v=pRpeEdMmmQ0', description: 'My Wipro NLTH on-campus experience from ANITS.' },
];

const HR_QUESTIONS = [
    { question: 'Tell me about yourself.', company: '' },
    { question: 'Why do you want to join our company?', company: 'TCS' },
    { question: 'Where do you see yourself in 5 years?', company: '' },
    { question: 'What is your greatest weakness?', company: '' },
    { question: 'Describe a situation where you resolved a conflict in a team.', company: '' },
    { question: 'Why should we hire you over other candidates?', company: 'Infosys' },
    { question: 'What are your strengths that make you suitable for this role?', company: '' },
    { question: 'Tell me about a time you failed and what you learned from it.', company: '' },
    { question: 'How do you handle work pressure and tight deadlines?', company: 'Amazon' },
    { question: 'Are you comfortable with relocation to any location in India?', company: 'Wipro' },
    { question: 'What do you know about our company culture?', company: 'Accenture' },
    { question: 'How do you prioritize tasks when everything is urgent?', company: '' },
    { question: 'Describe your final year project and your role in it.', company: '' },
    { question: 'What motivates you to perform your best at work?', company: '' },
    { question: 'Do you have any questions for us?', company: '' },
];

async function seed() {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    await Blog.deleteMany({});
    await Story.deleteMany({});
    await HRQuestion.deleteMany({});
    console.log('🗑️  Cleared old Placement Stories data');

    // Find or use a fallback userId
    const users = await User.find({}).limit(10).select('_id nickname name batch branch').lean();
    const getUser = (i) => users[i % Math.max(users.length, 1)] || { _id: new mongoose.Types.ObjectId(), nickname: NICKNAMES[i % NICKNAMES.length], name: NICKNAMES[i % NICKNAMES.length], batch: BATCHES[i % BATCHES.length], branch: BRANCHES[i % BRANCHES.length] };

    // Seed Blogs
    const blogs = BLOG_DATA.map((b, i) => {
        const u = getUser(i);
        return {
            ...b,
            authorId: u._id,
            authorNickname: u.nickname || NICKNAMES[i % NICKNAMES.length],
            authorBatch: u.batch || BATCHES[i % BATCHES.length],
            authorBranch: u.branch || BRANCHES[i % BRANCHES.length],
            createdAt: new Date(Date.now() - i * 86400000 * 2), // stagger by 2 days
        };
    });
    await Blog.insertMany(blogs);
    console.log(`✅ Inserted ${blogs.length} blogs`);

    // Seed Stories
    const coordinator = users.find(u => u) || { _id: new mongoose.Types.ObjectId(), nickname: 'Coordinator' };
    const stories = STORY_DATA.map((s, i) => ({
        ...s,
        ytThumbnail: `https://img.youtube.com/vi/${s.ytLink.match(/v=([^&]+)/)?.[1] || 'dQw4w9WgXcQ'}/hqdefault.jpg`,
        authorId: coordinator._id,
        authorNickname: coordinator.nickname || 'Coordinator',
        createdAt: new Date(Date.now() - i * 86400000 * 3),
    }));
    await Story.insertMany(stories);
    console.log(`✅ Inserted ${stories.length} stories`);

    // Seed HR Questions
    const hrqs = HR_QUESTIONS.map((q, i) => {
        const u = getUser(i);
        const upCount = Math.floor(Math.random() * 30) + 5;
        const downCount = Math.floor(Math.random() * 5);
        return {
            ...q,
            authorId: u._id,
            authorNickname: u.nickname || NICKNAMES[i % NICKNAMES.length],
            authorBatch: u.batch || BATCHES[i % BATCHES.length],
            authorBranch: u.branch || BRANCHES[i % BRANCHES.length],
            votes: { up: upCount, down: downCount, upVoters: [], downVoters: [] },
            createdAt: new Date(Date.now() - i * 86400000),
        };
    });
    await HRQuestion.insertMany(hrqs);
    console.log(`✅ Inserted ${hrqs.length} HR questions`);

    console.log('\n🎉 Placement Stories seed complete!');
    process.exit(0);
}

seed().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
