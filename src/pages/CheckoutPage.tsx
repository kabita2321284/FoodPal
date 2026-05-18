import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Home,
  MapPin,
  MessageSquare,
  Phone,
  ShoppingBag,
  Store,
  Truck,
  Wallet,
} from "lucide-react";

type CartItem = {
  _id?: string;
  id?: string;
  item?: string;
  menuItem?: string;
  menuItemId?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  restaurantId?: string;
  restaurant?: string;
};

const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? "" : "http://localhost:3000");

const addressLabels = ["Home", "Work", "Hotel", "Other"];

export default function CheckoutPage() {
  const navigate = useNavigate();

  const [addressLabel, setAddressLabel] = useState("Home");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [phone, setPhone] = useState("");
  const [instructions, setInstructions] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "cash">(
    "stripe"
  );
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

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

  const getCartItemId = (item: CartItem) => {
    return (
      item.item || item.menuItem || item.menuItemId || item._id || item.id || ""
    );
  };

  const getRestaurantId = () => {
    return cart[0]?.restaurantId || cart[0]?.restaurant || "";
  };

  const phoneIsValid = phone.replace(/\D/g, "").length >= 7;
  const addressIsValid = address.trim().length >= 6;
  const restaurantId = getRestaurantId();
  const hasInvalidItem = cart.some((cartItem) => !getCartItemId(cartItem));

  const canPlaceOrder =
    cart.length > 0 &&
    addressIsValid &&
    phoneIsValid &&
    Boolean(restaurantId) &&
    !hasInvalidItem &&
    !loading;

  const validateForm = () => {
    if (cart.length === 0) return "Your cart is empty.";
    if (!restaurantId)
      return "Restaurant ID is missing. Please remove item and add it again.";
    if (hasInvalidItem)
      return "Cart item ID is missing. Please remove item and add it again.";
    if (!addressIsValid) return "Please enter a complete delivery address.";
    if (!phoneIsValid) return "Please enter a valid phone number.";
    return "";
  };

  const handlePlaceOrder = async () => {
    const validationMessage = validateForm();

    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    try {
      setLoading(true);
      setFormError("");

      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("foodpal_token") ||
        localStorage.getItem("authToken");

      const fullAddress = [
        address.trim(),
        city.trim(),
        postcode.trim(),
      ]
        .filter(Boolean)
        .join(", ");

      const orderPayload = {
        items: cart.map((cartItem) => {
          const finalItemId = getCartItemId(cartItem);

          return {
            item: finalItemId,
            menuItem: finalItemId,
            name: cartItem.name,
            price: Number(cartItem.price || 0),
            quantity: Number(cartItem.quantity || 1),
            image: cartItem.image || "",
          };
        }),
        restaurant: restaurantId,
        restaurantId,
        deliveryAddress: {
          label: addressLabel,
          text: fullAddress,
          city,
          phone,
          instructions,
        },
        address: fullAddress,
        phone,
        note,
        customerNote: note,
        paymentMethod,
        currency: "NPR",
        baseCurrency: "NPR",
        subtotal,
        deliveryFee,
        serviceFee,
        platformFee: serviceFee,
        total,
        totalAmount: total,
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

      if (data.url || data.checkoutUrl) {
        window.location.href = data.url || data.checkoutUrl;
        return;
      }

      if (data.order?._id || data.orderId) {
        localStorage.removeItem("cart");
        localStorage.removeItem("foodpal_cart");
        navigate(`/order/${data.order?._id || data.orderId}/track`);
        return;
      }

      navigate("/");
    } catch (error: any) {
      console.error("Checkout error:", error);
      setFormError(error.message || "Something went wrong during checkout.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f8] px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-2">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-500">
            Secure checkout
          </p>
          <h1 className="text-4xl font-black tracking-tight text-gray-950">
            Complete your order
          </h1>
          <p className="text-sm font-semibold text-gray-500">
            Add delivery details, choose payment, and track everything live.
          </p>
        </div>

        {formError && (
          <div className="mb-6 flex items-start gap-3 rounded-3xl border border-red-100 bg-red-50 p-4 text-red-700">
            <AlertCircle size={22} className="mt-0.5 shrink-0" />
            <p className="text-sm font-bold">{formError}</p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <section className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                  <MapPin size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-950">
                    Delivery address
                  </h2>
                  <p className="text-sm font-semibold text-gray-500">
                    Riders need clear address details for faster delivery.
                  </p>
                </div>
              </div>

              <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {addressLabels.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setAddressLabel(label)}
                    className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${
                      addressLabel === label
                        ? "border-orange-500 bg-orange-50 text-orange-600"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="grid gap-4">
                <div>
                  <label className="mb-2 block text-sm font-black text-gray-800">
                    Full delivery address *
                  </label>
                  <textarea
                    className={`w-full rounded-2xl border p-4 text-sm font-semibold outline-none transition focus:border-orange-500 ${
                      address && !addressIsValid
                        ? "border-red-300"
                        : "border-gray-200"
                    }`}
                    rows={3}
                    placeholder="Flat/house number, street, area, landmark"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                  <p className="mt-2 text-xs font-semibold text-gray-400">
                    Example: Flat 3A, Steel Road, near Tesco entrance.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-black text-gray-800">
                      City / Area
                    </label>
                    <input
                      className="w-full rounded-2xl border border-gray-200 p-4 text-sm font-semibold outline-none transition focus:border-orange-500"
                      placeholder="Kathmandu, London, etc."
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-black text-gray-800">
                      Postcode / ZIP
                    </label>
                    <input
                      className="w-full rounded-2xl border border-gray-200 p-4 text-sm font-semibold outline-none transition focus:border-orange-500"
                      placeholder="Optional"
                      value={postcode}
                      onChange={(e) => setPostcode(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-gray-800">
                    Delivery instructions
                  </label>
                  <input
                    className="w-full rounded-2xl border border-gray-200 p-4 text-sm font-semibold outline-none transition focus:border-orange-500"
                    placeholder="Gate code, floor, leave at door, call on arrival..."
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-600">
                  <Phone size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-950">
                    Contact details
                  </h2>
                  <p className="text-sm font-semibold text-gray-500">
                    Used only for this order delivery and support.
                  </p>
                </div>
              </div>

              <label className="mb-2 block text-sm font-black text-gray-800">
                Phone number *
              </label>
              <input
                className={`w-full rounded-2xl border p-4 text-sm font-semibold outline-none transition focus:border-orange-500 ${
                  phone && !phoneIsValid ? "border-red-300" : "border-gray-200"
                }`}
                placeholder="Enter phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <label className="mb-2 mt-5 block text-sm font-black text-gray-800">
                Order note
              </label>
              <textarea
                className="w-full rounded-2xl border border-gray-200 p-4 text-sm font-semibold outline-none transition focus:border-orange-500"
                rows={3}
                placeholder="Optional note for restaurant or rider"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </section>

            <section className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                  <CreditCard size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-950">Payment</h2>
                  <p className="text-sm font-semibold text-gray-500">
                    Choose how you want to pay.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("stripe")}
                  className={`rounded-3xl border p-5 text-left transition ${
                    paymentMethod === "stripe"
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <CreditCard className="text-orange-500" size={28} />
                    {paymentMethod === "stripe" && (
                      <CheckCircle2 className="text-orange-500" size={22} />
                    )}
                  </div>
                  <p className="font-black text-gray-950">Card payment</p>
                  <p className="mt-1 text-sm font-semibold text-gray-500">
                    Secure Stripe checkout.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("cash")}
                  className={`rounded-3xl border p-5 text-left transition ${
                    paymentMethod === "cash"
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <Wallet className="text-green-500" size={28} />
                    {paymentMethod === "cash" && (
                      <CheckCircle2 className="text-orange-500" size={22} />
                    )}
                  </div>
                  <p className="font-black text-gray-950">Cash on delivery</p>
                  <p className="mt-1 text-sm font-semibold text-gray-500">
                    Pay rider when food arrives.
                  </p>
                </button>
              </div>
            </section>
          </div>

          <aside className="h-fit rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm lg:sticky lg:top-24">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-700">
                <ShoppingBag size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-950">
                  Order summary
                </h2>
                <p className="text-xs font-bold text-gray-500">
                  {cart.length} item type{cart.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            {cart.length === 0 ? (
              <div className="rounded-3xl bg-gray-50 p-6 text-center">
                <p className="font-bold text-gray-500">Your cart is empty.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item, index) => (
                  <div
                    key={getCartItemId(item) || index}
                    className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3"
                  >
                    <div>
                      <p className="font-black text-gray-900">{item.name}</p>
                      <p className="text-xs font-semibold text-gray-500">
                        Qty {item.quantity || 1} × Rs {Number(item.price || 0)}
                      </p>
                    </div>
                    <p className="font-black text-gray-950">
                      Rs {Number(item.price || 0) * Number(item.quantity || 1)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 space-y-3 rounded-3xl bg-gray-50 p-5 text-sm font-bold">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>Rs {subtotal}</span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Delivery fee</span>
                <span>Rs {deliveryFee}</span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Service fee</span>
                <span>Rs {serviceFee}</span>
              </div>

              <div className="flex justify-between border-t border-gray-200 pt-4 text-xl font-black text-gray-950">
                <span>Total</span>
                <span>Rs {total}</span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-orange-50 p-3">
                <Store className="mx-auto mb-1 text-orange-500" size={18} />
                <p className="text-[10px] font-black text-orange-600">Kitchen</p>
              </div>
              <div className="rounded-2xl bg-green-50 p-3">
                <Truck className="mx-auto mb-1 text-green-500" size={18} />
                <p className="text-[10px] font-black text-green-600">Delivery</p>
              </div>
              <div className="rounded-2xl bg-blue-50 p-3">
                <MessageSquare className="mx-auto mb-1 text-blue-500" size={18} />
                <p className="text-[10px] font-black text-blue-600">Chat</p>
              </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={!canPlaceOrder}
              className="mt-6 w-full rounded-2xl bg-orange-500 px-4 py-4 text-base font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {loading
                ? "Processing..."
                : paymentMethod === "stripe"
                ? "Continue to payment"
                : "Place order"}
            </button>

            <button
              onClick={() => navigate("/cart")}
              className="mt-3 w-full rounded-2xl bg-gray-100 px-4 py-4 text-sm font-black text-gray-700 transition hover:bg-gray-200"
            >
              Back to cart
            </button>

            <p className="mt-4 text-center text-xs font-semibold leading-relaxed text-gray-400">
              By placing this order, you agree that FoodPal may share delivery
              details with the restaurant and rider.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}