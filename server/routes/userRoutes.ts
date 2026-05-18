import express from 'express';
import User from '../models/User.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

const formatAddress = (address: any) => ({
  _id: address._id,
  label: address.label || 'Home',
  text: address.text || address.address || '',
  address: address.address || address.text || '',
  lat: typeof address.lat === 'number' ? address.lat : null,
  lng: typeof address.lng === 'number' ? address.lng : null,
  placeId: address.placeId || '',
  isDefault: Boolean(address.isDefault),
});

const formatUserProfile = (user: any, token?: string) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  savedAddresses: (user.savedAddresses || []).map(formatAddress),
  language: user.language,
  avatar: user.avatar,
  riderApplicationStatus: user.riderApplicationStatus,
  restaurantApplicationStatus: user.restaurantApplicationStatus,
  isVerified: user.isVerified,
  ...(token ? { token } : {}),
});

const normaliseAddressBody = (body: any) => {
  const label = String(body.label || 'Home').trim() || 'Home';
  const text = String(body.text || body.address || '').trim();
  const lat = Number(body.lat);
  const lng = Number(body.lng);

  if (!text) {
    throw new Error('Address text is required.');
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('Please select a real address from the dropdown so GPS is saved.');
  }

  return {
    label,
    text,
    address: text,
    lat,
    lng,
    placeId: body.placeId || '',
    isDefault: Boolean(body.isDefault),
  };
};

const makeOnlyDefault = (user: any, addressId?: string) => {
  user.savedAddresses.forEach((address: any) => {
    address.isDefault = addressId ? String(address._id) === String(addressId) : false;
  });
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
router.get('/profile', protect, async (req: any, res: any) => {
  const user = await (User as any).findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json(formatUserProfile(user));
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', protect, async (req: any, res: any) => {
  const user = await (User as any).findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (req.body.name !== undefined) user.name = req.body.name;
  if (req.body.email !== undefined) user.email = req.body.email;
  if (req.body.phone !== undefined) user.phone = req.body.phone;
  if (req.body.language !== undefined) user.language = req.body.language;
  if (req.body.avatar !== undefined) user.avatar = req.body.avatar;

  if (req.body.password) {
    const bcrypt = await import('bcryptjs');
    const salt = await bcrypt.default.genSalt(10);
    user.password = await bcrypt.default.hash(req.body.password, salt);
  }

  const updatedUser = await user.save();
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;

  res.json(formatUserProfile(updatedUser, token));
});

// @desc    Get saved addresses
// @route   GET /api/users/addresses
// @access  Private
router.get('/addresses', protect, async (req: any, res: any) => {
  const user = await (User as any).findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json((user.savedAddresses || []).map(formatAddress));
});

// @desc    Add saved address
// @route   POST /api/users/addresses
// @access  Private
router.post('/addresses', protect, async (req: any, res: any) => {
  try {
    const user = await (User as any).findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const address = normaliseAddressBody(req.body);
    const shouldBeDefault = address.isDefault || !user.savedAddresses?.length;

    if (shouldBeDefault) {
      makeOnlyDefault(user);
      address.isDefault = true;
    }

    user.savedAddresses.push(address);
    await user.save();

    res.status(201).json(user.savedAddresses.map(formatAddress));
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Could not save address' });
  }
});

// @desc    Update saved address
// @route   PUT /api/users/addresses/:addressId
// @access  Private
router.put('/addresses/:addressId', protect, async (req: any, res: any) => {
  try {
    const user = await (User as any).findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existingAddress = user.savedAddresses.id(req.params.addressId);

    if (!existingAddress) {
      return res.status(404).json({ message: 'Address not found' });
    }

    const updatedAddress = normaliseAddressBody(req.body);

    if (updatedAddress.isDefault) {
      makeOnlyDefault(user);
    }

    existingAddress.set(updatedAddress);
    await user.save();

    res.json(user.savedAddresses.map(formatAddress));
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Could not update address' });
  }
});

// @desc    Make address default
// @route   PATCH /api/users/addresses/:addressId/default
// @access  Private
router.patch('/addresses/:addressId/default', protect, async (req: any, res: any) => {
  const user = await (User as any).findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const existingAddress = user.savedAddresses.id(req.params.addressId);

  if (!existingAddress) {
    return res.status(404).json({ message: 'Address not found' });
  }

  makeOnlyDefault(user, req.params.addressId);
  await user.save();

  res.json(user.savedAddresses.map(formatAddress));
});

// @desc    Delete saved address
// @route   DELETE /api/users/addresses/:addressId
// @access  Private
router.delete('/addresses/:addressId', protect, async (req: any, res: any) => {
  const user = await (User as any).findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const existingAddress = user.savedAddresses.id(req.params.addressId);

  if (!existingAddress) {
    return res.status(404).json({ message: 'Address not found' });
  }

  const wasDefault = Boolean(existingAddress.isDefault);
  existingAddress.deleteOne();

  if (wasDefault && user.savedAddresses.length > 0) {
    user.savedAddresses[0].isDefault = true;
  }

  await user.save();

  res.json(user.savedAddresses.map(formatAddress));
});

export default router;
