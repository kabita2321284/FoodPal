import React from "react";
import {
  Package,
  CheckCircle,
  ChefHat,
  Store,
  Bike,
  Navigation,
  XCircle,
} from "lucide-react";

type OrderTimelineProps = {
  status: string;
};

export const OrderTimeline: React.FC<OrderTimelineProps> = ({ status }) => {
  const steps = [
    { key: "PENDING", label: "Order Placed", icon: <Package size={18} /> },
    { key: "ACCEPTED", label: "Accepted", icon: <CheckCircle size={18} /> },
    { key: "PREPARING", label: "Preparing", icon: <ChefHat size={18} /> },
    { key: "READY_FOR_PICKUP", label: "Ready", icon: <Store size={18} /> },
    { key: "PICKED_UP", label: "Picked Up", icon: <Bike size={18} /> },
    { key: "ON_THE_WAY", label: "On The Way", icon: <Navigation size={18} /> },
    { key: "DELIVERED", label: "Delivered", icon: <CheckCircle size={18} /> },
  ];

  if (status === "CANCELLED") {
    return (
      <div className="bg-red-50 border border-red-100 rounded-[32px] p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-red-500 text-white flex items-center justify-center">
          <XCircle size={22} />
        </div>
        <div>
          <p className="font-black text-red-600 uppercase text-sm">
            Order Cancelled
          </p>
          <p className="text-xs text-red-400 font-bold">
            This order is no longer active.
          </p>
        </div>
      </div>
    );
  }

  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.key === status)
  );

  return (
    <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-8">
      <h3 className="text-xl font-black text-gray-900 mb-8 tracking-tight">
        Delivery Timeline
      </h3>

      <div className="space-y-0">
        {steps.map((step, index) => {
          const completed = index <= currentIndex;
          const active = index === currentIndex;

          return (
            <div key={step.key} className="flex gap-5 relative pb-8 last:pb-0">
              {index < steps.length - 1 && (
                <div
                  className={`absolute left-5 top-11 w-0.5 h-8 ${
                    index < currentIndex ? "bg-orange-500" : "bg-gray-100"
                  }`}
                />
              )}

              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center z-10 transition-all ${
                  completed
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-100"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {step.icon}
              </div>

              <div className="pt-1">
                <p
                  className={`font-black text-sm uppercase tracking-wider ${
                    completed ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  {step.label}
                </p>

                {active && (
                  <p className="text-xs text-orange-500 font-bold mt-1">
                    Happening now
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};