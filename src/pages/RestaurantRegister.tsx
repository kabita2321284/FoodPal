import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiRequest } from "../lib/api";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  Store,
  MapPin,
  Upload,
  ArrowRight,
  CheckCircle,
  Clock,
  LocateFixed,
  Loader2,
} from "lucide-react";

type GPSLocation = {
  lat: number;
  lng: number;
};

const getCurrentGPS = (): Promise<GPSLocation> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      reject,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  });
};

const reverseGeocode = async (lat: number, lng: number) => {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!key) return `${lat}, ${lng}`;

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`
    );

    const data = await res.json();

    return data.results?.[0]?.formatted_address || `${lat}, ${lng}`;
  } catch (err) {
    console.error(err);
    return `${lat}, ${lng}`;
  }
};

export const RestaurantRegister: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    addressText: "",
    cuisine: "",
    lat: null as number | null,
    lng: null as number | null,
  });

  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState("");

  const handleUseCurrentGPS = async () => {
    setGpsLoading(true);
    setError("");

    try {
      const gps = await getCurrentGPS();
      const detectedAddress = await reverseGeocode(gps.lat, gps.lng);

      setFormData((prev) => ({
        ...prev,
        addressText: detectedAddress,
        lat: gps.lat,
        lng: gps.lng,
      }));

      alert("Restaurant GPS and address saved.");
    } catch (err) {
      console.error(err);
      setError("Please allow location access to save restaurant GPS.");
    } finally {
      setGpsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleNext = () => {
    if (
      step === 1 &&
      (!formData.name || !formData.description || !formData.addressText)
    ) {
      setError("Please fill all highlighted fields.");
      return;
    }

    if (step === 1 && (!formData.lat || !formData.lng)) {
      setError("Please click Use Current GPS Location before continuing.");
      return;
    }

    if (step === 2 && !formData.cuisine.trim()) {
      setError("Please enter at least one cuisine.");
      return;
    }

    setError("");
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      if (!user) {
        navigate("/login?redirect=/restaurant/register");
        return;
      }

      if (!formData.lat || !formData.lng) {
        setError("Restaurant GPS location is missing.");
        setLoading(false);
        return;
      }

      let imageUrl = "";

      if (image) {
        const uploadData = new FormData();
        uploadData.append("image", image);

        const uploadResult = await apiRequest("/api/uploads/single", {
          method: "POST",
          token: user.token,
          body: uploadData,
        });

        imageUrl = uploadResult.url;
      }

      await apiRequest("/api/restaurants/register", {
        method: "POST",
        token: user.token,
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          address: {
            text: formData.addressText,
            lat: formData.lat,
            lng: formData.lng,
          },
          lat: formData.lat,
          lng: formData.lng,
          location: {
            type: "Point",
            coordinates: [formData.lng, formData.lat],
          },
          cuisine: formData.cuisine
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean),
          images: [imageUrl].filter(Boolean),
        }),
      });

      setStep(4);
    } catch (err: any) {
      setError(err.message || "Could not submit restaurant application.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 py-20 font-sans">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-orange-500 rounded-[20px] flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-orange-200">
            <Store size={32} />
          </div>

          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">
            Partner with FoodPal
          </h1>

          <p className="text-gray-500 font-medium">
            Reach more customers and grow your business today.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-500 border border-red-100 rounded-2xl text-sm font-bold text-center">
            {error}
          </div>
        )}

        <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-xl shadow-gray-200/50 border border-gray-100">
          <div className="flex justify-between mb-10 px-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full mx-1 transition-all ${
                  step >= i ? "bg-orange-500" : "bg-gray-100"
                }`}
              />
            ))}
          </div>

          {step === 1 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-2xl font-black text-gray-900 mb-6 tracking-tight">
                Restaurant Details
              </h2>

              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                    Restaurant Name
                  </label>
                  <input
                    placeholder="e.g. Kathmandu Kitchen"
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-orange-500 rounded-2xl outline-none transition-all font-medium"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                    Short Description
                  </label>
                  <textarea
                    placeholder="Tell us about your kitchen..."
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-orange-500 rounded-2xl outline-none transition-all font-medium h-32 resize-none"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                    Full Address
                  </label>
                  <div className="relative">
                    <MapPin
                      className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                    <input
                      placeholder="Click GPS button or type restaurant full address"
                      className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-transparent focus:border-orange-500 rounded-2xl outline-none transition-all font-medium"
                      value={formData.addressText}
                      onChange={(e) =>
                        setFormData({ ...formData, addressText: e.target.value })
                      }
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleUseCurrentGPS}
                  disabled={gpsLoading}
                  className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {gpsLoading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <LocateFixed size={18} />
                  )}
                  {gpsLoading ? "Finding restaurant address..." : "Use Current GPS Location"}
                </button>

                <div
                  className={`p-5 rounded-3xl border ${
                    formData.lat && formData.lng
                      ? "bg-green-50 border-green-100"
                      : "bg-orange-50 border-orange-100"
                  }`}
                >
                  {formData.lat && formData.lng ? (
                    <>
                      <p className="text-xs text-green-600 font-black mb-2">
                        GPS saved: {formData.lat.toFixed(5)},{" "}
                        {formData.lng.toFixed(5)}
                      </p>
                      <p className="text-xs text-gray-600 font-bold">
                        {formData.addressText}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-orange-600 font-black">
                      GPS not saved yet. Click “Use Current GPS Location”.
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={handleNext}
                className="w-full mt-10 py-5 bg-orange-500 text-white rounded-3xl font-black text-lg shadow-xl shadow-orange-200 hover:bg-orange-600 transition-all flex items-center justify-center gap-2 group"
              >
                Next Step{" "}
                <ArrowRight
                  size={22}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-2xl font-black text-gray-900 mb-6 tracking-tight">
                Cuisine & Photos
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                    Cuisines comma separated
                  </label>
                  <input
                    placeholder="Momo, Newari, Thakali, Indian"
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-orange-500 rounded-2xl outline-none transition-all font-medium"
                    value={formData.cuisine}
                    onChange={(e) =>
                      setFormData({ ...formData, cuisine: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                    Cover Photo
                  </label>

                  <label className="relative block aspect-[2/1] border-2 border-dashed border-gray-200 rounded-3xl overflow-hidden cursor-pointer hover:border-orange-500 transition-all bg-gray-50">
                    {preview ? (
                      <img
                        src={preview}
                        className="w-full h-full object-cover"
                        alt="Restaurant preview"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <Upload className="text-gray-400 mb-2" size={32} />
                        <span className="text-sm font-bold text-gray-400">
                          Upload storefront photo
                        </span>
                      </div>
                    )}

                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              </div>

              <div className="flex gap-4 mt-10">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-5 bg-gray-50 text-gray-500 rounded-3xl font-black hover:bg-gray-100 transition-all"
                >
                  Back
                </button>

                <button
                  onClick={handleNext}
                  className="flex-[2] py-5 bg-orange-500 text-white rounded-3xl font-black hover:bg-orange-600 transition-all"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-2xl font-black text-gray-900 mb-6 tracking-tight">
                Review Application
              </h2>

              <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 mb-8">
                <div className="flex items-center gap-3 text-orange-600 mb-4">
                  <Clock size={20} />
                  <span className="font-bold text-sm">
                    Review Time: 2-3 Business Days
                  </span>
                </div>

                <p className="text-xs text-orange-800 leading-relaxed font-medium">
                  By submitting this application, you agree to FoodPal's Partner
                  Terms of Service. Our team will verify your location and
                  documentation before approving your store.
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between p-4 bg-gray-50 rounded-2xl">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                    Restaurant
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {formData.name}
                  </span>
                </div>

                <div className="flex justify-between p-4 bg-gray-50 rounded-2xl">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                    Address
                  </span>
                  <span className="text-sm font-bold text-gray-900 text-right">
                    {formData.addressText}
                  </span>
                </div>

                <div className="flex justify-between p-4 bg-gray-50 rounded-2xl">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                    GPS
                  </span>
                  <span className="text-sm font-bold text-green-600">
                    {formData.lat && formData.lng
                      ? `${formData.lat.toFixed(5)}, ${formData.lng.toFixed(5)}`
                      : "Missing"}
                  </span>
                </div>

                <div className="flex justify-between p-4 bg-gray-50 rounded-2xl">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                    Owner
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {user?.name}
                  </span>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-5 bg-gray-50 text-gray-500 rounded-3xl font-black hover:bg-gray-100 transition-all"
                >
                  Back
                </button>

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-[2] py-5 bg-orange-500 text-white rounded-3xl font-black shadow-xl shadow-orange-200 hover:bg-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-10"
            >
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto mb-8">
                <CheckCircle size={40} />
              </div>

              <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">
                Application Received!
              </h2>

              <p className="text-gray-500 font-medium mb-10 max-w-sm mx-auto">
                Thank you for choosing FoodPal. Our partner onboarding team will
                contact you shortly to complete the verification process.
              </p>

              <Link
                to="/"
                className="inline-block px-10 py-4 bg-gray-900 text-white rounded-2xl font-black hover:bg-gray-800 transition-all"
              >
                Return Home
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};