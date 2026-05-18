import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().min(10, "Invalid phone number"),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const { login, register, clearError, error: authError } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = searchParams.get("redirect") || "/";

  React.useEffect(() => {
    if (authError?.includes("Account already exists")) {
      const timer = setTimeout(() => {
        setIsLogin(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [authError]);

  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const {
    register: regRegister,
    handleSubmit: handleRegSubmit,
    formState: { errors: regErrors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
    },
  });

  const redirectByRole = (role: string) => {
    if (role === "ADMIN") {
      navigate("/admin/dashboard");
    } else if (role === "RESTAURANT") {
      navigate("/restaurant/dashboard");
    } else if (role === "RIDER") {
      navigate("/rider/dashboard");
    } else {
      navigate(redirectTo || "/");
    }
  };

  const onLogin = async (data: LoginFormValues) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    console.log("LoginPage: Starting login request...");

    try {
      const loggedInUser = await login(data.email, data.password);
      console.log("LoginPage: Login successful, Role:", loggedInUser.role);

      redirectByRole(loggedInUser.role);
    } catch (err) {
      console.error("LoginPage: Login failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onRegister = async (data: RegisterFormValues) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    console.log("LoginPage: Starting registration request...");

    try {
      const registeredUser = await register(
        data.name,
        data.email,
        data.password,
        data.phone
      );

      console.log(
        "LoginPage: Registration successful, Role:",
        registeredUser.role
      );

      navigate("/");
    } catch (err) {
      console.error("LoginPage: Registration failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-orange-50/30 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="flex bg-white rounded-t-[40px] border-x border-t border-orange-100 overflow-hidden">
          <button
            onClick={() => {
              setIsLogin(true);
              clearError();
            }}
            className={`flex-1 py-6 text-sm font-black uppercase tracking-widest transition-all ${
              isLogin
                ? "bg-white text-orange-500 border-b-4 border-orange-500"
                : "bg-gray-50 text-gray-400 hover:bg-gray-100"
            }`}
          >
            {t("common.login")}
          </button>

          <button
            onClick={() => {
              setIsLogin(false);
              clearError();
            }}
            className={`flex-1 py-6 text-sm font-black uppercase tracking-widest transition-all ${
              !isLogin
                ? "bg-white text-orange-500 border-b-4 border-orange-500"
                : "bg-gray-50 text-gray-400 hover:bg-gray-100"
            }`}
          >
            {t("common.signup")}
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-b-[40px] shadow-2xl shadow-orange-100 p-8 sm:p-12 border border-orange-100"
        >
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">
              {isLogin ? "Welcome Back" : "Create Account"}
            </h2>

            <p className="mt-2 text-gray-500 text-sm">
              {isLogin
                ? "Nepal's favorite food app is waiting"
                : "Join the biggest food community in Nepal"}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {authError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3 text-red-600 text-sm font-bold"
              >
                <AlertCircle size={18} />
                {authError}
              </motion.div>
            )}
          </AnimatePresence>

          {isLogin ? (
            <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                  Email Address
                </label>

                <div className="relative">
                  <input
                    {...loginRegister("email")}
                    type="email"
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-orange-500 rounded-2xl outline-none transition-all text-gray-900 text-sm"
                    placeholder="name@example.com"
                  />

                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                </div>

                {loginErrors.email && (
                  <p className="mt-1 text-xs text-red-500 ml-1 font-bold">
                    {loginErrors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                  Password
                </label>

                <div className="relative">
                  <input
                    {...loginRegister("password")}
                    type="password"
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-orange-500 rounded-2xl outline-none transition-all text-gray-900 text-sm"
                    placeholder="••••••••"
                  />

                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                </div>

                {loginErrors.password && (
                  <p className="mt-1 text-xs text-red-500 ml-1 font-bold">
                    {loginErrors.password.message}
                  </p>
                )}
              </div>

              <button
                disabled={isSubmitting}
                type="submit"
                className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-xl shadow-orange-200 disabled:opacity-70 disabled:cursor-not-allowed group active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight
                      size={20}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegSubmit(onRegister)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                  Full Name
                </label>

                <div className="relative">
                  <input
                    {...regRegister("name")}
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-orange-500 rounded-2xl outline-none transition-all text-gray-900 text-sm"
                    placeholder="John Doe"
                  />

                  <User
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                </div>

                {regErrors.name && (
                  <p className="mt-1 text-xs text-red-500 ml-1 font-bold">
                    {regErrors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                  Email
                </label>

                <div className="relative">
                  <input
                    {...regRegister("email")}
                    type="email"
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-orange-500 rounded-2xl outline-none transition-all text-gray-900 text-sm"
                    placeholder="name@example.com"
                  />

                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                </div>

                {regErrors.email && (
                  <p className="mt-1 text-xs text-red-500 ml-1 font-bold">
                    {regErrors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                  Phone
                </label>

                <div className="relative">
                  <input
                    {...regRegister("phone")}
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-orange-500 rounded-2xl outline-none transition-all text-gray-900 text-sm"
                    placeholder="98XXXXXXXX"
                  />

                  <Phone
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                </div>

                {regErrors.phone && (
                  <p className="mt-1 text-xs text-red-500 ml-1 font-bold">
                    {regErrors.phone.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                  Password
                </label>

                <div className="relative">
                  <input
                    {...regRegister("password")}
                    type="password"
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-orange-500 rounded-2xl outline-none transition-all text-gray-900 text-sm"
                    placeholder="••••••••"
                  />

                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                </div>

                {regErrors.password && (
                  <p className="mt-1 text-xs text-red-500 ml-1 font-bold">
                    {regErrors.password.message}
                  </p>
                )}
              </div>

              <div className="pt-2">
                <button
                  disabled={isSubmitting}
                  type="submit"
                  className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-xl shadow-orange-200 disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    "Create Account"
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
};