"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

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
      aria-label="Toggle medication notifications"
      onClick={toggleNotifications}
      disabled={loading}
      className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors disabled:opacity-50 ${enabled ? "border-emerald-400/60 text-emerald-300" : "border-white/30 text-gray-300"}`}
    >
      <span className={`relative h-5 w-9 rounded-full transition-colors ${enabled ? "bg-emerald-500" : "bg-gray-600"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${enabled ? "translate-x-4" : "translate-x-0.5"}`} />
      </span>
      {loading ? "Updating..." : enabled ? "Notifications on" : "Notifications off"}
    </button>
  );
}