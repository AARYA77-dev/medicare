"use client";

import Header from "@/components/header";
import ViewAsSelector from "@/components/ViewAsSelector";
import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import toast from "react-hot-toast";
import {
  Dose,
  LowStockItem,
  MedicineWithSchedule,
  ScheduleEntry,
} from "@/Interfaces/interface";
import Loading from "../loading";
import Image from "next/image";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchMedicines,
  deleteDose,
  resolveMissedDose,
  fetchDoseHistory,
} from "@/store/medicineSlice";
import { hasNoQuantityForDose } from "@/lib/medicineQuantity";
import {
  FaArrowRight,
  FaCalendarAlt,
  FaCalendarCheck,
  FaCalendarDay,
  FaCalendarTimes,
  FaCheckCircle,
  FaChevronLeft,
  FaChevronRight,
  FaClock,
  FaExclamationTriangle,
  FaEye,
  FaHistory,
  FaPills,
  FaTimes,
} from "react-icons/fa";
import MissedDoseModal from "@/components/MissedDoseModal";
import NotificationSettings from "@/components/NotificationSettings";

export interface UnifiedDoseItem {
  id: string;
  medicineId: string;
  medicineName: string;
  doseId: string;
  dayNumber: number;
  time: string;
  dosage: string;
  dateKey: string;
  parsedDate: Date;
  status: "completed" | "missed" | "pending";
  action?: "completed" | "skip_and_continue" | "carry_forward_shift" | "quantity_unavailable";
  takenAt?: Date | string;
  isOverdue?: boolean;
  doseHasNoStock?: boolean;
  medicine?: MedicineWithSchedule;
  scheduleEntry?: ScheduleEntry;
  dose?: Dose;
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseScheduleDate(dateStr?: string | Date): Date | null {
  if (!dateStr) return null;
  if (dateStr instanceof Date) {
    return isNaN(dateStr.getTime())
      ? null
      : new Date(dateStr.getFullYear(), dateStr.getMonth(), dateStr.getDate());
  }
  const str = String(dateStr).trim();
  if (!str) return null;

  // 1. YYYY-MM-DD or YYYY/MM/DD or ISO string with time
  const ymdMatch = str.match(/^(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    return isNaN(d.getTime()) ? null : d;
  }

  // 2. DD-MM-YYYY or DD/MM/YYYY
  const parts = str.split(/[\/\-\.]/).map((p) => p.trim());
  if (parts.length === 3) {
    const [p1, p2] = parts.map(Number);
    let p3 = Number(parts[2]);
    if (p3 < 100) p3 += 2000;
    if (p3 >= 1900 && p3 <= 2100) {
      if (p1 > 12 && p2 <= 12) {
        const d = new Date(p3, p2 - 1, p1);
        if (!isNaN(d.getTime())) return d;
      }
      if (p2 > 12 && p1 <= 12) {
        const d = new Date(p3, p1 - 1, p2);
        if (!isNaN(d.getTime())) return d;
      }
      const d = new Date(p3, p2 - 1, p1);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // 3. Fallback standard parse
  const fallback = new Date(str);
  if (!isNaN(fallback.getTime())) {
    return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
  }

  return null;
}

function formatDisplayDate(value?: string | Date): string {
  if (!value) return "";
  if (value instanceof Date) {
    const day = String(value.getDate()).padStart(2, "0");
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const year = value.getFullYear();
    return `${day}-${month}-${year}`;
  }
  const parsed = parseScheduleDate(value);
  if (parsed) {
    const day = String(parsed.getDate()).padStart(2, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const year = parsed.getFullYear();
    return `${day}-${month}-${year}`;
  }
  return String(value);
}

function formatHeaderDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatActionTime(val?: Date | string): { timeStr: string; dateStr: string } {
  if (!val) return { timeStr: "", dateStr: "" };
  const d = new Date(val);
  if (isNaN(d.getTime())) return { timeStr: "", dateStr: "" };
  return {
    timeStr: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }),
    dateStr: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  };
}

function shiftDateKey(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + deltaDays);
  return toDateKey(date);
}

function getDateRelativeLabel(dateKey: string, todayKey: string): string | null {
  if (dateKey === todayKey) return "Today";
  const [ty, tm, td] = todayKey.split("-").map(Number);
  const todayDate = new Date(ty, tm - 1, td);

  const [y, m, d] = dateKey.split("-").map(Number);
  const targetDate = new Date(y, m - 1, d);

  const diffDays = Math.round((targetDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  return null;
}

export default function HomePage() {
  const dispatch = useAppDispatch();
  const { medicines: medicineData, doseHistory, loading } = useAppSelector((state) => state.medicine);
  const { viewingOwnerId, role } = useAppSelector((state) => state.sharing);
  // Can interact (mark done, missed) if own schedule OR care partner/co-manager
  const canInteract = !viewingOwnerId || role === "collaborator" || role === "admin";
  const [checkDoses, setCheckDoses] = useState<string[]>([]);
  const [buttonLoading, setButtonLoading] = useState<string | null>(null);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [activeMissedModal, setActiveMissedModal] = useState<{
    isOpen: boolean;
    medicine: MedicineWithSchedule | null;
    dose: Dose | null;
  }>({
    isOpen: false,
    medicine: null,
    dose: null,
  });
  const [modalLoading, setModalLoading] = useState(false);

  // Date filter state - Today default selected
  const todayObj = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayKey = useMemo(() => toDateKey(todayObj), [todayObj]);

  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey);
  const [filterMode, setFilterMode] = useState<"date" | "all">("date");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "missed" | "pending">("all");
  const dateInputRef = useRef<HTMLInputElement>(null);

  // ── GSAP refs ──────────────────────────────────────────────────
  const dateBarRef = useRef<HTMLDivElement>(null);
  const dosesGridRef = useRef<HTMLDivElement>(null);
  const datePillsRef = useRef<HTMLDivElement>(null);
  const lowStockRef = useRef<HTMLDivElement>(null);

  // Register ScrollTrigger once
  useEffect(() => {
    if (typeof window !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
    }
  }, []);

  // Date bar + page entrance animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (dateBarRef.current) {
        gsap.fromTo(
          dateBarRef.current,
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", delay: 0.15 }
        );
      }
    });
    return () => ctx.revert();
  }, []);


  useEffect(() => {
    dispatch(fetchMedicines(viewingOwnerId ? { ownerId: viewingOwnerId } : undefined));
    dispatch(fetchDoseHistory(viewingOwnerId ? { ownerId: viewingOwnerId } : undefined));
  }, [dispatch, viewingOwnerId]);

  const handleCheckbox = (doseId: string) => {
    setCheckDoses((prev) =>
      prev.includes(doseId) ? prev.filter((id: string) => id !== doseId) : [...prev, doseId]
    );
  };

  const handleDeleteDose = async (doseId: string, medicineId: string) => {
    setButtonLoading(doseId);
    try {
      await dispatch(deleteDose({ doseId, medicineId })).unwrap();
      setCheckDoses((prev) => prev.filter((id) => id !== doseId));
      toast.success("Dose marked as done!");
    } catch {
      toast.error("Failed to update Dose");
    } finally {
      setButtonLoading(null);
    }
  };

  const handleOpenMissedModal = (medicine: MedicineWithSchedule, dose: Dose) => {
    setActiveMissedModal({
      isOpen: true,
      medicine,
      dose,
    });
  };

  const handleConfirmMissedDose = async (
    action: "skip_and_continue" | "carry_forward_shift" | "quantity_unavailable"
  ) => {
    if (!activeMissedModal.medicine || !activeMissedModal.dose) return;
    setModalLoading(true);
    try {
      const response = await dispatch(
        resolveMissedDose({
          medicineId: activeMissedModal.medicine._id,
          doseId: activeMissedModal.dose._id!,
          action,
        })
      ).unwrap();

      toast.success(response.message);
      setActiveMissedModal({ isOpen: false, medicine: null, dose: null });
    } catch (err: unknown) {
      toast.error(typeof err === "string" ? err : "Failed to update schedule");
    } finally {
      setModalLoading(false);
    }
  };

  // Extract medicines with quantity < 4
  const lowStockMedicines: LowStockItem[] = [];
  medicineData.forEach((med) => {
    if (med.quantity === undefined || med.quantity === null) return;

    if (typeof med.quantity === "object" && med.quantity !== null) {
      const lowVariants: string[] = [];
      let minQ = Infinity;
      Object.entries(med.quantity).forEach(([dose, qty]) => {
        const qNum = parseFloat(String(qty));
        if (!isNaN(qNum) && qNum < 4) {
          lowVariants.push(`${dose}: ${qNum} pill${qNum === 1 ? "" : "s"}`);
          if (qNum < minQ) minQ = qNum;
        }
      });

      if (lowVariants.length > 0) {
        lowStockMedicines.push({
          id: med._id,
          name: med.medicine_name,
          details: lowVariants.join(", "),
          minQty: minQ,
        });
      }
    } else {
      const qNum = parseFloat(String(med.quantity));
      if (!isNaN(qNum) && qNum < 4) {
        lowStockMedicines.push({
          id: med._id,
          name: med.medicine_name,
          details: `${qNum} pill${qNum === 1 ? "" : "s"} remaining`,
          minQty: qNum,
        });
      }
    }
  });

  // Extract doses by date (integrating active schedule doses and DoseHistory records)
  const { allDoseList, pastOverdueCount, dateDoseCounts, dateStatusCounts } = useMemo(() => {
    const list: UnifiedDoseItem[] = [];
    let overdue = 0;
    const counts: Record<string, number> = {};
    const statusCounts: Record<string, { completed: number; missed: number; pending: number }> = {};

    const helperAddCount = (dKey: string, status: "completed" | "missed" | "pending") => {
      counts[dKey] = (counts[dKey] || 0) + 1;
      if (!statusCounts[dKey]) {
        statusCounts[dKey] = { completed: 0, missed: 0, pending: 0 };
      }
      statusCounts[dKey][status] = (statusCounts[dKey][status] || 0) + 1;
    };

    // Keep track of dose IDs resolved in history to prevent any duplicate active entries
    const resolvedDoseIds = new Set<string>();

    // 1. Process Dose History (Completed and Missed doses)
    if (doseHistory && Array.isArray(doseHistory)) {
      doseHistory.forEach((hist, idx) => {
        if (hist.doseId) {
          resolvedDoseIds.add(String(hist.doseId));
        }

        let parsed = parseScheduleDate(hist.scheduledDate);
        if (!parsed && hist.takenAt) {
          parsed = parseScheduleDate(hist.takenAt);
        }
        if (!parsed) {
          parsed = todayObj;
        }

        const dKey = toDateKey(parsed);
        helperAddCount(dKey, hist.status);

        list.push({
          id: hist._id || hist.doseId || `hist-${idx}`,
          medicineId: hist.medicineId,
          medicineName: hist.medicineName,
          doseId: hist.doseId || "",
          dayNumber: hist.dayNumber || 1,
          time: hist.scheduledTime || (hist.takenAt ? formatActionTime(hist.takenAt).timeStr : "00:00"),
          dosage: hist.dosage || "",
          dateKey: dKey,
          parsedDate: parsed,
          status: hist.status,
          action: hist.action,
          takenAt: hist.takenAt,
        });
      });
    }

    // 2. Process Active Schedule Doses (Pending / No Action Taken)
    medicineData.forEach((med) => {
      if (!med.schedule || !Array.isArray(med.schedule)) return;

      med.schedule.forEach((sch) => {
        const parsed = parseScheduleDate(sch.date);
        if (!parsed) return;
        const dKey = toDateKey(parsed);

        if (sch.doses && Array.isArray(sch.doses)) {
          sch.doses.forEach((dose) => {
            if (!dose) return;
            const doseIdStr = dose._id ? String(dose._id) : "";
            // Skip if this dose was already recorded in history
            if (doseIdStr && resolvedDoseIds.has(doseIdStr)) {
              return;
            }

            const isPastPending = dKey < todayKey;
            if (isPastPending && !med.is_paused) {
              overdue++;
            }

            helperAddCount(dKey, "pending");

            const doseHasNoStock = hasNoQuantityForDose(med.quantity, dose.dosage);

            list.push({
              id: doseIdStr || `${med._id}-${sch.day}-${dose.time}`,
              medicineId: med._id,
              medicineName: med.medicine_name,
              doseId: doseIdStr,
              dayNumber: sch.day,
              time: dose.time || "00:00",
              dosage: dose.dosage || "",
              dateKey: dKey,
              parsedDate: parsed,
              status: "pending",
              medicine: med,
              scheduleEntry: sch,
              dose,
              isOverdue: isPastPending,
              doseHasNoStock,
            });
          });
        }
      });
    });

    return {
      allDoseList: list,
      pastOverdueCount: overdue,
      dateDoseCounts: counts,
      dateStatusCounts: statusCounts,
    };
  }, [doseHistory, medicineData, todayKey, todayObj]);

  // Selected date object for display
  const selectedDateObj = useMemo(() => {
    const [y, m, d] = selectedDateKey.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedDateKey]);

  const relativeLabel = useMemo(
    () => getDateRelativeLabel(selectedDateKey, todayKey),
    [selectedDateKey, todayKey]
  );

  // Compute filtered doses and stats for the current view
  const { filteredDoses, selectedDateStats } = useMemo(() => {
    // 1. Filter by date or all
    let dateFiltered = allDoseList;
    if (filterMode === "date") {
      dateFiltered = allDoseList.filter((item) => item.dateKey === selectedDateKey);
    }

    const total = dateFiltered.length;
    const completed = dateFiltered.filter((d) => d.status === "completed").length;
    const missed = dateFiltered.filter((d) => d.status === "missed").length;
    const pending = dateFiltered.filter((d) => d.status === "pending").length;

    // 2. Filter by status if selected
    let finalFiltered = dateFiltered;
    if (statusFilter !== "all") {
      finalFiltered = dateFiltered.filter((item) => item.status === statusFilter);
    }

    // 3. Sort by date, then time
    finalFiltered.sort((a, b) => {
      if (a.dateKey !== b.dateKey) {
        return a.dateKey.localeCompare(b.dateKey);
      }
      const timeA = a.time || "00:00";
      const timeB = b.time || "00:00";
      return timeA.localeCompare(timeB);
    });

    return {
      filteredDoses: finalFiltered,
      selectedDateStats: { total, completed, missed, pending },
    };
  }, [allDoseList, filterMode, selectedDateKey, statusFilter]);

  // 7 date pills centered around the selected date
  const datePills = useMemo(() => {
    const [y, m, d] = selectedDateKey.split("-").map(Number);
    const baseDate = new Date(y, m - 1, d);
    const pills = [];

    for (let offset = -3; offset <= 3; offset++) {
      const pillDate = new Date(baseDate);
      pillDate.setDate(baseDate.getDate() + offset);
      const pillKey = toDateKey(pillDate);
      const isToday = pillKey === todayKey;
      const isSelected = filterMode === "date" && pillKey === selectedDateKey;
      const count = dateDoseCounts[pillKey] || 0;
      const st = dateStatusCounts[pillKey];

      pills.push({
        key: pillKey,
        date: pillDate,
        dayName: pillDate.toLocaleDateString("en-US", { weekday: "short" }),
        dayNum: pillDate.getDate(),
        isToday,
        isSelected,
        doseCount: count,
        hasPending: (st?.pending || 0) > 0,
        hasCompleted: (st?.completed || 0) > 0,
        hasMissed: (st?.missed || 0) > 0,
      });
    }

    return pills;
  }, [selectedDateKey, todayKey, filterMode, dateDoseCounts, dateStatusCounts]);

  // Convenience: skip all animations if user prefers reduced motion
  const prefersReducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  // Track whether pills have already been revealed (so tapping a date
  // doesn't replay the entrance flash on every tap)
  const pillsAnimated = useRef(false);

  // Dose cards — y-fade on desktop, alternating x-slide on mobile (both scroll-triggered)
  useEffect(() => {
    if (prefersReducedMotion || !dosesGridRef.current) return;
    const cards = dosesGridRef.current.querySelectorAll<HTMLElement>(".dose-card");
    if (!cards.length) return;

    const isDesktop = window.matchMedia("(min-width: 768px)").matches;

    const ctx = gsap.context(() => {
      if (isDesktop) {
        // Desktop: fade + slide up, scroll-triggered
        gsap.set(cards, { opacity: 0, y: 30, scale: 0.96 });
        gsap.to(cards, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          stagger: 0.07,
          ease: "power2.out",
          scrollTrigger: {
            trigger: dosesGridRef.current,
            start: "top 90%",
            toggleActions: "play none none none",
            onEnter: () => ScrollTrigger.refresh(),
          },
        });
      } else {
        // Mobile: alternating left/right slide-in, scroll-triggered per card
        cards.forEach((card, i) => {
          const fromX = i % 2 === 0 ? -100 : 100;
          gsap.from(card, {
            x: fromX,
            opacity: 0,
            duration: 0.6,
            ease: "power3.out",
            scrollTrigger: {
              trigger: card,
              start: "top 92%",
              toggleActions: "play none none none",
            },
            delay: i * 0.08, // light stagger between cards
          });
        });
        ScrollTrigger.refresh();
      }
    }, dosesGridRef);

    return () => ctx.revert();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredDoses.length, prefersReducedMotion]);

  // Low stock alert shake-in (once per appearance)
  useEffect(() => {
    if (prefersReducedMotion || !lowStockRef.current || lowStockMedicines.length === 0) return;
    gsap.fromTo(
      lowStockRef.current,
      { opacity: 0, x: -16 },
      { opacity: 1, x: 0, duration: 0.45, ease: "power3.out" }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lowStockMedicines.length]);

  // Date pills — only animate on first reveal, not on every date tap
  useEffect(() => {
    if (prefersReducedMotion || !datePillsRef.current) return;
    const pills = datePillsRef.current.querySelectorAll<HTMLElement>(".date-pill-btn");
    if (!pills.length) return;

    if (pillsAnimated.current) return; // already played — don't replay on date change
    pillsAnimated.current = true;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        pills,
        { opacity: 0, scale: 0.75, y: 8 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.35,
          stagger: 0.04,
          ease: "back.out(1.3)",
        }
      );
    }, datePillsRef);

    return () => ctx.revert();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDateKey]);

  if (loading && medicineData.length === 0 && (!doseHistory || doseHistory.length === 0)) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen text-white">
      <Header />
      {/* Low Stock Alert Bar */}
      {lowStockMedicines.length > 0 && !alertDismissed && (
        <div ref={lowStockRef} className="mx-auto max-w-7xl px-4">
          <div className="mb-8 rounded-2xl border border-amber-500/25 bg-amber-500/10 backdrop-blur-md p-4 sm:p-4.5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
              <div className="flex items-start gap-3">
                <FaExclamationTriangle className="text-amber-400 text-base sm:text-lg shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-semibold text-white">
                      Low Stock Alert
                    </h3>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {lowStockMedicines.length}{" "}
                      {lowStockMedicines.length > 1 ? "medicines" : "medicine"} &lt; 4 pills
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {lowStockMedicines.map((item, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-black/40 border border-white/10 text-xs text-gray-300"
                      >
                        <FaPills className="text-amber-400/80 text-[10px]" />
                        <span className="font-medium text-white">{item.name}</span>
                        <span className="text-amber-300/90 font-mono text-[11px]">
                          ({item.details})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                <Link
                  href="/Medicines"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#03e9f4] hover:bg-[#02c4ce] text-black font-semibold text-xs transition-colors"
                >
                  Manage
                  <FaArrowRight className="text-[10px]" />
                </Link>
                <button
                  type="button"
                  onClick={() => setAlertDismissed(true)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Dismiss alert"
                  aria-label="Dismiss alert"
                >
                  <FaTimes size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 pt-2">
        <NotificationSettings />
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <ViewAsSelector />

        {/* Date Filter Bar */}
        <div ref={dateBarRef} className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-4 sm:p-5 shadow-2xl">
          {/* Top Row: Title, Date Headline & Mode Toggles */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400">
                  {filterMode === "all" ? "All Scheduled & Recorded Doses" : "Daily Medication Schedule"}
                </h2>
                {filterMode === "date" && selectedDateKey === todayKey && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#03e9f4]/15 text-[#03e9f4] border border-[#03e9f4]/30 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#03e9f4]" />
                    Today
                  </span>
                )}
                {filterMode === "date" && selectedDateKey !== todayKey && relativeLabel && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-gray-200 border border-white/20">
                    {relativeLabel}
                  </span>
                )}
              </div>

              <div className="text-xs sm:text-sm text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
                <FaCalendarDay className="text-[#03e9f4] text-xs shrink-0" />
                <span>
                  {filterMode === "all"
                    ? "Showing all active and recorded doses across all dates"
                    : `${formatHeaderDate(selectedDateObj)}${
                        relativeLabel ? ` • ${relativeLabel}` : ""
                      }`}
                </span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-300 font-medium font-mono">
                  {selectedDateStats.total} dose{selectedDateStats.total === 1 ? "" : "s"}
                </span>

                {selectedDateStats.total > 0 && (
                  <div className="flex items-center gap-2 text-xs ml-1 flex-wrap">
                    {selectedDateStats.completed > 0 && (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                        <FaCheckCircle className="text-[10px]" />
                        {selectedDateStats.completed} done
                      </span>
                    )}
                    {selectedDateStats.missed > 0 && (
                      <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                        <FaCalendarTimes className="text-[10px]" />
                        {selectedDateStats.missed} missed
                      </span>
                    )}
                    {selectedDateStats.pending > 0 && (
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          selectedDateKey < todayKey ? "text-rose-400" : "text-[#03e9f4]"
                        }`}
                      >
                        {selectedDateKey < todayKey ? (
                          <FaExclamationTriangle className="text-[10px]" />
                        ) : (
                          <FaClock className="text-[10px]" />
                        )}
                        {selectedDateStats.pending}{" "}
                        {selectedDateKey < todayKey ? "action needed" : "scheduled"}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Action Controls */}
            <div className="flex items-center flex-wrap gap-2 self-start md:self-auto">
              {/* Jump to Today Button */}
              <button
                type="button"
                onClick={() => {
                  setSelectedDateKey(todayKey);
                  setFilterMode("date");
                  setStatusFilter("all");
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterMode === "date" && selectedDateKey === todayKey
                    ? "bg-[#03e9f4] text-black shadow-[0_0_15px_rgba(3,233,244,0.3)]"
                    : "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10"
                }`}
              >
                <FaCalendarCheck
                  className={
                    filterMode === "date" && selectedDateKey === todayKey
                      ? "text-black"
                      : "text-[#03e9f4]"
                  }
                />
                Today
              </button>

              {/* All Doses Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  setFilterMode((prev) => (prev === "all" ? "date" : "all"));
                  setStatusFilter("all");
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterMode === "all"
                    ? "bg-[#03e9f4] text-black shadow-[0_0_15px_rgba(3,233,244,0.3)]"
                    : "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10"
                }`}
              >
                <FaHistory className={filterMode === "all" ? "text-black" : "text-gray-400"} />
                All Doses
              </button>

              {/* Native Date Picker Trigger */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      dateInputRef.current?.showPicker();
                    } catch {
                      dateInputRef.current?.focus();
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
                  title="Choose specific date"
                >
                  <FaCalendarAlt className="text-[#03e9f4]" />
                  <span className="hidden sm:inline">Pick Date</span>
                </button>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={selectedDateKey}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedDateKey(e.target.value);
                      setFilterMode("date");
                      setStatusFilter("all");
                    }
                  }}
                  className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
                  tabIndex={-1}
                />
              </div>
            </div>
          </div>

          {/* Optional Status Filter Chips if multiple statuses exist for this date */}
          {selectedDateStats.total > 0 &&
            (selectedDateStats.completed > 0 ||
              selectedDateStats.missed > 0 ||
              selectedDateStats.pending > 0) &&
            ((selectedDateStats.completed > 0 && selectedDateStats.missed > 0) ||
              (selectedDateStats.completed > 0 && selectedDateStats.pending > 0) ||
              (selectedDateStats.missed > 0 && selectedDateStats.pending > 0)) && (
              <div className="pt-3 pb-1 border-b border-white/5 flex items-center gap-2 overflow-x-auto">
                <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold shrink-0">
                  Filter:
                </span>
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === "all"
                      ? "bg-white/20 text-white border border-white/30"
                      : "bg-white/5 text-gray-400 hover:text-white border border-white/10"
                  }`}
                >
                  All ({selectedDateStats.total})
                </button>
                {selectedDateStats.completed > 0 && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter("completed")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      statusFilter === "completed"
                        ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 shadow-[0_0_10px_rgba(52,211,153,0.2)]"
                        : "bg-white/5 text-gray-400 hover:text-emerald-300 border border-white/10"
                    }`}
                  >
                    <FaCheckCircle className="text-[10px] text-emerald-400" />
                    Completed ({selectedDateStats.completed})
                  </button>
                )}
                {selectedDateStats.missed > 0 && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter("missed")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      statusFilter === "missed"
                        ? "bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-[0_0_10px_rgba(251,191,36,0.2)]"
                        : "bg-white/5 text-gray-400 hover:text-amber-300 border border-white/10"
                    }`}
                  >
                    <FaCalendarTimes className="text-[10px] text-amber-400" />
                    Missed ({selectedDateStats.missed})
                  </button>
                )}
                {selectedDateStats.pending > 0 && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter("pending")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      statusFilter === "pending"
                        ? selectedDateKey < todayKey
                          ? "bg-rose-500/25 text-rose-300 border border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.2)]"
                          : "bg-[#03e9f4]/25 text-[#03e9f4] border border-[#03e9f4]/50 shadow-[0_0_10px_rgba(3,233,244,0.2)]"
                        : "bg-white/5 text-gray-400 hover:text-white border border-white/10"
                    }`}
                  >
                    {selectedDateKey < todayKey ? (
                      <FaExclamationTriangle className="text-[10px] text-rose-400" />
                    ) : (
                      <FaClock className="text-[10px] text-[#03e9f4]" />
                    )}
                    {selectedDateKey < todayKey ? "Action Needed" : "Scheduled"} ({selectedDateStats.pending})
                  </button>
                )}
              </div>
            )}

          {/* Interactive Date Pills Strip */}
          <div ref={datePillsRef} className="mt-4 flex items-center justify-between gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedDateKey((curr) => shiftDateKey(curr, -1));
                setFilterMode("date");
                setStatusFilter("all");
              }}
              className="p-2 sm:p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-colors cursor-pointer shrink-0"
              title="Previous Day"
              aria-label="Previous Day"
            >
              <FaChevronLeft className="text-xs sm:text-sm" />
            </button>

            {/* Horizontal Date Pills */}
            <div className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 overflow-x-auto py-1 px-1">
              {datePills.map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => {
                    setSelectedDateKey(pill.key);
                    setFilterMode("date");
                    setStatusFilter("all");
                  }}
                  className={`date-pill-btn flex flex-col items-center justify-center min-w-[48px] sm:min-w-[60px] py-2 px-1 sm:px-2 rounded-xl transition-all duration-200 cursor-pointer relative ${
                    pill.isSelected
                      ? "bg-[#03e9f4] text-black shadow-[0_0_18px_rgba(3,233,244,0.35)] scale-105 font-bold"
                      : pill.isToday
                      ? "bg-white/10 text-white border border-[#03e9f4]/50 hover:bg-white/15"
                      : "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5"
                  }`}
                >
                  <span
                    className={`text-[10px] uppercase tracking-wider ${
                      pill.isSelected ? "text-black/80 font-bold" : "text-gray-400"
                    }`}
                  >
                    {pill.dayName}
                  </span>
                  <span className="text-sm sm:text-base font-bold my-0.5">{pill.dayNum}</span>

                  {/* Status Aware Dose Indicator Dot */}
                  <div className="h-1.5 flex items-center justify-center">
                    {pill.doseCount > 0 && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          pill.isSelected
                            ? "bg-black"
                            : pill.hasPending
                            ? "bg-[#03e9f4]"
                            : pill.hasMissed
                            ? "bg-amber-400"
                            : "bg-emerald-400"
                        }`}
                        title={`${pill.doseCount} dose(s)`}
                      />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedDateKey((curr) => shiftDateKey(curr, 1));
                setFilterMode("date");
                setStatusFilter("all");
              }}
              className="p-2 sm:p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-colors cursor-pointer shrink-0"
              title="Next Day"
              aria-label="Next Day"
            >
              <FaChevronRight className="text-xs sm:text-sm" />
            </button>
          </div>

          {/* Past Pending Overdue Banner */}
          {pastOverdueCount > 0 && (
            <div className="mt-3.5 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-amber-300/90 bg-amber-500/10 rounded-xl px-3 py-2 border border-amber-500/20">
              <div className="flex items-center gap-2">
                <FaExclamationTriangle className="text-amber-400 text-xs shrink-0" />
                <span>
                  You have <strong className="text-white">{pastOverdueCount}</strong> pending dose
                  {pastOverdueCount > 1 ? "s" : ""} from earlier days where no action was taken.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFilterMode("all");
                  setStatusFilter("pending");
                }}
                className="underline hover:text-white font-medium cursor-pointer ml-2 shrink-0"
              >
                Resolve Pending
              </button>
            </div>
          )}
        </div>

        {/* Doses Grid */}
        <div ref={dosesGridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDoses.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 px-4 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
              <Image
                src="/not_found.png"
                height={100}
                width={200}
                alt="no doses"
                className="opacity-75"
              />
              <h3 className="mt-4 text-xl font-medium tracking-wide text-white text-center">
                {medicineData.length === 0 && (!doseHistory || doseHistory.length === 0)
                  ? "No Medicines Added"
                  : statusFilter !== "all"
                  ? `No ${statusFilter} doses found`
                  : filterMode === "all"
                  ? "No Medication Records Found"
                  : selectedDateKey === todayKey
                  ? "No Medicines Scheduled for Today"
                  : selectedDateKey < todayKey
                  ? `No Medication Records for ${formatDisplayDate(selectedDateObj)}`
                  : `No Medicines Scheduled for ${formatDisplayDate(selectedDateObj)}`}
              </h3>
              <p className="mt-1 text-sm text-gray-400 text-center max-w-md">
                {medicineData.length === 0 && (!doseHistory || doseHistory.length === 0)
                  ? "You haven't added any medication schedules yet. Start by adding your first medicine."
                  : statusFilter !== "all"
                  ? `There are no doses matching the '${statusFilter}' filter for this selection.`
                  : filterMode === "all"
                  ? "No active or recorded medication doses are currently found."
                  : selectedDateKey === todayKey
                  ? "You are all caught up for today! Use the date pills or calendar to check other dates."
                  : selectedDateKey < todayKey
                  ? "There are no completed, missed, or scheduled medication records for this previous date."
                  : "There are no medication doses scheduled on this date. Select another date or view all doses."}
              </p>
              <div className="mt-5 flex items-center gap-3 flex-wrap justify-center">
                {medicineData.length === 0 && (!doseHistory || doseHistory.length === 0) ? (
                  <Link
                    href="/Medicines"
                    className="px-4 py-2 rounded-xl bg-[#03e9f4] hover:bg-[#02c4ce] text-black font-semibold text-xs transition-colors flex items-center gap-1.5"
                  >
                    Add Medicine
                    <FaArrowRight className="text-[10px]" />
                  </Link>
                ) : (
                  <>
                    {statusFilter !== "all" && (
                      <button
                        type="button"
                        onClick={() => setStatusFilter("all")}
                        className="px-4 py-2 rounded-xl bg-[#03e9f4] hover:bg-[#02c4ce] text-black font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Show All Statuses
                      </button>
                    )}
                    {filterMode === "date" && selectedDateKey !== todayKey && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDateKey(todayKey);
                          setFilterMode("date");
                          setStatusFilter("all");
                        }}
                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors border border-white/10 cursor-pointer"
                      >
                        Go to Today
                      </button>
                    )}
                    {filterMode !== "all" && (
                      <button
                        type="button"
                        onClick={() => {
                          setFilterMode("all");
                          setStatusFilter("all");
                        }}
                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors border border-white/10 cursor-pointer"
                      >
                        View All Doses
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            filteredDoses.map((item, idx) => {
              const actionTime = item.takenAt ? formatActionTime(item.takenAt) : null;

              // CASE 1: COMPLETED DOSE (FROM HISTORY)
              if (item.status === "completed") {
                return (
                  <div
                    key={`completed-${item.id}-${idx}`}
                    className="dose-card relative group overflow-hidden transition-all duration-300 border border-emerald-500/30 rounded-2xl bg-emerald-500/[0.03] backdrop-blur-md p-6 hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(52,211,153,0.15)] flex flex-col justify-between"
                  >
                    {/* Glassmorphic Emerald Background Accent */}
                    <div className="pointer-events-none absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/10 blur-3xl rounded-full" />

                    <div>
                      {/* Header: Name, Date Badge (if 'all' mode) and Status Badge */}
                      <div className="flex justify-between items-start mb-4 gap-2">
                        <div className="pr-1">
                          <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                            {item.medicineName}
                          </h3>
                          {filterMode === "all" && (
                            <span className="text-[11px] text-gray-400 font-mono">
                              {formatDisplayDate(item.parsedDate)}
                            </span>
                          )}
                        </div>

                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_8px_rgba(52,211,153,0.3)] shrink-0">
                          <FaCheckCircle className="text-[10px]" /> Completed
                        </span>
                      </div>

                      {/* Body: Info Rows */}
                      <div className="space-y-3 text-sm text-gray-300">
                        <div className="flex items-center gap-2">
                          <FaClock className="text-emerald-400 text-xs opacity-80" />
                          <span className="opacity-50">Time:</span>
                          <span className="font-mono text-white">{item.time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FaPills className="text-emerald-400 text-xs opacity-80" />
                          <span className="opacity-50">Dosage:</span>
                          <span className="bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-xs text-white">
                            {item.dosage}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="opacity-50 text-[10px] uppercase tracking-tighter">
                            Schedule:
                          </span>
                          <span className="text-[12px] italic text-gray-300">
                            Day {item.dayNumber} • {formatDisplayDate(item.parsedDate)}
                          </span>
                        </div>
                      </div>

                      {/* Completed Action Timestamp Box */}
                      {actionTime && (
                        <div className="mt-4 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-emerald-300 font-medium">
                            <FaCheckCircle className="text-emerald-400 shrink-0 text-xs" />
                            <span>Marked Done:</span>
                          </div>
                          <span className="font-mono font-bold text-emerald-200">
                            {actionTime.timeStr}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer Tag */}
                    <div className="mt-6 pt-3 border-t border-emerald-500/20 flex items-center justify-center text-xs font-medium text-emerald-300/90 gap-1.5">
                      <FaCheckCircle className="text-xs text-emerald-400" />
                      <span>Dose completed on schedule</span>
                    </div>
                  </div>
                );
              }

              // CASE 2: MISSED DOSE (FROM HISTORY)
              if (item.status === "missed") {
                return (
                  <div
                    key={`missed-${item.id}-${idx}`}
                    className="dose-card relative group overflow-hidden transition-all duration-300 border border-amber-500/30 rounded-2xl bg-amber-500/[0.03] backdrop-blur-md p-6 hover:border-amber-500/50 hover:shadow-[0_0_20px_rgba(251,191,36,0.15)] flex flex-col justify-between"
                  >
                    {/* Glassmorphic Amber Background Accent */}
                    <div className="pointer-events-none absolute -top-10 -right-10 w-24 h-24 bg-amber-500/10 blur-3xl rounded-full" />

                    <div>
                      {/* Header: Name, Date Badge (if 'all' mode) and Status Badge */}
                      <div className="flex justify-between items-start mb-4 gap-2">
                        <div className="pr-1">
                          <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">
                            {item.medicineName}
                          </h3>
                          {filterMode === "all" && (
                            <span className="text-[11px] text-gray-400 font-mono">
                              {formatDisplayDate(item.parsedDate)}
                            </span>
                          )}
                        </div>

                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_8px_rgba(251,191,36,0.3)] shrink-0">
                          <FaCalendarTimes className="text-[10px]" /> Missed
                        </span>
                      </div>

                      {/* Body: Info Rows */}
                      <div className="space-y-3 text-sm text-gray-300">
                        <div className="flex items-center gap-2">
                          <FaClock className="text-amber-400 text-xs opacity-80" />
                          <span className="opacity-50">Scheduled:</span>
                          <span className="font-mono text-white">{item.time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FaPills className="text-amber-400 text-xs opacity-80" />
                          <span className="opacity-50">Dosage:</span>
                          <span className="bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-xs text-white">
                            {item.dosage}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="opacity-50 text-[10px] uppercase tracking-tighter">
                            Schedule:
                          </span>
                          <span className="text-[12px] italic text-gray-300">
                            Day {item.dayNumber} • {formatDisplayDate(item.parsedDate)}
                          </span>
                        </div>
                      </div>

                      {/* Missed Action Resolution Box */}
                      <div className="mt-4 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1 text-xs">
                        <div className="flex items-center justify-between text-amber-300 font-medium">
                          <span className="flex items-center gap-1">
                            <FaCalendarTimes className="text-amber-400 text-xs" />
                            Resolution:
                          </span>
                          {actionTime && (
                            <span className="font-mono text-amber-200 text-[11px] font-bold">
                              {actionTime.timeStr}
                            </span>
                          )}
                        </div>
                        <p className="text-amber-300/85 text-[11px]">
                          {item.action === "skip_and_continue"
                            ? "Skipped & Added to End of Schedule"
                            : item.action === "carry_forward_shift"
                            ? "Shifted Forward to Next Day"
                            : item.action === "quantity_unavailable"
                            ? "Recorded Missed (Zero Stock)"
                            : "Recorded in Missed History"}
                        </p>
                      </div>
                    </div>

                    {/* Footer Tag */}
                    <div className="mt-6 pt-3 border-t border-amber-500/20 flex items-center justify-center text-xs font-medium text-amber-300/90 gap-1.5">
                      <FaCalendarTimes className="text-xs text-amber-400" />
                      <span>Missed dose logged in history</span>
                    </div>
                  </div>
                );
              }

              // CASE 3: PENDING DOSE (ACTIVE SCHEDULE - INCLUDING PAST DATES WITH NO ACTION PERFORMED)
              const dose = item.dose!;
              const medicine = item.medicine!;
              const isChecked = dose._id ? checkDoses.includes(dose._id) : false;
              const isPastPending = item.isOverdue;

              return (
                <div
                  key={`pending-${medicine._id}-${dose._id || item.dayNumber}-${idx}`}
                  className={`dose-card relative group overflow-hidden transition-all duration-300 border rounded-2xl backdrop-blur-md p-6 flex flex-col justify-between ${
                    isPastPending
                      ? "border-rose-500/40 bg-rose-500/[0.03] hover:border-rose-500/70 hover:shadow-[0_0_20px_rgba(244,63,94,0.2)]"
                      : "border-white/10 bg-white/5 hover:border-[#03e9f4]/40 hover:shadow-[0_0_20px_rgba(3,233,244,0.15)]"
                  }`}
                >
                  {/* Glassmorphic Background Accent */}
                  <div
                    className={`pointer-events-none absolute -top-10 -right-10 w-24 h-24 blur-3xl rounded-full ${
                      isPastPending ? "bg-rose-500/10" : "bg-[#03e9f4]/10"
                    }`}
                  />

                  <div>
                    {/* Header: Name, Date Badge (if 'all' mode) and Checkbox */}
                    <div className="flex justify-between items-start mb-4 gap-2">
                      <div className="pr-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3
                            className={`text-xl font-bold ${
                              isPastPending ? "text-rose-300" : "text-[#03e9f4]"
                            }`}
                          >
                            {medicine.medicine_name}
                          </h3>
                        </div>
                        {filterMode === "all" && (
                          <span className="text-[11px] text-gray-400 font-mono block mt-0.5">
                            {formatDisplayDate(item.parsedDate)}
                          </span>
                        )}
                        {isPastPending && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 mt-1">
                            <FaExclamationTriangle className="text-[9px]" /> Past Due • Action Needed
                          </span>
                        )}
                      </div>

                      <input
                        className={`w-10 h-5 rounded transition-transform enabled:cursor-pointer enabled:hover:scale-140 disabled:cursor-not-allowed disabled:opacity-40 ${
                          isPastPending ? "accent-rose-500" : "accent-[#03e9f4]"
                        }`}
                        onChange={() => handleCheckbox(dose._id!)}
                        checked={isChecked}
                        disabled={!canInteract || medicine.is_paused || item.doseHasNoStock}
                        type="checkbox"
                        aria-label={`Select dose for ${medicine.medicine_name}`}
                      />
                    </div>

                    {/* Body: Info Rows */}
                    <div className="space-y-3 text-sm text-gray-300">
                      <div className="flex items-center gap-2">
                        <FaClock
                          className={`text-xs opacity-70 ${
                            isPastPending ? "text-rose-400" : "text-[#03e9f4]"
                          }`}
                        />
                        <span className="opacity-50">Time:</span>
                        <span className="font-mono text-white">{dose.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FaPills
                          className={`text-xs opacity-70 ${
                            isPastPending ? "text-rose-400" : "text-[#03e9f4]"
                          }`}
                        />
                        <span className="opacity-50">Dosage:</span>
                        <span className="bg-white/10 px-2 py-0.5 rounded text-xs text-white">
                          {dose.dosage}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="opacity-50 text-[10px] uppercase tracking-tighter">
                          Schedule:
                        </span>
                        <span className="text-[12px] italic text-gray-300">
                          Day {item.dayNumber} • {formatDisplayDate(item.parsedDate)}
                        </span>
                      </div>
                    </div>

                    {/* Past Due Warning Helper */}
                    {isPastPending && (
                      <div className="mt-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300/90 flex items-start gap-2">
                        <FaExclamationTriangle className="text-rose-400 text-xs shrink-0 mt-0.5" />
                        <span>No action was recorded on this date. You can still mark it done or missed.</span>
                      </div>
                    )}
                  </div>

                  {/* Footer: Done and Missed Buttons */}
                  <div className="mt-6 flex items-center gap-2">
                    {canInteract && !medicine.is_paused ? (
                      <>
                        <button
                          disabled={!isChecked || !!buttonLoading || item.doseHasNoStock}
                          onClick={() => handleDeleteDose(dose._id!, medicine._id)}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold uppercase text-[11px] sm:text-xs tracking-wider transition-all duration-200 
                            ${
                              isChecked
                                ? isPastPending
                                  ? "bg-rose-500 hover:bg-rose-400 text-white shadow-lg shadow-rose-500/20 hover:scale-[1.02] active:scale-95 cursor-pointer"
                                  : "bg-[#03e9f4] text-black shadow-lg shadow-[#03e9f4]/20 hover:scale-[1.02] active:scale-95 cursor-pointer"
                                : "bg-gray-800 text-gray-500 cursor-not-allowed"
                            }`}
                        >
                          {buttonLoading === dose?._id && (
                            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                          )}
                          Mark Done
                        </button>

                        <button
                          type="button"
                          disabled={!!buttonLoading}
                          onClick={() => handleOpenMissedModal(medicine, dose)}
                          className="px-3 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/60 font-semibold text-[11px] sm:text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                          title="Reschedule or record as missed"
                        >
                          <FaCalendarTimes className="text-xs" />
                          <span>Missed</span>
                        </button>
                      </>
                    ) : medicine.is_paused ? (
                      <div className="w-full py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-center text-xs text-yellow-300 font-medium">
                        Schedule is paused
                      </div>
                    ) : (
                      <div className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-center text-xs text-gray-500 font-medium">
                        <span className="flex items-center justify-center gap-1">
                          <FaEye aria-hidden="true" /> View only — no interactions
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Missed Dose Resolution Modal */}
      <MissedDoseModal
        isOpen={activeMissedModal.isOpen}
        onClose={() => setActiveMissedModal({ isOpen: false, medicine: null, dose: null })}
        medicine={activeMissedModal.medicine}
        dose={activeMissedModal.dose}
        onConfirm={handleConfirmMissedDose}
        isLoading={modalLoading}
      />
    </div>
  );
}