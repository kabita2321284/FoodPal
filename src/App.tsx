import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell,
  X as XIcon,
  CheckCircle2,
  XCircle,
  ShoppingBag,
  Home as HomeIcon,
  RefreshCw,
} from "lucide-react";

import { FavoritesPage } from "./pages/FavoritesPage";
import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { Navbar } from "./components/Navbar";
import { Home } from "./pages/Home";
import { LoginPage } from "./pages/LoginPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RestaurantDetail } from "./pages/RestaurantDetail";
import { RestaurantDashboard } from "./pages/RestaurantDashboard";
import { RestaurantRegister } from "./pages/RestaurantRegister";
import { RiderDashboard } from "./pages/RiderDashboard";
import { RiderOnboarding } from "./pages/RiderOnboarding";
import { AdminDashboard } from "./pages/AdminDashboard";
import { OrderTracking } from "./pages/OrderTracking";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { ProtectedRoute } from "./components/ProtectedRoute";

import { getSocket } from "./lib/socket";
import { useAuth } from "./contexts/AuthContext";

const PaymentStatusPage: React.FC<{ type: "success" | "failed" }> = ({
  type,
}) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const orderId = searchParams.get("orderId");
  const isSuccess = type === "success";

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      className="min-h-[70vh] bg-gray-50 px-4 py-20 flex items-center justify-center"
    >
      <div className="w-full max-w-xl bg-white rounded-[36px] shadow-xl border border-gray-100 p-8 md:p-12 text-center">
        <div
          className={`mx-auto mb-6 w-24 h-24 rounded-full flex items-center justify-center ${
            isSuccess
              ? "bg-green-100 text-green-600"
              : "bg-red-100 text-red-600"
          }`}
        >
          {isSuccess ? <CheckCircle2 size={52} /> : <XCircle size={52} />}
        </div>

        <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
          {isSuccess ? "Payment Successful!" : "Payment Failed"}
        </h1>

        <p className="mt-4 text-gray-500 font-medium leading-relaxed">
          {isSuccess
            ? "Your payment has been completed successfully. Your FoodPal order is now being processed."
            : "Your payment was cancelled or could not be completed. No worries, you can try again from your cart."}
        </p>

        {orderId && (
          <div className="mt-6 bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <p className="text-xs uppercase tracking-widest text-gray-400 font-black">
              Order ID
            </p>
            <p className="mt-1 text-sm font-bold text-gray-900 break-all">
              #{orderId.slice(-8).toUpperCase()}
            </p>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {isSuccess && orderId ? (
            <button
              onClick={() => navigate(`/order/${orderId}/track`)}
              className="h-14 rounded-2xl bg-orange-500 text-white font-black flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-lg shadow-orange-200"
            >
              <ShoppingBag size={20} />
              Track Order
            </button>
          ) : (
            <button
              onClick={() => navigate("/cart")}
              className="h-14 rounded-2xl bg-orange-500 text-white font-black flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-lg shadow-orange-200"
            >
              <RefreshCw size={20} />
              Try Again
            </button>
          )}

          <button
            onClick={() => navigate("/")}
            className="h-14 rounded-2xl bg-gray-100 text-gray-800 font-black flex items-center justify-center gap-2 hover:bg-gray-200 transition-all"
          >
            <HomeIcon size={20} />
            Go Home
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Shared Layout Wrapper
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (!user) return;

    const socket = getSocket();
    if (!socket) return;

    const userId = user.id || user._id;

    if (!userId) {
      console.warn("Socket join skipped: user id missing", user);
      return;
    }

    console.log("Joining socket as:", user);

    socket.emit("user:join", userId);

    const handleNotification = (data: any) => {
      const id = Date.now();

      setNotifications((prev) => [...prev, { ...data, id }]);

      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 5000);
    };

    const handleNewOrder = (order: any) => {
      if (user.role === "ADMIN") {
        handleNotification({
          title: "New Order Received!",
          message: `Order #${order._id?.slice(-6).toUpperCase()} placed by ${
            order.customer?.name || "Customer"
          }`,
        });
      }
    };

    socket.on("notification", handleNotification);
    socket.on("order:new", handleNewOrder);

    return () => {
      socket.off("notification", handleNotification);
      socket.off("order:new", handleNewOrder);
    };
  }, [user]);

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-orange-200 selection:text-orange-900">
      <Navbar />

      <div className="fixed top-24 right-6 z-[100] space-y-4 w-full max-w-sm pointer-events-none">
        <AnimatePresence>
          {notifications.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className="bg-white rounded-[24px] shadow-2xl p-6 border border-orange-100 flex items-start gap-4 pointer-events-auto"
            >
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 flex-shrink-0">
                <Bell size={20} />
              </div>

              <div className="flex-1">
                <h4 className="font-black text-gray-900 text-sm">
                  {note.title}
                </h4>
                <p className="text-xs text-gray-500 font-medium leading-relaxed mt-1">
                  {note.message}
                </p>
              </div>

              <button
                onClick={() =>
                  setNotifications((prev) =>
                    prev.filter((n) => n.id !== note.id)
                  )
                }
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400"
              >
                <XIcon size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <main>
        <AnimatePresence mode="wait">{children}</AnimatePresence>
      </main>

      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">F</span>
              </div>
              <span className="text-xl font-bold tracking-tight">FoodPal</span>
            </div>

            <p className="text-gray-400 text-sm leading-relaxed">
              Leading the high-quality food delivery revolution in Nepal.
              Quality ingredients, fast delivery.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-4 uppercase text-xs tracking-widest text-orange-500">
              Quick Links
            </h4>

            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <button className="hover:text-white transition-colors">
                  About Us
                </button>
              </li>

              <li>
                <button
                  onClick={() =>
                    fetch("/api/seed/seed").then(() => window.location.reload())
                  }
                  className="hover:text-orange-500 transition-colors font-bold"
                >
                  Seed Data (Dev Only)
                </button>
              </li>

              <li>
                <Link
                  to="/rider/onboarding"
                  className="hover:text-white transition-colors"
                >
                  Become a Rider
                </Link>
              </li>

              <li>
                <Link
                  to="/restaurant/register"
                  className="hover:text-white transition-colors"
                >
                  Partner with Us
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 uppercase text-xs tracking-widest text-orange-500">
              Support
            </h4>

            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <button className="hover:text-white transition-colors">
                  Help Center
                </button>
              </li>
              <li>
                <button className="hover:text-white transition-colors">
                  Terms of Service
                </button>
              </li>
              <li>
                <button className="hover:text-white transition-colors">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button className="hover:text-white transition-colors">
                  Refund Policy
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 uppercase text-xs tracking-widest text-orange-500">
              Connect
            </h4>

            <div className="flex gap-4">
              {["FB", "IG", "TW", "LI"].map((social) => (
                <button
                  key={social}
                  className="w-10 h-10 rounded-full border border-gray-800 flex items-center justify-center hover:bg-orange-500 hover:border-orange-500 transition-all"
                >
                  {social}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-gray-800 text-center text-gray-500 text-xs">
          © {new Date().getFullYear()} FoodPal Nepal. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<LoginPage />} />

              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />

              <Route path="/restaurant/:id" element={<RestaurantDetail />} />
              <Route path="/cart" element={<CartPage />} />

              <Route
                path="/favorites"
                element={
                  <ProtectedRoute>
                    <FavoritesPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/checkout"
                element={
                  <ProtectedRoute>
                    <CheckoutPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/payment-success"
                element={
                  <ProtectedRoute>
                    <PaymentStatusPage type="success" />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/payment-failed"
                element={
                  <ProtectedRoute>
                    <PaymentStatusPage type="failed" />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/restaurant/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["RESTAURANT", "ADMIN"]}>
                    <RestaurantDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/restaurant/register"
                element={
                  <ProtectedRoute>
                    <RestaurantRegister />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/rider/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["RIDER", "ADMIN"]}>
                    <RiderDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/rider/onboarding"
                element={
                  <ProtectedRoute>
                    <RiderOnboarding />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["ADMIN"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/order/:id/track"
                element={
                  <ProtectedRoute>
                    <OrderTracking />
                  </ProtectedRoute>
                }
              />

              <Route
                path="*"
                element={
                  <div className="flex items-center justify-center min-h-[60vh] font-bold text-2xl uppercase tracking-tighter">
                    404 - Page Not Found
                  </div>
                }
              />
            </Routes>
          </AppLayout>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}