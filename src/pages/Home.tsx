import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import {
  ChevronRight,
  Search,
  Star,
  Clock,
  Truck,
  Map as MapIcon,
  Grid,
  Navigation,
  Loader2,
  X,
} from "lucide-react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";
import { apiRequest } from "../lib/api";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

const containerStyle = {
  width: "100%",
  height: "100%",
};

type LocationState = {
  lat: number;
  lng: number;
};

export const Home: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("");
  const [openOnly, setOpenOnly] = useState(false);

  const [userLocation, setUserLocation] = useState<LocationState | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");

  const [showMap, setShowMap] = useState(false);
  const [selectedRes, setSelectedRes] = useState<any>(null);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchRestaurants();
  }, [debouncedSearch, activeCategory, sortBy, openOnly, userLocation]);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      if (activeCategory) {
        params.set("cuisine", activeCategory);
      }

      if (sortBy) {
        params.set("sortBy", sortBy);
      }

      if (openOnly) {
        params.set("isOpen", "true");
      }

      /*
        IMPORTANT FIX:
        We only send lat/lng when user manually clicks "Use my location".
        Before, browser location was being sent automatically.
        If you are in UK and restaurants are in Kathmandu, backend returns 0 restaurants.
      */
      if (userLocation) {
        params.set("lat", String(userLocation.lat));
        params.set("lng", String(userLocation.lng));
      }

      const queryString = params.toString();
      const endpoint = queryString
        ? `/api/restaurants?${queryString}`
        : "/api/restaurants";

      const data = await apiRequest<any>(endpoint);

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.restaurants)
        ? data.restaurants
        : Array.isArray(data.data)
        ? data.data
        : [];

      setRestaurants(list);
    } catch (error) {
      console.error("Failed to load restaurants:", error);
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { name: "Momo", icon: "🥟", color: "bg-orange-100" },
    { name: "Khaja Set", icon: "🍛", color: "bg-yellow-100" },
    { name: "Burger", icon: "🍔", color: "bg-blue-100" },
    { name: "Pizza", icon: "🍕", color: "bg-red-100" },
    { name: "Thali", icon: "🍱", color: "bg-green-100" },
    { name: "Sweets", icon: "🍰", color: "bg-pink-100" },
  ];

  const scrollToRestaurants = () => {
    document
      .getElementById("featured-restaurants")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  const handleUseMyLocation = () => {
    setLocationMessage("");

    if (!("geolocation" in navigator)) {
      setLocationMessage("Location is not supported in this browser.");
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationMessage("Showing restaurants near your current location.");
        setLocationLoading(false);
      },
      () => {
        setLocationMessage("Could not get your location.");
        setLocationLoading(false);
      }
    );
  };

  const clearLocationFilter = () => {
    setUserLocation(null);
    setLocationMessage("");
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setActiveCategory(null);
    setOpenOnly(false);
    setSortBy("");
    setUserLocation(null);
    setLocationMessage("");
    setShowMap(false);
  };

  const getRestaurantImage = (res: any) => {
    return (
      res.bannerImage ||
      res.images?.[0] ||
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1000"
    );
  };

  const getDistanceKm = (res: any) => {
    if (res.distanceKm !== undefined) {
      return Number(res.distanceKm).toFixed(1);
    }

    if (res.distance !== undefined) {
      return (Number(res.distance) / 1000).toFixed(1);
    }

    return null;
  };

  const getMapPosition = (res: any) => {
    const lat =
      res.address?.lat ||
      res.location?.coordinates?.[1] ||
      27.7172;

    const lng =
      res.address?.lng ||
      res.location?.coordinates?.[0] ||
      85.324;

    return { lat: Number(lat), lng: Number(lng) };
  };

  const mapCenter =
    userLocation ||
    (restaurants[0] ? getMapPosition(restaurants[0]) : { lat: 27.7172, lng: 85.324 });

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-32 bg-gradient-to-br from-orange-50 via-white to-orange-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-orange-100 text-orange-600 text-xs font-bold tracking-widest uppercase mb-6 shadow-sm border border-orange-200">
                🚀 Faster than your hunger
              </span>

              <h1 className="text-6xl md:text-7xl font-black text-gray-900 leading-[1.1] tracking-tighter mb-8">
                {t("home.hero_title", "Food delivery made simple")}
              </h1>

              <p className="text-lg text-gray-600 max-w-lg mb-10 leading-relaxed">
                {t(
                  "home.hero_subtitle",
                  "Order fresh meals from your favourite local restaurants."
                )}
              </p>

              <div className="relative max-w-xl group">
                <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-gray-400 group-focus-within:text-orange-500 transition-colors">
                  <Search size={24} />
                </div>

                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pizza, Burger, Momo..."
                  className="w-full pl-16 pr-8 py-6 bg-white border-2 border-gray-100 rounded-[32px] font-bold text-lg shadow-2xl shadow-orange-100 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all placeholder:text-gray-300"
                />

                <div className="absolute inset-y-4 right-44 hidden md:flex items-center">
                  <button
                    onClick={handleUseMyLocation}
                    disabled={locationLoading}
                    className="p-3 bg-gray-100 rounded-full text-gray-500 hover:bg-orange-100 hover:text-orange-500 transition-all active:scale-90 disabled:opacity-50"
                    title="Use my location"
                  >
                    {locationLoading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Navigation size={18} />
                    )}
                  </button>
                </div>

                <button
                  onClick={scrollToRestaurants}
                  className="absolute right-3 top-3 bottom-3 px-8 bg-orange-500 text-white rounded-[24px] font-black uppercase tracking-widest text-xs hover:bg-orange-600 transition-all active:scale-95 shadow-lg shadow-orange-200"
                >
                  Find Food
                </button>
              </div>

              {(userLocation || locationMessage) && (
                <div className="mt-4 flex items-center gap-3 text-sm">
                  <span className="text-gray-500 font-semibold">
                    {locationMessage || "Location filter enabled."}
                  </span>

                  {userLocation && (
                    <button
                      onClick={clearLocationFilter}
                      className="inline-flex items-center gap-1 text-orange-600 font-bold hover:underline"
                    >
                      <X size={14} />
                      Clear location
                    </button>
                  )}
                </div>
              )}

              <div className="mt-8 flex items-center gap-4 text-sm font-medium text-gray-400">
                <span>Recent:</span>

                <div className="flex gap-2">
                  {["Momo", "Burger", "Healthy"].map((term) => (
                    <button
                      key={term}
                      onClick={() => setSearchQuery(term)}
                      className="px-3 py-1 bg-gray-100 rounded-full hover:bg-orange-100 hover:text-orange-600 transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-12 flex items-center gap-8 grayscale opacity-50">
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-gray-900">10k+</span>
                  <span className="text-xs uppercase tracking-widest font-semibold">
                    Orders Today
                  </span>
                </div>

                <div className="w-px h-8 bg-gray-200" />

                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-gray-900">500+</span>
                  <span className="text-xs uppercase tracking-widest font-semibold">
                    Restaurants
                  </span>
                </div>

                <div className="w-px h-8 bg-gray-200" />

                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-gray-900">1k+</span>
                  <span className="text-xs uppercase tracking-widest font-semibold">
                    Riders
                  </span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="relative hidden lg:block"
            >
              <div className="relative w-full aspect-square bg-orange-100 rounded-[60px] overflow-hidden shadow-2xl skew-y-3">
                <img
                  src="https://images.unsplash.com/photo-1541167760496-162955ed8a9f?q=80&w=2667&auto=format&fit=crop"
                  alt="Food"
                  className="absolute inset-0 w-full h-full object-cover -skew-y-3 hover:scale-110 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
              </div>

              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute -top-6 -right-6 bg-white p-4 rounded-2xl shadow-xl border border-gray-50 flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                  <Truck size={20} />
                </div>

                <div>
                  <p className="text-sm font-bold text-gray-900">Fast Delivery</p>
                  <p className="text-[10px] text-gray-500">Under 30 mins</p>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1,
                }}
                className="absolute -bottom-10 -left-10 bg-white p-4 rounded-2xl shadow-xl border border-gray-50 flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600">
                  <Star fill="currentColor" size={20} />
                </div>

                <div>
                  <p className="text-sm font-bold text-gray-900">Top Rated</p>
                  <p className="text-[10px] text-gray-500">4.9/5 Average</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-black text-gray-900 mb-2">
                {t("home.popular_categories", "Popular Categories")}
              </h2>
              <p className="text-gray-500">Explore the best food in Kathmandu</p>
            </div>

            <button className="text-orange-500 font-bold text-sm flex items-center gap-1 hover:underline">
              View All <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
            {categories.map((cat) => (
              <motion.button
                key={cat.name}
                whileHover={{ y: -8 }}
                onClick={() =>
                  setActiveCategory(activeCategory === cat.name ? null : cat.name)
                }
                className={`flex flex-col items-center justify-center p-8 rounded-[32px] ${cat.color} cursor-pointer group transition-all border-4 ${
                  activeCategory === cat.name
                    ? "border-orange-500"
                    : "border-transparent"
                }`}
              >
                <span className="text-4xl mb-4 group-hover:scale-125 transition-transform">
                  {cat.icon}
                </span>

                <span
                  className={`font-bold text-sm tracking-tight ${
                    activeCategory === cat.name
                      ? "text-orange-500"
                      : "text-gray-900"
                  }`}
                >
                  {cat.name}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      <section
        id="featured-restaurants"
        className="py-20 bg-gray-50 rounded-t-[60px]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">
              {debouncedSearch
                ? `Results for "${debouncedSearch}"`
                : activeCategory
                ? `${activeCategory} Specialities`
                : t("home.featured_restaurants", "Featured Restaurants")}
            </h2>

            <div className="flex flex-wrap items-center gap-3">
              {!loading && restaurants.length > 0 && (
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                  {restaurants.length} Restaurants found
                </p>
              )}

              <button
                onClick={() => setOpenOnly(!openOnly)}
                className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider ${
                  openOnly
                    ? "bg-green-600 text-white"
                    : "bg-white text-gray-700 border border-gray-200"
                }`}
              >
                Open Now
              </button>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-5 py-3 rounded-2xl bg-white border border-gray-200 text-gray-700 font-black text-xs uppercase outline-none"
              >
                <option value="">Sort</option>
                <option value="rating">Rating</option>
                <option value="deliveryTime">Fastest</option>
                <option value="deliveryFee">Delivery Fee</option>
              </select>

              <button
                id="map-toggle-btn"
                onClick={() => setShowMap(!showMap)}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl shadow-xl transition-all font-black text-xs uppercase tracking-wider active:scale-95 ${
                  showMap ? "bg-gray-900 text-white" : "bg-orange-500 text-white"
                }`}
              >
                {showMap ? (
                  <>
                    <Grid size={18} /> Grid View
                  </>
                ) : (
                  <>
                    <MapIcon size={18} /> Map
                  </>
                )}
              </button>
            </div>
          </div>

          {showMap && restaurants.length > 0 ? (
            <div className="h-[600px] w-full rounded-[40px] overflow-hidden shadow-2xl border-8 border-white mb-12 relative">
              {!GOOGLE_MAPS_API_KEY && (
                <div className="absolute inset-0 z-10 bg-gray-900/80 backdrop-blur flex items-center justify-center text-white text-center p-8">
                  <div>
                    <MapIcon size={48} className="mx-auto mb-4 text-orange-500" />
                    <h3 className="text-2xl font-black mb-2">
                      Google Maps Key Required
                    </h3>
                    <p className="max-w-md opacity-70">
                      Please add VITE_GOOGLE_MAPS_API_KEY to your .env to enable
                      this feature.
                    </p>
                  </div>
                </div>
              )}

              {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={containerStyle}
                  center={mapCenter}
                  zoom={13}
                  options={{
                    styles: [
                      {
                        featureType: "poi",
                        stylers: [{ visibility: "off" }],
                      },
                    ],
                  }}
                >
                  {restaurants.map((res: any) => (
                    <Marker
                      key={res._id}
                      position={getMapPosition(res)}
                      onClick={() => setSelectedRes(res)}
                      icon={
                        isLoaded
                          ? {
                              url: "https://cdn-icons-png.flaticon.com/512/6122/6122556.png",
                              scaledSize: new window.google.maps.Size(40, 40),
                            }
                          : undefined
                      }
                    />
                  ))}

                  {selectedRes && (
                    <InfoWindow
                      position={getMapPosition(selectedRes)}
                      onCloseClick={() => setSelectedRes(null)}
                    >
                      <div className="p-2 min-w-[150px]">
                        <img
                          src={getRestaurantImage(selectedRes)}
                          alt={selectedRes.name}
                          className="w-full h-20 object-cover rounded-lg mb-2"
                        />

                        <h4 className="font-bold text-gray-900">
                          {selectedRes.name}
                        </h4>

                        <p className="text-xs text-gray-500 mb-2">
                          {(selectedRes.cuisine || []).join(", ")}
                        </p>

                        <Link
                          to={`/restaurant/${selectedRes._id}`}
                          className="text-orange-500 font-bold text-xs hover:underline"
                        >
                          View Menu
                        </Link>
                      </div>
                    </InfoWindow>
                  )}

                  {userLocation && <Marker position={userLocation} label="You" />}
                </GoogleMap>
              ) : (
                <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center text-gray-400 font-bold">
                  Loading Maps...
                </div>
              )}
            </div>
          ) : null}

          <div
            className={`grid grid-cols-1 md:grid-cols-3 gap-8 ${
              showMap ? "hidden" : ""
            }`}
          >
            {loading ? (
              [1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-72 bg-gray-200 animate-pulse rounded-[32px]"
                />
              ))
            ) : restaurants.length === 0 ? (
              <div className="md:col-span-3 text-center py-20 bg-white rounded-[40px] border border-dashed border-gray-200">
                <Search className="mx-auto mb-4 text-gray-300" size={48} />

                <p className="text-gray-500 font-bold text-xl">
                  No restaurants match your search.
                </p>

                {userLocation && (
                  <p className="text-gray-400 mt-2">
                    Your current location may be too far from Kathmandu
                    restaurants.
                  </p>
                )}

                <button
                  onClick={clearAllFilters}
                  className="mt-4 text-orange-500 font-bold hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              restaurants.map((res: any) => {
                const distanceKm = getDistanceKm(res);

                return (
                  <Link
                    to={`/restaurant/${res._id}`}
                    key={res._id}
                    className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all group"
                  >
                    <div className="h-48 bg-gray-200 relative overflow-hidden">
                      <img
                        src={getRestaurantImage(res)}
                        alt={res.name}
                        className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${
                          !res.isOpen ? "grayscale opacity-70" : ""
                        }`}
                        referrerPolicy="no-referrer"
                      />

                      {res.isFeatured && (
                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-orange-600 shadow-sm">
                          Featured
                        </div>
                      )}

                      <div
                        className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-black shadow-sm ${
                          res.isOpen
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {res.isOpen ? "Open Now" : "Closed"}
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="flex justify-between items-start mb-2 gap-3">
                        <h3 className="text-xl font-bold text-gray-900 line-clamp-1">
                          {res.name}
                        </h3>

                        <div className="flex items-center gap-1 text-yellow-500 shrink-0">
                          <Star fill="currentColor" size={16} />
                          <span className="text-sm font-bold">
                            {res.rating || 0}
                          </span>
                        </div>
                      </div>

                      <p className="text-gray-500 text-sm mb-4 line-clamp-1">
                        {(res.cuisine || []).join(" • ")}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 border-t border-gray-50 pt-4">
                        <div className="flex items-center gap-1 text-gray-500 bg-gray-50 px-2.5 py-1.5 rounded-full">
                          <Clock size={14} />
                          <span className="text-xs font-black">
                            {res.estimatedDeliveryTime || 30} min
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2.5 py-1.5 rounded-full">
                          <Truck size={14} />
                          <span className="text-xs font-black">
                            Rs {res.deliveryFee ?? 50}
                          </span>
                        </div>

                        {Number(res.minimumOrder || 0) > 0 && (
                          <div className="text-xs font-black text-gray-500 bg-gray-50 px-2.5 py-1.5 rounded-full">
                            Min Rs {res.minimumOrder}
                          </div>
                        )}

                        {distanceKm && (
                          <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-full">
                            <Navigation size={14} />
                            <span className="text-xs font-black">
                              {distanceKm} km
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-gray-100 text-gray-600">
                          {res.priceLevel || "MEDIUM"}
                        </span>

                        {(res.tags || []).slice(0, 2).map((tag: string) => (
                          <span
                            key={tag}
                            className="px-3 py-1 rounded-full text-xs font-black bg-orange-100 text-orange-700"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;