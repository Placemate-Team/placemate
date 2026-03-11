import mongoose from 'mongoose';

const blogSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true, maxlength: 200 },
        content: { type: String, required: true }, // HTML from react-quill
        company: { type: String, default: '', trim: true },
        authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        authorNickname: { type: String, required: true },
        authorBatch: { type: String, default: '' },
        authorBranch: { type: String, default: '' },
        isHidden: { type: Boolean, default: false },
        hideReason: { type: String, default: '' },
        hiddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },
    { timestamps: true }
);

blogSchema.index({ createdAt: -1 });
blogSchema.index({ company: 1 });

const Blog = mongoose.model('Blog', blogSchema);
export default Blog;
