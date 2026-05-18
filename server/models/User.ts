import mongoose from 'mongoose';

const SavedAddressSchema = new mongoose.Schema(
  {
    label: { type: String, default: 'Home' },
    text: { type: String, default: '' },
    address: { type: String, default: '' },
    lat: { type: Number },
    lng: { type: Number },
    placeId: { type: String, default: '' },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  role: {
    type: String,
    enum: ['CUSTOMER', 'RESTAURANT', 'RIDER', 'ADMIN', 'SUPPORT', 'FINANCE', 'MARKETING'],
    default: 'CUSTOMER',
  },
  savedAddresses: [SavedAddressSchema],
  language: { type: String, enum: ['en', 'ne'], default: 'en' },
  avatar: String,
  isVerified: { type: Boolean, default: false },
  riderApplicationStatus: {
    type: String,
    enum: ['none', 'pending_review', 'approved', 'rejected'],
    default: 'none',
  },
  restaurantApplicationStatus: {
    type: String,
    enum: ['none', 'pending_review', 'approved', 'rejected'],
    default: 'none',
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
