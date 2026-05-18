import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  LogOut,
  ChevronRight,
  Edit2,
  Shield,
  Bell,
  CreditCard,
  Bike,
  Store,
  Trash2,
  Home,
  Briefcase,
  Plus,
  X,
  Loader2,
  CheckCircle2,
  Save,
} from 'lucide-react';
import { useAuth, SavedAddress } from '../contexts/AuthContext';
import { apiRequest } from '../lib/api';
import { AddressAutocomplete, AddressValue } from '../components/AddressAutocomplete';

type ProfileTab = 'profile' | 'orders' | 'addresses' | 'notifications' | 'security';

type AddressFormValue = AddressValue & {
  _id?: string;
  address?: string;
  isDefault?: boolean;
};

const createEmptyAddress = (): AddressFormValue => ({
  label: 'Home',
  text: '',
  lat: null,
  lng: null,
  placeId: '',
  isDefault: false,
});

const getAddressText = (address: SavedAddress | AddressFormValue) => {
  return address.text || address.address || '';
};

const getAddressIcon = (label?: string) => {
  const lowerLabel = (label || '').toLowerCase();

  if (lowerLabel.includes('work') || lowerLabel.includes('office')) {
    return <Briefcase size={22} />;
  }

  if (lowerLabel.includes('home')) {
    return <Home size={22} />;
  }

  return <MapPin size={22} />;
};

export const ProfilePage: React.FC = () => {
  const { user, logout, isLoading, updateUser } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile');
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [saveLoading, setSaveLoading] = useState(false);
  const [profileError, setProfileError] = useState('');

  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addressForm, setAddressForm] = useState<AddressFormValue>(createEmptyAddress());
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState('');

  const [editData, setEditData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    language: user?.language || 'en',
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');

    if (tab === 'orders' || tab === 'addresses' || tab === 'profile') {
      setActiveTab(tab);
    }
  }, []);

  useEffect(() => {
    if (user) {
      setEditData({
        name: user.name || '',
        phone: user.phone || '',
        language: user.language || 'en',
      });
      setAddresses(user.savedAddresses || []);
    }
  }, [user]);

  useEffect(() => {
    if (user && activeTab === 'orders') {
      apiRequest('/api/orders/myorders', {
        token: user.token,
      })
        .then(setMyOrders)
        .catch((err) => console.error(err));
    }
  }, [user, activeTab]);

  const fetchAddresses = async () => {
    if (!user?.token) return;

    try {
      setAddressLoading(true);
      setAddressError('');
      const data = await apiRequest<SavedAddress[]>('/api/users/addresses', {
        token: user.token,
      });
      setAddresses(data);
      updateUser({ savedAddresses: data });
    } catch (err: any) {
      setAddressError(err?.message || 'Could not load addresses.');
    } finally {
      setAddressLoading(false);
    }
  };

  useEffect(() => {
    if (user && activeTab === 'addresses') {
      fetchAddresses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.token, activeTab]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('image', file);

    try {
      setProfileError('');
      const data = await apiRequest('/api/uploads/single', {
        method: 'POST',
        token: user?.token,
        body: formData,
      });

      const updatedUser = await apiRequest('/api/users/profile', {
        method: 'PUT',
        token: user?.token,
        body: JSON.stringify({ avatar: data.url }),
      });

      updateUser(updatedUser);
    } catch (err: any) {
      setProfileError(err?.message || 'Could not update profile image.');
    }
  };

  const handleSaveProfile = async () => {
    if (!editData.name.trim()) {
      setProfileError('Name is required.');
      return;
    }

    setSaveLoading(true);
    setProfileError('');

    try {
      const updatedUser = await apiRequest('/api/users/profile', {
        method: 'PUT',
        token: user?.token,
        body: JSON.stringify({
          name: editData.name.trim(),
          phone: editData.phone.trim(),
          language: editData.language,
        }),
      });

      updateUser(updatedUser);
      setIsEditing(false);
    } catch (err: any) {
      setProfileError(err?.message || 'Could not update profile.');
    } finally {
      setSaveLoading(false);
    }
  };

  const openAddAddressModal = () => {
    setEditingAddressId(null);
    setAddressForm({ ...createEmptyAddress(), isDefault: addresses.length === 0 });
    setAddressError('');
    setIsAddressModalOpen(true);
  };

  const openEditAddressModal = (address: SavedAddress) => {
    setEditingAddressId(address._id || null);
    setAddressForm({
      _id: address._id,
      label: address.label || 'Home',
      text: getAddressText(address),
      lat: address.lat ?? null,
      lng: address.lng ?? null,
      placeId: address.placeId || '',
      isDefault: Boolean(address.isDefault),
    });
    setAddressError('');
    setIsAddressModalOpen(true);
  };

  const closeAddressModal = () => {
    setIsAddressModalOpen(false);
    setEditingAddressId(null);
    setAddressForm(createEmptyAddress());
    setAddressError('');
  };

  const saveAddress = async () => {
    if (!addressForm.label?.trim()) {
      setAddressError('Address label is required, for example Home or Work.');
      return;
    }

    if (!addressForm.text?.trim()) {
      setAddressError('Please enter your full delivery address.');
      return;
    }

    if (typeof addressForm.lat !== 'number' || typeof addressForm.lng !== 'number') {
      setAddressError('Please select a real address from the dropdown so exact GPS is saved.');
      return;
    }

    try {
      setAddressSaving(true);
      setAddressError('');

      const payload = {
        label: addressForm.label.trim(),
        text: addressForm.text.trim(),
        address: addressForm.text.trim(),
        lat: addressForm.lat,
        lng: addressForm.lng,
        placeId: addressForm.placeId || '',
        isDefault: Boolean(addressForm.isDefault),
      };

      const endpoint = editingAddressId
        ? `/api/users/addresses/${editingAddressId}`
        : '/api/users/addresses';

      const method = editingAddressId ? 'PUT' : 'POST';

      const updatedAddresses = await apiRequest<SavedAddress[]>(endpoint, {
        method,
        token: user?.token,
        body: JSON.stringify(payload),
      });

      setAddresses(updatedAddresses);
      updateUser({ savedAddresses: updatedAddresses });
      closeAddressModal();
    } catch (err: any) {
      setAddressError(err?.message || 'Could not save address.');
    } finally {
      setAddressSaving(false);
    }
  };

  const makeDefaultAddress = async (addressId?: string) => {
    if (!addressId) return;

    try {
      setAddressError('');
      const updatedAddresses = await apiRequest<SavedAddress[]>(`/api/users/addresses/${addressId}/default`, {
        method: 'PATCH',
        token: user?.token,
      });
      setAddresses(updatedAddresses);
      updateUser({ savedAddresses: updatedAddresses });
    } catch (err: any) {
      setAddressError(err?.message || 'Could not set default address.');
    }
  };

  const deleteAddress = async (addressId?: string) => {
    if (!addressId) return;

    const confirmed = window.confirm('Delete this saved address?');
    if (!confirmed) return;

    try {
      setAddressError('');
      const updatedAddresses = await apiRequest<SavedAddress[]>(`/api/users/addresses/${addressId}`, {
        method: 'DELETE',
        token: user?.token,
      });
      setAddresses(updatedAddresses);
      updateUser({ savedAddresses: updatedAddresses });
    } catch (err: any) {
      setAddressError(err?.message || 'Could not delete address.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4">
        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 mb-6">
          <User size={40} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-4 tracking-tighter">Please Log In</h2>
        <p className="text-gray-500 mb-8 text-center max-w-xs">
          You need to be logged in to view your profile and manage your account.
        </p>
        <button
          onClick={() => (window.location.href = '/login')}
          className="px-8 py-4 bg-orange-500 text-white rounded-2xl font-bold hover:bg-orange-600 shadow-xl shadow-orange-200 transition-all"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-6">
            <div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100 text-center">
              <div className="relative inline-block mb-6">
                <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 text-4xl font-black shadow-inner overflow-hidden">
                  {user.avatar ? (
                    <img src={user.avatar} className="w-full h-full object-cover" />
                  ) : (
                    user.name?.charAt(0) || '?'
                  )}
                </div>
                <label className="absolute bottom-0 right-0 p-2 bg-orange-500 text-white rounded-full border-4 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform">
                  <Edit2 size={14} />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </label>
              </div>

              <h2 className="text-2xl font-black text-gray-900 leading-tight">{user.name}</h2>
              <p className="text-gray-500 font-medium text-sm mb-6">{user.email}</p>

              <div className="inline-flex px-4 py-1.5 rounded-full bg-orange-50 text-orange-600 text-[10px] uppercase font-black tracking-widest border border-orange-100 mb-4">
                {user.role}
              </div>

              <div className="space-y-3 pt-6 border-t border-gray-50">
                {user.riderApplicationStatus && user.riderApplicationStatus !== 'none' && (
                  <div className="text-left p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Rider Status</p>
                    <div className="flex items-center gap-2">
                      <Bike size={14} className="text-gray-400" />
                      <span
                        className={`text-xs font-bold ${
                          user.riderApplicationStatus === 'approved'
                            ? 'text-green-600'
                            : user.riderApplicationStatus === 'pending_review'
                              ? 'text-orange-600'
                              : 'text-red-600'
                        }`}
                      >
                        {user.riderApplicationStatus.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}

                {user.restaurantApplicationStatus && user.restaurantApplicationStatus !== 'none' && (
                  <div className="text-left p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Restaurant Status</p>
                    <div className="flex items-center gap-2">
                      <Store size={14} className="text-gray-400" />
                      <span
                        className={`text-xs font-bold ${
                          user.restaurantApplicationStatus === 'approved'
                            ? 'text-green-600'
                            : user.restaurantApplicationStatus === 'pending_review'
                              ? 'text-orange-600'
                              : 'text-red-600'
                        }`}
                      >
                        {user.restaurantApplicationStatus.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <nav className="bg-white rounded-[40px] p-4 shadow-sm border border-gray-100 overflow-hidden">
              {[
                { id: 'profile' as ProfileTab, icon: <User size={18} />, label: t('common.profile') },
                { id: 'orders' as ProfileTab, icon: <CreditCard size={18} />, label: t('common.orders') },
                { id: 'addresses' as ProfileTab, icon: <MapPin size={18} />, label: t('common.my_addresses') },
                { id: 'notifications' as ProfileTab, icon: <Bell size={18} />, label: 'Notifications' },
                { id: 'security' as ProfileTab, icon: <Shield size={18} />, label: 'Security' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl transition-all ${
                    activeTab === item.id
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-200'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span className="font-bold text-sm tracking-tight">{item.label}</span>
                  </div>
                  <ChevronRight size={16} className={activeTab === item.id ? 'opacity-100' : 'opacity-40'} />
                </button>
              ))}

              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="w-full mt-4 flex items-center gap-3 px-4 py-4 text-red-600 font-bold text-sm hover:bg-red-50 rounded-2xl transition-all"
              >
                <LogOut size={18} />
                {t('common.logout')}
              </button>
            </nav>
          </div>

          <div className="md:col-span-2 space-y-8">
            {activeTab === 'profile' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-[40px] p-10 shadow-sm border border-gray-100"
              >
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">{t('common.edit_profile')}</h3>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-gray-50 text-gray-900 rounded-xl font-bold text-sm border border-gray-100 hover:border-orange-500 transition-all flex items-center gap-2"
                    >
                      <Edit2 size={16} />
                      Edit
                    </button>
                  )}
                </div>

                {profileError && (
                  <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 font-bold text-sm">
                    {profileError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      {t('common.full_name')}
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        disabled={!isEditing}
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-orange-500 rounded-2xl outline-none transition-all text-sm font-medium disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        disabled
                        value={user.email || ''}
                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl outline-none text-sm font-medium opacity-60"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      {t('common.phone_number')}
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        disabled={!isEditing}
                        placeholder="98XXXXXXXX"
                        value={editData.phone}
                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-orange-500 rounded-2xl outline-none transition-all text-sm font-medium disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      Language Preference
                    </label>
                    <select
                      disabled={!isEditing}
                      value={editData.language}
                      onChange={(e) => setEditData({ ...editData, language: e.target.value })}
                      className="w-full px-4 py-3.5 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-orange-500 rounded-2xl outline-none transition-all text-sm font-medium disabled:opacity-60 appearance-none"
                    >
                      <option value="en">English</option>
                      <option value="ne">नेपाली (Nepali)</option>
                    </select>
                  </div>
                </div>

                {isEditing && (
                  <div className="mt-12 pt-8 border-t border-gray-100 flex gap-4">
                    <button
                      onClick={handleSaveProfile}
                      disabled={saveLoading}
                      className="px-8 py-3.5 bg-orange-500 text-white rounded-2xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {saveLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                      {saveLoading ? 'Saving...' : t('common.save')}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setProfileError('');
                        setEditData({
                          name: user.name || '',
                          phone: user.phone || '',
                          language: user.language || 'en',
                        });
                      }}
                      className="px-8 py-3.5 bg-white text-gray-500 border border-gray-200 rounded-2xl font-bold hover:bg-gray-50 transition-all"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'orders' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-[40px] p-10 shadow-sm border border-gray-100"
              >
                <h3 className="text-2xl font-black text-gray-900 mb-8 tracking-tight">{t('common.orders')}</h3>
                <div className="space-y-6">
                  {myOrders.length === 0 ? (
                    <p className="text-center py-10 text-gray-400 font-medium">No orders found.</p>
                  ) : (
                    myOrders.map((order) => (
                      <div key={order._id} className="p-6 bg-gray-50 rounded-3xl flex justify-between items-center">
                        <div>
                          <p className="font-bold text-gray-900">{order.restaurant?.name || 'Restaurant'}</p>
                          <p className="text-xs text-gray-500">
                            Rs. {order.totalAmount} • {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Link
                          to={`/order/${order._id}/track`}
                          className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-black text-orange-500 hover:border-orange-500 transition-all"
                        >
                          Track Order
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'addresses' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-[40px] p-10 shadow-sm border border-gray-100"
              >
                <div className="flex justify-between items-center mb-8 gap-4">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">{t('common.my_addresses')}</h3>
                    <p className="text-sm text-gray-500 font-medium mt-2">
                      Save exact Google GPS addresses for checkout, delivery fee, ETA and rider map.
                    </p>
                  </div>
                  <button
                    onClick={openAddAddressModal}
                    className="px-4 py-3 bg-orange-500 text-white rounded-2xl font-black text-xs tracking-tight hover:bg-orange-600 flex items-center gap-2 shadow-lg shadow-orange-100"
                  >
                    <Plus size={16} />
                    Add New
                  </button>
                </div>

                {addressError && !isAddressModalOpen && (
                  <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 font-bold text-sm">
                    {addressError}
                  </div>
                )}

                {addressLoading ? (
                  <div className="py-16 flex items-center justify-center text-orange-500">
                    <Loader2 className="animate-spin" size={34} />
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="p-8 bg-gray-50 rounded-3xl border border-dashed border-gray-200 text-center">
                    <div className="w-16 h-16 mx-auto bg-orange-100 text-orange-500 rounded-3xl flex items-center justify-center mb-4">
                      <MapPin size={28} />
                    </div>
                    <h4 className="font-black text-gray-900">No saved address yet</h4>
                    <p className="text-sm text-gray-500 mt-2 mb-5">
                      Add your home, work or delivery address using Google address autocomplete.
                    </p>
                    <button
                      onClick={openAddAddressModal}
                      className="px-6 py-3 bg-orange-500 text-white rounded-2xl font-black text-sm hover:bg-orange-600"
                    >
                      Add Address
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {addresses.map((address) => (
                      <div
                        key={address._id || getAddressText(address)}
                        className="p-6 bg-orange-50 rounded-3xl border border-orange-100 flex items-start gap-4"
                      >
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-orange-500 shadow-sm shrink-0">
                          {getAddressIcon(address.label)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-1">
                            <span className="text-sm font-black text-gray-900 uppercase tracking-wider">
                              {address.label || 'Address'}
                            </span>
                            {address.isDefault && (
                              <span className="px-2 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded-lg uppercase tracking-tighter">
                                Default
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-gray-600 font-medium leading-relaxed break-words">
                            {getAddressText(address)}
                          </p>

                          {typeof address.lat === 'number' && typeof address.lng === 'number' && (
                            <p className="text-[11px] text-green-600 font-black mt-2 flex items-center gap-1">
                              <CheckCircle2 size={13} /> GPS saved: {address.lat.toFixed(5)}, {address.lng.toFixed(5)}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-2 mt-5">
                            <button
                              onClick={() => openEditAddressModal(address)}
                              className="px-4 py-2 bg-white border border-orange-100 text-orange-600 rounded-xl text-xs font-black hover:border-orange-500 transition-all flex items-center gap-2"
                            >
                              <Edit2 size={14} /> Edit
                            </button>

                            {!address.isDefault && (
                              <button
                                onClick={() => makeDefaultAddress(address._id)}
                                className="px-4 py-2 bg-white border border-gray-100 text-gray-700 rounded-xl text-xs font-black hover:border-orange-500 transition-all"
                              >
                                Make Default
                              </button>
                            )}

                            <button
                              onClick={() => deleteAddress(address._id)}
                              className="px-4 py-2 bg-white border border-red-100 text-red-600 rounded-xl text-xs font-black hover:border-red-400 transition-all flex items-center gap-2"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-[40px] p-10 shadow-sm border border-gray-100"
              >
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Notifications</h3>
                <p className="text-gray-500 mt-4 font-medium">Push notification settings will be added in the notification feature.</p>
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-[40px] p-10 shadow-sm border border-gray-100"
              >
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Security</h3>
                <p className="text-gray-500 mt-4 font-medium">Password and account security settings will be added in the security feature.</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {isAddressModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-2xl bg-white rounded-[36px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                  {editingAddressId ? 'Edit Address' : 'Add New Address'}
                </h3>
                <p className="text-sm text-gray-500 font-medium mt-1">Select a real address from Google dropdown.</p>
              </div>
              <button
                onClick={closeAddressModal}
                className="w-11 h-11 rounded-2xl bg-gray-50 text-gray-500 flex items-center justify-center hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto">
              <AddressAutocomplete
                value={addressForm}
                onChange={(value) => setAddressForm({ ...addressForm, ...value })}
                country="gb"
                showLabelInput
                showCurrentLocationButton
                labelPlaceholder="Label e.g. Home, Work, Uni"
                placeholder="Start typing postcode, street, or full delivery address..."
              />

              <label className="mt-6 flex items-center gap-3 p-4 bg-gray-50 border border-gray-100 rounded-2xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(addressForm.isDefault)}
                  onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                  className="w-5 h-5 accent-orange-500"
                />
                <span className="font-bold text-sm text-gray-700">Make this my default delivery address</span>
              </label>

              {addressError && (
                <div className="mt-5 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 font-bold text-sm">
                  {addressError}
                </div>
              )}
            </div>

            <div className="px-8 py-6 border-t border-gray-100 flex flex-col sm:flex-row gap-3 justify-end">
              <button
                onClick={closeAddressModal}
                className="px-7 py-3.5 bg-white border border-gray-200 text-gray-600 rounded-2xl font-black hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveAddress}
                disabled={addressSaving}
                className="px-7 py-3.5 bg-orange-500 text-white rounded-2xl font-black hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {addressSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {addressSaving ? 'Saving...' : 'Save Address'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
