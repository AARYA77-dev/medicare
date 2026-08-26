"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaBell } from "react-icons/fa";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

export default function NotificationSettings() {
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.getRegistration("/sw.js").then(async (registration) => {
      const subscription = await registration?.pushManager.getSubscription();
      setEnabled(Boolean(subscription));
    });
  }, []);

  const toggleNotifications = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("Push notifications are not supported by this browser.");
      return;
    }
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.getSubscription();

      if (enabled) {
        if (subscription) {
          const response = await fetch("/api/notifications/subscription", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
          if (!response.ok) throw new Error("Could not disable notifications");
          await subscription.unsubscribe();
        }
        setEnabled(false);
        toast.success("Medication notifications disabled.");
        return;
      }

      if (await Notification.requestPermission() !== "granted") throw new Error("Notification permission was not granted");
      const { publicKey } = await fetch("/api/notifications/subscription").then((response) => response.json());
      if (!publicKey) throw new Error("Push notifications are not configured");
      const newSubscription = subscription || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      const response = await fetch("/api/notifications/subscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...newSubscription.toJSON(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }) });
      if (!response.ok) throw new Error("Could not save notification settings");
      setEnabled(true);
      toast.success("Medication notifications enabled.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not enable notifications.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-busy={loading}
      aria-label="Toggle medication notifications"
      onClick={toggleNotifications}
      disabled={loading}
      className={`group flex min-h-[58px] w-full max-w-sm items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left shadow-lg backdrop-blur-md transition-all duration-200 disabled:cursor-wait disabled:opacity-70 ${enabled ? "border-emerald-300/40 bg-emerald-400/10 hover:border-emerald-300/70 hover:bg-emerald-400/15" : "border-white/15 bg-white/[0.06] hover:border-[#03e9f4]/50 hover:bg-white/[0.1]"}`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${enabled ? "bg-emerald-400/20 text-emerald-300" : "bg-white/10 text-gray-400 group-hover:text-[#03e9f4]"}`}>
          <FaBell size={15} aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-white">Medication alerts</span>
          <span className={`block text-xs ${enabled ? "text-emerald-300" : "text-gray-400"}`}>
            {loading ? "Updating..." : enabled ? "Enabled" : "Disabled"}
          </span>
        </span>
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors ${enabled ? "bg-emerald-500" : "bg-gray-600"}`}>
        <span className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${enabled ? "translate-x-5" : "translate-x-0"}`} />
      </span>
    </button>
  );
}