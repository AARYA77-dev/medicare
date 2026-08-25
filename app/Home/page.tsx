"use client";

import Header from "@/components/header";
import ViewAsSelector from "@/components/ViewAsSelector";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Dose, LowStockItem, MedicineWithSchedule } from "@/Interfaces/interface";
import Loading from "../loading";
import Image from "next/image";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchMedicines, deleteDose, resolveMissedDose } from "@/store/medicineSlice";
import { FaArrowRight, FaCalendarTimes, FaExclamationTriangle, FaEye, FaPills, FaTimes } from "react-icons/fa";
import MissedDoseModal from "@/components/MissedDoseModal";


export default function HomePage() {
  const dispatch = useAppDispatch();
  const { medicines: medicineData, loading } = useAppSelector((state) => state.medicine);
  const { viewingOwnerId, role } = useAppSelector((state) => state.sharing);
  // Can interact (mark done, missed) if own schedule OR care partner/co-manager
  const canInteract = !viewingOwnerId || role === 'collaborator' || role === 'admin';
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

  useEffect(() => {
    dispatch(fetchMedicines(viewingOwnerId ? { ownerId: viewingOwnerId } : undefined));
  }, [dispatch, viewingOwnerId]);

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

  const handleOpenMissedModal = (medicine: MedicineWithSchedule, dose: Dose) => {
    setActiveMissedModal({
      isOpen: true,
      medicine,
      dose,
    });
  };

  const handleConfirmMissedDose = async (action: 'skip_and_continue' | 'carry_forward_shift') => {
    if (!activeMissedModal.medicine || !activeMissedModal.dose) return;
    setModalLoading(true);
    try {
      await dispatch(
        resolveMissedDose({
          medicineId: activeMissedModal.medicine._id,
          doseId: activeMissedModal.dose._id!,
          action,
        })
      ).unwrap();
      toast.success(
        action === 'skip_and_continue'
          ? "Dose skipped & appended to end of schedule (+1 day extended)!"
          : "Dose carried forward to tomorrow (+1 day extended)!"
      );
      setActiveMissedModal({ isOpen: false, medicine: null, dose: null });
    } catch (err: unknown) {
      toast.error(typeof err === 'string' ? err : "Failed to update schedule");
    } finally {
      setModalLoading(false);
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
        <ViewAsSelector />

        {/* Low Stock Alert Bar */}
        {lowStockMedicines.length > 0 && !alertDismissed && (
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
                      {lowStockMedicines.length} {lowStockMedicines.length > 1 ? 'medicines' : 'medicine'} &lt; 4 pills
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
                        <span className="text-amber-300/90 font-mono text-[11px]">({item.details})</span>
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
        )}

        {/* Section Title */}
        {medicineData.length > 0 && <h2 className="text-2xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">
          Daily Medication Schedule
        </h2>}

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
                      className="w-10 h-5 rounded accent-[#03e9f4] transition-transform enabled:cursor-pointer enabled:hover:scale-140 disabled:cursor-not-allowed disabled:opacity-40"
                      onChange={() => handleCheckbox(dose._id!)}
                      checked={isChecked}
                      disabled={!canInteract}
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

                  {/* Footer: Done and Missed Buttons */}
                  <div className="mt-6 flex items-center gap-2">
                    {canInteract ? (
                      <>
                        <button
                          disabled={!isChecked || !!buttonLoading}
                          onClick={() => handleDeleteDose(dose._id!, item._id)}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold uppercase text-[11px] sm:text-xs tracking-wider transition-all duration-200 
                            ${isChecked
                              ? "bg-[#03e9f4] text-black shadow-lg shadow-[#03e9f4]/20 hover:scale-[1.02] active:scale-95 cursor-pointer"
                              : "bg-gray-800 text-gray-500 cursor-not-allowed"}`}
                        >
                          {buttonLoading === dose?._id && (
                            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                          )}
                          Mark Done
                        </button>

                        <button
                          type="button"
                          disabled={!!buttonLoading}
                          onClick={() => handleOpenMissedModal(item, dose)}
                          className="px-3 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/60 font-semibold text-[11px] sm:text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                          title="Reschedule or skip this dose"
                        >
                          <FaCalendarTimes className="text-xs" />
                          <span>Missed</span>
                        </button>
                      </>
                    ) : (
                      <div className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-center text-xs text-gray-500 font-medium">
                        <span className="flex items-center justify-center gap-1"><FaEye aria-hidden="true" /> View only — no interactions</span>
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