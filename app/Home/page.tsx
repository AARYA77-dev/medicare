"use client";

import Header from "@/components/header";
import ViewAsSelector from "@/components/ViewAsSelector";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Dose, LowStockItem, MedicineWithSchedule, ScheduleEntry } from "@/Interfaces/interface";
import Loading from "../loading";
import Image from "next/image";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchMedicines, deleteDose, resolveMissedDose } from "@/store/medicineSlice";
import { hasNoQuantityForDose } from "@/lib/medicineQuantity";
import {
  FaArrowRight,
  FaCalendarAlt,
  FaCalendarCheck,
  FaCalendarDay,
  FaCalendarTimes,
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

interface ExtractedDoseItem {
  medicine: MedicineWithSchedule;
  scheduleEntry: ScheduleEntry;
  dose: Dose;
  dateKey: string;
  parsedDate: Date;
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseScheduleDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const str = String(dateStr).trim();

  // 1. YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    return isNaN(d.getTime()) ? null : d;
  }

  // 2. DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-\/\.](\d{1,2})[-\/\.](\d{4})/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    return isNaN(d.getTime()) ? null : d;
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
  const { medicines: medicineData, loading } = useAppSelector((state) => state.medicine);
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
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    dispatch(fetchMedicines(viewingOwnerId ? { ownerId: viewingOwnerId } : undefined));
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

  // Extract doses by date and compute overdue counts & dates with doses
  const { scheduledDoses, pastOverdueCount, dateDoseCounts } = useMemo(() => {
    const allList: ExtractedDoseItem[] = [];
    let overdue = 0;
    const counts: Record<string, number> = {};

    medicineData.forEach((med) => {
      if (!med.schedule || !Array.isArray(med.schedule)) return;

      med.schedule.forEach((sch) => {
        const parsed = parseScheduleDate(sch.date);
        if (!parsed) return;
        const dKey = toDateKey(parsed);

        if (sch.doses && Array.isArray(sch.doses)) {
          sch.doses.forEach((dose) => {
            if (dose) {
              counts[dKey] = (counts[dKey] || 0) + 1;
              if (dKey < todayKey && !med.is_paused) {
                overdue++;
              }
              allList.push({
                medicine: med,
                scheduleEntry: sch,
                dose,
                dateKey: dKey,
                parsedDate: parsed,
              });
            }
          });
        }
      });
    });

    let filtered: ExtractedDoseItem[] = [];
    if (filterMode === "all") {
      filtered = allList;
    } else {
      filtered = allList.filter((item) => item.dateKey === selectedDateKey);
    }

    filtered.sort((a, b) => {
      if (a.dateKey !== b.dateKey) {
        return a.dateKey.localeCompare(b.dateKey);
      }
      const timeA = a.dose.time || "00:00";
      const timeB = b.dose.time || "00:00";
      return timeA.localeCompare(timeB);
    });

    return {
      scheduledDoses: filtered,
      pastOverdueCount: overdue,
      dateDoseCounts: counts,
    };
  }, [medicineData, filterMode, selectedDateKey, todayKey]);

  // Selected date object for display
  const selectedDateObj = useMemo(() => {
    const [y, m, d] = selectedDateKey.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedDateKey]);

  const relativeLabel = useMemo(
    () => getDateRelativeLabel(selectedDateKey, todayKey),
    [selectedDateKey, todayKey]
  );

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

      pills.push({
        key: pillKey,
        date: pillDate,
        dayName: pillDate.toLocaleDateString("en-US", { weekday: "short" }),
        dayNum: pillDate.getDate(),
        isToday,
        isSelected,
        doseCount: count,
      });
    }

    return pills;
  }, [selectedDateKey, todayKey, filterMode, dateDoseCounts]);

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen text-white">
      <Header />
      {/* Low Stock Alert Bar */}
      {lowStockMedicines.length > 0 && !alertDismissed && (
        <div className="mx-auto max-w-7xl px-4">
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
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-4 sm:p-5 shadow-2xl">
          {/* Top Row: Title, Date Headline & Mode Toggles */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400">
                  {filterMode === "all" ? "All Scheduled Medications" : "Daily Medication Schedule"}
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
              <p className="text-xs sm:text-sm text-gray-400 mt-1 flex items-center gap-2">
                <FaCalendarDay className="text-[#03e9f4] text-xs shrink-0" />
                <span>
                  {filterMode === "all"
                    ? "Showing all active doses across all schedule dates"
                    : `${formatHeaderDate(selectedDateObj)}${
                        relativeLabel ? ` • ${relativeLabel}` : ""
                      }`}
                </span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-300 font-medium font-mono">
                  {scheduledDoses.length} dose{scheduledDoses.length === 1 ? "" : "s"}
                </span>
              </p>
            </div>

            {/* Quick Action Controls */}
            <div className="flex items-center flex-wrap gap-2 self-start md:self-auto">
              {/* Jump to Today Button */}
              <button
                type="button"
                onClick={() => {
                  setSelectedDateKey(todayKey);
                  setFilterMode("date");
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
                onClick={() => setFilterMode((prev) => (prev === "all" ? "date" : "all"))}
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
                    }
                  }}
                  className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
                  tabIndex={-1}
                />
              </div>
            </div>
          </div>

          {/* Interactive Date Pills Strip */}
          <div className="mt-4 flex items-center justify-between gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedDateKey((curr) => shiftDateKey(curr, -1));
                setFilterMode("date");
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
                  }}
                  className={`flex flex-col items-center justify-center min-w-[48px] sm:min-w-[60px] py-2 px-1 sm:px-2 rounded-xl transition-all duration-200 cursor-pointer relative ${
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

                  {/* Dose Indicator Dot */}
                  <div className="h-1.5 flex items-center justify-center">
                    {pill.doseCount > 0 && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          pill.isSelected ? "bg-black" : "bg-[#03e9f4]"
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
                  {pastOverdueCount > 1 ? "s" : ""} from earlier days.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className="underline hover:text-white font-medium cursor-pointer ml-2 shrink-0"
              >
                View All Doses
              </button>
            </div>
          )}
        </div>

        {/* Doses Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {scheduledDoses.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 px-4 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
              <Image
                src="/not_found.png"
                height={100}
                width={200}
                alt="no doses"
                className="opacity-75"
              />
              <h3 className="mt-4 text-xl font-medium tracking-wide text-white">
                {medicineData.length === 0
                  ? "No Medicines Added"
                  : filterMode === "all"
                  ? "No Scheduled Doses Remaining"
                  : selectedDateKey === todayKey
                  ? "No Medicines Scheduled for Today"
                  : `No Medicines Scheduled for ${formatDisplayDate(selectedDateObj)}`}
              </h3>
              <p className="mt-1 text-sm text-gray-400 text-center max-w-md">
                {medicineData.length === 0
                  ? "You haven't added any medication schedules yet. Start by adding your first medicine."
                  : filterMode === "all"
                  ? "All scheduled doses have been marked done or no active doses are found."
                  : selectedDateKey === todayKey
                  ? "You are all caught up for today! Use the date pills or calendar to check other dates."
                  : "There are no medication doses scheduled on this date. Select another date or view all doses."}
              </p>
              <div className="mt-5 flex items-center gap-3">
                {medicineData.length === 0 ? (
                  <Link
                    href="/Medicines"
                    className="px-4 py-2 rounded-xl bg-[#03e9f4] hover:bg-[#02c4ce] text-black font-semibold text-xs transition-colors flex items-center gap-1.5"
                  >
                    Add Medicine
                    <FaArrowRight className="text-[10px]" />
                  </Link>
                ) : (
                  <>
                    {filterMode === "date" && selectedDateKey !== todayKey && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDateKey(todayKey);
                          setFilterMode("date");
                        }}
                        className="px-4 py-2 rounded-xl bg-[#03e9f4] hover:bg-[#02c4ce] text-black font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Go to Today
                      </button>
                    )}
                    {filterMode !== "all" && (
                      <button
                        type="button"
                        onClick={() => setFilterMode("all")}
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
            scheduledDoses.map((item, idx) => {
              const dose = item.dose;
              const isChecked = dose._id ? checkDoses.includes(dose._id) : false;
              const doseHasNoStock = hasNoQuantityForDose(item.medicine.quantity, dose.dosage);

              return (
                <div
                  key={`${item.medicine._id}-${dose._id || item.scheduleEntry.day}-${idx}`}
                  className="relative group overflow-hidden transition-all duration-300 border border-white/10 rounded-2xl bg-white/5 backdrop-blur-md p-6 hover:border-[#03e9f4]/40 hover:shadow-[0_0_20px_rgba(3,233,244,0.15)]"
                >
                  {/* Glassmorphic Background Accent */}
                  <div className="pointer-events-none absolute -top-10 -right-10 w-24 h-24 bg-[#03e9f4]/10 blur-3xl rounded-full" />

                  {/* Header: Name, Date Badge (if 'all' mode) and Checkbox */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="pr-2">
                      <h3 className="text-xl font-bold text-[#03e9f4]">
                        {item.medicine.medicine_name}
                      </h3>
                      {filterMode === "all" && (
                        <span className="text-[11px] text-gray-400 font-mono">
                          {formatDisplayDate(item.parsedDate)}
                        </span>
                      )}
                    </div>

                    <input
                      className="w-10 h-5 rounded accent-[#03e9f4] transition-transform enabled:cursor-pointer enabled:hover:scale-140 disabled:cursor-not-allowed disabled:opacity-40"
                      onChange={() => handleCheckbox(dose._id!)}
                      checked={isChecked}
                      disabled={!canInteract || item.medicine.is_paused || doseHasNoStock}
                      type="checkbox"
                      aria-label={`Select dose for ${item.medicine.medicine_name}`}
                    />
                  </div>

                  {/* Body: Info Rows */}
                  <div className="space-y-3 text-sm text-gray-300">
                    <div className="flex items-center gap-2">
                      <FaClock className="text-[#03e9f4] text-xs opacity-70" />
                      <span className="opacity-50">Time:</span>
                      <span className="font-mono text-white">{dose.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FaPills className="text-[#03e9f4] text-xs opacity-70" />
                      <span className="opacity-50">Dosage:</span>
                      <span className="bg-white/10 px-2 py-0.5 rounded text-xs text-white">
                        {dose.dosage}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="opacity-50 text-[10px] uppercase tracking-tighter">
                        Schedule:
                      </span>
                      <span className="text-[12px] italic">
                        Day {item.scheduleEntry.day} • {formatDisplayDate(item.parsedDate)}
                      </span>
                    </div>
                  </div>

                  {/* Footer: Done and Missed Buttons */}
                  <div className="mt-6 flex items-center gap-2">
                    {canInteract && !item.medicine.is_paused ? (
                      <>
                        <button
                          disabled={!isChecked || !!buttonLoading || doseHasNoStock}
                          onClick={() => handleDeleteDose(dose._id!, item.medicine._id)}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold uppercase text-[11px] sm:text-xs tracking-wider transition-all duration-200 
                            ${
                              isChecked
                                ? "bg-[#03e9f4] text-black shadow-lg shadow-[#03e9f4]/20 hover:scale-[1.02] active:scale-95 cursor-pointer"
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
                          onClick={() => handleOpenMissedModal(item.medicine, dose)}
                          className="px-3 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/60 font-semibold text-[11px] sm:text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                          title="Reschedule or skip this dose"
                        >
                          <FaCalendarTimes className="text-xs" />
                          <span>Missed</span>
                        </button>
                      </>
                    ) : item.medicine.is_paused ? (
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