import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true }, // e.g. "Frontend Dev"
    needed: { type: Number, required: true, default: 1 },
}, { _id: false });

const collabPostSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true, maxlength: 150 },
        description: { type: String, required: true, trim: true, maxlength: 2000 },
        roles: { type: [roleSchema], default: [] },
        contactDetails: { type: String, required: true, trim: true }, // email or Discord
        status: {
            type: String,
            enum: ['open', 'closed'],
            default: 'open',
        },
        closedAt: { type: Date, default: null }, // set when marked closed; auto-remove after 10 days
        authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        authorNickname: { type: String, required: true },
        authorBranch: { type: String, default: '' },
        authorBatch: { type: String, default: '' },
        isHidden: { type: Boolean, default: false },
        hideReason: { type: String, default: '' },
        hiddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },
    { timestamps: true }
);

collabPostSchema.index({ createdAt: -1 });
collabPostSchema.index({ status: 1, closedAt: 1 }); // for cron cleanup

const CollabPost = mongoose.model('CollabPost', collabPostSchema);
export default CollabPost;
