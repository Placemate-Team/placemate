import mongoose from 'mongoose';

const hrQuestionSchema = new mongoose.Schema(
    {
        question: { type: String, required: true, trim: true, maxlength: 1000 },
        company: { type: String, default: '', trim: true },
        authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        authorNickname: { type: String, required: true },
        authorBatch: { type: String, default: '' },
        authorBranch: { type: String, default: '' },
        votes: {
            up: { type: Number, default: 0 },
            down: { type: Number, default: 0 },
            // Track who voted to prevent duplicates
            upVoters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
            downVoters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        },
        isHidden: { type: Boolean, default: false },
        hideReason: { type: String, default: '' },
        hiddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },
    { timestamps: true }
);

hrQuestionSchema.index({ createdAt: -1 });
hrQuestionSchema.virtual('netScore').get(function () {
    return this.votes.up - this.votes.down;
});

const HRQuestion = mongoose.model('HRQuestion', hrQuestionSchema);
export default HRQuestion;
