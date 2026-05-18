/**
 * Central API Helper for FoodPal
 * Handles base URL, JWT tokens, payment helpers, and safe JSON parsing
 */

const envApiUrl = import.meta.env.VITE_API_URL || "";

const API_URL =
  envApiUrl.includes("localhost:5000") || !envApiUrl ? "" : envApiUrl;

console.log(
  "FoodPal API Initialized. Base URL:",
  API_URL || "Relative (Same Origin)"
);

export interface ApiOptions extends RequestInit {
  token?: string;
  timeout?: number;
}

export type PaymentMethod = "CASH" | "STRIPE" | "ESEWA" | "KHALTI" | "WALLET";

const getStoredToken = () => {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("foodpal_token") ||
    ""
  );
};

export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const { token, timeout = 15000, ...fetchOptions } = options;

  const url = endpoint.startsWith("http") ? endpoint : `${API_URL}${endpoint}`;

  const headers = new Headers(fetchOptions.headers || {});

  const finalToken = token || getStoredToken();

  if (finalToken) {
    headers.set("Authorization", `Bearer ${finalToken}`);
  }

  if (!headers.has("Content-Type") && !(fetchOptions.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  console.log(`[API Request] ${fetchOptions.method || "GET"} ${url}`);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const text = await response.text();

    console.log(`[API Response] ${response.status} ${url}`);

    if (
      text.trim().startsWith("<!DOCTYPE") ||
      text.trim().startsWith("<html")
    ) {
      console.error("[API Error] Received HTML instead of JSON from:", url);
      throw new Error(
        "Backend returned HTML instead of JSON. Check API URL or backend route."
      );
    }

    let data: any = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      console.error(
        "[API Error] JSON Parse failed for:",
        url,
        "Content snippet:",
        text.slice(0, 150)
      );

      throw new Error(`Failed to parse response as JSON. Status: ${response.status}`);
    }

    if (!response.ok) {
      const errorMsg =
        data.message ||
        data.error ||
        `Request failed with status ${response.status}`;

      throw new Error(errorMsg);
    }

    return data as T;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
      throw new Error("Request timed out after 15 seconds");
    }

    console.error(`[API Exception] ${url}:`, error.message);

    throw error;
  }
}

export const api = {
  get: <T = any>(endpoint: string, token?: string) =>
    apiRequest<T>(endpoint, {
      method: "GET",
      token,
    }),

  post: <T = any>(endpoint: string, body?: any, token?: string) =>
    apiRequest<T>(endpoint, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body || {}),
      token,
    }),

  put: <T = any>(endpoint: string, body?: any, token?: string) =>
    apiRequest<T>(endpoint, {
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body || {}),
      token,
    }),

  patch: <T = any>(endpoint: string, body?: any, token?: string) =>
    apiRequest<T>(endpoint, {
      method: "PATCH",
      body: body instanceof FormData ? body : JSON.stringify(body || {}),
      token,
    }),

  delete: <T = any>(endpoint: string, token?: string) =>
    apiRequest<T>(endpoint, {
      method: "DELETE",
      token,
    }),
};

export const orderApi = {
  createOrder: (payload: any, token?: string) =>
    api.post("/api/orders", payload, token),

  getMyOrders: (token?: string) => api.get("/api/orders/myorders", token),

  getOrderById: (orderId: string, token?: string) =>
    api.get(`/api/orders/${orderId}`, token),
};

export const paymentApi = {
  createStripeSession: (orderId: string, token?: string) =>
    api.post<{ url: string }>(
      `/api/orders/${orderId}/create-stripe-session`,
      {},
      token
    ),

  verifyStripePayment: (sessionId: string, token?: string) =>
    api.post(
      "/api/orders/stripe/verify",
      {
        sessionId,
      },
      token
    ),

  initiateEsewa: (orderId: string, token?: string) =>
    api.post(
      `/api/orders/${orderId}/esewa`,
      {},
      token
    ),

  initiateKhalti: (orderId: string, token?: string) =>
    api.post(
      `/api/orders/${orderId}/khalti`,
      {},
      token
    ),
};

export const redirectToStripeCheckout = async (
  orderId: string,
  token?: string
) => {
  const data = await paymentApi.createStripeSession(orderId, token);

  if (!data?.url) {
    throw new Error("Stripe checkout URL not received.");
  }

  window.location.href = data.url;
};

export const submitEsewaPayment = async (orderId: string, token?: string) => {
  const data: any = await paymentApi.initiateEsewa(orderId, token);

  if (!data?.formData) {
    throw new Error("eSewa payment data not received.");
  }

  const form = document.createElement("form");

  form.method = "POST";
  form.action = "https://rc-epay.esewa.com.np/api/epay/main/v2/form";
  form.style.display = "none";

  Object.entries(data.formData).forEach(([key, value]) => {
    const input = document.createElement("input");

    input.type = "hidden";
    input.name = key;
    input.value = String(value ?? "");

    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
};

export const startKhaltiPayment = async (orderId: string, token?: string) => {
  const data: any = await paymentApi.initiateKhalti(orderId, token);

  if (!data?.payload) {
    throw new Error("Khalti payment data not received.");
  }

  const response = await fetch("https://a.khalti.com/api/v2/epayment/initiate/", {
    method: "POST",
    headers: {
      Authorization: `Key ${import.meta.env.VITE_KHALTI_PUBLIC_KEY || ""}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data.payload),
  });

  const result = await response.json();

  if (!response.ok || !result?.payment_url) {
    throw new Error(result?.detail || "Khalti payment failed to start.");
  }

  window.location.href = result.payment_url;
};