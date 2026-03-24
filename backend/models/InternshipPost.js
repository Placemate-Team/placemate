import mongoose from 'mongoose';

const internshipPostSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true, maxlength: 150 },
        description: { type: String, required: true, trim: true, maxlength: 2000 },
        link: { type: String, required: true, trim: true },
        stipendInfo: { type: String, default: '' }, // e.g. "₹10k/month" or "Unpaid"
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
        },
        rejectionReason: { type: String, default: '' },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        approvedAt: { type: Date, default: null },
        authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        authorNickname: { type: String, required: true },
        authorBranch: { type: String, default: '' },
        authorBatch: { type: String, default: '' },
        approverNickname: { type: String, default: '' },
        isHidden: { type: Boolean, default: false },
        hideReason: { type: String, default: '' },
        hiddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },
    { timestamps: true }
);

internshipPostSchema.index({ status: 1, createdAt: -1 });

const InternshipPost = mongoose.model('InternshipPost', internshipPostSchema);
export default InternshipPost;
