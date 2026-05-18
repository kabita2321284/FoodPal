import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "http://localhost:3000";
};

export const getSocket = (): Socket => {
  if (!socket) {
    const socketUrl = getSocketUrl();

    console.log("Connecting to socket server:", socketUrl);

    socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 25,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
      withCredentials: false,
    });

    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket?.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
    });

    socket.on("reconnect", (attempt) => {
      console.log(`✅ Socket reconnected after ${attempt} attempts`);
    });

    socket.on("reconnect_attempt", (attempt) => {
      console.log(`Trying socket reconnect attempt ${attempt}`);
    });

    socket.on("reconnect_failed", () => {
      console.error("Socket reconnection failed");
    });
  }

  return socket;
};

export const isSocketConnected = () => {
  return Boolean(socket?.connected);
};

export const joinUserRoom = (userId?: string | null) => {
  if (!userId) return;
  getSocket().emit("user:join", userId);
};

export const joinAdminRoom = () => {
  getSocket().emit("admin:join");
};

export const joinRestaurantRoom = (restaurantId?: string | null) => {
  if (!restaurantId) return;
  getSocket().emit("restaurant:join", restaurantId);
};

export const joinRiderRoom = (riderId?: string | null) => {
  if (!riderId) return;
  getSocket().emit("rider:join", riderId);
};

export const joinOrderRoom = (orderId?: string | null) => {
  if (!orderId) return;
  getSocket().emit("order:join", orderId);
};

export const leaveOrderRoom = (orderId?: string | null) => {
  if (!orderId) return;
  getSocket().emit("order:leave", orderId);
};

export const emitRiderLocationUpdate = (data: {
  orderId: string;
  riderId?: string;
  lat: number;
  lng: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  updatedAt?: string | Date;
}) => {
  if (!data?.orderId) return;

  getSocket().emit("rider:location_update", {
    ...data,
    lat: Number(data.lat),
    lng: Number(data.lng),
    updatedAt: data.updatedAt || new Date(),
  });
};

export const emitRiderAvailabilityUpdate = (data: {
  riderId?: string;
  userId?: string;
  isAvailable: boolean;
  isBusy?: boolean;
  currentLocation?: {
    lat?: number | null;
    lng?: number | null;
    accuracy?: number | null;
    heading?: number | null;
    speed?: number | null;
    updatedAt?: string | Date | null;
  };
}) => {
  getSocket().emit("rider:availability_update", {
    ...data,
    updatedAt: new Date(),
  });
};

export const emitOrderStatusUpdate = (data: {
  orderId: string;
  status: string;
  userId?: string;
  customerId?: string;
  restaurantId?: string;
  riderId?: string;
  message?: string;
}) => {
  if (!data?.orderId || !data?.status) return;

  getSocket().emit("order:update_status", {
    ...data,
    updatedAt: new Date(),
  });
};

export const emitOrderAssigned = (data: {
  orderId: string;
  riderId?: string;
  customerId?: string;
  restaurantId?: string;
}) => {
  if (!data?.orderId) return;

  getSocket().emit("order:assigned", {
    ...data,
    updatedAt: new Date(),
  });
};

export const sendNotification = (data: {
  userId: string;
  title?: string;
  message?: string;
  orderId?: string;
}) => {
  if (!data?.userId) return;

  getSocket().emit("notification:send", {
    ...data,
    createdAt: new Date(),
  });
};

export const onSocketEvent = <T = any>(
  eventName: string,
  callback: (data: T) => void
) => {
  const activeSocket = getSocket();
  activeSocket.on(eventName, callback);

  return () => {
    activeSocket.off(eventName, callback);
  };
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};