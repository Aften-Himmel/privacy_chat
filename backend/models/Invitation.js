import mongoose from 'mongoose'

const invitationSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
    },
    type: {
      type: String,
      enum: ['normal', 'private', 'contact_request'],
      default: 'normal',
    },
  },
  { timestamps: true }
)

const Invitation = mongoose.model('Invitation', invitationSchema)
export default Invitation