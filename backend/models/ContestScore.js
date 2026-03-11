import mongoose from 'mongoose';

const contestScoreSchema = new mongoose.Schema(
    {
        contestId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Contest',
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        nickname: { type: String, required: true, trim: true },
        score: { type: Number, required: true, default: 0 },
        maxScore: { type: Number, default: 1000 }, // max possible score for the contest
        branch: { type: String, default: '' },      // e.g. 'CSE', 'ECE'
        college: { type: String, default: '' },      // e.g. 'ANITS', 'GVP', 'RGUKT'
        year: { type: String, default: '' },         // e.g. '1st Year', '2nd Year'
        role: {
            type: String,
            enum: ['Ignite', 'Spark', 'Alumni', 'Faculty', 'Coordinator', 'Admin'],
            default: 'Ignite',
        },
    },
    { timestamps: true }
);

contestScoreSchema.index({ contestId: 1, userId: 1 });
contestScoreSchema.index({ year: 1, contestId: 1 });

const ContestScore = mongoose.model('ContestScore', contestScoreSchema);
export default ContestScore;
