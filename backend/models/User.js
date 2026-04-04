import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    avatar: {
      type: String,
      default: '',
    },
    contacts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }
    ],
    isOnline: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
)

// Cascading delete: when a user is deleted, remove them from other users' contacts
userSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    await mongoose.model('User').updateMany(
      { contacts: doc._id },
      { $pull: { contacts: doc._id } }
    )
  }
})

userSchema.post('deleteOne', { document: true, query: false }, async function() {
  await mongoose.model('User').updateMany(
    { contacts: this._id },
    { $pull: { contacts: this._id } }
  )
})

const User = mongoose.model('User', userSchema)
export default User