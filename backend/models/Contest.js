import mongoose from 'mongoose';

const contestSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        type: { type: String, enum: ['monthly', 'major'], required: true },
        eligibleYears: { type: [String], default: [] }, // e.g. ['1st Year', '2nd Year']
        description: { type: String, default: '' },
        rules: { type: [String], default: [] },
        hackerRankLink: { type: String, default: '' },
        status: { type: String, enum: ['upcoming', 'ongoing', 'past'], default: 'upcoming' },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        participantCount: { type: Number, default: 0 },
        topic: { type: String, default: '' }, // e.g. "Dynamic Programming"
        problemCount: { type: Number, default: 10 },
        durationHours: { type: Number, default: 2 },
    },
    { timestamps: true }
);

const Contest = mongoose.model('Contest', contestSchema);
export default Contest;
