import React, { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  apiRequest,
  redirectToStripeCheckout,
  submitEsewaPayment,
  startKhaltiPayment,
} from "../lib/api";
import { motion } from "motion/react";
import {
  MapPin,
  CreditCard,
  Banknote,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Tag,
  X,
  LocateFixed,
  Route,
  Truck,
  Search,
  Navigation,
  Check,
  AlertCircle,
} from "lucide-react";

type GPSLocation = {
  lat: number;
  lng: number;
};

type PlacePrediction = google.maps.places.AutocompletePrediction;

type DeliveryFeeBreakdown = {
  distanceKm: number;
  baseFee: number;
  freeKm: number;
  perKmFee: number;
  extraKm: number;
  rawFee: number;
  finalFee: number;
  maxFee: number;
};

const DELIVERY_RULES = {
  baseFee: 50,
  freeKm: 1,
  perKmFee: 25,
  minimumFee: 50,
  maximumFee: 250,
};

const MIN_ADDRESS_SEARCH_LENGTH = 3;

const getGoogleMapsApiKey = () => {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
};

const loadGoogleMapsScript = () => {
  return new Promise<void>((resolve, reject) => {
    const googleObject = (window as any).google;

    if (googleObject?.maps?.places) {
      resolve();
      return;
    }

    const existingScript = document.getElementById("google-maps-script");

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", reject, { once: true });
      return;
    }

    const key = getGoogleMapsApiKey();

    if (!key) {
      reject(new Error("Missing VITE_GOOGLE_MAPS_API_KEY in .env file."));
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Google Maps."));

    document.head.appendChild(script);
  });
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
  try {
    await loadGoogleMapsScript();

    const googleObject = (window as any).google;
    const geocoder = new googleObject.maps.Geocoder();

    return await new Promise<string>((resolve) => {
      geocoder.geocode(
        { location: { lat, lng } },
        (results: google.maps.GeocoderResult[] | null, status: string) => {
          if (status === "OK" && results?.[0]?.formatted_address) {
            resolve(results[0].formatted_address);
            return;
          }

          resolve(`${lat}, ${lng}`);
        }
      );
    });
  } catch (err) {
    console.error(err);
    return `${lat}, ${lng}`;
  }
};

const geocodeTypedAddress = async (address: string) => {
  await loadGoogleMapsScript();

  const googleObject = (window as any).google;
  const geocoder = new googleObject.maps.Geocoder();

  return await new Promise<{
    location: GPSLocation;
    formattedAddress: string;
  }>((resolve, reject) => {
    geocoder.geocode(
      { address },
      (results: google.maps.GeocoderResult[] | null, status: string) => {
        const result = results?.[0];
        const location = result?.geometry?.location;

        if (status === "OK" && result && location) {
          resolve({
            location: {
              lat: location.lat(),
              lng: location.lng(),
            },
            formattedAddress: result.formatted_address || address,
          });
          return;
        }

        reject(new Error("Address not found."));
      }
    );
  });
};

const isValidCoordinate = (lat: any, lng: any) => {
  const nLat = Number(lat);
  const nLng = Number(lng);

  if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) return false;
  if (nLat === 0 && nLng === 0) return false;

  return nLat >= -90 && nLat <= 90 && nLng >= -180 && nLng <= 180;
};

const getLatLng = (source: any): GPSLocation | null => {
  if (!source) return null;

  if (isValidCoordinate(source.lat, source.lng)) {
    return {
      lat: Number(source.lat),
      lng: Number(source.lng),
    };
  }

  if (
    Array.isArray(source.coordinates) &&
    source.coordinates.length >= 2 &&
    isValidCoordinate(source.coordinates[1], source.coordinates[0])
  ) {
    return {
      lat: Number(source.coordinates[1]),
      lng: Number(source.coordinates[0]),
    };
  }

  return null;
};

const calculateStraightDistanceKm = (from: GPSLocation, to: GPSLocation) => {
  const R = 6371;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const calculateDeliveryFee = (distanceKm: number): DeliveryFeeBreakdown => {
  const roundedDistance = Number(distanceKm.toFixed(2));
  const extraKm = Math.max(0, roundedDistance - DELIVERY_RULES.freeKm);
  const rawFee = DELIVERY_RULES.baseFee + extraKm * DELIVERY_RULES.perKmFee;

  const finalFee = Math.min(
    DELIVERY_RULES.maximumFee,
    Math.max(DELIVERY_RULES.minimumFee, Math.ceil(rawFee))
  );

  return {
    distanceKm: roundedDistance,
    baseFee: DELIVERY_RULES.baseFee,
    freeKm: DELIVERY_RULES.freeKm,
    perKmFee: DELIVERY_RULES.perKmFee,
    extraKm: Number(extraKm.toFixed(2)),
    rawFee: Math.ceil(rawFee),
    finalFee,
    maxFee: DELIVERY_RULES.maximumFee,
  };
};

export const CheckoutPage: React.FC = () => {
  const { items, total, clearCart } = useCart();
  const { user, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<
    "CASH" | "STRIPE" | "ESEWA" | "KHALTI"
  >("CASH");

  const [addressLabel, setAddressLabel] = useState("Home");
  const [addressText, setAddressText] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [gpsLocation, setGpsLocation] = useState<GPSLocation | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  const [addressPredictions, setAddressPredictions] = useState<PlacePrediction[]>(
    []
  );
  const [addressSearchLoading, setAddressSearchLoading] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [selectedAddressText, setSelectedAddressText] = useState("");
  const [selectedPlaceId, setSelectedPlaceId] = useState("");
  const [isAddressInputFocused, setIsAddressInputFocused] = useState(false);

  const [restaurant, setRestaurant] = useState<any>(null);
  const [restaurantLoading, setRestaurantLoading] = useState(false);

  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<any>(null);

  const autocompleteSessionTokenRef = useRef<any>(null);

  const platformFee = 20;
  const restaurantId = items[0]?.restaurantId;
  const discount = Number(appliedPromo?.discount || 0);

  const createAutocompleteSession = () => {
    const googleObject = (window as any).google;

    if (googleObject?.maps?.places?.AutocompleteSessionToken) {
      autocompleteSessionTokenRef.current =
        new googleObject.maps.places.AutocompleteSessionToken();
    }
  };

  useEffect(() => {
    if (!isAuthLoading && !user) {
      navigate("/login?redirect=/checkout");
    }
  }, [user, isAuthLoading, navigate]);

  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!restaurantId) return;

      setRestaurantLoading(true);

      try {
        const data = await apiRequest(`/api/restaurants/${restaurantId}`);
        setRestaurant(data);
      } catch (err) {
        console.error(err);
        setRestaurant(null);
      } finally {
        setRestaurantLoading(false);
      }
    };

    fetchRestaurant();
  }, [restaurantId]);

  useEffect(() => {
    const query = addressText.trim();

    if (
      query.length < MIN_ADDRESS_SEARCH_LENGTH ||
      (selectedAddressText && query === selectedAddressText)
    ) {
      setAddressPredictions([]);
      setAddressSearchLoading(false);
      return;
    }

    let isCancelled = false;

    const timer = window.setTimeout(async () => {
      try {
        setAddressSearchLoading(true);
        setAddressError("");

        await loadGoogleMapsScript();

        if (!autocompleteSessionTokenRef.current) {
          createAutocompleteSession();
        }

        const googleObject = (window as any).google;
        const service = new googleObject.maps.places.AutocompleteService();

        service.getPlacePredictions(
          {
            input: query,
            types: ["address"],
            sessionToken: autocompleteSessionTokenRef.current || undefined,
          },
          (
            predictions: PlacePrediction[] | null,
            status: google.maps.places.PlacesServiceStatus
          ) => {
            if (isCancelled) return;

            if (
              status === googleObject.maps.places.PlacesServiceStatus.OK &&
              predictions
            ) {
              setAddressPredictions(predictions);
            } else {
              setAddressPredictions([]);
            }

            setAddressSearchLoading(false);
          }
        );
      } catch (err: any) {
        if (isCancelled) return;

        console.error(err);
        setAddressPredictions([]);
        setAddressSearchLoading(false);
        setAddressError(
          err?.message ||
            "Google address search is not available. Check your Maps API key."
        );
      }
    }, 300);

    return () => {
      isCancelled = true;
      window.clearTimeout(timer);
    };
  }, [addressText, selectedAddressText]);

  const restaurantCoords = useMemo(() => {
    return (
      getLatLng(restaurant?.address) ||
      getLatLng(restaurant?.location) ||
      getLatLng(restaurant)
    );
  }, [restaurant]);

  const deliveryFeeBreakdown = useMemo(() => {
    if (!restaurantCoords || !gpsLocation) return null;

    const distanceKm = calculateStraightDistanceKm(restaurantCoords, gpsLocation);
    return calculateDeliveryFee(distanceKm);
  }, [restaurantCoords, gpsLocation]);

  const deliveryFee = deliveryFeeBreakdown?.finalFee ?? DELIVERY_RULES.baseFee;

  const grandTotal = useMemo(() => {
    return Math.max(0, total + platformFee + deliveryFee - discount);
  }, [total, platformFee, deliveryFee, discount]);

  const handleAddressFocus = async () => {
    setIsAddressInputFocused(true);

    try {
      await loadGoogleMapsScript();

      if (!autocompleteSessionTokenRef.current) {
        createAutocompleteSession();
      }
    } catch (err: any) {
      console.error(err);
      setAddressError(
        err?.message ||
          "Google address search is not available. Check your Maps API key."
      );
    }
  };

  const handleAddressChange = (value: string) => {
    setAddressText(value);
    setSelectedAddressText("");
    setSelectedPlaceId("");
    setGpsLocation(null);
    setAddressError("");
  };

  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    try {
      setAddressSearchLoading(true);
      setAddressError("");

      await loadGoogleMapsScript();

      const googleObject = (window as any).google;
      const service = new googleObject.maps.places.PlacesService(
        document.createElement("div")
      );

      const place = await new Promise<google.maps.places.PlaceResult>(
        (resolve, reject) => {
          service.getDetails(
            {
              placeId: prediction.place_id,
              fields: [
                "place_id",
                "formatted_address",
                "geometry",
                "name",
                "address_components",
              ],
              sessionToken: autocompleteSessionTokenRef.current || undefined,
            },
            (
              result: google.maps.places.PlaceResult | null,
              status: google.maps.places.PlacesServiceStatus
            ) => {
              if (
                status === googleObject.maps.places.PlacesServiceStatus.OK &&
                result
              ) {
                resolve(result);
                return;
              }

              reject(new Error("Could not read this address. Try another one."));
            }
          );
        }
      );

      const location = place.geometry?.location;

      if (!location) {
        throw new Error("This address has no GPS location. Try another address.");
      }

      const formattedAddress =
        place.formatted_address || prediction.description || addressText;

      setAddressText(formattedAddress);
      setSelectedAddressText(formattedAddress);
      setSelectedPlaceId(place.place_id || prediction.place_id);
      setGpsLocation({
        lat: location.lat(),
        lng: location.lng(),
      });
      setAddressPredictions([]);
      setIsAddressInputFocused(false);

      createAutocompleteSession();
    } catch (err: any) {
      console.error(err);
      setAddressError(err?.message || "Could not select address.");
    } finally {
      setAddressSearchLoading(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    setGpsLoading(true);
    setAddressError("");

    try {
      const gps = await getCurrentGPS();
      const detectedAddress = await reverseGeocode(gps.lat, gps.lng);

      setGpsLocation(gps);
      setAddressLabel("Current Location");
      setAddressText(detectedAddress);
      setSelectedAddressText(detectedAddress);
      setSelectedPlaceId("");
      setAddressPredictions([]);

      alert("Current location saved for this order.");
    } catch (err) {
      console.error(err);
      alert("Please allow location access to save accurate delivery GPS.");
    } finally {
      setGpsLoading(false);
    }
  };

  const applyPromo = async () => {
    if (!promoCode.trim()) {
      setPromoError("Please enter a promo code.");
      return;
    }

    if (!restaurantId) {
      setPromoError("Your cart is empty.");
      return;
    }

    setPromoLoading(true);
    setPromoError("");

    try {
      const data = await apiRequest("/api/promos/validate", {
        method: "POST",
        token: user?.token,
        body: JSON.stringify({
          code: promoCode,
          orderAmount: total,
          restaurantId,
        }),
      });

      setAppliedPromo(data);
    } catch (err: any) {
      console.error(err);
      setAppliedPromo(null);
      setPromoError(err?.message || "Invalid promo code.");
    } finally {
      setPromoLoading(false);
    }
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromoCode("");
    setPromoError("");
  };

  const handlePlaceOrder = async () => {
    if (!user) return navigate("/login?redirect=/checkout");

    if (items.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    if (!restaurantId) {
      alert("Restaurant is missing from cart.");
      return;
    }

    if (!addressText.trim()) {
      alert("Please search and select your delivery address.");
      return;
    }

    setIsSubmitting(true);

    try {
      let finalGPS = gpsLocation;
      let finalAddressText = addressText.trim();

      if (!finalGPS) {
        try {
          const geocoded = await geocodeTypedAddress(finalAddressText);
          finalGPS = geocoded.location;
          finalAddressText = geocoded.formattedAddress;

          setGpsLocation(finalGPS);
          setAddressText(finalAddressText);
          setSelectedAddressText(finalAddressText);
        } catch (gpsErr) {
          console.error(gpsErr);
          alert(
            "Please select a real delivery address from the dropdown so FoodPal can save the exact map location."
          );
          setIsSubmitting(false);
          return;
        }
      }

      const finalDeliveryBreakdown =
        restaurantCoords && finalGPS
          ? calculateDeliveryFee(
              calculateStraightDistanceKm(restaurantCoords, finalGPS)
            )
          : null;

      const finalDeliveryFee =
        finalDeliveryBreakdown?.finalFee ?? DELIVERY_RULES.baseFee;

      const finalGrandTotal = Math.max(
        0,
        total + platformFee + finalDeliveryFee - discount
      );

      const data = await apiRequest("/api/orders", {
        method: "POST",
        token: user.token,
        body: JSON.stringify({
          items: items.map((i) => ({
            item: i.id,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
          })),
          restaurant: restaurantId,
          subtotal: total,
          deliveryFee: finalDeliveryFee,
          deliveryDistanceKm: finalDeliveryBreakdown?.distanceKm ?? null,
          deliveryFeeBreakdown: finalDeliveryBreakdown,
          platformFee,
          discountAmount: discount,
          promoCode: appliedPromo?.code || "",
          totalAmount: finalGrandTotal,
          deliveryAddress: {
            label: addressLabel || "Home",
            text: finalAddressText,
            lat: finalGPS?.lat ?? null,
            lng: finalGPS?.lng ?? null,
            instructions: deliveryInstructions.trim(),
            placeId: selectedPlaceId,
          },
          customerNote: deliveryInstructions.trim(),
          paymentMethod,
        }),
      });

      const orderId = data._id || data.id;

      if (!orderId) {
        throw new Error("Order created but order ID was not returned.");
      }

      if (paymentMethod === "STRIPE") {
        clearCart();
        await redirectToStripeCheckout(orderId, user.token);
        return;
      }

      if (paymentMethod === "ESEWA") {
        clearCart();
        await submitEsewaPayment(orderId, user.token);
        return;
      }

      if (paymentMethod === "KHALTI") {
        clearCart();
        await startKhaltiPayment(orderId, user.token);
        return;
      }

      setPlacedOrderId(orderId);
      clearCart();

      setTimeout(() => navigate(`/order/${orderId}/track`), 2000);
    } catch (err) {
      console.error(err);
      alert("Could not place order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (placedOrderId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white flex-col">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-500 mx-auto mb-6">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tighter mb-4">
            Order Placed!
          </h2>
          <p className="text-gray-500">Connecting you to tracking...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-black text-gray-900 mb-12 tracking-tighter">
          Checkout
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white rounded-[40px] p-10 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-500">
                  <MapPin size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                    Delivery Address
                  </h3>
                  <p className="text-sm text-gray-500 font-bold mt-1">
                    Search and select a real address from Google suggestions.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <input
                  value={addressLabel}
                  onChange={(e) => setAddressLabel(e.target.value)}
                  placeholder="Label e.g. Home, Work"
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-orange-500 font-bold"
                />

                <div className="relative">
                  <div className="relative">
                    <Search
                      size={20}
                      className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      value={addressText}
                      onFocus={handleAddressFocus}
                      onBlur={() => {
                        window.setTimeout(
                          () => setIsAddressInputFocused(false),
                          200
                        );
                      }}
                      onChange={(e) => handleAddressChange(e.target.value)}
                      placeholder="Start typing address, postcode, or street..."
                      className={`w-full pl-14 pr-12 py-5 bg-gray-50 border rounded-2xl outline-none font-bold text-gray-900 placeholder:text-gray-400 ${
                        gpsLocation
                          ? "border-green-300 focus:border-green-500"
                          : "border-gray-200 focus:border-orange-500"
                      }`}
                    />

                    {addressSearchLoading ? (
                      <Loader2
                        size={20}
                        className="absolute right-5 top-1/2 -translate-y-1/2 animate-spin text-orange-500"
                      />
                    ) : gpsLocation ? (
                      <Check
                        size={20}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-green-500"
                      />
                    ) : null}
                  </div>

                  {isAddressInputFocused &&
                    addressPredictions.length > 0 &&
                    !gpsLocation && (
                      <div className="absolute z-50 mt-3 w-full bg-white border border-gray-100 rounded-[28px] shadow-2xl shadow-gray-200 overflow-hidden">
                        {addressPredictions.map((prediction) => (
                          <button
                            key={prediction.place_id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelectPrediction(prediction)}
                            className="w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-orange-50 transition-colors border-b border-gray-50 last:border-b-0"
                          >
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 shrink-0">
                              <MapPin size={18} />
                            </div>
                            <div>
                              <p className="font-black text-gray-900">
                                {prediction.structured_formatting?.main_text ||
                                  prediction.description}
                              </p>
                              <p className="text-sm text-gray-500 font-medium mt-1">
                                {prediction.structured_formatting?.secondary_text ||
                                  prediction.description}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                </div>

                {addressError && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="text-red-500 mt-0.5" size={18} />
                    <p className="text-sm font-bold text-red-600">{addressError}</p>
                  </div>
                )}

                {addressText.trim().length >= MIN_ADDRESS_SEARCH_LENGTH &&
                  !gpsLocation &&
                  !addressSearchLoading &&
                  !addressError && (
                    <p className="text-xs font-bold text-orange-600 bg-orange-50 border border-orange-100 rounded-2xl p-4">
                      Select one address from the dropdown. This saves exact GPS
                      coordinates for the customer map and rider delivery route.
                    </p>
                  )}

                <textarea
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  placeholder="Delivery instructions e.g. flat number, gate code, call when outside"
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-orange-500 font-bold min-h-[95px]"
                />

                <button
                  onClick={handleUseCurrentLocation}
                  disabled={gpsLoading}
                  className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black uppercase text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-orange-600 transition-colors"
                >
                  {gpsLoading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <LocateFixed size={18} />
                  )}
                  {gpsLoading ? "Finding location..." : "Use my current GPS location"}
                </button>

                {gpsLocation && (
                  <div className="p-5 bg-green-50 border border-green-100 rounded-3xl">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                        <Navigation size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-green-700 uppercase tracking-widest">
                          Exact map location saved
                        </p>
                        <p className="text-sm font-bold text-gray-700 mt-2">
                          {gpsLocation.lat.toFixed(5)}, {gpsLocation.lng.toFixed(5)}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">{addressText}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="bg-white rounded-[40px] p-10 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-500">
                  <Truck size={24} />
                </div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                  Delivery Fee
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 bg-gray-50 rounded-3xl">
                  <Route className="text-orange-500 mb-3" size={24} />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Distance
                  </p>
                  <p className="text-2xl font-black text-gray-900">
                    {deliveryFeeBreakdown
                      ? `${deliveryFeeBreakdown.distanceKm} km`
                      : gpsLocation
                      ? "Calculating"
                      : "Add address"}
                  </p>
                </div>

                <div className="p-5 bg-orange-50 rounded-3xl">
                  <Truck className="text-orange-500 mb-3" size={24} />
                  <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">
                    Final Fee
                  </p>
                  <p className="text-2xl font-black text-gray-900">
                    Rs. {deliveryFee}
                  </p>
                </div>
              </div>

              <div className="mt-5 p-5 bg-gray-900 text-white rounded-3xl">
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">
                  Transparent pricing rule
                </p>
                <div className="space-y-2 text-sm font-bold">
                  <div className="flex justify-between">
                    <span>Base fee</span>
                    <span>Rs. {DELIVERY_RULES.baseFee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>First {DELIVERY_RULES.freeKm} km</span>
                    <span>Included</span>
                  </div>
                  <div className="flex justify-between">
                    <span>After {DELIVERY_RULES.freeKm} km</span>
                    <span>Rs. {DELIVERY_RULES.perKmFee}/km</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Maximum delivery fee</span>
                    <span>Rs. {DELIVERY_RULES.maximumFee}</span>
                  </div>
                </div>
              </div>

              {restaurantLoading && (
                <p className="text-sm text-gray-400 font-bold mt-4">
                  Loading restaurant location...
                </p>
              )}

              {!restaurantLoading && !restaurantCoords && restaurantId && (
                <p className="text-sm text-red-500 font-bold mt-4">
                  Restaurant GPS is missing. Delivery fee uses base fee only.
                </p>
              )}
            </section>

            <section className="bg-white rounded-[40px] p-10 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-500">
                  <CreditCard size={24} />
                </div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                  Payment Method
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { id: "CASH", label: "Cash", icon: <Banknote size={20} /> },
                  {
                    id: "STRIPE",
                    label: "Card / Stripe",
                    icon: <CreditCard size={20} />,
                  },
                  {
                    id: "ESEWA",
                    label: "eSewa",
                    icon: (
                      <div className="w-5 h-5 bg-green-500 rounded flex items-center justify-center text-[10px] font-bold text-white">
                        e
                      </div>
                    ),
                  },
                  {
                    id: "KHALTI",
                    label: "Khalti",
                    icon: (
                      <div className="w-5 h-5 bg-purple-600 rounded flex items-center justify-center text-[10px] font-bold text-white">
                        k
                      </div>
                    ),
                  },
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id as any)}
                    className={`flex items-center justify-center gap-3 p-5 rounded-2xl border-2 transition-all font-bold text-sm ${
                      paymentMethod === method.id
                        ? "border-orange-500 bg-orange-50 text-orange-600"
                        : "border-gray-100 text-gray-400"
                    }`}
                  >
                    {method.icon}
                    {method.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-[40px] p-10 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-500">
                  <Tag size={24} />
                </div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                  Promo Code
                </h3>
              </div>

              {appliedPromo ? (
                <div className="p-5 bg-green-50 border border-green-100 rounded-3xl flex items-center justify-between">
                  <div>
                    <p className="font-black text-green-700">{appliedPromo.code}</p>
                    <p className="text-sm text-green-600">
                      Discount applied: Rs. {appliedPromo.discount}
                    </p>
                  </div>

                  <button
                    onClick={removePromo}
                    className="p-2 bg-white rounded-xl text-red-500"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <input
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Enter code e.g. FOODPAL50"
                    className="flex-1 px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-orange-500 font-bold"
                  />

                  <button
                    onClick={applyPromo}
                    disabled={promoLoading}
                    className="px-6 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs disabled:opacity-50"
                  >
                    {promoLoading ? "Checking" : "Apply"}
                  </button>
                </div>
              )}

              {promoError && (
                <p className="text-sm font-bold text-red-500 mt-3">{promoError}</p>
              )}
            </section>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-gray-900 text-white rounded-[40px] p-10 sticky top-28 shadow-xl shadow-gray-200">
              <h3 className="text-xl font-bold mb-8">Final Total</h3>

              <div className="space-y-4 mb-10">
                <div className="flex justify-between text-sm opacity-60">
                  <span>Product Total</span>
                  <span>Rs. {total}</span>
                </div>

                <div className="flex justify-between text-sm opacity-60">
                  <span>Delivery Fee</span>
                  <span>Rs. {deliveryFee}</span>
                </div>

                {deliveryFeeBreakdown && (
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Distance</span>
                    <span>{deliveryFeeBreakdown.distanceKm} km</span>
                  </div>
                )}

                <div className="flex justify-between text-sm opacity-60">
                  <span>Platform Fee</span>
                  <span>Rs. {platformFee}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-400 font-bold">
                    <span>Promo Discount</span>
                    <span>- Rs. {discount}</span>
                  </div>
                )}

                <div className="h-px bg-white/10" />

                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">Grand Total</span>
                  <span className="text-2xl font-black text-orange-500">
                    Rs. {grandTotal}
                  </span>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={isSubmitting || items.length === 0}
                className="w-full py-5 bg-orange-500 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-orange-600 transition-all shadow-lg shadow-orange-900/50 active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    {paymentMethod === "CASH" ? "Confirm Order" : "Confirm & Pay"}
                    <ChevronRight />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
