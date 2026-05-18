import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Bike, FileText, Smartphone, CheckCircle, ArrowRight, Upload, X } from 'lucide-react';

export const RiderOnboarding: React.FC = () => {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    vehicleType: 'MOTORBIKE',
    licenseNumber: ''
  });

  const [files, setFiles] = useState<{
    license: File | null;
    citizenship: File | null;
    profile: File | null;
  }>({
    license: null,
    citizenship: null,
    profile: null
  });

  const [previews, setPreviews] = useState({
    license: '',
    citizenship: '',
    profile: ''
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'license' | 'citizenship' | 'profile') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFiles({ ...files, [type]: file });
      setPreviews({ ...previews, [type]: URL.createObjectURL(file) });
    }
  };

  const handleNext = () => {
    if (step === 1 && !user) {
      if (!formData.name || !formData.email || !formData.password || !formData.phone) {
        setError('Please fill all basic details');
        return;
      }
    }
    setError('');
    setStep(s => s + 1);
  };

  const uploadFiles = async (token: string) => {
    const data = new FormData();
    if (files.license) data.append('license', files.license);
    if (files.citizenship) data.append('citizenship', files.citizenship);
    if (files.profile) data.append('profile', files.profile);

    return await apiRequest('/api/uploads/rider-docs', {
      method: 'POST',
      token,
      body: data
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      let currentUser = user;
      
      // 1. Register user if not exists
      if (!currentUser) {
        await register(formData.name, formData.email, formData.password, formData.phone, 'RIDER');
        // Refresh currentUser context (should happen automatically via useAuth but let's be safe or just use the response)
        // For simplicity in this demo, let's assume register handles login
      }

      // We need the token. Let's get it from localStorage if useAuth hasn't updated yet or just use user from context
      const token = (user as any)?.token || JSON.parse(localStorage.getItem('foodpal_user') || '{}').token;

      // 2. Upload documents
      const uploadedUrls = await uploadFiles(token);

      // 3. Create rider record
      await apiRequest('/api/riders/register', {
        method: 'POST',
        token,
        body: JSON.stringify({
          vehicleType: formData.vehicleType,
          licenseNumber: formData.licenseNumber,
          licenseImage: uploadedUrls.license,
          citizenshipImage: uploadedUrls.citizenship,
          profilePhoto: uploadedUrls.profile
        })
      });

      navigate('/rider/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white py-20 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-orange-500/20">
            <Bike size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter mb-2">Ride with FoodPal</h1>
          <p className="text-gray-400 font-medium">Earn money on your own schedule in Nepal.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm font-bold text-center">
            {error}
          </div>
        )}

        <div className="bg-gray-800 rounded-[40px] p-8 md:p-12 border border-gray-700">
          <div className="flex justify-between mb-10">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={`h-1 flex-1 rounded-full mx-1 ${step >= i ? 'bg-orange-500' : 'bg-gray-700'}`} />
            ))}
          </div>

          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="text-2xl font-black mb-6">Basic Information</h2>
              {user ? (
                <div className="p-6 bg-gray-700/50 rounded-2xl border border-gray-600 mb-8">
                  <p className="text-gray-400 mb-1 font-bold">Currently signed in as:</p>
                  <p className="text-xl font-black">{user.name}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <input 
                    placeholder="Full Name"
                    className="w-full px-6 py-4 bg-gray-700 border-none rounded-2xl outline-none focus:ring-2 focus:ring-orange-500"
                    value={formData.name || ''}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                  <input 
                    placeholder="Email Address"
                    className="w-full px-6 py-4 bg-gray-700 border-none rounded-2xl outline-none focus:ring-2 focus:ring-orange-500"
                    value={formData.email || ''}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                  <input 
                    placeholder="Phone"
                    className="w-full px-6 py-4 bg-gray-700 border-none rounded-2xl outline-none focus:ring-2 focus:ring-orange-500"
                    value={formData.phone || ''}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                  <input 
                    placeholder="Password"
                    type="password"
                    className="w-full px-6 py-4 bg-gray-700 border-none rounded-2xl outline-none focus:ring-2 focus:ring-orange-500"
                    value={formData.password || ''}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              )}
              <button onClick={handleNext} className="w-full mt-8 py-4 bg-orange-500 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-orange-600 transition-all">
                Next Step <ArrowRight size={20} />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="text-2xl font-black mb-6">Vehicle Details</h2>
              <div className="space-y-4">
                <select 
                  className="w-full px-6 py-4 bg-gray-700 border-none rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 appearance-none"
                  value={formData.vehicleType}
                  onChange={e => setFormData({...formData, vehicleType: e.target.value})}
                >
                  <option value="MOTORBIKE">Motorbike / Scooter</option>
                  <option value="BICYCLE">Bicycle</option>
                  <option value="CAR">Car</option>
                </select>
                <input 
                  placeholder="License Number"
                  className="w-full px-6 py-4 bg-gray-700 border-none rounded-2xl outline-none focus:ring-2 focus:ring-orange-500"
                  value={formData.licenseNumber || ''}
                  onChange={e => setFormData({...formData, licenseNumber: e.target.value})}
                />
              </div>
              <div className="flex gap-4 mt-8">
                <button onClick={() => setStep(1)} className="flex-1 py-4 bg-gray-700 rounded-2xl font-black">Back</button>
                <button onClick={handleNext} className="flex-2 py-4 bg-orange-500 rounded-2xl font-black hover:bg-orange-600">Next</button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="text-2xl font-black mb-6">Upload Documents</h2>
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-widest">Driving License</p>
                  <label className="relative block h-32 border-2 border-dashed border-gray-600 rounded-2xl overflow-hidden cursor-pointer hover:border-orange-500 transition-colors">
                    {previews.license ? (
                      <img src={previews.license} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <Upload className="text-gray-500 mb-1" />
                        <span className="text-xs font-bold text-gray-500">Tap to upload</span>
                      </div>
                    )}
                    <input type="file" className="hidden" onChange={(e) => handleFileChange(e, 'license')} />
                  </label>
                </div>

                <div>
                  <p className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-widest">Citizenship / ID Card</p>
                  <label className="relative block h-32 border-2 border-dashed border-gray-600 rounded-2xl overflow-hidden cursor-pointer hover:border-orange-500 transition-colors">
                    {previews.citizenship ? (
                      <img src={previews.citizenship} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <Upload className="text-gray-500 mb-1" />
                        <span className="text-xs font-bold text-gray-500">Tap to upload</span>
                      </div>
                    )}
                    <input type="file" className="hidden" onChange={(e) => handleFileChange(e, 'citizenship')} />
                  </label>
                </div>

                <div>
                  <p className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-widest">Profile Photo</p>
                  <label className="relative block h-32 border-2 border-dashed border-gray-600 rounded-2xl overflow-hidden cursor-pointer hover:border-orange-500 transition-colors">
                    {previews.profile ? (
                      <img src={previews.profile} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <Upload className="text-gray-500 mb-1" />
                        <span className="text-xs font-bold text-gray-500">Tap to upload</span>
                      </div>
                    )}
                    <input type="file" className="hidden" onChange={(e) => handleFileChange(e, 'profile')} />
                  </label>
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <button onClick={() => setStep(2)} className="flex-1 py-4 bg-gray-700 rounded-2xl font-black">Back</button>
                <button 
                  onClick={handleNext} 
                  disabled={!files.license || !files.citizenship || !files.profile}
                  className="flex-2 py-4 bg-orange-500 rounded-2xl font-black hover:bg-orange-600 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="text-2xl font-black mb-6">Final Verification</h2>
              <div className="bg-orange-500/10 p-6 rounded-2xl border border-orange-500/20 mb-8">
                <div className="flex items-center gap-4 text-orange-500 mb-4">
                  <CheckCircle size={24} />
                  <span className="font-bold">Ready to Start</span>
                </div>
                <p className="text-sm text-gray-300">By clicking finish, you agree to FoodPal's Rider Terms of Service and Privacy Policy for Nepal. Your account will be active once reviewed by our team.</p>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setStep(3)} className="flex-1 py-4 bg-gray-700 rounded-2xl font-black">Back</button>
                <button 
                  onClick={handleSubmit} 
                  disabled={loading}
                  className="flex-2 py-4 bg-orange-500 rounded-2xl font-black hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? 'Processing...' : 'Finish Registration'}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
