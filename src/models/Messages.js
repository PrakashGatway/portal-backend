import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    text: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    username: { type: String, required: true },
    classId: { type: String, required: true, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    isSystem: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false }
    // messageType: { type: String, enum: ['text', 'image', 'file'], default: 'text' }
    // readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] // For read receipts
}, {
    timestamps: true
});

messageSchema.index({ timestamp: 1 }, { expireAfterSeconds: 14400 });

messageSchema.index({ classId: 1, timestamp: -1 });

export default mongoose.model('Message', messageSchema);