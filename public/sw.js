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
      title: "✓ Mark Done",
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

  // 2. Handle Real Dose
  if (!data.doseId) {
    if (self.clients.openWindow) {
      await self.clients.openWindow(data.url || "/");
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
      await self.registration.showNotification("Medicare", {
        body: result.message || "Could not mark dose as done. Tap to view schedule.",
        icon: "/medicareLogo.png",
        badge: "/medicareLogo.png",
        tag: "medicare-action-feedback",
        data: { url: "/" },
      });
    }
  } catch (error) {
    console.error("Error marking dose done from notification:", error);
    await self.registration.showNotification("Medicare", {
      body: "Network error while marking dose done. Tap to open app.",
      icon: "/medicareLogo.png",
      badge: "/medicareLogo.png",
      tag: "medicare-action-feedback",
      data: { url: "/" },
    });
  }
}