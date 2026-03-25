import mongoose from 'mongoose'

const sessionSchema = new mongoose.Schema({
  conversationId: { type: String, required: true },
  participants:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status:         { type: String, enum: ['active', 'ended'], default: 'active' },
  startedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

export default mongoose.model('Session', sessionSchema)