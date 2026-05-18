import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Trash2,
  ShoppingBag,
  Plus,
  Minus,
  ArrowRight,
  Banknote,
  Wallet,
  CreditCard,
} from "lucide-react";
import { useCart } from "../contexts/CartContext";

type PaymentMethod = "CASH" | "STRIPE" | "ESEWA" | "KHALTI";

const isValidPaymentMethod = (value: string | null): value is PaymentMethod => {
  return value === "CASH" || value === "STRIPE" || value === "ESEWA" || value === "KHALTI";
};

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, updateQuantity, removeFromCart, total } = useCart();

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(() => {
    const saved = localStorage.getItem("foodpal_payment_method");
    return isValidPaymentMethod(saved) ? saved : "CASH";
  });

  const platformFee = 20;
  const deliveryFee = 0;
  const grandTotal = total + platformFee + deliveryFee;

  const handlePaymentSelect = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
    localStorage.setItem("foodpal_payment_method", method);
  };

  const handleProceedToCheckout = () => {
    localStorage.setItem("foodpal_payment_method", selectedPaymentMethod);
    navigate("/checkout", {
      state: {
        paymentMethod: selectedPaymentMethod,
      },
    });
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pt-28 px-6">
        <div className="max-w-3xl mx-auto bg-white rounded-[40px] shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag size={42} className="text-orange-500" />
          </div>

          <h1 className="text-4xl font-black text-gray-900 mb-3">Your cart is empty</h1>

          <p className="text-gray-500 font-semibold mb-8">
            Add delicious food from your favourite restaurants.
          </p>

          <button
            onClick={() => navigate("/")}
            className="bg-orange-500 hover:bg-orange-600 text-white px-10 py-4 rounded-2xl font-black transition-all shadow-lg shadow-orange-200"
          >
            Browse Restaurants
          </button>
        </div>
      </div>
    );
  }

  const paymentMethods: {
    id: PaymentMethod;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "CASH",
      label: "Cash",
      icon: <Banknote size={22} />,
    },
    {
      id: "STRIPE",
      label: "Card",
      icon: <CreditCard size={22} />,
    },
    {
      id: "ESEWA",
      label: "eSewa",
      icon: <Wallet size={22} />,
    },
    {
      id: "KHALTI",
      label: "Khalti",
      icon: (
        <div className="w-6 h-6 rounded-md bg-purple-600 text-white text-xs font-black flex items-center justify-center">
          K
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-28 px-6 pb-20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_470px] gap-10">
        <div className="space-y-6">
          {items.map((item) => (
            <div
              key={item._id}
              className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6"
            >
              <div className="w-32 h-32 rounded-3xl overflow-hidden bg-gray-100 flex-shrink-0">
                <img
                  src={item.image || item.images?.[0] || "/placeholder-food.png"}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder-food.png";
                  }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-black text-gray-900 mb-2">
                  {item.name}
                </h2>

                <p className="text-orange-600 font-black text-lg">
                  Rs. {item.price}
                </p>
              </div>

              <div className="flex items-center gap-4 bg-gray-50 rounded-2xl p-2">
                <button
                  onClick={() => updateQuantity(item._id, Math.max(1, item.quantity - 1))}
                  className="w-12 h-12 rounded-2xl bg-white text-gray-400 hover:text-orange-500 flex items-center justify-center transition-all"
                >
                  <Minus size={18} />
                </button>

                <span className="w-10 text-center font-black text-xl text-gray-900">
                  {item.quantity}
                </span>

                <button
                  onClick={() => updateQuantity(item._id, item.quantity + 1)}
                  className="w-12 h-12 rounded-2xl bg-white text-gray-400 hover:text-orange-500 flex items-center justify-center transition-all"
                >
                  <Plus size={18} />
                </button>
              </div>

              <div className="text-xl font-black text-gray-900 min-w-[90px] text-right">
                Rs. {item.price * item.quantity}
              </div>

              <button
                onClick={() => removeFromCart(item._id)}
                className="w-12 h-12 rounded-2xl bg-red-50 text-red-300 hover:text-red-500 hover:bg-red-100 flex items-center justify-center transition-all"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>

        <div className="lg:sticky lg:top-32 h-fit">
          <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 p-8">
            <h2 className="text-3xl font-black text-gray-900 mb-8">
              Order Summary
            </h2>

            <div className="space-y-5 mb-8">
              <div className="flex items-center justify-between text-lg">
                <span className="text-gray-500 font-bold">Subtotal</span>
                <span className="font-black text-gray-900">Rs. {total}</span>
              </div>

              <div className="flex items-center justify-between text-lg">
                <span className="text-gray-500 font-bold">Delivery Fee</span>
                <span className="font-black text-green-500">
                  {deliveryFee === 0 ? "FREE" : `Rs. ${deliveryFee}`}
                </span>
              </div>

              <div className="flex items-center justify-between text-lg">
                <span className="text-gray-500 font-bold">Platform Fee</span>
                <span className="font-black text-gray-900">Rs. {platformFee}</span>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6 mb-8">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-gray-900">Total</span>
                <span className="text-3xl font-black text-orange-600">
                  Rs. {grandTotal}
                </span>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
                Payment Method
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => handlePaymentSelect(method.id)}
                    className={`h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 font-black text-sm transition-all ${
                      selectedPaymentMethod === method.id
                        ? "border-orange-500 bg-orange-50 text-orange-600 shadow-md shadow-orange-100"
                        : "border-gray-100 bg-gray-50 text-gray-400 hover:border-orange-200 hover:text-orange-500"
                    }`}
                  >
                    {method.icon}
                    <span>{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleProceedToCheckout}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-3xl py-6 font-black text-xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-orange-200"
            >
              Proceed to Checkout
              <ArrowRight size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;