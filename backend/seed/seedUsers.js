import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const SEED_USERS = [
    {
        name: 'Arjun Mehta',
        email: 'arjun.ignite@placemate.com',
        password: 'Ignite@123',
        role: 'Ignite',
    },
    {
        name: 'Priya Sharma',
        email: 'priya.spark@placemate.com',
        password: 'Spark@123',
        role: 'Spark',
    },
    {
        name: 'Rohan Das',
        email: 'rohan.alumni@placemate.com',
        password: 'Alumni@123',
        role: 'Alumni',
    },
    {
        name: 'Dr. Kavitha Raju',
        email: 'kavitha.faculty@placemate.com',
        password: 'Faculty@123',
        role: 'Faculty',
    },
    {
        name: 'Admin PlaceMate',
        email: 'admin@placemate.com',
        password: 'Admin@123',
        role: 'Admin',
    },
];

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB connected for seeding...\n');

        // Clear existing users
        await User.deleteMany({});
        console.log('🗑️  Cleared existing users.\n');

        // Insert seed users
        const created = await User.insertMany(SEED_USERS);
        console.log('🌱 Seeded Users:\n');
        created.forEach((u) => {
            const original = SEED_USERS.find((s) => s.email === u.email);
            console.log(`  ✔ [${u.role.padEnd(12)}] ${u.name.padEnd(20)} | ${u.email} | pwd: ${original.password}`);
        });

        console.log('\n✅ Seeding complete!\n');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seed error:', err.message);
        process.exit(1);
    }
};

seed();
