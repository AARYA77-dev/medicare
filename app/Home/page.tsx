"use client";
import Header from "@/components/header";
import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Dose, MedicineWithSchedule } from "@/Interfaces/interface";
import Loading from "../loading";
import Image from "next/image";

export default function HomePage() {
  const [medicineData, setMedicineData] = useState<MedicineWithSchedule[]>([]);
  const [checkDoses, setCheckDoses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [buttonLoading, setButtonLoading] = useState<string | null | undefined>(null);

  useEffect(() => {
    setLoading(true);
    axios.get("/api/medicareDB")
      .then((response) => {
        setMedicineData(response.data.result);
      }).catch(() => {
        toast.error("Something went wrong");
      }).finally(() => {
        setLoading(false);
      });
  }, []);

  const handleCheckbox = (doseId: string) => {
    setCheckDoses((prev) =>
      prev.includes(doseId)
        ? prev.filter((id: string) => id !== doseId)
        : [...prev, doseId]
    );
  };

  const handleDeleteDose = (doseId: string, medicineId: string) => {
    setButtonLoading(doseId);
    axios.delete(`/api/medicareDB/${doseId}`)
      .then(() => {
        setMedicineData((prev) =>
          prev.map((med) =>
            med._id === medicineId
              ? {
                ...med,
                schedule: med.schedule.map((sch) => ({
                  ...sch,
                  doses: sch.doses.filter((d) => d._id !== doseId),
                })).filter((sch) => sch.doses.length > 0)
              }
              : med
          ).filter((med) => med.schedule.length > 0)
        );
        setCheckDoses((prev) => prev.filter((id) => id !== doseId));
        toast.success("Dose marked as done!");
      })
      .catch(() => toast.error("Failed to update Dose"))
      .finally(() => setButtonLoading(null));
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen  text-white">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-10">
        
        {/* Section Title */}
        <h2 className="text-2xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">
          Daily Medication Schedule
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {medicineData.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center h-[50vh] opacity-60">
              <Image src="/not_found.png" height={100} width={200} alt="not found" className="grayscale brightness-50" />
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
                    <h3 className="text-xl font-bold text-[#03e9f4]  pr-2">
                      {item.medicine_name}
                    </h3>

                    <input 
                      className="w-15 h-5 rounded cursor-pointer accent-[#03e9f4] transition-transform hover:scale-140"
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