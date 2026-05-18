import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bike,
  Package,
  CheckCircle,
  Navigation,
  DollarSign,
  Clock,
  LogOut,
  RefreshCw,
  Radio,
  X,
  MapPin,
  Send,
  Wifi,
  WifiOff,
  AlertCircle,
  MessageCircle,
  Phone,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { apiRequest } from "../lib/api";
import { getSocket } from "../lib/socket";
import {
  getCurrentLocation,
  startLiveLocationTracking,
  stopLiveLocationTracking,
  type LiveLocationCoords,
  type LiveLocationError,
} from "../lib/location";

type OrderStatus =
  | "PENDING"
  | "ACCEPTED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "PICKED_UP"
  | "ON_THE_WAY"
  | "DELIVERED"
  | "CANCELLED"
  | "REJECTED"
  | "REFUNDED";

type LastSentLocation = {
  target: string;
  lat: number;
  lng: number;
  sentAt: number;
};

type ChatMessage = {
  _id?: string;
  order?: string;
  orderId?: string;
  sender?: any;
  senderName: string;
  senderRole: string;
  message: string;
  messageType?: string;
  createdAt?: string;
};

const ACTIVE_DELIVERY_STATUSES: OrderStatus[] = [
  "READY_FOR_PICKUP",
  "PICKED_UP",
  "ON_THE_WAY",
];

const LIVE_TRACKING_STATUSES: OrderStatus[] = ["PICKED_UP", "ON_THE_WAY"];

const safeJsonArray = (key: string) => {
  try {
    if (typeof window === "undefined") return [];
    const value = localStorage.getItem(key);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const formatStatus = (status?: string) => {
  if (!status) return "UNKNOWN";
  return status.replaceAll("_", " ");
};

const isValidCoordinate = (lat: any, lng: any) => {
  const nLat = Number(lat);
  const nLng = Number(lng);

  if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) return false;
  if (nLat === 0 && nLng === 0) return false;

  return nLat >= -90 && nLat <= 90 && nLng >= -180 && nLng <= 180;
};

const getAddressText = (address: any) => {
  if (!address) return "";
  if (typeof address === "string") return address;
  return address.text || address.label || "";
};

const distanceInMeters = (
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
) => {
  const earthRadius = 6371000;
  const toRadians = (value: number) => (value * Math.PI) / 180;

  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
};

export const RiderDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [isOnline, setIsOnline] = useState(false);
  const [riderInfo, setRiderInfo] = useState<any>(null);
  const [activeTasks, setActiveTasks] = useState<any[]>([]);
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingLocation, setSendingLocation] = useState(false);
  const [liveTrackingOrderId, setLiveTrackingOrderId] = useState<string | null>(
    null
  );
  const [trackingError, setTrackingError] = useState<string>("");
  const [lastLocationAt, setLastLocationAt] = useState<string>("");
  const [lastLocationText, setLastLocationText] = useState<string>("");
  const [rejectedOrderIds, setRejectedOrderIds] = useState<string[]>(() =>
    safeJsonArray("foodpal_rejected_orders")
  );

  const [selectedChatOrder, setSelectedChatOrder] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const deliveryWatchIdRef = useRef<number | null>(null);
  const availabilityWatchIdRef = useRef<number | null>(null);
  const lastSentLocationRef = useRef<LastSentLocation | null>(null);
  const lastAvailabilityLocationRef = useRef<LastSentLocation | null>(null);
  const liveTrackingOrderIdRef = useRef<string | null>(null);

  const riderId = user?.id || (user as any)?._id;

  const visibleAvailableOrders = useMemo(() => {
    if (!isOnline) return [];
    return availableOrders.filter(
      (order) => !rejectedOrderIds.includes(order._id)
    );
  }, [availableOrders, rejectedOrderIds, isOnline]);

  const estimatedEarnings = useMemo(() => activeTasks.length * 50, [activeTasks]);

  const shouldSendLocation = (
    previous: LastSentLocation | null,
    target: string,
    lat: number,
    lng: number,
    minMeters = 8,
    minSeconds = 8
  ) => {
    const now = Date.now();

    if (!previous || previous.target !== target) return true;

    const secondsSinceLastSend = (now - previous.sentAt) / 1000;
    const movedMeters = distanceInMeters(
      { lat: previous.lat, lng: previous.lng },
      { lat, lng }
    );

    return movedMeters >= minMeters || secondsSinceLastSend >= minSeconds;
  };

  const saveRejectedOrders = (ids: string[]) => {
    setRejectedOrderIds(ids);
    localStorage.setItem("foodpal_rejected_orders", JSON.stringify(ids));
  };

  const fetchRiderInfo = async () => {
    try {
      const data = await apiRequest("/api/riders/me", {
        token: user?.token,
      });

      setRiderInfo(data);

      if (typeof data?.isAvailable === "boolean") {
        setIsOnline(data.isAvailable);
      }
    } catch (err) {
      console.error(err);
      setRiderInfo(null);
    }
  };

  const fetchActiveTasks = async () => {
    try {
      const data = await apiRequest("/api/riders/orders", {
        token: user?.token,
      });

      const active = (data || []).filter((order: any) =>
        ACTIVE_DELIVERY_STATUSES.includes(order.status)
      );

      setActiveTasks(active);
    } catch (err) {
      console.error(err);
      setActiveTasks([]);
    }
  };

  const fetchAvailableOrders = async () => {
    try {
      const data = await apiRequest("/api/riders/available-orders", {
        token: user?.token,
      });

      setAvailableOrders(data || []);
    } catch (err) {
      console.error(err);
      setAvailableOrders([]);
    }
  };

  const refreshAll = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    await Promise.allSettled([
      fetchRiderInfo(),
      fetchActiveTasks(),
      fetchAvailableOrders(),
    ]);

    setRefreshing(false);
    setLoading(false);
  };

  const fetchChatMessages = async (orderId: string) => {
    try {
      const data = await apiRequest(`/api/chats/order/${orderId}`, {
        token: user?.token,
      });

      setChatMessages(data.messages || []);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Could not load chat.");
    }
  };

  const openOrderChat = async (order: any) => {
    setSelectedChatOrder(order);
    setChatMessages([]);

    const socket = getSocket();
    socket.emit("chat:join", order._id);

    await fetchChatMessages(order._id);
  };

  const closeOrderChat = () => {
    if (selectedChatOrder?._id) {
      getSocket().emit("chat:leave", selectedChatOrder._id);
    }

    setSelectedChatOrder(null);
    setChatMessages([]);
    setChatInput("");
  };

  const sendChatMessage = async () => {
    if (!selectedChatOrder?._id || !chatInput.trim()) return;

    const text = chatInput.trim();
    setChatInput("");

    try {
      setChatLoading(true);

      await apiRequest(`/api/chats/order/${selectedChatOrder._id}`, {
        method: "POST",
        token: user?.token,
        body: JSON.stringify({
          message: text,
          messageType: "TEXT",
        }),
      });
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Could not send message.");
      setChatInput(text);
    } finally {
      setChatLoading(false);
    }
  };

  const requestCall = async () => {
    if (!selectedChatOrder?._id) return;

    const phone =
      selectedChatOrder.customer?.phone || selectedChatOrder.deliveryAddress?.phone;

    if (phone) {
      window.location.href = `tel:${phone}`;
      return;
    }

    try {
      await apiRequest(`/api/chats/order/${selectedChatOrder._id}/call-request`, {
        method: "POST",
        token: user?.token,
        body: JSON.stringify({ callType: "phone" }),
      });

      alert("Call request sent, but customer phone number is missing.");
    } catch (err: any) {
      alert(err.message || "Could not request call.");
    }
  };

  const sendRiderCurrentLocation = async (
    coords: LiveLocationCoords,
    options?: { force?: boolean }
  ) => {
    const lat = Number(coords.lat);
    const lng = Number(coords.lng);

    if (!isValidCoordinate(lat, lng)) return;

    if (
      !options?.force &&
      !shouldSendLocation(
        lastAvailabilityLocationRef.current,
        "rider-current-location",
        lat,
        lng,
        10,
        10
      )
    ) {
      return;
    }

    await apiRequest("/api/riders/location", {
      method: "PATCH",
      token: user?.token,
      timeout: 8000,
      body: JSON.stringify({
        lat,
        lng,
        accuracy: coords.accuracy,
        heading: coords.heading,
        speed: coords.speed,
      }),
    });

    lastAvailabilityLocationRef.current = {
      target: "rider-current-location",
      lat,
      lng,
      sentAt: Date.now(),
    };

    setLastLocationAt(new Date().toISOString());
    setLastLocationText(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  };

  const stopAvailabilityTracking = () => {
    if (availabilityWatchIdRef.current !== null) {
      stopLiveLocationTracking(availabilityWatchIdRef.current);
      availabilityWatchIdRef.current = null;
    }

    lastAvailabilityLocationRef.current = null;
  };

  const startAvailabilityTracking = () => {
    stopAvailabilityTracking();

    const watchId = startLiveLocationTracking(
      async (coords) => {
        try {
          await sendRiderCurrentLocation(coords);
        } catch (err: any) {
          console.error("Rider availability GPS update failed:", err);
        }
      },
      (error: LiveLocationError) => {
        setTrackingError(error.message);
      }
    );

    if (watchId !== null) {
      availabilityWatchIdRef.current = watchId;
    }
  };

  const stopRealLiveTracking = () => {
    if (deliveryWatchIdRef.current !== null) {
      stopLiveLocationTracking(deliveryWatchIdRef.current);
      deliveryWatchIdRef.current = null;
    }

    liveTrackingOrderIdRef.current = null;
    lastSentLocationRef.current = null;
    setLiveTrackingOrderId(null);
  };

  const sendLocationToOrder = async (
    orderId: string,
    coords: LiveLocationCoords,
    options?: { force?: boolean }
  ) => {
    const lat = Number(coords.lat);
    const lng = Number(coords.lng);

    if (!isValidCoordinate(lat, lng)) {
      throw new Error("Invalid GPS location received.");
    }

    await sendRiderCurrentLocation(coords, { force: options?.force });

    if (
      !options?.force &&
      !shouldSendLocation(lastSentLocationRef.current, orderId, lat, lng, 8, 8)
    ) {
      return;
    }

    const updatedAt = new Date().toISOString();

    await apiRequest("/api/riders/location", {
      method: "PATCH",
      token: user?.token,
      timeout: 8000,
      body: JSON.stringify({
        lat,
        lng,
        accuracy: coords.accuracy,
        heading: coords.heading,
        speed: coords.speed,
      }),
    });

    lastSentLocationRef.current = {
      target: orderId,
      lat,
      lng,
      sentAt: Date.now(),
    };

    setLastLocationAt(updatedAt);
    setLastLocationText(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    setTrackingError("");

    const socket = getSocket();

    socket.emit("rider:location_update", {
      orderId,
      riderId,
      lat,
      lng,
      accuracy: coords.accuracy,
      heading: coords.heading,
      speed: coords.speed,
      updatedAt,
    });
  };

  const startRealLiveTracking = (orderId: string) => {
    if (!orderId) return;

    stopRealLiveTracking();

    setTrackingError("");
    liveTrackingOrderIdRef.current = orderId;

    const watchId = startLiveLocationTracking(
      async (coords) => {
        try {
          await sendLocationToOrder(orderId, coords);
        } catch (err: any) {
          console.error("Live location send failed:", err);
          setTrackingError(err?.message || "Could not send live location.");
        }
      },
      (error: LiveLocationError) => {
        setTrackingError(error.message);
      }
    );

    if (watchId !== null) {
      deliveryWatchIdRef.current = watchId;
      setLiveTrackingOrderId(orderId);
    } else {
      liveTrackingOrderIdRef.current = null;
      setLiveTrackingOrderId(null);
    }
  };

  const sendLiveLocationOnce = async (orderId: string) => {
    setSendingLocation(true);
    setTrackingError("");

    getCurrentLocation(
      async (coords) => {
        try {
          await sendLocationToOrder(orderId, coords, { force: true });
          alert("Location sent to customer.");
        } catch (err: any) {
          console.error(err);
          setTrackingError(err?.message || "Could not send location.");
          alert(err?.message || "Could not send location.");
        } finally {
          setSendingLocation(false);
        }
      },
      (error: LiveLocationError) => {
        setSendingLocation(false);
        setTrackingError(error.message);
        alert(error.message);
      }
    );
  };

  const goOnlineWithGPS = () => {
    setTrackingError("");

    getCurrentLocation(
      async (coords) => {
        try {
          await apiRequest("/api/riders/availability", {
            method: "PATCH",
            token: user?.token,
            body: JSON.stringify({
              isAvailable: true,
              lat: coords.lat,
              lng: coords.lng,
              accuracy: coords.accuracy,
              heading: coords.heading,
              speed: coords.speed,
            }),
          });

          await sendRiderCurrentLocation(coords, { force: true });

          setIsOnline(true);
          startAvailabilityTracking();
          await refreshAll(true);
        } catch (err: any) {
          console.error(err);
          setIsOnline(false);
          alert(err?.message || "Could not go online.");
        }
      },
      (error: LiveLocationError) => {
        setIsOnline(false);
        setTrackingError(error.message);
        alert(error.message);
      }
    );
  };

  const goOffline = async () => {
    try {
      await apiRequest("/api/riders/availability", {
        method: "PATCH",
        token: user?.token,
        body: JSON.stringify({ isAvailable: false }),
      });

      setIsOnline(false);
      stopAvailabilityTracking();
      stopRealLiveTracking();
      await refreshAll(true);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Could not go offline.");
    }
  };

  const toggleOnlineStatus = async () => {
    if (isOnline) await goOffline();
    else goOnlineWithGPS();
  };

  const acceptOrder = async (orderId: string) => {
    try {
      const acceptedOrder = await apiRequest(`/api/riders/orders/${orderId}/accept`, {
        method: "POST",
        token: user?.token,
      });

      saveRejectedOrders(rejectedOrderIds.filter((id) => id !== orderId));
      await refreshAll(true);
      startRealLiveTracking(orderId);

      if (acceptedOrder?._id) {
        getSocket().emit("chat:join", acceptedOrder._id);
      }
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Could not accept this order.");
    }
  };

  const rejectOrder = async (orderId: string) => {
    const next = Array.from(new Set([...rejectedOrderIds, orderId]));
    saveRejectedOrders(next);
    await refreshAll(true);
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await apiRequest(`/api/riders/orders/${orderId}/status`, {
        method: "PATCH",
        token: user?.token,
        body: JSON.stringify({ status }),
      });

      if (LIVE_TRACKING_STATUSES.includes(status)) {
        startRealLiveTracking(orderId);
      }

      if (status === "DELIVERED" && liveTrackingOrderIdRef.current === orderId) {
        stopRealLiveTracking();
        startAvailabilityTracking();
      }

      await refreshAll(true);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Could not update order status.");
    }
  };

  const openMap = (address: any) => {
    if (isValidCoordinate(address?.lat, address?.lng)) {
      window.open(
        `https://www.google.com/maps?q=${address.lat},${address.lng}`,
        "_blank"
      );
      return;
    }

    const query = getAddressText(address);

    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        query
      )}`,
      "_blank"
    );
  };

  const getNextAction = (
    order: any
  ): { label: string; status: OrderStatus } | null => {
    if (order.status === "READY_FOR_PICKUP") {
      return { label: "Pick Up Order", status: "PICKED_UP" };
    }

    if (order.status === "PICKED_UP") {
      return { label: "Start Delivery", status: "ON_THE_WAY" };
    }

    if (order.status === "ON_THE_WAY") {
      return { label: "Mark Delivered", status: "DELIVERED" };
    }

    return null;
  };

  useEffect(() => {
    if (!user || !riderId) return;

    refreshAll();

    const socket = getSocket();

    socket.emit("rider:join", riderId);
    socket.emit("user:join", riderId);

    const refreshHandler = () => refreshAll(true);

    const handleNewChatMessage = (message: ChatMessage) => {
      const orderId = String(message?.order || message?.orderId || "");
      if (!selectedChatOrder?._id || orderId !== String(selectedChatOrder._id)) {
        return;
      }

      setChatMessages((prev) => {
        if (message._id && prev.some((m) => m._id === message._id)) return prev;
        return [...prev, message];
      });
    };

    socket.on("order:assigned", refreshHandler);
    socket.on("order:updated", refreshHandler);
    socket.on("order:new_available", refreshHandler);
    socket.on("notification", refreshHandler);
    socket.on("chat:new_message", handleNewChatMessage);

    const interval = window.setInterval(() => {
      refreshAll(true);
    }, 10000);

    return () => {
      socket.off("order:assigned", refreshHandler);
      socket.off("order:updated", refreshHandler);
      socket.off("order:new_available", refreshHandler);
      socket.off("notification", refreshHandler);
      socket.off("chat:new_message", handleNewChatMessage);
      window.clearInterval(interval);
      stopAvailabilityTracking();
      stopRealLiveTracking();
    };
  }, [user, riderId, selectedChatOrder?._id]);

  useEffect(() => {
    if (isOnline) startAvailabilityTracking();
    else stopAvailabilityTracking();

    return () => stopAvailabilityTracking();
  }, [isOnline]);

  useEffect(() => {
    if (!liveTrackingOrderId) return;

    const stillActive = activeTasks.some(
      (order) =>
        order._id === liveTrackingOrderId &&
        LIVE_TRACKING_STATUSES.includes(order.status)
    );

    if (!stillActive && activeTasks.length > 0) stopRealLiveTracking();
  }, [activeTasks, liveTrackingOrderId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center font-black">
        Loading rider dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black tracking-tight">Rider Portal</h1>
            <p className="text-gray-400 font-bold mt-2">
              Hello,{" "}
              {user?.name ||
                riderInfo?.userId?.name ||
                riderInfo?.name ||
                "Rider"}{" "}
              • FoodPal Delivery
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleOnlineStatus}
              className={`px-8 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 ${
                isOnline ? "bg-green-500 text-white" : "bg-gray-700 text-gray-300"
              }`}
            >
              {isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
              {isOnline ? "Online" : "Go Online"}
            </button>

            <button
              onClick={() => refreshAll(true)}
              className="p-3 rounded-xl bg-white/5 text-gray-400 hover:text-white disabled:opacity-50"
              disabled={refreshing}
              title="Refresh dashboard"
            >
              <RefreshCw
                size={22}
                className={refreshing ? "animate-spin" : ""}
              />
            </button>

            <button
              onClick={() => {
                stopAvailabilityTracking();
                stopRealLiveTracking();
                logout();
                navigate("/");
              }}
              className="p-3 rounded-xl bg-white/5 text-gray-400 hover:text-red-400"
              title="Logout"
            >
              <LogOut size={22} />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-12">
          <div className="bg-gray-900 border border-white/10 rounded-[32px] p-7">
            <DollarSign className="text-green-500 mb-5" size={30} />
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest">
              Estimated Earnings
            </p>
            <p className="text-3xl font-black mt-2">Rs. {estimatedEarnings}</p>
          </div>

          <div className="bg-gray-900 border border-white/10 rounded-[32px] p-7">
            <CheckCircle className="text-orange-500 mb-5" size={30} />
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest">
              Active Tasks
            </p>
            <p className="text-3xl font-black mt-2">{activeTasks.length}</p>
          </div>

          <div className="bg-gray-900 border border-white/10 rounded-[32px] p-7">
            <Package className="text-blue-500 mb-5" size={30} />
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest">
              Available
            </p>
            <p className="text-3xl font-black mt-2">
              {visibleAvailableOrders.length}
            </p>
          </div>

          <div className="bg-gray-900 border border-white/10 rounded-[32px] p-7">
            <Radio
              className={isOnline ? "text-green-500 mb-5" : "text-gray-500 mb-5"}
              size={30}
            />
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest">
              Status
            </p>
            <p className="text-3xl font-black mt-2">
              {isOnline ? "Online" : "Offline"}
            </p>
          </div>

          <div className="bg-gray-900 border border-white/10 rounded-[32px] p-7">
            <Bike
              className={
                liveTrackingOrderId || isOnline
                  ? "text-green-500 mb-5"
                  : "text-gray-500 mb-5"
              }
              size={30}
            />
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest">
              GPS
            </p>
            <p className="text-2xl font-black mt-2">
              {liveTrackingOrderId ? "Delivery" : isOnline ? "Ready" : "Off"}
            </p>
          </div>
        </div>

        {(trackingError || liveTrackingOrderId || isOnline) && (
          <div
            className={`mb-10 rounded-[28px] border p-5 ${
              trackingError
                ? "bg-red-500/10 border-red-500/20 text-red-200"
                : "bg-green-500/10 border-green-500/20 text-green-200"
            }`}
          >
            <div className="flex items-start gap-3">
              {trackingError ? <AlertCircle size={22} /> : <Radio size={22} />}
              <div>
                <p className="font-black text-sm uppercase">
                  {trackingError
                    ? "GPS needs attention"
                    : liveTrackingOrderId
                    ? "Live delivery GPS is sharing"
                    : "Rider GPS is ready for auto assignment"}
                </p>
                <p className="text-sm opacity-80 mt-1">
                  {trackingError ||
                    (liveTrackingOrderId
                      ? `Order #${liveTrackingOrderId
                          ?.slice(-6)
                          .toUpperCase()} is sending rider movement to the customer map.`
                      : "Your current location is being saved so the system can assign nearby orders automatically.")}
                </p>
                {lastLocationText && !trackingError && (
                  <p className="text-xs opacity-70 mt-2">
                    Last location: {lastLocationText}
                    {lastLocationAt
                      ? ` • ${new Date(lastLocationAt).toLocaleTimeString()}`
                      : ""}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <section className="mb-14">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-black">
              Available Orders ({visibleAvailableOrders.length})
            </h2>
            <p className="text-xs text-gray-500 font-bold">
              Restaurant must mark orders as READY_FOR_PICKUP first.
            </p>
          </div>

          {visibleAvailableOrders.length === 0 ? (
            <div className="bg-gray-900/80 border border-dashed border-white/10 rounded-[32px] p-16 text-center text-gray-500 font-bold">
              {isOnline
                ? "No available orders right now"
                : "Go online to receive orders"}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {visibleAvailableOrders.map((order) => (
                <div
                  key={order._id}
                  className="bg-gray-900 border border-white/10 rounded-[32px] p-7"
                >
                  <div className="flex justify-between gap-4 mb-6">
                    <div>
                      <p className="text-xs text-gray-500 font-black uppercase tracking-widest">
                        New Delivery Request
                      </p>
                      <h3 className="text-2xl font-black mt-1">
                        #{order._id?.slice(-6).toUpperCase()}
                      </h3>
                    </div>

                    <span className="h-fit px-4 py-2 bg-orange-500/10 text-orange-400 rounded-xl text-xs font-black uppercase">
                      {formatStatus(order.status)}
                    </span>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="bg-gray-950 rounded-2xl p-4">
                      <p className="text-xs text-gray-500 font-black uppercase mb-1">
                        Pick up from
                      </p>
                      <p className="font-black">
                        {order.restaurant?.name || "Restaurant"}
                      </p>
                      <p className="text-sm text-gray-400">
                        {order.restaurantAddress?.text ||
                          order.restaurant?.address?.text ||
                          "Restaurant address"}
                      </p>
                    </div>

                    <div className="bg-gray-950 rounded-2xl p-4">
                      <p className="text-xs text-gray-500 font-black uppercase mb-1">
                        Deliver to
                      </p>
                      <p className="font-black">
                        {order.deliveryAddress?.label || "Customer"}
                      </p>
                      <p className="text-sm text-gray-400">
                        {order.deliveryAddress?.text || "Delivery address"}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => acceptOrder(order._id)}
                      className="flex-1 py-4 bg-green-500 rounded-2xl font-black text-sm uppercase flex items-center justify-center gap-2 hover:bg-green-400 transition-colors"
                    >
                      <CheckCircle size={18} />
                      Accept + Start GPS
                    </button>

                    <button
                      onClick={() => rejectOrder(order._id)}
                      className="px-5 py-4 bg-red-500/10 text-red-400 rounded-2xl font-black text-sm uppercase hover:bg-red-500/20 transition-colors"
                      title="Reject order"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-black mb-6">
            Current Tasks ({activeTasks.length})
          </h2>

          {activeTasks.length === 0 ? (
            <div className="bg-gray-900/80 border border-dashed border-white/10 rounded-[32px] p-16 text-center text-gray-500 font-bold">
              No active delivery tasks
            </div>
          ) : (
            <div className="space-y-6">
              {activeTasks.map((order) => {
                const nextAction = getNextAction(order);
                const isTrackingThisOrder = liveTrackingOrderId === order._id;
                const phone =
                  order.customer?.phone || order.deliveryAddress?.phone || "";

                return (
                  <div
                    key={order._id}
                    className="bg-gray-900 border border-white/10 rounded-[32px] p-7"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
                      <div>
                        <p className="text-xs text-gray-500 font-black uppercase tracking-widest">
                          Active Delivery
                        </p>
                        <h3 className="text-2xl font-black mt-1">
                          #{order._id?.slice(-6).toUpperCase()}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">
                          {order.restaurant?.name || "Restaurant"} →{" "}
                          {order.deliveryAddress?.text || "Customer"}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {isTrackingThisOrder && (
                          <span className="h-fit px-4 py-2 bg-green-500/10 text-green-400 rounded-xl text-xs font-black uppercase flex items-center gap-2">
                            <Radio size={14} />
                            Live GPS
                          </span>
                        )}

                        <span className="h-fit px-4 py-2 bg-orange-500/10 text-orange-400 rounded-xl text-xs font-black uppercase">
                          {formatStatus(order.status)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <button
                        onClick={() =>
                          openMap(order.restaurantAddress || order.restaurant?.address)
                        }
                        className="p-4 bg-gray-950 rounded-2xl text-left hover:bg-gray-800 transition-colors"
                      >
                        <MapPin className="text-orange-500 mb-2" size={22} />
                        <p className="text-xs text-gray-500 font-black uppercase">
                          Restaurant Map
                        </p>
                        <p className="font-bold text-sm mt-1">
                          {order.restaurantAddress?.text ||
                            order.restaurant?.address?.text ||
                            "Open restaurant"}
                        </p>
                      </button>

                      <button
                        onClick={() => openMap(order.deliveryAddress)}
                        className="p-4 bg-gray-950 rounded-2xl text-left hover:bg-gray-800 transition-colors"
                      >
                        <Navigation className="text-green-500 mb-2" size={22} />
                        <p className="text-xs text-gray-500 font-black uppercase">
                          Customer Map
                        </p>
                        <p className="font-bold text-sm mt-1">
                          {order.deliveryAddress?.text || "Open delivery"}
                        </p>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                      <div className="p-4 bg-gray-950 rounded-2xl">
                        <Clock className="text-gray-400 mb-2" size={20} />
                        <p className="text-xs text-gray-500 font-black uppercase">
                          ETA
                        </p>
                        <p className="font-black text-sm mt-1">
                          {order.estimatedTime || 30} mins
                        </p>
                      </div>

                      <div className="p-4 bg-gray-950 rounded-2xl">
                        <DollarSign className="text-green-500 mb-2" size={20} />
                        <p className="text-xs text-gray-500 font-black uppercase">
                          Earning
                        </p>
                        <p className="font-black text-sm mt-1">Rs. 50</p>
                      </div>

                      <div className="p-4 bg-gray-950 rounded-2xl">
                        <Package className="text-blue-500 mb-2" size={20} />
                        <p className="text-xs text-gray-500 font-black uppercase">
                          Items
                        </p>
                        <p className="font-black text-sm mt-1">
                          {(order.items || []).reduce(
                            (sum: number, item: any) =>
                              sum + Number(item.quantity || 1),
                            0
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {nextAction && (
                        <button
                          onClick={() =>
                            updateOrderStatus(order._id, nextAction.status)
                          }
                          className="flex-1 min-w-[220px] py-4 bg-orange-500 rounded-2xl font-black text-sm uppercase hover:bg-orange-400 transition-colors"
                        >
                          {nextAction.label}
                        </button>
                      )}

                      <button
                        onClick={() => openOrderChat(order)}
                        className="px-5 py-4 bg-purple-600 rounded-2xl font-black text-sm uppercase flex items-center gap-2 hover:bg-purple-500 transition-colors"
                      >
                        <MessageCircle size={18} />
                        Chat
                      </button>

                      {phone && (
                        <a
                          href={`tel:${phone}`}
                          className="px-5 py-4 bg-green-600 rounded-2xl font-black text-sm uppercase flex items-center gap-2 hover:bg-green-500 transition-colors"
                        >
                          <Phone size={18} />
                          Call
                        </a>
                      )}

                      <button
                        onClick={() => sendLiveLocationOnce(order._id)}
                        disabled={sendingLocation}
                        className="px-5 py-4 bg-blue-600 rounded-2xl font-black text-sm uppercase flex items-center gap-2 disabled:opacity-50 hover:bg-blue-500 transition-colors"
                      >
                        <Send size={18} />
                        Send Location
                      </button>

                      {isTrackingThisOrder ? (
                        <button
                          onClick={stopRealLiveTracking}
                          className="px-5 py-4 bg-red-600 rounded-2xl font-black text-sm uppercase hover:bg-red-500 transition-colors"
                        >
                          Stop Live
                        </button>
                      ) : (
                        <button
                          onClick={() => startRealLiveTracking(order._id)}
                          className="px-5 py-4 bg-green-600 rounded-2xl font-black text-sm uppercase flex items-center gap-2 hover:bg-green-500 transition-colors"
                        >
                          <Radio size={18} />
                          Start Live
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {selectedChatOrder && (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-end md:items-center justify-center p-4">
          <div className="bg-white text-gray-900 w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl">
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-orange-500 uppercase">
                  Order #{selectedChatOrder._id?.slice(-6).toUpperCase()}
                </p>
                <h2 className="text-xl font-black">Delivery chat</h2>
                <p className="text-sm text-gray-500 font-bold">
                  Customer, restaurant, and rider
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={requestCall}
                  className="p-3 rounded-2xl bg-green-100 text-green-700"
                >
                  <Phone size={20} />
                </button>
                <button
                  onClick={closeOrderChat}
                  className="p-3 rounded-2xl bg-gray-100 text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="h-[420px] overflow-y-auto bg-gray-50 p-5 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400 font-black text-center">
                  No messages yet.
                </div>
              ) : (
                chatMessages.map((msg, index) => {
                  const senderId =
                    typeof msg.sender === "object" ? msg.sender?._id : msg.sender;
                  const myId = user?._id || user?.id;
                  const isMine = String(senderId) === String(myId);

                  return (
                    <div
                      key={msg._id || index}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-3xl px-4 py-3 ${
                          isMine
                            ? "bg-orange-500 text-white"
                            : "bg-white border border-gray-100 text-gray-900"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs font-black">
                            {msg.senderName || "User"}
                          </p>
                          <p
                            className={`text-[10px] font-black ${
                              isMine ? "text-orange-100" : "text-gray-400"
                            }`}
                          >
                            {msg.senderRole}
                          </p>
                        </div>

                        <p className="text-sm font-semibold whitespace-pre-wrap">
                          {msg.message}
                        </p>

                        {msg.createdAt && (
                          <p
                            className={`text-[10px] mt-2 ${
                              isMine ? "text-orange-100" : "text-gray-400"
                            }`}
                          >
                            {new Date(msg.createdAt).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-5 border-t flex gap-3">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendChatMessage();
                }}
                placeholder="Send message..."
                className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-500"
              />

              <button
                onClick={sendChatMessage}
                disabled={chatLoading || !chatInput.trim()}
                className="px-5 py-3 rounded-2xl bg-orange-500 text-white font-black disabled:bg-gray-300"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiderDashboard;