/**
 * Seed: 5 collab posts + 5 approved internships.
 * Run: node seed/seedOpportunities.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CollabPost from '../models/CollabPost.js';
import InternshipPost from '../models/InternshipPost.js';
import User from '../models/User.js';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/placemate';

const COLLAB_SEED = [
    {
        title: 'AI-Powered Resume Screener',
        description: 'Building a web app that uses NLP to match resumes against job descriptions and score them. Looking for ML and frontend devs.',
        roles: [{ name: 'ML Engineer', needed: 1 }, { name: 'React Frontend Dev', needed: 2 }, { name: 'UI/UX Designer', needed: 1 }],
        contactDetails: 'rohan99@anits.edu.in | Discord: rohan99#4201',
        status: 'open',
    },
    {
        title: 'Campus Event Management App',
        description: 'A mobile-first app to manage college fests, hackathons, and club events with QR-based check-in and live updates.',
        roles: [{ name: 'Flutter Developer', needed: 2 }, { name: 'Backend Node.js', needed: 1 }],
        contactDetails: 'priya.cse@anits.edu.in | Discord: priya2026#1234',
        status: 'open',
    },
    {
        title: 'Peer-to-Peer Tutoring Platform',
        description: 'Marketplace for students to offer and find tutoring sessions. Sessions can be virtual or in-person.',
        roles: [{ name: 'Full Stack Dev', needed: 2 }, { name: 'Database Engineer', needed: 1 }],
        contactDetails: 'arjun.it@anits.edu.in',
        status: 'open',
    },
    {
        title: 'Smart Attendance System using Face Recognition',
        description: 'Using OpenCV and Raspberry Pi to automate attendance for labs. Looking for embedded systems and Python/ML enthusiasts.',
        roles: [{ name: 'Python/ML Dev', needed: 2 }, { name: 'Embedded Systems', needed: 1 }],
        contactDetails: 'venkat2025@anits.edu.in | Discord: venkatR#9921',
        status: 'closed',
        closedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
        title: 'Leetcode Clone for DSA Practice',
        description: 'Build a self-hosted competitive programming platform with code submission, test cases, and leaderboard.',
        roles: [{ name: 'Backend Dev', needed: 2 }, { name: 'Frontend Dev', needed: 2 }, { name: 'DevOps', needed: 1 }],
        contactDetails: 'sneha.ece@anits.edu.in',
        status: 'open',
    },
];

const INTERNSHIP_SEED = [
    {
        title: 'SDE Intern - Flipkart Summer 2025',
        description: "Flipkart summer internship program for 3rd year students. 3-month paid internship with PPO opportunity. Not a course.",
        link: 'https://www.flipkartcareers.com/internships',
        stipendInfo: 'Rs.60,000/month',
        status: 'approved',
    },
    {
        title: 'Data Science Intern - HDFC Bank',
        description: 'Work with the HDFC risk analytics team on real-world financial data. Must know Python, Pandas, and SQL. Not a course.',
        link: 'https://hdfcbank.careers/internship',
        stipendInfo: 'Rs.25,000/month',
        status: 'approved',
    },
    {
        title: 'Software Intern - Zoho Corporation',
        description: "Zoho year-round internship. Work on their SaaS products. Strong coding interview process. Not a short course.",
        link: 'https://careers.zoho.com/intern',
        stipendInfo: 'Rs.15,000/month',
        status: 'approved',
    },
    {
        title: 'Frontend Intern - Razorpay',
        description: "Join Razorpay product team for 6 months. React, TypeScript, and design systems. Fully remote opportunity.",
        link: 'https://razorpay.com/jobs/internship',
        stipendInfo: 'Rs.30,000/month',
        status: 'approved',
    },
    {
        title: 'Cloud Intern - Microsoft MAIA Program',
        description: 'Microsoft partnered internship for ANITS students, 3 months on Azure. Competitive stipend and PPO possible.',
        link: 'https://careers.microsoft.com/intern',
        stipendInfo: 'Rs.50,000/month',
        status: 'approved',
    },
];

async function seed() {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    await CollabPost.deleteMany({});
    await InternshipPost.deleteMany({});
    console.log('Cleared old Opportunities data');

    const users = await User.find({}).limit(10).select('_id nickname name batch branch role').lean();
    const igniteUsers = users.filter(u => u.role === 'Ignite');
    const coordUser = users.find(u => ['Coordinator', 'Admin'].includes(u.role)) || users[0];
    const getIgnite = (i) => igniteUsers[i % Math.max(igniteUsers.length, 1)] || users[i % users.length] || { _id: new mongoose.Types.ObjectId(), nickname: 'Student' + i };

    const collabs = COLLAB_SEED.map((c, i) => {
        const u = getIgnite(i);
        return {
            ...c,
            authorId: u._id,
            authorNickname: u.nickname || ('User' + i),
            authorBranch: u.branch || 'CSE',
            authorBatch: u.batch || '2026',
            createdAt: new Date(Date.now() - i * 86400000 * 1.5),
        };
    });
    await CollabPost.insertMany(collabs);
    console.log('Inserted ' + collabs.length + ' collab posts');

    const internships = INTERNSHIP_SEED.map((s, i) => {
        const u = getIgnite(i);
        return {
            ...s,
            authorId: u._id,
            authorNickname: u.nickname || ('User' + i),
            authorBranch: u.branch || 'CSE',
            authorBatch: u.batch || '2026',
            approvedBy: coordUser ? coordUser._id : u._id,
            approvedAt: new Date(Date.now() - i * 86400000),
            approverNickname: coordUser ? (coordUser.nickname || 'Coordinator') : 'Coordinator',
            createdAt: new Date(Date.now() - i * 86400000 * 2),
        };
    });
    await InternshipPost.insertMany(internships);
    console.log('Inserted ' + internships.length + ' internship posts');

    console.log('Opportunities seed complete!');
    process.exit(0);
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
