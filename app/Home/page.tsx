"use client";

import Header from "@/components/header";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Dose, LowStockItem } from "@/Interfaces/interface";
import Loading from "../loading";
import Image from "next/image";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchMedicines, deleteDose } from "@/store/medicineSlice";
import { FaExclamationTriangle, FaArrowRight, FaTimes, FaPills } from "react-icons/fa";


export default function HomePage() {
  const dispatch = useAppDispatch();
  const { medicines: medicineData, loading } = useAppSelector((state) => state.medicine);
  const [checkDoses, setCheckDoses] = useState<string[]>([]);
  const [buttonLoading, setButtonLoading] = useState<string | null>(null);
  const [alertDismissed, setAlertDismissed] = useState(false);

  useEffect(() => {
    dispatch(fetchMedicines());
  }, [dispatch]);

  const handleCheckbox = (doseId: string) => {
    setCheckDoses((prev) =>
      prev.includes(doseId)
        ? prev.filter((id: string) => id !== doseId)
        : [...prev, doseId]
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

  // Extract medicines with quantity < 4
  const lowStockMedicines: LowStockItem[] = [];
  medicineData.forEach((med) => {
    if (med.quantity === undefined || med.quantity === null) return;

    if (typeof med.quantity === 'object' && med.quantity !== null) {
      const lowVariants: string[] = [];
      let minQ = Infinity;
      Object.entries(med.quantity).forEach(([dose, qty]) => {
        const qNum = parseFloat(String(qty));
        if (!isNaN(qNum) && qNum < 4) {
          lowVariants.push(`${dose}: ${qNum} pill${qNum === 1 ? '' : 's'}`);
          if (qNum < minQ) minQ = qNum;
        }
      });

      if (lowVariants.length > 0) {
        lowStockMedicines.push({
          id: med._id,
          name: med.medicine_name,
          details: lowVariants.join(', '),
          minQty: minQ,
        });
      }
    } else {
      const qNum = parseFloat(String(med.quantity));
      if (!isNaN(qNum) && qNum < 4) {
        lowStockMedicines.push({
          id: med._id,
          name: med.medicine_name,
          details: `${qNum} pill${qNum === 1 ? '' : 's'} remaining`,
          minQty: qNum,
        });
      }
    }
  });

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen text-white">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* Low Stock Alert Bar */}
        {lowStockMedicines.length > 0 && !alertDismissed && (
          <div className="mb-8 relative overflow-hidden rounded-2xl border border-amber-500/50 bg-gradient-to-r from-amber-950/40 via-red-950/30 to-black/60 backdrop-blur-xl p-4 sm:p-5">
            {/* Glowing Accent */}
            <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-amber-400 to-red-500" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pl-3">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shrink-0 mt-0.5 animate-pulse">
                  <FaExclamationTriangle className="text-lg sm:text-xl" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      Low Stock Warning
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 uppercase">
                        {lowStockMedicines.length} Medicine{lowStockMedicines.length > 1 ? 's' : ''} &lt; 4 Pills
                      </span>
                    </h3>
                  </div>

                  <p className="text-xs sm:text-sm text-gray-300 mt-1">
                    The following medication stock is running critically low.
                  </p>

                  <div className="flex flex-wrap gap-2 mt-2.5">
                    {lowStockMedicines.map((item, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/60 border border-amber-500/40 text-xs text-amber-200"
                      >
                        <FaPills className="text-amber-400 text-[11px]" />
                        <span className="font-bold text-white">{item.name}</span>
                        <span className="text-red-300 font-semibold">{item.details} left</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                <Link
                  href="/Medicines"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-[#03e9f4] text-black font-bold text-xs shadow-lg hover:opacity-90 active:scale-95 transition-all"
                >
                  Refill / Manage
                  <FaArrowRight className="text-xs" />
                </Link>
                <button
                  type="button"
                  onClick={() => setAlertDismissed(true)}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Dismiss alert"
                  aria-label="Dismiss alert"
                >
                  <FaTimes className="text-sm" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Section Title */}
        <h2 className="text-2xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">
          Daily Medication Schedule
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {medicineData.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center h-[50vh]">
              <Image src="/not_found.png" height={100} width={200} alt="not found" />
              <h1 className="mt-4 text-2xl font-light tracking-widest uppercase">No Medicines Today</h1>
            </div>
          ) : (
            medicineData.map((item) => {
              const dose: Dose = item.schedule[0]?.doses[0];
              if (!dose) return null;

              const isChecked = dose._id ? checkDoses.includes(dose._id) : false;
              return (
                <div
                  key={item._id}
                  className={`relative group overflow-hidden transition-all duration-300 border border-white/10 rounded-2xl bg-white/5 backdrop-blur-md p-6 hover:border-[#03e9f4]/40 hover:shadow-[0_0_20px_rgba(3,233,244,0.15)]`}
                >
                  {/* Glassmorphic Background Accent */}
                  <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#03e9f4]/10 blur-3xl rounded-full" />

                  {/* Header: Name and Checkbox */}
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-[#03e9f4] pr-2">
                      {item.medicine_name}
                    </h3>

                    <input
                      className="w-10 h-5 rounded cursor-pointer accent-[#03e9f4] transition-transform hover:scale-140"
                      onChange={() => handleCheckbox(dose._id!)}
                      checked={isChecked}
                      type="checkbox"
                    />
                  </div>

                  {/* Body: Info Rows */}
                  <div className="space-y-3 text-sm text-gray-300">
                    <div className="flex items-center gap-2">
                      <span className="opacity-50">Time:</span>
                      <span className="font-mono text-white">{dose.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="opacity-50">Dosage:</span>
                      <span className="bg-white/10 px-2 py-0.5 rounded text-xs text-white">{dose.dosage}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="opacity-50 text-[10px] uppercase tracking-tighter">Schedule:</span>
                      <span className="text-[12px] italic">Day {item.schedule[0].day} • {item.schedule[0].date}</span>
                    </div>
                  </div>

                  {/* Footer: Done Button */}
                  <button
                    disabled={!isChecked || !!buttonLoading}
                    onClick={() => handleDeleteDose(dose._id!, item._id)}
                    className={`mt-6 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold uppercase text-xs tracking-widest transition-all duration-200 
                      ${isChecked
                        ? "bg-[#03e9f4] text-black shadow-lg shadow-[#03e9f4]/20 hover:scale-[1.02] active:scale-95"
                        : "bg-gray-800 text-gray-500 cursor-not-allowed"}`}
                  >
                    {buttonLoading === dose?._id && (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                    )}
                    Mark Completed
                  </button>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}