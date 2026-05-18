import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type CartItem = {
  _id?: string;
  id?: string;
  menuItemId?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  restaurantId?: string;
};

const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? "" : "http://localhost:3000");

const supportedCurrencies = [
  { code: "NPR", label: "NPR - Nepalese Rupee" },
  { code: "GBP", label: "GBP - British Pound" },
  { code: "USD", label: "USD - US Dollar" },
  { code: "EUR", label: "EUR - Euro" },
  { code: "INR", label: "INR - Indian Rupee" },
  { code: "AUD", label: "AUD - Australian Dollar" },
  { code: "CAD", label: "CAD - Canadian Dollar" },
  { code: "AED", label: "AED - UAE Dirham" },
  { code: "JPY", label: "JPY - Japanese Yen" },
];

export default function CheckoutPage() {
  const navigate = useNavigate();

  const [currency, setCurrency] = useState("GBP");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("stripe");
  const [loading, setLoading] = useState(false);

  const cart: CartItem[] = useMemo(() => {
    try {
      const savedCart =
        localStorage.getItem("cart") ||
        localStorage.getItem("foodpal_cart") ||
        "[]";

      return JSON.parse(savedCart);
    } catch {
      return [];
    }
  }, []);

  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
    0
  );

  const deliveryFee = subtotal > 0 ? 50 : 0;
  const serviceFee = subtotal > 0 ? 20 : 0;
  const total = subtotal + deliveryFee + serviceFee;

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    if (!address.trim()) {
      alert("Please enter delivery address.");
      return;
    }

    if (!phone.trim()) {
      alert("Please enter phone number.");
      return;
    }

    try {
      setLoading(true);

      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("foodpal_token") ||
        localStorage.getItem("authToken");

      const orderPayload = {
        items: cart.map((item) => ({
          menuItem: item.menuItemId || item._id || item.id,
          name: item.name,
          price: Number(item.price),
          quantity: Number(item.quantity || 1),
          image: item.image || "",
        })),
        deliveryAddress: {
          text: address,
          phone,
        },
        address,
        phone,
        note,
        paymentMethod,
        currency,
        baseCurrency: "NPR",
        subtotal,
        deliveryFee,
        serviceFee,
        total,
        restaurantId: cart[0]?.restaurantId,
      };

      const response = await fetch(`${API_URL}/api/orders/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(orderPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create order.");
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      if (data.order?._id || data.orderId) {
        localStorage.removeItem("cart");
        localStorage.removeItem("foodpal_cart");
        navigate(`/orders/${data.order?._id || data.orderId}`);
        return;
      }

      alert("Order created successfully.");
      navigate("/");
    } catch (error: any) {
      console.error("Checkout error:", error);
      alert(error.message || "Something went wrong during checkout.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-3xl font-bold text-gray-900">Checkout</h1>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-semibold">Delivery Details</h2>

              <label className="mb-2 block text-sm font-medium">
                Delivery Address
              </label>
              <textarea
                className="mb-4 w-full rounded-xl border p-3 outline-none focus:border-orange-500"
                rows={3}
                placeholder="Enter full delivery address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />

              <label className="mb-2 block text-sm font-medium">
                Phone Number
              </label>
              <input
                className="mb-4 w-full rounded-xl border p-3 outline-none focus:border-orange-500"
                placeholder="Enter phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <label className="mb-2 block text-sm font-medium">
                Order Note
              </label>
              <textarea
                className="w-full rounded-xl border p-3 outline-none focus:border-orange-500"
                rows={2}
                placeholder="Optional note for restaurant or rider"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-semibold">Payment</h2>

              <label className="mb-2 block text-sm font-medium">
                Payment Currency
              </label>
              <select
                className="mb-4 w-full rounded-xl border p-3 outline-none focus:border-orange-500"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {supportedCurrencies.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </select>

              <label className="mb-2 block text-sm font-medium">
                Payment Method
              </label>
              <select
                className="w-full rounded-xl border p-3 outline-none focus:border-orange-500"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="stripe">Stripe Card Payment</option>
                <option value="cash">Cash on Delivery</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow h-fit">
            <h2 className="mb-4 text-xl font-semibold">Order Summary</h2>

            {cart.length === 0 ? (
              <p className="text-gray-500">Your cart is empty.</p>
            ) : (
              <div className="space-y-3">
                {cart.map((item, index) => (
                  <div
                    key={item._id || item.id || index}
                    className="flex justify-between border-b pb-2 text-sm"
                  >
                    <span>
                      {item.name} x {item.quantity || 1}
                    </span>
                    <span>Rs {Number(item.price || 0) * Number(item.quantity || 1)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>Rs {subtotal}</span>
              </div>

              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span>Rs {deliveryFee}</span>
              </div>

              <div className="flex justify-between">
                <span>Service Fee</span>
                <span>Rs {serviceFee}</span>
              </div>

              <div className="flex justify-between border-t pt-3 text-lg font-bold">
                <span>Total</span>
                <span>Rs {total}</span>
              </div>

              <p className="text-xs text-gray-500">
                Base currency is NPR. Stripe will charge in selected currency:
                {" "}
                <b>{currency}</b>.
              </p>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={loading || cart.length === 0}
              className="mt-6 w-full rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {loading ? "Processing..." : "Place Order"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}