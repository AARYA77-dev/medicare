// Service Worker v2.3.0 - 1-click background mark-done with mobile failure alerts
const SW_VERSION = "2.3.0";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Medication reminder", body: event.data ? event.data.text() : "" };
  }

  const actions = [];
  if (data.doseId || data.isTest) {
    actions.push({
      action: "mark-done",
      title: "Mark Done",
    });
  }
  actions.push({
    action: "open-app",
    title: "Open App",
  });

  const options = {
    body: data.body || "Your medication is due soon.",
    icon: data.icon || "/medicareLogo.png",
    badge: data.badge || "/medicareLogo.png",
    tag: data.tag || (data.doseId ? `dose-${data.doseId}` : "medicare-notification"),
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || "/",
      doseId: data.doseId,
      medicineId: data.medicineId,
      medicineName: data.medicineName,
      actionToken: data.actionToken,
      isTest: Boolean(data.isTest),
    },
    actions: data.actions && data.actions.length > 0 ? data.actions : actions,
  };

  event.waitUntil(self.registration.showNotification(data.title || "Medication reminder", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};

  if (event.action === "mark-done") {
    event.waitUntil(handleMarkDone(data));
    return;
  }

  // Handle clicking notification body or "open-app" action
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(data.url || "/");
      }
    })
  );
});

async function handleMarkDone(data) {
  if (!data) return;

  // 1. Handle Test Notification
  if (data.isTest) {
    await self.registration.showNotification("Medicare", {
      body: "✓ Test verified! 'Mark Done' action works directly from browser notifications.",
      icon: "/medicareLogo.png",
      badge: "/medicareLogo.png",
      tag: "medicare-action-feedback",
    });

    const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clientList) {
      client.postMessage({
        type: "NOTIFICATION_ACTION_TEST_SUCCESS",
        message: "Notification 'Mark Done' action verified successfully!",
      });
    }
    return;
  }

  // 2. Handle missing doseId
  if (!data.doseId) {
    const fallbackMsg = "Could not identify medication dose. Tap to open schedule.";
    await self.registration.showNotification("Medicare - Action Notice", {
      body: fallbackMsg,
      icon: "/medicareLogo.png",
      badge: "/medicareLogo.png",
      tag: "medicare-action-error",
      vibrate: [200, 100, 200],
      renotify: true,
      data: { url: "/" },
      actions: [{ action: "open-app", title: "Open Schedule" }],
    });

    const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clientList) {
      client.postMessage({
        type: "DOSE_MARK_FAILED",
        message: fallbackMsg,
      });
    }
    return;
  }

  try {
    const response = await fetch("/api/notifications/mark-done", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        doseId: data.doseId,
        medicineId: data.medicineId,
        actionToken: data.actionToken,
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (response.ok && result.success) {
      const medName = data.medicineName || result.medicineName || "Medication";

      // Show instant confirmation notification
      await self.registration.showNotification("Medicare", {
        body: `✓ ${medName} marked as done!`,
        icon: "/medicareLogo.png",
        badge: "/medicareLogo.png",
        tag: "medicare-action-feedback",
      });

      // Inform open tabs in real-time
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientList) {
        client.postMessage({
          type: "DOSE_MARKED_DONE",
          doseId: data.doseId,
          medicineId: data.medicineId,
          medicineName: medName,
        });
      }
    } else {
      const failureMsg = result.message || "Could not mark dose as done. Tap to view schedule.";

      // Show clear failure alert on mobile screen with vibration and 1-tap open action
      await self.registration.showNotification("Medicare - Could not mark dose", {
        body: failureMsg,
        icon: "/medicareLogo.png",
        badge: "/medicareLogo.png",
        tag: "medicare-action-error",
        vibrate: [200, 100, 200],
        renotify: true,
        data: { url: "/" },
        actions: [{ action: "open-app", title: "Open Schedule" }],
      });

      // Broadcast to any open tabs so they show error toast
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientList) {
        client.postMessage({
          type: "DOSE_MARK_FAILED",
          message: failureMsg,
        });
      }
    }
  } catch (error) {
    console.error("Error marking dose done from notification:", error);
    const networkMsg = "Network error while marking dose done. Tap to open app.";

    await self.registration.showNotification("Medicare - Connection Error", {
      body: networkMsg,
      icon: "/medicareLogo.png",
      badge: "/medicareLogo.png",
      tag: "medicare-action-error",
      vibrate: [200, 100, 200],
      renotify: true,
      data: { url: "/" },
      actions: [{ action: "open-app", title: "Open Schedule" }],
    });

    const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clientList) {
      client.postMessage({
        type: "DOSE_MARK_FAILED",
        message: networkMsg,
      });
    }
  }
}