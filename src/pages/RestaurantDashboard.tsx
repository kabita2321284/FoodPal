import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  AlertCircle,
  CheckCircle,
  ChefHat,
  Clock,
  DollarSign,
  Eye,
  LogOut,
  Package,
  RefreshCw,
  Store,
  Timer,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Zap,
  MessageCircle,
  Send,
  Phone,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { apiRequest } from "../lib/api";
import { getSocket } from "../lib/socket";

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

const ACTIVE_STATUSES: OrderStatus[] = [
  "PENDING",
  "ACCEPTED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "PICKED_UP",
  "ON_THE_WAY",
];

const formatStatus = (status?: string) => {
  if (!status) return "UNKNOWN";
  return status.replaceAll("_", " ");
};

const getNextRestaurantAction = (
  status: OrderStatus
): { label: string; status: OrderStatus } | null => {
  if (status === "PENDING") return { label: "Accept Order", status: "ACCEPTED" };
  if (status === "ACCEPTED") return { label: "Start Preparing", status: "PREPARING" };
  if (status === "PREPARING") return { label: "Ready For Pickup", status: "READY_FOR_PICKUP" };
  return null;
};

const getStatusColor = (status: string) => {
  if (status === "PENDING") return "bg-yellow-100 text-yellow-700";
  if (status === "ACCEPTED") return "bg-blue-100 text-blue-700";
  if (status === "PREPARING") return "bg-orange-100 text-orange-700";
  if (status === "READY_FOR_PICKUP") return "bg-purple-100 text-purple-700";
  if (status === "PICKED_UP") return "bg-indigo-100 text-indigo-700";
  if (status === "ON_THE_WAY") return "bg-green-100 text-green-700";
  if (status === "DELIVERED") return "bg-emerald-100 text-emerald-700";
  if (status === "CANCELLED" || status === "REJECTED") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
};

export const RestaurantDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [restaurant, setRestaurant] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"orders" | "menu" | "eta">("orders");

  const [selectedChatOrder, setSelectedChatOrder] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const [etaForm, setEtaForm] = useState({
    preparationTime: 20,
    averagePrepTime: 20,
    busyPrepTimeExtra: 10,
    pickupBufferMinutes: 5,
    deliverySpeedKmph: 22,
    serviceRadiusKm: 5,
    isBusy: false,
  });

  const activeOrders = useMemo(
    () => orders.filter((order) => ACTIVE_STATUSES.includes(order.status)),
    [orders]
  );

  const completedOrders = useMemo(
    () => orders.filter((order) => order.status === "DELIVERED"),
    [orders]
  );

  const todayRevenue = useMemo(() => {
    const today = new Date().toDateString();
    return orders
      .filter(
        (order) =>
          order.status === "DELIVERED" &&
          new Date(order.createdAt).toDateString() === today
      )
      .reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
  }, [orders]);

  const fetchRestaurantInfo = async () => {
    try {
      const data = await apiRequest("/api/restaurants/me", {
        token: user?.token,
      });

      setRestaurant(data);

      setEtaForm({
        preparationTime: Number(data?.preparationTime || 20),
        averagePrepTime: Number(data?.averagePrepTime || data?.preparationTime || 20),
        busyPrepTimeExtra: Number(data?.busyPrepTimeExtra || 10),
        pickupBufferMinutes: Number(data?.pickupBufferMinutes || 5),
        deliverySpeedKmph: Number(data?.deliverySpeedKmph || 22),
        serviceRadiusKm: Number(data?.serviceRadiusKm || 5),
        isBusy: Boolean(data?.isBusy),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrders = async () => {
    try {
      const data = await apiRequest("/api/restaurants/my/orders", {
        token: user?.token,
      });
      setOrders(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const data = await apiRequest("/api/restaurants/my/menu-items", {
        token: user?.token,
      });
      setMenuItems(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await apiRequest("/api/restaurants/my/categories", {
        token: user?.token,
      });
      setCategories(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAll = async (silent = false) => {
    silent ? setRefreshing(true) : setLoading(true);
    await Promise.allSettled([
      fetchRestaurantInfo(),
      fetchOrders(),
      fetchCategories(),
      fetchMenuItems(),
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

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (!restaurant?._id) return;

    const socket = getSocket();
    socket.emit("restaurant:join", restaurant._id);

    const refreshOrders = () => fetchOrders();

    const handleNewChatMessage = (message: ChatMessage) => {
      const orderId = String(message?.order || message?.orderId || "");
      if (!selectedChatOrder?._id || orderId !== String(selectedChatOrder._id)) return;

      setChatMessages((prev) => {
        if (message._id && prev.some((m) => m._id === message._id)) return prev;
        return [...prev, message];
      });
    };

    socket.on("order:new", refreshOrders);
    socket.on("order:updated", refreshOrders);
    socket.on("order:status_update", refreshOrders);
    socket.on("chat:new_message", handleNewChatMessage);

    return () => {
      socket.off("order:new", refreshOrders);
      socket.off("order:updated", refreshOrders);
      socket.off("order:status_update", refreshOrders);
      socket.off("chat:new_message", handleNewChatMessage);
    };
  }, [restaurant?._id, selectedChatOrder?._id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await apiRequest(`/api/restaurants/my/orders/${orderId}/status`, {
        method: "PATCH",
        token: user?.token,
        body: JSON.stringify({
          status,
          message: `Restaurant changed order status to ${formatStatus(status)}`,
        }),
      });

      await fetchOrders();
    } catch (err) {
      console.error(err);
      alert("Could not update order status.");
    }
  };

  const rejectOrder = async (orderId: string) => {
    const reason = prompt("Why are you rejecting this order?") || "Restaurant rejected order";

    try {
      await apiRequest(`/api/restaurants/my/orders/${orderId}/status`, {
        method: "PATCH",
        token: user?.token,
        body: JSON.stringify({
          status: "REJECTED",
          message: reason,
        }),
      });

      await fetchOrders();
    } catch (err) {
      console.error(err);
      alert("Could not reject order.");
    }
  };

  const toggleRestaurantOpen = async () => {
    if (!restaurant) return;

    try {
      const updated = await apiRequest("/api/restaurants/me/open-status", {
        method: "PATCH",
        token: user?.token,
        body: JSON.stringify({ isOpen: !restaurant.isOpen }),
      });

      setRestaurant(updated);
    } catch (err) {
      console.error(err);
      alert("Could not update open status.");
    }
  };

  const saveEtaSettings = async () => {
    try {
      const updated = await apiRequest("/api/restaurants/me/eta-settings", {
        method: "PATCH",
        token: user?.token,
        body: JSON.stringify(etaForm),
      });

      setRestaurant(updated);
      alert("ETA settings saved.");
    } catch (err) {
      console.error(err);
      alert("Backend route missing: /api/restaurants/me/eta-settings.");
    }
  };

  const toggleBusyMode = async () => {
    const next = { ...etaForm, isBusy: !etaForm.isBusy };
    setEtaForm(next);

    try {
      const updated = await apiRequest("/api/restaurants/me/eta-settings", {
        method: "PATCH",
        token: user?.token,
        body: JSON.stringify(next),
      });

      setRestaurant(updated);
    } catch (err) {
      console.error(err);
      alert("Backend route missing: /api/restaurants/me/eta-settings.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-black">
        Loading restaurant dashboard...
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
        <Store className="text-orange-500 mb-4" size={46} />
        <h1 className="text-3xl font-black">No restaurant profile found</h1>
        <p className="text-gray-500 font-bold mt-2">
          Please register your restaurant first.
        </p>
        <button
          onClick={() => navigate("/restaurant/register")}
          className="mt-6 px-8 py-4 rounded-2xl bg-orange-500 text-white font-black"
        >
          Register Restaurant
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
          <div>
            <p className="text-orange-500 font-black uppercase text-xs tracking-widest">
              Restaurant Portal
            </p>
            <h1 className="text-4xl font-black mt-2">{restaurant.name}</h1>
            <p className="text-gray-500 font-bold mt-1">
              {restaurant.address?.text || "Restaurant address"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={toggleBusyMode}
              className={`px-6 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 ${
                etaForm.isBusy
                  ? "bg-red-500 text-white"
                  : "bg-white text-gray-700 border border-gray-200"
              }`}
            >
              <Zap size={18} />
              {etaForm.isBusy ? "Busy Mode On" : "Busy Mode Off"}
            </button>

            <button
              onClick={toggleRestaurantOpen}
              className={`px-6 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 ${
                restaurant.isOpen
                  ? "bg-green-500 text-white"
                  : "bg-gray-800 text-white"
              }`}
            >
              {restaurant.isOpen ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
              {restaurant.isOpen ? "Open" : "Closed"}
            </button>

            <button
              onClick={() => fetchAll(true)}
              disabled={refreshing}
              className="p-3 rounded-2xl bg-white border border-gray-200 text-gray-600 disabled:opacity-60"
            >
              <RefreshCw size={22} className={refreshing ? "animate-spin" : ""} />
            </button>

            <button
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="p-3 rounded-2xl bg-white border border-gray-200 text-red-500"
            >
              <LogOut size={22} />
            </button>
          </div>
        </header>

        {restaurant.status !== "approved" && (
          <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-[28px] p-5 flex gap-3">
            <AlertCircle className="text-yellow-600" />
            <div>
              <p className="font-black text-yellow-800">
                Restaurant is {formatStatus(restaurant.status).toLowerCase()}
              </p>
              <p className="text-sm text-yellow-700 font-bold mt-1">
                You may not receive live customer orders until admin approves it.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-10">
          <StatCard icon={<Package />} label="Active Orders" value={activeOrders.length} />
          <StatCard icon={<CheckCircle />} label="Completed" value={completedOrders.length} />
          <StatCard icon={<DollarSign />} label="Today Revenue" value={`Rs. ${todayRevenue}`} />
          <StatCard icon={<Clock />} label="Prep Time" value={`${etaForm.averagePrepTime} min`} />
          <StatCard icon={<TrendingUp />} label="Menu Items" value={menuItems.length} />
        </div>

        <div className="flex gap-3 mb-8 overflow-x-auto">
          {[
            { id: "orders", label: "Orders" },
            { id: "menu", label: "Menu" },
            { id: "eta", label: "ETA Settings" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 rounded-2xl font-black text-sm uppercase whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-orange-500 text-white"
                  : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "orders" && (
          <div className="space-y-5">
            {orders.length === 0 ? (
              <EmptyState text="No orders yet." />
            ) : (
              orders.map((order) => {
                const nextAction = getNextRestaurantAction(order.status);
                return (
                  <motion.div
                    key={order._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm"
                  >
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <h3 className="text-2xl font-black">
                            #{order._id?.slice(-6).toUpperCase()}
                          </h3>
                          <span
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase ${getStatusColor(
                              order.status
                            )}`}
                          >
                            {formatStatus(order.status)}
                          </span>
                        </div>

                        <p className="text-gray-500 font-bold">
                          Customer: {order.customer?.name || "Customer"}
                        </p>
                        <p className="text-gray-500 font-bold">
                          Phone: {order.customer?.phone || order.deliveryAddress?.phone || "No phone"}
                        </p>
                        <p className="text-gray-500 font-bold">
                          Address: {order.deliveryAddress?.text || "No address"}
                        </p>
                        <p className="text-sm text-gray-400 font-bold mt-1">
                          {new Date(order.createdAt).toLocaleString()}
                        </p>

                        <div className="mt-4 space-y-1">
                          {(order.items || []).map((item: any, index: number) => (
                            <p key={index} className="text-sm font-bold text-gray-700">
                              {item.quantity} × {item.name}
                            </p>
                          ))}
                        </div>
                      </div>

                      <div className="xl:text-right">
                        <p className="text-3xl font-black">Rs. {order.totalAmount || 0}</p>
                        <p className="text-sm text-gray-500 font-bold mt-1">
                          ETA: {order.estimatedTime || restaurant.estimatedDeliveryTime || 30} min
                        </p>

                        <div className="flex flex-wrap xl:justify-end gap-3 mt-5">
                          <button
                            onClick={() => navigate(`/order/${order._id}/track`)}
                            className="px-5 py-3 rounded-2xl bg-gray-100 text-gray-700 font-black text-xs uppercase flex items-center gap-2"
                          >
                            <Eye size={16} />
                            View
                          </button>

                          <button
                            onClick={() => openOrderChat(order)}
                            className="px-5 py-3 rounded-2xl bg-blue-100 text-blue-700 font-black text-xs uppercase flex items-center gap-2"
                          >
                            <MessageCircle size={16} />
                            Chat
                          </button>

                          {(order.customer?.phone || order.deliveryAddress?.phone) && (
                            <a
                              href={`tel:${order.customer?.phone || order.deliveryAddress?.phone}`}
                              className="px-5 py-3 rounded-2xl bg-green-100 text-green-700 font-black text-xs uppercase flex items-center gap-2"
                            >
                              <Phone size={16} />
                              Call
                            </a>
                          )}

                          {nextAction && (
                            <button
                              onClick={() => updateOrderStatus(order._id, nextAction.status)}
                              className="px-5 py-3 rounded-2xl bg-orange-500 text-white font-black text-xs uppercase"
                            >
                              {nextAction.label}
                            </button>
                          )}

                          {order.status === "PENDING" && (
                            <button
                              onClick={() => rejectOrder(order._id)}
                              className="px-5 py-3 rounded-2xl bg-red-100 text-red-600 font-black text-xs uppercase"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        )}

        {activeTab === "menu" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm">
              <h2 className="text-2xl font-black mb-5">Categories</h2>
              {categories.length === 0 ? (
                <EmptyState text="No categories yet." />
              ) : (
                <div className="space-y-3">
                  {categories.map((cat) => (
                    <div key={cat._id} className="p-4 rounded-2xl bg-gray-50 font-black">
                      {cat.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm">
              <h2 className="text-2xl font-black mb-5">Menu Items</h2>
              {menuItems.length === 0 ? (
                <EmptyState text="No menu items yet." />
              ) : (
                <div className="space-y-3">
                  {menuItems.map((item) => (
                    <div key={item._id} className="p-4 rounded-2xl bg-gray-50 flex justify-between gap-4">
                      <div>
                        <p className="font-black">{item.name}</p>
                        <p className="text-sm text-gray-500 font-bold">
                          {item.category?.name || "Uncategorised"}
                        </p>
                      </div>
                      <p className="font-black">Rs. {item.price}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "eta" && (
          <div className="bg-white rounded-[36px] p-7 border border-gray-100 shadow-sm max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              <Timer className="text-orange-500" size={28} />
              <div>
                <h2 className="text-2xl font-black">ETA Prediction Settings</h2>
                <p className="text-gray-500 font-bold text-sm">
                  These values help calculate customer delivery time.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <NumberInput
                label="Normal prep time"
                value={etaForm.averagePrepTime}
                suffix="minutes"
                onChange={(value) =>
                  setEtaForm({
                    ...etaForm,
                    averagePrepTime: value,
                    preparationTime: value,
                  })
                }
              />

              <NumberInput
                label="Busy extra time"
                value={etaForm.busyPrepTimeExtra}
                suffix="minutes"
                onChange={(value) =>
                  setEtaForm({ ...etaForm, busyPrepTimeExtra: value })
                }
              />

              <NumberInput
                label="Pickup buffer"
                value={etaForm.pickupBufferMinutes}
                suffix="minutes"
                onChange={(value) =>
                  setEtaForm({ ...etaForm, pickupBufferMinutes: value })
                }
              />

              <NumberInput
                label="Delivery speed"
                value={etaForm.deliverySpeedKmph}
                suffix="km/h"
                onChange={(value) =>
                  setEtaForm({ ...etaForm, deliverySpeedKmph: value })
                }
              />

              <NumberInput
                label="Service radius"
                value={etaForm.serviceRadiusKm}
                suffix="km"
                onChange={(value) =>
                  setEtaForm({ ...etaForm, serviceRadiusKm: value })
                }
              />
            </div>

            <button
              onClick={saveEtaSettings}
              className="mt-7 w-full py-4 rounded-2xl bg-orange-500 text-white font-black uppercase"
            >
              Save ETA Settings
            </button>
          </div>
        )}
      </div>

      {selectedChatOrder && (
        <div className="fixed inset-0 z-[200] bg-black/40 flex items-end md:items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl">
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-orange-500 uppercase">
                  Order #{selectedChatOrder._id?.slice(-6).toUpperCase()}
                </p>
                <h2 className="text-xl font-black">Customer chat</h2>
                <p className="text-sm text-gray-500 font-bold">
                  {selectedChatOrder.customer?.name || "Customer"}
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
                placeholder="Reply to customer..."
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

const StatCard = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: any;
}) => (
  <div className="bg-white rounded-[28px] p-6 border border-gray-100 shadow-sm">
    <div className="text-orange-500 mb-4">{icon}</div>
    <p className="text-xs font-black uppercase tracking-widest text-gray-400">
      {label}
    </p>
    <p className="text-3xl font-black mt-2">{value}</p>
  </div>
);

const EmptyState = ({ text }: { text: string }) => (
  <div className="p-12 rounded-[28px] bg-gray-50 border border-dashed border-gray-200 text-center">
    <ChefHat className="mx-auto text-gray-300 mb-3" size={38} />
    <p className="font-black text-gray-400">{text}</p>
  </div>
);

const NumberInput = ({
  label,
  value,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  onChange: (value: number) => void;
}) => (
  <label className="block">
    <span className="text-sm font-black text-gray-700">{label}</span>
    <div className="mt-2 flex items-center bg-gray-50 border border-gray-200 rounded-2xl px-4">
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-transparent py-4 outline-none font-black"
      />
      <span className="text-sm text-gray-400 font-bold">{suffix}</span>
    </div>
  </label>
);

export default RestaurantDashboard;