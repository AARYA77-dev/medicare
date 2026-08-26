"use client";

import { useState } from "react";
import toast from "react-hot-toast";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

export default function NotificationSettings() {
  const [loading, setLoading] = useState(false);
  const enableNotifications = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("Push notifications are not supported by this browser.");
      return;
    }
    setLoading(true);
    try {
      if (await Notification.requestPermission() !== "granted") throw new Error("Notification permission was not granted");
      const registration = await navigator.serviceWorker.register("/sw.js");
      const { publicKey } = await fetch("/api/notifications/subscription").then((response) => response.json());
      if (!publicKey) throw new Error("Push notifications are not configured");
      const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      const response = await fetch("/api/notifications/subscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...subscription.toJSON(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }) });
      if (!response.ok) throw new Error("Could not save notification settings");
      toast.success("Medication notifications enabled.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not enable notifications.");
    } finally {
      setLoading(false);
    }
  };
  return <button type="button" onClick={enableNotifications} disabled={loading} className="rounded-lg border border-[#03e9f4]/40 px-4 py-2 text-sm text-[#03e9f4] disabled:opacity-50">{loading ? "Enabling..." : "Enable medication notifications"}</button>;
}