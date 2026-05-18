import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { apiRequest } from "../lib/api";
import {
  Users,
  Store,
  Bike,
  ShoppingBag,
  TrendingUp,
  Settings,
  BarChart3,
  Check,
  X,
  Eye,
  CreditCard,
  Tag,
  Image as ImageIcon,
  MapPin,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeView, setActiveView] = useState("overview");
  const [statsData, setStatsData] = useState<any>(null);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const [promos, setPromos] = useState<any[]>([]);
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [editingPromo, setEditingPromo] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<any>(null);
  const [showRestaurantForm, setShowRestaurantForm] = useState(false);
  const [managingMenuFor, setManagingMenuFor] = useState<any>(null);

  const [showMenuItemForm, setShowMenuItemForm] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<any>(null);

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  const [showRiderAssignModal, setShowRiderAssignModal] = useState(false);
  const [assigningOrder, setAssigningOrder] = useState<any>(null);

  const authOptions = { token: user?.token };

  useEffect(() => {
    fetchStats();
    fetchOrders();
    fetchRiders();
  }, []);

  useEffect(() => {
    if (activeView === "restaurants") fetchRestaurants();
    if (activeView === "customers") fetchUsers();
    if (activeView === "riders") fetchRiders();
    if (activeView === "orders") fetchOrders();
    if (activeView === "promos") fetchPromos();
  }, [activeView]);

  const fetchStats = async () => {
    try {
      const data = await apiRequest("/api/admin/stats", authOptions);
      setStatsData(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/api/admin/restaurants", authOptions);
      setRestaurants(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/api/admin/users", authOptions);
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRiders = async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/api/admin/riders", authOptions);
      setRiders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/api/admin/orders", authOptions);
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPromos = async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/api/promos", {
        token: user?.token,
      });
      setPromos(data);
    } catch (err) {
      console.error(err);
      setPromos([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async (restaurantId: string) => {
    try {
      const data = await apiRequest(
        `/api/admin/categories?restaurantId=${restaurantId}`,
        authOptions
      );
      setCategories(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMenuItems = async (restaurantId: string) => {
    setLoading(true);
    try {
      const data = await apiRequest(
        `/api/admin/menu-items?restaurantId=${restaurantId}`,
        authOptions
      );
      setMenuItems(data);
      await fetchCategories(restaurantId);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateRestaurantStatus = async (restaurantId: string, status: string) => {
    try {
      await apiRequest(`/api/admin/restaurants/${restaurantId}/status`, {
        method: "PATCH",
        token: user?.token,
        body: JSON.stringify({ status }),
      });
      fetchRestaurants();
      fetchStats();
    } catch (err) {
      console.error(err);
      alert("Could not update restaurant status.");
    }
  };

  const updateRiderStatus = async (riderId: string, status: string) => {
    try {
      await apiRequest(`/api/admin/riders/${riderId}/status`, {
        method: "PATCH",
        token: user?.token,
        body: JSON.stringify({ status }),
      });
      fetchRiders();
      fetchStats();
    } catch (err) {
      console.error(err);
      alert("Could not update rider status.");
    }
  };

  const deleteRider = async (riderId: string) => {
    try {
      if (!window.confirm("Remove this rider application/profile?")) return;

      await apiRequest(`/api/admin/riders/${riderId}`, {
        method: "DELETE",
        token: user?.token,
      });

      fetchRiders();
      fetchStats();
    } catch (err) {
      console.error(err);
      alert("Could not delete rider.");
    }
  };

  const deletePromo = async (promoId: string) => {
    try {
      if (!window.confirm("Delete this promo code?")) return;

      await apiRequest(`/api/promos/${promoId}`, {
        method: "DELETE",
        token: user?.token,
      });

      fetchPromos();
    } catch (err) {
      console.error(err);
      alert("Could not delete promo.");
    }
  };

  const savePromo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const formData = new FormData(e.currentTarget);

      const data = {
        code: String(formData.get("code") || "").toUpperCase().trim(),
        title: formData.get("title"),
        description: formData.get("description"),
        discountType: formData.get("discountType"),
        discountValue: Number(formData.get("discountValue") || 0),
        maxDiscount: Number(formData.get("maxDiscount") || 0),
        minOrderAmount: Number(formData.get("minOrderAmount") || 0),
        usageLimit: Number(formData.get("usageLimit") || 100),
        perUserLimit: Number(formData.get("perUserLimit") || 1),
        expiresAt: formData.get("expiresAt") || undefined,
        isActive: formData.get("isActive") === "on",
      };

      const url = editingPromo ? `/api/promos/${editingPromo._id}` : "/api/promos";
      const method = editingPromo ? "PUT" : "POST";

      await apiRequest(url, {
        method,
        token: user?.token,
        body: JSON.stringify(data),
      });

      setShowPromoForm(false);
      setEditingPromo(null);
      fetchPromos();
    } catch (err) {
      console.error(err);
      alert("Could not save promo code.");
    }
  };

  const assignRider = async (orderId: string, riderId: string) => {
    try {
      await apiRequest(`/api/orders/${orderId}/assign`, {
        method: "PATCH",
        token: user?.token,
        body: JSON.stringify({ riderId }),
      });
      setShowRiderAssignModal(false);
      setAssigningOrder(null);
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert("Could not assign rider.");
    }
  };

  const getRestaurantImage = (res: any) =>
    res.bannerImage ||
    res.logo ||
    res.images?.[0] ||
    "https://via.placeholder.com/150?text=FoodPal";

  const getOpeningHoursText = (restaurant: any) => {
    if (!restaurant?.openingHours) return "09:00 - 22:00";
    if (typeof restaurant.openingHours === "string") return restaurant.openingHours;
    return `${restaurant.openingHours.open || "09:00"} - ${
      restaurant.openingHours.close || "22:00"
    }`;
  };

  const formatDateForInput = (dateValue: any) => {
    if (!dateValue) return "";
    try {
      return new Date(dateValue).toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  const stats = [
    {
      label: "Total Revenue",
      value: statsData ? `Rs. ${statsData.totalRevenue?.toLocaleString() || 0}` : "Rs. 0",
      icon: <TrendingUp size={24} />,
      color: "bg-green-500",
    },
    {
      label: "Total Orders",
      value: statsData ? statsData.totalOrders?.toString() : "0",
      icon: <ShoppingBag size={24} />,
      color: "bg-orange-500",
    },
    {
      label: "Restaurants",
      value: statsData ? statsData.totalRestaurants?.toString() : "0",
      icon: <Store size={24} />,
      color: "bg-blue-500",
    },
    {
      label: "Active Riders",
      value: statsData ? statsData.totalRiders?.toString() : "0",
      icon: <Bike size={24} />,
      color: "bg-indigo-500",
    },
  ];

  const sidebar = [
    { id: "overview", icon: <BarChart3 size={18} />, label: "Overview" },
    { id: "restaurants", icon: <Store size={18} />, label: "Restaurants" },
    { id: "customers", icon: <Users size={18} />, label: "Customers" },
    { id: "riders", icon: <Bike size={18} />, label: "Riders" },
    { id: "orders", icon: <ShoppingBag size={18} />, label: "Orders" },
    { id: "payments", icon: <CreditCard size={18} />, label: "Payments" },
    { id: "promos", icon: <Tag size={18} />, label: "Promo Codes" },
    { id: "banners", icon: <ImageIcon size={18} />, label: "Banners" },
    { id: "zones", icon: <MapPin size={18} />, label: "Delivery Zones" },
    { id: "settings", icon: <Settings size={18} />, label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-gray-900 text-white hidden lg:flex flex-col p-6 sticky top-0 h-screen">
        <div className="flex items-center gap-2 mb-12">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <span className="font-bold">F</span>
          </div>
          <span className="text-lg font-black tracking-tight">
            Admin<span className="text-orange-500">Panel</span>
          </span>
        </div>

        <nav className="space-y-2 flex-1">
          {sidebar.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                activeView === item.id
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <button
          onClick={() => {
            logout();
            navigate("/");
          }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-red-400 hover:bg-red-500/10"
        >
          <LogOut size={18} />
          Logout Session
        </button>
      </aside>

      <main className="flex-1 p-8 md:p-12 overflow-y-auto">
        <header className="flex justify-between items-center mb-12">
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">
            {activeView === "overview" ? "System Overview" : activeView}
          </h1>

          <button
            onClick={() => {
              logout();
              navigate("/");
            }}
            className="p-3 text-gray-400 hover:text-red-500 bg-white rounded-xl border border-gray-100 shadow-sm"
          >
            <LogOut size={20} />
          </button>
        </header>

        {loading && (
          <div className="mb-6 text-sm font-bold text-orange-500">Loading...</div>
        )}

        {activeView === "overview" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm"
                >
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-4 ${stat.color}`}
                  >
                    {stat.icon}
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-black text-gray-900">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm">
                <h2 className="text-xl font-black text-gray-900 mb-8">
                  Pending Riders ({statsData?.pendingRiderApplications || 0})
                </h2>

                <div className="space-y-4">
                  {riders
                    .filter((r) => r.riderApplicationStatus === "pending_review")
                    .slice(0, 3)
                    .map((rider) => (
                      <div
                        key={rider._id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl"
                      >
                        <div className="flex items-center gap-4">
                          <img
                            src={`https://ui-avatars.com/api/?name=${rider.name || "Rider"}`}
                            className="w-10 h-10 rounded-xl"
                          />
                          <div>
                            <p className="font-bold text-sm">{rider.name || "Unknown Rider"}</p>
                            <p className="text-xs text-gray-500">{rider.email}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => setActiveView("riders")}
                          className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg"
                        >
                          Review
                        </button>
                      </div>
                    ))}

                  {riders.filter((r) => r.riderApplicationStatus === "pending_review")
                    .length === 0 && (
                    <p className="text-center py-4 text-gray-400 text-sm">
                      No pending riders
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm">
                <h2 className="text-xl font-black text-gray-900 mb-8">Recent Orders</h2>

                <div className="space-y-4">
                  {orders.slice(0, 3).map((order) => (
                    <div
                      key={order._id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl"
                    >
                      <div>
                        <p className="font-bold text-sm">
                          Order #{order._id.slice(-6).toUpperCase()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {order.customer?.name || order.customer?.email || "Customer"} • Rs.{" "}
                          {order.totalAmount || 0}
                        </p>
                      </div>

                      <span className="text-[10px] font-black px-2 py-1 rounded-md uppercase bg-orange-100 text-orange-600">
                        {order.status}
                      </span>
                    </div>
                  ))}

                  {orders.length === 0 && (
                    <p className="text-center py-4 text-gray-400 text-sm">
                      No recent orders
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {activeView === "restaurants" && (
          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-black text-gray-900">Restaurant Management</h2>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setEditingRestaurant(null);
                    setShowRestaurantForm(true);
                  }}
                  className="px-6 py-3 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase"
                >
                  Add Restaurant
                </button>

                <button
                  onClick={fetchRestaurants}
                  className="text-orange-500 font-bold text-sm"
                >
                  Refresh List
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase">
                    <th className="px-8 py-4">Restaurant</th>
                    <th className="px-8 py-4">Owner</th>
                    <th className="px-8 py-4">Status</th>
                    <th className="px-8 py-4">Open</th>
                    <th className="px-8 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-50">
                  {restaurants.map((res) => (
                    <tr key={res._id}>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <img
                            src={getRestaurantImage(res)}
                            className="w-12 h-12 rounded-xl object-cover bg-gray-100"
                          />
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{res.name}</p>
                            <p className="text-xs text-gray-500">
                              {(res.cuisine || []).join(", ")}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {getOpeningHoursText(res)} • Rs. {res.deliveryFee || 50}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-8 py-6">
                        <p className="font-bold text-sm">{res.owner?.name || "Unknown"}</p>
                        <p className="text-xs text-gray-500">{res.owner?.email}</p>
                      </td>

                      <td className="px-8 py-6">
                        <select
                          value={res.status}
                          onChange={(e) =>
                            updateRestaurantStatus(res._id, e.target.value)
                          }
                          className="bg-gray-50 border border-gray-200 rounded-lg text-[10px] font-black uppercase px-3 py-2"
                        >
                          <option value="pending_review">PENDING_REVIEW</option>
                          <option value="approved">APPROVED</option>
                          <option value="rejected">REJECTED</option>
                          <option value="suspended">SUSPENDED</option>
                        </select>
                      </td>

                      <td className="px-8 py-6">
                        <span
                          className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase ${
                            res.isOpen
                              ? "bg-green-100 text-green-600"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {res.isOpen ? "Open" : "Closed"}
                        </span>
                      </td>

                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => updateRestaurantStatus(res._id, "approved")}
                            className="p-2 text-green-500 hover:bg-green-50 rounded-lg"
                            title="Approve"
                          >
                            <Check size={18} />
                          </button>

                          <button
                            onClick={() => {
                              setManagingMenuFor(res);
                              fetchMenuItems(res._id);
                              setActiveView("menu-management");
                            }}
                            className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg text-[10px] font-black flex items-center gap-1"
                          >
                            <ShoppingBag size={14} /> Menu
                          </button>

                          <button
                            onClick={() => {
                              setEditingRestaurant(res);
                              setShowRestaurantForm(true);
                            }}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                          >
                            <Eye size={18} />
                          </button>

                          <button
                            onClick={async () => {
                              if (window.confirm("Delete this restaurant?")) {
                                await apiRequest(`/api/admin/restaurants/${res._id}`, {
                                  method: "DELETE",
                                  token: user?.token,
                                });
                                fetchRestaurants();
                                fetchStats();
                              }
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeView === "customers" && (
          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-gray-100">
              <h2 className="text-xl font-black text-gray-900">Customer Database</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase">
                    <th className="px-8 py-4">User</th>
                    <th className="px-8 py-4">Phone</th>
                    <th className="px-8 py-4">Role</th>
                    <th className="px-8 py-4">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-50">
                  {users.map((u) => (
                    <tr key={u._id}>
                      <td className="px-8 py-6 flex items-center gap-4">
                        <img
                          src={`https://ui-avatars.com/api/?name=${u.name || "User"}`}
                          className="w-9 h-9 rounded-full bg-gray-100"
                        />
                        <div>
                          <p className="font-bold text-sm">{u.name || "Unknown"}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </td>

                      <td className="px-8 py-6 text-sm text-gray-600">{u.phone || "-"}</td>
                      <td className="px-8 py-6 text-xs font-bold text-gray-500 uppercase">
                        {u.role}
                      </td>
                      <td className="px-8 py-6">
                        <span
                          className={`text-[10px] font-black px-2 py-1 rounded-md uppercase ${
                            u.isVerified ? "text-green-600" : "text-orange-600"
                          }`}
                        >
                          {u.isVerified ? "Verified" : "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeView === "riders" && (
          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-black text-gray-900">Rider Management</h2>
              <button onClick={fetchRiders} className="text-orange-500 font-bold text-sm">
                Refresh List
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase">
                    <th className="px-8 py-4">Rider</th>
                    <th className="px-8 py-4">Vehicle</th>
                    <th className="px-8 py-4">Status</th>
                    <th className="px-8 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-50">
                  {riders.map((rider) => (
                    <tr key={rider._id}>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <img
                            src={`https://ui-avatars.com/api/?name=${rider.name || "Rider"}`}
                            className="w-10 h-10 rounded-xl bg-gray-100"
                          />
                          <div>
                            <p className="font-bold text-gray-900 text-sm">
                              {rider.name || "Unknown Rider"}
                            </p>
                            <p className="text-xs text-gray-500">{rider.email}</p>
                            <p className="text-[10px] text-gray-400">{rider.phone}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-8 py-6">
                        <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-lg uppercase">
                          {rider.vehicleType || "Bike"}
                        </span>
                      </td>

                      <td className="px-8 py-6">
                        <span
                          className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase ${
                            rider.riderApplicationStatus === "approved"
                              ? "bg-green-100 text-green-600"
                              : rider.riderApplicationStatus === "pending_review"
                              ? "bg-orange-100 text-orange-600"
                              : rider.riderApplicationStatus === "rejected"
                              ? "bg-red-100 text-red-600"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {rider.riderApplicationStatus || "none"}
                        </span>
                      </td>

                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => updateRiderStatus(rider._id, "approved")}
                            className="p-2 text-green-500 hover:bg-green-50 rounded-lg"
                            title="Approve rider"
                          >
                            <Check size={18} />
                          </button>

                          <button
                            onClick={() => deleteRider(rider._id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            title="Delete/remove rider"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {riders.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-8 py-12 text-center text-gray-400 font-bold">
                        No rider applications found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeView === "orders" && (
          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-gray-100">
              <h2 className="text-xl font-black text-gray-900">Order Management</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase">
                    <th className="px-8 py-4">Order</th>
                    <th className="px-8 py-4">Customer</th>
                    <th className="px-8 py-4">Total</th>
                    <th className="px-8 py-4">Status</th>
                    <th className="px-8 py-4">Rider</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-50">
                  {orders.map((order) => (
                    <tr key={order._id}>
                      <td className="px-8 py-6 font-bold text-sm">
                        #{order._id.slice(-6).toUpperCase()}
                      </td>

                      <td className="px-8 py-6">
                        <p className="font-bold text-sm">
                          {order.customer?.name || "Customer"}
                        </p>
                        <p className="text-xs text-gray-500">{order.customer?.email}</p>
                      </td>

                      <td className="px-8 py-6 text-sm font-bold">
                        Rs. {order.totalAmount || 0}
                      </td>

                      <td className="px-8 py-6">
                        <select
                          value={order.status}
                          onChange={async (e) => {
                            await apiRequest(`/api/admin/orders/${order._id}/status`, {
                              method: "PATCH",
                              token: user?.token,
                              body: JSON.stringify({ status: e.target.value }),
                            });
                            fetchOrders();
                          }}
                          className="bg-gray-50 border border-gray-200 rounded-lg text-[10px] font-black uppercase px-2 py-1"
                        >
                          {[
                            "PENDING",
                            "ACCEPTED",
                            "PREPARING",
                            "READY_FOR_PICKUP",
                            "PICKED_UP",
                            "ON_THE_WAY",
                            "DELIVERED",
                            "CANCELLED",
                          ].map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-8 py-6">
                        {order.rider ? (
                          <div>
                            <p className="text-sm font-bold">{order.rider.name}</p>
                            <p className="text-[10px] text-gray-500">{order.rider.phone}</p>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setAssigningOrder(order);
                              setShowRiderAssignModal(true);
                            }}
                            className="px-3 py-1 bg-orange-100 text-orange-600 rounded-lg text-[10px] font-black uppercase"
                          >
                            Assign Rider
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeView === "promos" && (
          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-black text-gray-900">Promo Codes</h2>

              <button
                onClick={() => {
                  setEditingPromo(null);
                  setShowPromoForm(true);
                }}
                className="px-6 py-3 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase"
              >
                Add Promo
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase">
                    <th className="px-8 py-4">Code</th>
                    <th className="px-8 py-4">Discount</th>
                    <th className="px-8 py-4">Minimum</th>
                    <th className="px-8 py-4">Limit</th>
                    <th className="px-8 py-4">Expiry</th>
                    <th className="px-8 py-4">Status</th>
                    <th className="px-8 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-50">
                  {promos.map((promo) => (
                    <tr key={promo._id}>
                      <td className="px-8 py-6">
                        <p className="font-black text-gray-900">{promo.code}</p>
                        <p className="text-xs text-gray-500">
                          {promo.title || promo.description || "Promo code"}
                        </p>
                      </td>

                      <td className="px-8 py-6 text-sm font-bold">
                        {promo.discountType === "PERCENTAGE"
                          ? `${promo.discountValue}%`
                          : `Rs. ${promo.discountValue}`}
                      </td>

                      <td className="px-8 py-6 text-sm text-gray-600">
                        Rs. {promo.minOrderAmount || 0}
                      </td>

                      <td className="px-8 py-6 text-sm text-gray-600">
                        {promo.usageLimit || 0} uses
                      </td>

                      <td className="px-8 py-6 text-sm text-gray-600">
                        {promo.expiresAt
                          ? new Date(promo.expiresAt).toLocaleDateString()
                          : "No expiry"}
                      </td>

                      <td className="px-8 py-6">
                        <span
                          className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase ${
                            promo.isActive
                              ? "bg-green-100 text-green-600"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {promo.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingPromo(promo);
                              setShowPromoForm(true);
                            }}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                            title="Edit promo"
                          >
                            <Eye size={18} />
                          </button>

                          <button
                            onClick={() => deletePromo(promo._id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            title="Delete promo"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {promos.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-8 py-12 text-center text-gray-400 font-bold">
                        No promo codes found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeView === "menu-management" && managingMenuFor && (
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveView("restaurants")}
                className="p-3 bg-white rounded-2xl border border-gray-100 shadow-sm"
              >
                <X size={20} />
              </button>

              <div>
                <h2 className="text-2xl font-black uppercase">Menu Management</h2>
                <p className="text-sm font-bold text-gray-400">
                  Restaurant: <span className="text-orange-500">{managingMenuFor.name}</span>
                </p>
              </div>

              <div className="ml-auto flex gap-3">
                <button
                  onClick={() => {
                    setEditingCategory(null);
                    setShowCategoryForm(true);
                  }}
                  className="px-5 py-3 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase"
                >
                  Add Category
                </button>

                <button
                  onClick={() => {
                    setEditingMenuItem(null);
                    setShowMenuItemForm(true);
                  }}
                  className="px-5 py-3 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase"
                >
                  Add Item
                </button>
              </div>
            </div>

            <div className="bg-white rounded-[32px] p-6 border border-gray-100">
              <h3 className="font-black mb-4">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <span
                    key={cat._id}
                    className="px-3 py-2 bg-orange-100 text-orange-700 rounded-xl text-xs font-black"
                  >
                    {cat.name}
                  </span>
                ))}
                {categories.length === 0 && (
                  <span className="text-gray-400 text-sm">No categories yet.</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {menuItems.map((item) => (
                <div
                  key={item._id}
                  className="bg-white rounded-[32px] border border-gray-100 overflow-hidden"
                >
                  <img
                    src={item.image || "https://via.placeholder.com/300x200?text=Food"}
                    className="w-full h-44 object-cover"
                  />

                  <div className="p-6">
                    <div className="flex justify-between">
                      <h4 className="font-black">{item.name}</h4>
                      <p className="font-black text-orange-500">Rs. {item.price}</p>
                    </div>

                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                      {item.description}
                    </p>

                    <p className="text-[10px] font-black text-gray-400 mt-3 uppercase">
                      {item.category?.name || "No Category"}
                    </p>

                    <div className="flex justify-between mt-5 pt-4 border-t">
                      <span
                        className={`text-[10px] font-black uppercase ${
                          item.isAvailable ? "text-green-600" : "text-red-500"
                        }`}
                      >
                        {item.isAvailable ? "Available" : "Sold Out"}
                      </span>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingMenuItem(item);
                            setShowMenuItemForm(true);
                          }}
                          className="text-blue-500"
                        >
                          <Eye size={16} />
                        </button>

                        <button
                          onClick={async () => {
                            if (window.confirm("Delete this item?")) {
                              await apiRequest(`/api/admin/menu-items/${item._id}`, {
                                method: "DELETE",
                                token: user?.token,
                              });
                              fetchMenuItems(managingMenuFor._id);
                            }
                          }}
                          className="text-red-500"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {menuItems.length === 0 && (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-100 rounded-[40px]">
                  <ShoppingBag size={40} className="mx-auto text-gray-200 mb-4" />
                  <p className="text-gray-400 font-bold">No menu items found.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {["payments", "banners", "zones", "settings"].includes(activeView) && (
          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-20 flex flex-col items-center justify-center text-center">
            <Store size={40} className="text-gray-300 mb-6" />
            <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase">
              {activeView} Section
            </h2>
            <p className="text-gray-500 max-w-sm">
              This module is currently under development.
            </p>
          </div>
        )}

        {showRestaurantForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[40px] w-full max-w-2xl max-h-[90vh] overflow-hidden"
            >
              <div className="p-8 bg-gray-900 text-white flex justify-between">
                <h3 className="text-xl font-black uppercase">
                  {editingRestaurant ? "Edit Restaurant" : "Add Restaurant"}
                </h3>
                <button onClick={() => setShowRestaurantForm(false)}>
                  <X />
                </button>
              </div>

              <form
                className="p-8 space-y-5 overflow-y-auto max-h-[75vh]"
                onSubmit={async (e) => {
                  e.preventDefault();

                  const formData = new FormData(e.currentTarget);

                  const data = {
                    name: formData.get("name"),
                    owner: formData.get("owner"),
                    address: formData.get("address"),
                    city: formData.get("city"),
                    cuisine: String(formData.get("cuisine") || "")
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                    openingHours: {
                      open: formData.get("openTime"),
                      close: formData.get("closeTime"),
                    },
                    deliveryFee: Number(formData.get("deliveryFee")),
                    minimumOrder: Number(formData.get("minimumOrder")),
                    estimatedDeliveryTime: Number(formData.get("estimatedDeliveryTime")),
                    priceLevel: formData.get("priceLevel"),
                    tags: String(formData.get("tags") || "")
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                    status: formData.get("status"),
                    isOpen: formData.get("isOpen") === "on",
                  };

                  const url = editingRestaurant
                    ? `/api/admin/restaurants/${editingRestaurant._id}`
                    : "/api/admin/restaurants";

                  const method = editingRestaurant ? "PUT" : "POST";

                  await apiRequest(url, {
                    method,
                    token: user?.token,
                    body: JSON.stringify(data),
                  });

                  setShowRestaurantForm(false);
                  fetchRestaurants();
                  fetchStats();
                }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    name="name"
                    required
                    placeholder="Restaurant name"
                    defaultValue={editingRestaurant?.name}
                    className="px-4 py-3 bg-gray-50 rounded-xl border"
                  />

                  <input
                    name="owner"
                    required
                    placeholder="Owner ID"
                    defaultValue={
                      typeof editingRestaurant?.owner === "object"
                        ? editingRestaurant?.owner?._id
                        : editingRestaurant?.owner
                    }
                    className="px-4 py-3 bg-gray-50 rounded-xl border"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    name="city"
                    placeholder="City"
                    defaultValue={editingRestaurant?.address?.city}
                    className="px-4 py-3 bg-gray-50 rounded-xl border"
                  />

                  <input
                    name="address"
                    required
                    placeholder="Address"
                    defaultValue={editingRestaurant?.address?.text}
                    className="px-4 py-3 bg-gray-50 rounded-xl border"
                  />
                </div>

                <input
                  name="cuisine"
                  required
                  placeholder="Cuisine: Nepali, Indian, Chinese"
                  defaultValue={editingRestaurant?.cuisine?.join(", ")}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    name="openTime"
                    placeholder="Open time"
                    defaultValue={editingRestaurant?.openingHours?.open || "09:00"}
                    className="px-4 py-3 bg-gray-50 rounded-xl border"
                  />

                  <input
                    name="closeTime"
                    placeholder="Close time"
                    defaultValue={editingRestaurant?.openingHours?.close || "22:00"}
                    className="px-4 py-3 bg-gray-50 rounded-xl border"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <input
                    name="deliveryFee"
                    type="number"
                    placeholder="Delivery fee"
                    defaultValue={editingRestaurant?.deliveryFee || 50}
                    className="px-4 py-3 bg-gray-50 rounded-xl border"
                  />

                  <input
                    name="minimumOrder"
                    type="number"
                    placeholder="Minimum order"
                    defaultValue={editingRestaurant?.minimumOrder || 0}
                    className="px-4 py-3 bg-gray-50 rounded-xl border"
                  />

                  <input
                    name="estimatedDeliveryTime"
                    type="number"
                    placeholder="ETA"
                    defaultValue={editingRestaurant?.estimatedDeliveryTime || 30}
                    className="px-4 py-3 bg-gray-50 rounded-xl border"
                  />
                </div>

                <input
                  name="tags"
                  placeholder="Tags: fast delivery, momo, popular"
                  defaultValue={editingRestaurant?.tags?.join(", ")}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <select
                    name="priceLevel"
                    defaultValue={editingRestaurant?.priceLevel || "MEDIUM"}
                    className="px-4 py-3 bg-gray-50 rounded-xl border"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                  </select>

                  <select
                    name="status"
                    defaultValue={editingRestaurant?.status || "approved"}
                    className="px-4 py-3 bg-gray-50 rounded-xl border"
                  >
                    <option value="pending_review">PENDING_REVIEW</option>
                    <option value="approved">APPROVED</option>
                    <option value="rejected">REJECTED</option>
                    <option value="suspended">SUSPENDED</option>
                  </select>
                </div>

                <label className="flex items-center gap-3 font-bold text-sm">
                  <input
                    name="isOpen"
                    type="checkbox"
                    defaultChecked={editingRestaurant?.isOpen ?? true}
                  />
                  Restaurant open now
                </label>

                <button
                  type="submit"
                  className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black uppercase"
                >
                  {editingRestaurant ? "Update Restaurant" : "Save Restaurant"}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {showPromoForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[40px] w-full max-w-2xl max-h-[90vh] overflow-hidden"
            >
              <div className="p-8 bg-gray-900 text-white flex justify-between">
                <h3 className="text-xl font-black uppercase">
                  {editingPromo ? "Edit Promo" : "Add Promo"}
                </h3>
                <button
                  onClick={() => {
                    setShowPromoForm(false);
                    setEditingPromo(null);
                  }}
                >
                  <X />
                </button>
              </div>

              <form
                className="p-8 space-y-5 overflow-y-auto max-h-[75vh]"
                onSubmit={savePromo}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    name="code"
                    required
                    placeholder="Promo code e.g. SAVE50"
                    defaultValue={editingPromo?.code}
                    className="px-4 py-3 bg-gray-50 rounded-xl border uppercase"
                  />

                  <select
                    name="discountType"
                    defaultValue={editingPromo?.discountType || "FIXED"}
                    className="px-4 py-3 bg-gray-50 rounded-xl border"
                  >
                    <option value="FIXED">FIXED</option>
                    <option value="PERCENTAGE">PERCENTAGE</option>
                  </select>
                </div>

                <input
                  name="title"
                  required
                  placeholder="Promo title"
                  defaultValue={editingPromo?.title}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border"
                />

                <textarea
                  name="description"
                  placeholder="Description"
                  defaultValue={editingPromo?.description}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border"
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <input
                    name="discountValue"
                    type="number"
                    required
                    placeholder="Discount value"
                    defaultValue={editingPromo?.discountValue || 0}
                    className="px-4 py-3 bg-gray-50 rounded-xl border"
                  />

                  <input
                    name="maxDiscount"
                    type="number"
                    placeholder="Max discount"
                    defaultValue={editingPromo?.maxDiscount || 0}
                    className="px-4 py-3 bg-gray-50 rounded-xl border"
                  />

                  <input
                    name="minOrderAmount"
                    type="number"
                    placeholder="Min order"
                    defaultValue={editingPromo?.minOrderAmount || 0}
                    className="px-4 py-3 bg-gray-50 rounded-xl border"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <input
                    name="usageLimit"
                    type="number"
                    placeholder="Usage limit"
                    defaultValue={editingPromo?.usageLimit || 100}
                    className="px-4 py-3 bg-gray-50 rounded-xl border"
                  />

                  <input
                    name="perUserLimit"
                    type="number"
                    placeholder="Per user limit"
                    defaultValue={editingPromo?.perUserLimit || 1}
                    className="px-4 py-3 bg-gray-50 rounded-xl border"
                  />

                  <input
                    name="expiresAt"
                    type="date"
                    defaultValue={formatDateForInput(editingPromo?.expiresAt)}
                    className="px-4 py-3 bg-gray-50 rounded-xl border"
                  />
                </div>

                <label className="flex items-center gap-3 font-bold text-sm">
                  <input
                    name="isActive"
                    type="checkbox"
                    defaultChecked={editingPromo?.isActive ?? true}
                  />
                  Promo active
                </label>

                <button
                  type="submit"
                  className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black uppercase"
                >
                  {editingPromo ? "Update Promo" : "Save Promo"}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {showCategoryForm && managingMenuFor && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[32px] w-full max-w-md overflow-hidden"
            >
              <div className="p-6 bg-gray-900 text-white flex justify-between">
                <h3 className="font-black uppercase">Category</h3>
                <button onClick={() => setShowCategoryForm(false)}>
                  <X />
                </button>
              </div>

              <form
                className="p-6 space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();

                  const formData = new FormData(e.currentTarget);

                  const data = {
                    restaurant: managingMenuFor._id,
                    name: formData.get("name"),
                    description: formData.get("description"),
                    order: Number(formData.get("order")),
                  };

                  const url = editingCategory
                    ? `/api/admin/categories/${editingCategory._id}`
                    : "/api/admin/categories";

                  const method = editingCategory ? "PUT" : "POST";

                  await apiRequest(url, {
                    method,
                    token: user?.token,
                    body: JSON.stringify(data),
                  });

                  setShowCategoryForm(false);
                  setEditingCategory(null);
                  fetchCategories(managingMenuFor._id);
                }}
              >
                <input
                  name="name"
                  required
                  placeholder="Category name"
                  defaultValue={editingCategory?.name}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border"
                />

                <input
                  name="description"
                  placeholder="Description"
                  defaultValue={editingCategory?.description}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border"
                />

                <input
                  name="order"
                  type="number"
                  defaultValue={editingCategory?.order || 0}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border"
                />

                <button
                  type="submit"
                  className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black uppercase"
                >
                  Save Category
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {showMenuItemForm && managingMenuFor && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[40px] w-full max-w-2xl max-h-[90vh] overflow-hidden"
            >
              <div className="p-8 bg-gray-900 text-white flex justify-between">
                <h3 className="text-xl font-black uppercase">
                  {editingMenuItem ? "Edit Menu Item" : "Add Menu Item"}
                </h3>
                <button onClick={() => setShowMenuItemForm(false)}>
                  <X />
                </button>
              </div>

              <form
                className="p-8 space-y-5 overflow-y-auto max-h-[75vh]"
                onSubmit={async (e) => {
                  e.preventDefault();

                  const formData = new FormData(e.currentTarget);

                  const data = {
                    restaurant: managingMenuFor._id,
                    name: formData.get("name"),
                    description: formData.get("description"),
                    price: Number(formData.get("price")),
                    category: formData.get("category"),
                    image: formData.get("image"),
                    isVegetarian: formData.get("isVegetarian") === "on",
                    isAvailable: formData.get("isAvailable") === "on",
                    spicyLevel: Number(formData.get("spicyLevel")),
                  };

                  const url = editingMenuItem
                    ? `/api/admin/menu-items/${editingMenuItem._id}`
                    : "/api/admin/menu-items";

                  const method = editingMenuItem ? "PUT" : "POST";

                  await apiRequest(url, {
                    method,
                    token: user?.token,
                    body: JSON.stringify(data),
                  });

                  setShowMenuItemForm(false);
                  setEditingMenuItem(null);
                  fetchMenuItems(managingMenuFor._id);
                }}
              >
                <input
                  name="name"
                  required
                  placeholder="Item name"
                  defaultValue={editingMenuItem?.name}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border"
                />

                <select
                  name="category"
                  required
                  defaultValue={
                    typeof editingMenuItem?.category === "object"
                      ? editingMenuItem?.category?._id
                      : editingMenuItem?.category || ""
                  }
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>

                <textarea
                  name="description"
                  placeholder="Description"
                  defaultValue={editingMenuItem?.description}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border"
                />

                <input
                  name="price"
                  type="number"
                  required
                  placeholder="Price"
                  defaultValue={editingMenuItem?.price}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border"
                />

                <input
                  name="spicyLevel"
                  type="number"
                  min="0"
                  max="3"
                  defaultValue={editingMenuItem?.spicyLevel || 0}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border"
                />

                <input
                  name="image"
                  placeholder="Image URL"
                  defaultValue={editingMenuItem?.image}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border"
                />

                <div className="flex gap-8">
                  <label className="flex items-center gap-3 font-bold text-sm">
                    <input
                      name="isVegetarian"
                      type="checkbox"
                      defaultChecked={editingMenuItem?.isVegetarian}
                    />
                    Vegetarian
                  </label>

                  <label className="flex items-center gap-3 font-bold text-sm">
                    <input
                      name="isAvailable"
                      type="checkbox"
                      defaultChecked={editingMenuItem?.isAvailable ?? true}
                    />
                    Available
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black uppercase"
                >
                  Save Item
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {showRiderAssignModal && assigningOrder && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden"
            >
              <div className="p-8 bg-gray-900 text-white flex justify-between">
                <h3 className="text-xl font-black uppercase">Assign Rider</h3>
                <button onClick={() => setShowRiderAssignModal(false)}>
                  <X />
                </button>
              </div>

              <div className="p-8 space-y-4">
                <div className="p-5 bg-orange-50 rounded-3xl">
                  <p className="font-bold">
                    #{assigningOrder._id.slice(-6).toUpperCase()} •{" "}
                    {assigningOrder.restaurant?.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {assigningOrder.deliveryAddress?.text}
                  </p>
                </div>

                {riders
                  .filter(
                    (r) =>
                      r.role === "RIDER" &&
                      r.riderApplicationStatus === "approved"
                  )
                  .map((rider) => (
                    <button
                      key={rider._id}
                      onClick={() => assignRider(assigningOrder._id, rider._id)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-orange-50"
                    >
                      <div className="text-left">
                        <p className="font-bold text-sm">{rider.name || "Rider"}</p>
                        <p className="text-xs text-gray-500">{rider.phone}</p>
                      </div>
                      <ChevronRight size={18} />
                    </button>
                  ))}

                {riders.filter(
                  (r) =>
                    r.role === "RIDER" &&
                    r.riderApplicationStatus === "approved"
                ).length === 0 && (
                  <p className="text-center py-6 text-gray-400 font-bold">
                    No approved riders found.
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
};