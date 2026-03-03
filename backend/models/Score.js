import mongoose from 'mongoose';

const scoreSchema = new mongoose.Schema(
    {
        contestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contest', required: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        nickname: { type: String, required: true, trim: true },
        hackerRankUsername: { type: String, default: '' },
        score: { type: Number, required: true, default: 0 },
        rank: { type: Number, required: true },
        matchStatus: { type: String, enum: ['matched', 'unmatched', 'manual'], default: 'matched' },
    },
    { timestamps: true }
);

scoreSchema.index({ contestId: 1, rank: 1 });

const Score = mongoose.model('Score', scoreSchema);
export default Score;
