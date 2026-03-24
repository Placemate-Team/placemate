import mongoose from 'mongoose';

// ── DSA Problem ──────────────────────────────────────────────────────────────
const dsaProblemSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    link: { type: String, default: '' },           // LeetCode / GFG URL
    resourceLink: { type: String, default: '' },   // Striver video / notes URL
    practiceLink: { type: String, default: '' },   // Internal practice link
    difficulty: {
        type: String,
        enum: ['Easy', 'Medium', 'Hard'],
        default: 'Easy',
    },
    order: { type: Number, default: 0 },
}, { _id: true });

// ── DSA Topic ────────────────────────────────────────────────────────────────
const dsaTopicSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    problems: [dsaProblemSchema],
    order: { type: Number, default: 0 },
    isNew: { type: Boolean, default: false },   // "New" badge flag
    isFocusTopic: { type: Boolean, default: false }, // Monthly focus ★
    createdAt: { type: Date, default: Date.now },
}, { _id: true });

// ── DSA Level ────────────────────────────────────────────────────────────────
const dsaLevelSchema = new mongoose.Schema({
    level: { type: Number, required: true, unique: true, min: 1, max: 3 },
    topics: [dsaTopicSchema],
}, { timestamps: true });

export const DSALevel = mongoose.model('DSALevel', dsaLevelSchema);

// ── User DSA Progress ────────────────────────────────────────────────────────
const userDSAProgressSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    completedProblems: [{ type: mongoose.Schema.Types.ObjectId }], // problem _id list
}, { timestamps: true });

export const UserDSAProgress = mongoose.model('UserDSAProgress', userDSAProgressSchema);

// ── Monthly Focus ────────────────────────────────────────────────────────────
const monthlyFocusSchema = new mongoose.Schema({
    topicId: { type: mongoose.Schema.Types.ObjectId, required: true },
    topicName: { type: String, required: true },
    levelId: { type: Number, required: true },
    endsAt: { type: Date, required: true },
    active: { type: Boolean, default: true },
}, { timestamps: true });

export const MonthlyFocus = mongoose.model('MonthlyFocus', monthlyFocusSchema);

// ── Batch Guidance ───────────────────────────────────────────────────────────
const batchGuidanceSchema = new mongoose.Schema({
    batch: { type: String, required: true, unique: true },
    guidance: { type: String, default: '' },
}, { timestamps: true });

export const BatchGuidance = mongoose.model('BatchGuidance', batchGuidanceSchema);
