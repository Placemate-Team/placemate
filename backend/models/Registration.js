import mongoose from 'mongoose';

const registrationSchema = new mongoose.Schema(
    {
        contestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contest', required: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        hackerRankUsername: { type: String, required: true, trim: true },
    },
    { timestamps: true }
);

// Prevent duplicate registrations
registrationSchema.index({ contestId: 1, userId: 1 }, { unique: true });

const Registration = mongoose.model('Registration', registrationSchema);
export default Registration;
