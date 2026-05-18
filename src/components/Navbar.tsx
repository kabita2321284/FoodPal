import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ShoppingCart,
  User,
  Search,
  MapPin,
  LogOut,
  ChevronDown,
  ShoppingBag,
  Bike,
  Store,
  ShieldAlert,
  Heart,
} from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";

export const Navbar: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { items } = useCart();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayName = user?.name || user?.email || "User";
  const avatarInitial = displayName ? displayName.charAt(0).toUpperCase() : "U";
  const displayRole = user?.role === "user" ? "customer" : user?.role || "customer";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setIsProfileOpen(false);
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
                <span className="text-white font-bold text-xl">F</span>
              </div>
              <span className="text-2xl font-black tracking-tight text-gray-900 hidden sm:block">
                Food<span className="text-orange-500">Pal</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-full cursor-pointer hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200">
              <MapPin size={16} className="text-orange-500" />
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Kathmandu
              </span>
            </div>
          </div>

          <div className="hidden lg:flex flex-1 max-w-md mx-8">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const q = (e.currentTarget.elements.namedItem("search") as HTMLInputElement).value;
                navigate(`/?q=${encodeURIComponent(q)}`);
              }}
              className="relative w-full"
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                name="search"
                type="text"
                placeholder={t("common.search_placeholder")}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 rounded-2xl transition-all outline-none text-sm font-medium shadow-inner"
              />
            </form>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>

            {user && (
              <Link
                to="/favorites"
                className="relative p-2.5 text-gray-600 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all active:scale-95"
                title="Favorites"
              >
                <Heart size={22} />
              </Link>
            )}

            <Link
              to="/cart"
              className="relative p-2.5 text-gray-600 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-all active:scale-95"
            >
              <ShoppingCart size={22} />
              {items.length > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-orange-600 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white shadow-sm"
                >
                  {items.length}
                </motion.span>
              )}
            </Link>

            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 p-1.5 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-white hover:border-orange-200 hover:shadow-md transition-all active:scale-95 group"
                >
                  <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 overflow-hidden font-black border-2 border-white shadow-sm">
                    {user.avatar ? (
                      <img src={user.avatar} className="w-full h-full object-cover" />
                    ) : (
                      avatarInitial
                    )}
                  </div>

                  <div className="hidden md:block text-left mr-2">
                    <p className="text-xs font-black text-gray-900 leading-none mb-1">
                      {displayName}
                    </p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {displayRole}
                    </p>
                  </div>

                  <ChevronDown
                    size={14}
                    className={`text-gray-400 transition-transform hidden md:block ${
                      isProfileOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-72 bg-white rounded-[32px] shadow-2xl shadow-gray-200 border border-gray-100 overflow-hidden py-4 z-50"
                    >
                      <div className="px-6 py-4 border-b border-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-orange-100">
                            {avatarInitial}
                          </div>
                          <div>
                            <h4 className="font-black text-gray-900 leading-tight">
                              {displayName}
                            </h4>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                              {displayRole === "customer" ? "Premium Member" : displayRole}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="px-2 py-2">
                        <Link
                          to="/profile"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-gray-600 hover:bg-orange-50 hover:text-orange-600 transition-all group"
                        >
                          <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-white border border-transparent group-hover:border-orange-100">
                            <User size={16} />
                          </div>
                          <span>My Profile</span>
                        </Link>

                        <Link
                          to="/favorites"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-gray-600 hover:bg-red-50 hover:text-red-500 transition-all group"
                        >
                          <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-white border border-transparent group-hover:border-red-100 text-red-500">
                            <Heart size={16} />
                          </div>
                          <span>Favorites</span>
                        </Link>

                        <Link
                          to="/profile?tab=orders"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-gray-600 hover:bg-orange-50 hover:text-orange-600 transition-all group"
                        >
                          <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-white border border-transparent group-hover:border-orange-100">
                            <ShoppingBag size={16} />
                          </div>
                          <span>Order History</span>
                        </Link>

                        {user.role === "ADMIN" && (
                          <Link
                            to="/admin/dashboard"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-all group"
                          >
                            <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-white border border-transparent group-hover:border-blue-100 text-blue-500">
                              <ShieldAlert size={16} />
                            </div>
                            <span>Admin Portal</span>
                          </Link>
                        )}

                        {(displayRole === "customer" || user.role === "ADMIN") && (
                          <>
                            <Link
                              to="/rider/onboarding"
                              onClick={() => setIsProfileOpen(false)}
                              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-gray-600 hover:bg-purple-50 hover:text-purple-600 transition-all group"
                            >
                              <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-white border border-transparent group-hover:border-purple-100 text-purple-500">
                                <Bike size={16} />
                              </div>
                              <span>Become a Rider</span>
                            </Link>

                            <Link
                              to="/restaurant/register"
                              onClick={() => setIsProfileOpen(false)}
                              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 transition-all group"
                            >
                              <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-white border border-transparent group-hover:border-emerald-100 text-emerald-500">
                                <Store size={16} />
                              </div>
                              <span>Register Restaurant</span>
                            </Link>
                          </>
                        )}

                        {user.role === "RIDER" && (
                          <Link
                            to="/rider/dashboard"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-gray-600 hover:bg-purple-50 hover:text-purple-600 transition-all group"
                          >
                            <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-white border border-transparent group-hover:border-purple-100 text-purple-500">
                              <Bike size={16} />
                            </div>
                            <span>Rider Dashboard</span>
                          </Link>
                        )}

                        {user.role === "RESTAURANT" && (
                          <Link
                            to="/restaurant/dashboard"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 transition-all group"
                          >
                            <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-white border border-transparent group-hover:border-emerald-100 text-emerald-500">
                              <Store size={16} />
                            </div>
                            <span>Partner Dashboard</span>
                          </Link>
                        )}

                        <div className="sm:hidden">
                          <div className="px-4 py-3">
                            <LanguageSwitcher />
                          </div>
                        </div>
                      </div>

                      <div className="px-4 py-2 mt-2 border-t border-gray-50">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-red-500 hover:bg-red-50 hover:text-red-600 transition-all group"
                        >
                          <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center group-hover:bg-white border border-transparent group-hover:border-red-100">
                            <LogOut size={16} />
                          </div>
                          <span>Logout Session</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-8 py-3 bg-gray-900 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-orange-500 transition-all shadow-xl shadow-gray-200 active:scale-95"
              >
                {t("common.login")}
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};