import mongoose from 'mongoose';

const storySchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true, maxlength: 200 },
        company: { type: String, required: true, trim: true },
        type: {
            type: String,
            enum: ['On-Campus', 'Off-Campus', 'Internship'],
            required: true,
        },
        year: { type: String, default: '' }, // e.g. '2025'
        ytLink: { type: String, required: true, trim: true },
        ytThumbnail: { type: String, default: '' }, // derived from ytLink
        description: { type: String, default: '', maxlength: 300 },
        authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        authorNickname: { type: String, required: true },
        isHidden: { type: Boolean, default: false },
        hideReason: { type: String, default: '' },
        hiddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },
    { timestamps: true }
);

storySchema.index({ createdAt: -1 });
storySchema.index({ company: 1 });

const Story = mongoose.model('Story', storySchema);
export default Story;
