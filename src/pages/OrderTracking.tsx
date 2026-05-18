import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSocket, joinOrderRoom, leaveOrderRoom } from "../lib/socket";
import { apiRequest } from "../lib/api";
import { motion } from "motion/react";
import {
  Bike,
  Phone,
  Store,
  Home,
  Clock,
  Navigation,
  Route,
  Timer,
  ArrowLeft,
  RefreshCw,
  MapPin,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { OrderTimeline } from "../components/OrderTimeline";

type LatLng = {
  lat: number;
  lng: number;
};

type RouteInfo = {
  distanceText: string;
  durationText: string;
  durationMinutes: number;
};

const isValidCoordinate = (lat: any, lng: any) => {
  const nLat = Number(lat);
  const nLng = Number(lng);

  if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) return false;
  if (nLat === 0 && nLng === 0) return false;

  return nLat >= -90 && nLat <= 90 && nLng >= -180 && nLng <= 180;
};

const getLatLng = (source: any): LatLng | null => {
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

const toRad = (value: number) => (value * Math.PI) / 180;

const distanceKm = (from: LatLng, to: LatLng) => {
  const earthRadiusKm = 6371;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) *
      Math.cos(toRad(to.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const makeGoogleMapUrl = (coords: LatLng | null, text?: string) => {
  if (coords) {
    return `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
  }

  if (text) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      text
    )}`;
  }

  return "https://www.google.com/maps";
};

const loadGoogleMapsScript = () => {
  return new Promise<void>((resolve, reject) => {
    const existingGoogle = (window as any).google;

    if (existingGoogle?.maps) {
      resolve();
      return;
    }

    const existingScript = document.getElementById("google-maps-script");

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", reject, { once: true });
      return;
    }

    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!key) {
      reject(new Error("Missing VITE_GOOGLE_MAPS_API_KEY"));
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = reject;

    document.head.appendChild(script);
  });
};

const animateMarkerTo = (
  marker: any,
  from: LatLng,
  to: LatLng,
  duration = 1200
) => {
  const start = performance.now();

  const step = (now: number) => {
    const progress = Math.min((now - start) / duration, 1);
    const lat = from.lat + (to.lat - from.lat) * progress;
    const lng = from.lng + (to.lng - from.lng) * progress;

    marker.setPosition({ lat, lng });

    if (progress < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
};

const calculateFallbackEta = (order: any, routeMinutes?: number | null) => {
  const status = order?.status;
  const prepTime = Number(
    order?.restaurant?.averagePrepTime ||
      order?.restaurant?.preparationTime ||
      order?.preparationTime ||
      20
  );

  const busyExtra = order?.restaurant?.isBusy
    ? Number(order?.restaurant?.busyPrepTimeExtra || 10)
    : 0;

  const pickupBuffer = Number(order?.restaurant?.pickupBufferMinutes || 5);
  const deliveryDistance = Number(order?.deliveryDistanceKm || 0);
  const speedKmph = Number(order?.restaurant?.deliverySpeedKmph || 22);

  const deliveryMinutes =
    routeMinutes && routeMinutes > 0
      ? routeMinutes
      : deliveryDistance > 0
      ? Math.ceil((deliveryDistance / speedKmph) * 60)
      : 15;

  if (["PENDING", "ACCEPTED", "PREPARING"].includes(status)) {
    return Math.max(10, prepTime + busyExtra + pickupBuffer + deliveryMinutes);
  }

  if (status === "READY_FOR_PICKUP") {
    return Math.max(8, pickupBuffer + deliveryMinutes);
  }

  if (status === "PICKED_UP" || status === "ON_THE_WAY") {
    return Math.max(3, deliveryMinutes);
  }

  if (status === "DELIVERED") return 0;

  return Number(order?.estimatedTime || 30);
};

const formatEtaText = (minutes: number) => {
  if (minutes <= 0) return "Delivered";
  if (minutes <= 1) return "Arriving now";
  return `${Math.ceil(minutes)} min`;
};

const LiveOrderMap = ({
  restaurantCoords,
  deliveryCoords,
  riderCoords,
  onRouteInfo,
}: {
  restaurantCoords: LatLng | null;
  deliveryCoords: LatLng | null;
  riderCoords: LatLng | null;
  onRouteInfo: (info: RouteInfo | null) => void;
}) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const googleMapRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);

  const restaurantMarkerRef = useRef<any>(null);
  const deliveryMarkerRef = useRef<any>(null);
  const riderMarkerRef = useRef<any>(null);
  const previousRiderCoordsRef = useRef<LatLng | null>(null);

  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current) return;

      try {
        await loadGoogleMapsScript();

        const google = (window as any).google;

        const center =
          riderCoords || restaurantCoords || deliveryCoords || {
            lat: 51.5074,
            lng: -0.1278,
          };

        if (!googleMapRef.current) {
          googleMapRef.current = new google.maps.Map(mapRef.current, {
            center,
            zoom: 15,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            zoomControl: true,
          });

          directionsRendererRef.current = new google.maps.DirectionsRenderer({
            map: googleMapRef.current,
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: "#f97316",
              strokeOpacity: 1,
              strokeWeight: 6,
            },
          });
        }

        const bounds = new google.maps.LatLngBounds();

        if (restaurantCoords) {
          if (!restaurantMarkerRef.current) {
            restaurantMarkerRef.current = new google.maps.Marker({
              position: restaurantCoords,
              map: googleMapRef.current,
              label: "R",
              title: "Restaurant",
            });
          } else {
            restaurantMarkerRef.current.setPosition(restaurantCoords);
          }

          bounds.extend(restaurantCoords);
        }

        if (deliveryCoords) {
          if (!deliveryMarkerRef.current) {
            deliveryMarkerRef.current = new google.maps.Marker({
              position: deliveryCoords,
              map: googleMapRef.current,
              label: "D",
              title: "Delivery Address",
            });
          } else {
            deliveryMarkerRef.current.setPosition(deliveryCoords);
          }

          bounds.extend(deliveryCoords);
        }

        if (riderCoords) {
          if (!riderMarkerRef.current) {
            riderMarkerRef.current = new google.maps.Marker({
              position: riderCoords,
              map: googleMapRef.current,
              label: "🛵",
              title: "Rider",
            });

            previousRiderCoordsRef.current = riderCoords;
          } else {
            const previous = previousRiderCoordsRef.current;

            if (previous) {
              animateMarkerTo(riderMarkerRef.current, previous, riderCoords);
            } else {
              riderMarkerRef.current.setPosition(riderCoords);
            }

            previousRiderCoordsRef.current = riderCoords;
          }

          bounds.extend(riderCoords);
        }

        if (!bounds.isEmpty()) {
          googleMapRef.current.fitBounds(bounds);
        }

        const origin = riderCoords || restaurantCoords;
        const destination = deliveryCoords;

        if (origin && destination) {
          const directionsService = new google.maps.DirectionsService();

          directionsService.route(
            {
              origin,
              destination,
              travelMode: google.maps.TravelMode.DRIVING,
            },
            (result: any, status: any) => {
              if (status === "OK" && result?.routes?.[0]) {
                directionsRendererRef.current?.setDirections(result);

                const leg = result.routes[0].legs?.[0];

                onRouteInfo({
                  distanceText: leg?.distance?.text || "",
                  durationText: leg?.duration?.text || "",
                  durationMinutes: Math.ceil(
                    Number(leg?.duration?.value || 0) / 60
                  ),
                });
              } else {
                onRouteInfo(null);
              }
            }
          );
        }
      } catch (error) {
        console.error("Map failed:", error);
        onRouteInfo(null);
      }
    };

    initMap();
  }, [restaurantCoords, deliveryCoords, riderCoords, onRouteInfo]);

  return (
    <div className="w-full h-[420px] rounded-[32px] overflow-hidden bg-gray-200">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
};

export const OrderTracking: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [liveRiderCoords, setLiveRiderCoords] = useState<LatLng | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrder = async (silent = false) => {
    if (!id) return;

    try {
      silent ? setRefreshing(true) : setLoading(true);

      const data = await apiRequest(`/api/orders/${id}`, {
        token: user?.token,
      });

      setOrder(data);

      const existingRiderCoords = getLatLng(data?.riderLocation);
      if (existingRiderCoords) {
        setLiveRiderCoords(existingRiderCoords);
      }

      setLastUpdated(new Date().toISOString());
    } catch (error) {
      console.error(error);
      alert("Could not load order tracking.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const socket = getSocket();

    joinOrderRoom(id);

    const handleOrderUpdate = (updatedOrder: any) => {
      if (!updatedOrder) return;

      const updatedId = updatedOrder._id || updatedOrder.orderId;
      if (String(updatedId) !== String(id)) return;

      setOrder((prev: any) => ({
        ...prev,
        ...updatedOrder,
      }));

      const riderCoords = getLatLng(updatedOrder?.riderLocation);
      if (riderCoords) {
        setLiveRiderCoords(riderCoords);
      }

      setLastUpdated(new Date().toISOString());
    };

    const handleRiderLocation = (payload: any) => {
      if (!payload || String(payload.orderId) !== String(id)) return;

      if (isValidCoordinate(payload.lat, payload.lng)) {
        setLiveRiderCoords({
          lat: Number(payload.lat),
          lng: Number(payload.lng),
        });

        setOrder((prev: any) =>
          prev
            ? {
                ...prev,
                riderLocation: {
                  lat: Number(payload.lat),
                  lng: Number(payload.lng),
                  accuracy: payload.accuracy ?? null,
                  heading: payload.heading ?? null,
                  speed: payload.speed ?? null,
                  updatedAt: payload.updatedAt || new Date().toISOString(),
                },
              }
            : prev
        );

        setLastUpdated(new Date().toISOString());
      }
    };

    socket.on("order:status_update", handleOrderUpdate);
    socket.on("order:updated", handleOrderUpdate);
    socket.on("order:assigned", handleOrderUpdate);
    socket.on("rider:location_update", handleRiderLocation);

    return () => {
      socket.off("order:status_update", handleOrderUpdate);
      socket.off("order:updated", handleOrderUpdate);
      socket.off("order:assigned", handleOrderUpdate);
      socket.off("rider:location_update", handleRiderLocation);
      leaveOrderRoom(id);
    };
  }, [id]);

  const restaurantCoords = useMemo(() => {
    return (
      getLatLng(order?.restaurantAddress) ||
      getLatLng(order?.restaurant?.address) ||
      getLatLng(order?.restaurant?.location)
    );
  }, [order]);

  const deliveryCoords = useMemo(() => {
    return getLatLng(order?.deliveryAddress);
  }, [order]);

  const riderCoords = useMemo(() => {
    return liveRiderCoords || getLatLng(order?.riderLocation);
  }, [liveRiderCoords, order]);

  const fallbackDistanceKm = useMemo(() => {
    if (riderCoords && deliveryCoords) {
      return distanceKm(riderCoords, deliveryCoords);
    }

    if (restaurantCoords && deliveryCoords) {
      return distanceKm(restaurantCoords, deliveryCoords);
    }

    return Number(order?.deliveryDistanceKm || 0);
  }, [riderCoords, restaurantCoords, deliveryCoords, order]);

  const etaMinutes = useMemo(() => {
    return calculateFallbackEta(order, routeInfo?.durationMinutes);
  }, [order, routeInfo]);

  const statusTitle = useMemo(() => {
    const status = order?.status;

    if (status === "PENDING") return "Waiting for restaurant";
    if (status === "ACCEPTED") return "Restaurant accepted your order";
    if (status === "PREPARING") return "Food is being prepared";
    if (status === "READY_FOR_PICKUP") return "Looking for / waiting rider";
    if (status === "PICKED_UP") return "Rider picked up your order";
    if (status === "ON_THE_WAY") return "Rider is on the way";
    if (status === "DELIVERED") return "Order delivered";
    if (status === "CANCELLED") return "Order cancelled";

    return "Tracking your order";
  }, [order]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-black text-gray-900">
        Loading order tracking...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-3xl font-black">Order not found</h1>
        <button
          onClick={() => navigate("/orders")}
          className="mt-6 px-8 py-4 rounded-2xl bg-orange-500 text-white font-black"
        >
          Back to orders
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-gray-600 font-black hover:text-orange-500"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.8fr] gap-8">
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[36px] p-6 shadow-sm border border-gray-100"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-orange-500">
                    Order #{order._id?.slice(-6).toUpperCase()}
                  </p>
                  <h1 className="text-3xl font-black mt-2">{statusTitle}</h1>
                  <p className="text-gray-500 font-bold mt-1">
                    {order.restaurant?.name || "Restaurant"}
                  </p>
                </div>

                <button
                  onClick={() => fetchOrder(true)}
                  disabled={refreshing}
                  className="px-5 py-3 rounded-2xl bg-gray-100 font-black flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <RefreshCw
                    size={18}
                    className={refreshing ? "animate-spin" : ""}
                  />
                  Refresh
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-orange-50 rounded-3xl p-5">
                  <Timer className="text-orange-500 mb-3" size={26} />
                  <p className="text-xs font-black uppercase text-orange-500">
                    ETA
                  </p>
                  <p className="text-3xl font-black mt-1">
                    {formatEtaText(etaMinutes)}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-3xl p-5">
                  <Route className="text-gray-500 mb-3" size={26} />
                  <p className="text-xs font-black uppercase text-gray-500">
                    Distance
                  </p>
                  <p className="text-2xl font-black mt-1">
                    {routeInfo?.distanceText ||
                      `${fallbackDistanceKm.toFixed(1)} km`}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-3xl p-5">
                  <Clock className="text-gray-500 mb-3" size={26} />
                  <p className="text-xs font-black uppercase text-gray-500">
                    Status
                  </p>
                  <p className="text-xl font-black mt-1">
                    {String(order.status).replaceAll("_", " ")}
                  </p>
                </div>
              </div>
            </motion.div>

            <LiveOrderMap
              restaurantCoords={restaurantCoords}
              deliveryCoords={deliveryCoords}
              riderCoords={riderCoords}
              onRouteInfo={setRouteInfo}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href={makeGoogleMapUrl(
                  restaurantCoords,
                  order.restaurantAddress?.text || order.restaurant?.address?.text
                )}
                target="_blank"
                rel="noreferrer"
                className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm"
              >
                <Store className="text-orange-500 mb-3" size={24} />
                <p className="font-black">Restaurant</p>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                  {order.restaurantAddress?.text ||
                    order.restaurant?.address?.text ||
                    "Open restaurant map"}
                </p>
              </a>

              <a
                href={makeGoogleMapUrl(deliveryCoords, order.deliveryAddress?.text)}
                target="_blank"
                rel="noreferrer"
                className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm"
              >
                <Home className="text-green-500 mb-3" size={24} />
                <p className="font-black">Delivery</p>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                  {order.deliveryAddress?.text || "Open delivery map"}
                </p>
              </a>

              <a
                href={makeGoogleMapUrl(riderCoords)}
                target="_blank"
                rel="noreferrer"
                className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm"
              >
                <Bike className="text-blue-500 mb-3" size={24} />
                <p className="font-black">Rider</p>
                <p className="text-sm text-gray-500 mt-1">
                  {riderCoords
                    ? "Live location available"
                    : "Waiting for rider location"}
                </p>
              </a>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-[36px] p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-black mb-5">Delivery progress</h2>
              <OrderTimeline
                status={order.status}
                trackingEvents={order.trackingEvents || []}
              />
            </div>

            <div className="bg-white rounded-[36px] p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-black mb-5">Rider details</h2>

              {order.rider ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center">
                      <Bike className="text-orange-500" size={26} />
                    </div>
                    <div>
                      <p className="font-black">
                        {order.rider?.name ||
                          order.riderProfile?.userId?.name ||
                          "Assigned rider"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {order.riderProfile?.vehicleType || "Delivery rider"}
                      </p>
                    </div>
                  </div>

                  {(order.rider?.phone || order.riderProfile?.userId?.phone) && (
                    <a
                      href={`tel:${
                        order.rider?.phone || order.riderProfile?.userId?.phone
                      }`}
                      className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black flex items-center justify-center gap-2"
                    >
                      <Phone size={18} />
                      Call rider
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 font-bold">
                  Rider has not been assigned yet.
                </p>
              )}
            </div>

            <div className="bg-white rounded-[36px] p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-black mb-5">Order summary</h2>

              <div className="space-y-3">
                {(order.items || []).map((item: any, index: number) => (
                  <div key={index} className="flex justify-between gap-4">
                    <p className="font-bold text-gray-700">
                      {item.quantity} × {item.name}
                    </p>
                    <p className="font-black">Rs. {item.price}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 mt-5 pt-5 space-y-2">
                <div className="flex justify-between text-sm font-bold text-gray-500">
                  <span>Subtotal</span>
                  <span>Rs. {order.subtotal || 0}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-gray-500">
                  <span>Delivery fee</span>
                  <span>Rs. {order.deliveryFee || 0}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-gray-500">
                  <span>Platform fee</span>
                  <span>Rs. {order.platformFee || 0}</span>
                </div>
                {Number(order.surgeFee || 0) > 0 && (
                  <div className="flex justify-between text-sm font-bold text-orange-500">
                    <span>Surge fee</span>
                    <span>Rs. {order.surgeFee}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-black pt-3">
                  <span>Total</span>
                  <span>Rs. {order.totalAmount || 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 text-white rounded-[36px] p-6">
              <div className="flex items-center gap-3 mb-3">
                <MapPin className="text-orange-400" size={22} />
                <p className="font-black">Live tracking</p>
              </div>
              <p className="text-sm text-gray-400 font-bold">
                {lastUpdated
                  ? `Last updated ${new Date(lastUpdated).toLocaleTimeString()}`
                  : "Waiting for live updates"}
              </p>
              <p className="text-xs text-gray-500 mt-3">
                Keep this page open to see the rider moving in real time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;