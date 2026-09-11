"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchMedicines } from "@/store/medicineSlice";
import toast from "react-hot-toast";

export default function NotificationSyncHandler() {
  const dispatch = useAppDispatch();
  const { viewingOwnerId } = useAppSelector((state) => state.sharing);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;

      if (event.data.type === "DOSE_MARKED_DONE") {
        const { medicineName } = event.data;
        dispatch(fetchMedicines(viewingOwnerId ? { ownerId: viewingOwnerId } : undefined));
        toast.success(
          medicineName
            ? `✓ ${medicineName} marked as done from notification!`
            : "✓ Dose marked as done from notification!"
        );
      } else if (event.data.type === "NOTIFICATION_ACTION_TEST_SUCCESS") {
        toast.success(
          event.data.message || "Notification 'Mark Done' action verified successfully!"
        );
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, [dispatch, viewingOwnerId]);

  return null;
}
