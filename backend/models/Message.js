import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  conversationId: { type: String, index: true },           // for DMs
  groupId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Group' }, // for groups
  sender:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:           { type: String, default: '' },
  fileUrl:        { type: String },
  fileName:       { type: String },
  fileType:       { type: String },
  fileSize:       { type: Number },
  deletedFor:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // Read receipts
  status:         { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  readBy:         [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // NOTE: isPrivate is NOT stored here — private messages never touch the DB
  // They live only in RAM via privateStore.js and are cleared when session ends
}, { timestamps: true })

export default mongoose.model('Message', messageSchema)