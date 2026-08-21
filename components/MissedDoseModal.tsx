'use client';

import React, { useState } from 'react';
import { Dose, MedicineWithSchedule } from '@/Interfaces/interface';
import {
  FaTimes,
  FaCalendarPlus,
  FaForward,
  FaRedoAlt,
  FaPills,
  FaCheckCircle,
  FaInfoCircle,
  FaCalendarAlt,
} from 'react-icons/fa';

interface MissedDoseModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicine: MedicineWithSchedule | null;
  dose: Dose | null;
  onConfirm: (action: 'skip_and_continue' | 'carry_forward_shift') => Promise<void>;
  isLoading: boolean;
}

export default function MissedDoseModal({
  isOpen,
  onClose,
  medicine,
  dose,
  onConfirm,
  isLoading,
}: MissedDoseModalProps) {
  const [selectedOption, setSelectedOption] = useState<'skip_and_continue' | 'carry_forward_shift'>('skip_and_continue');

  if (!isOpen || !medicine || !dose) return null;

  // Determine next scheduled dose details for preview
  let nextScheduledDose = 'Next regular dose';
  if (medicine.schedule && medicine.schedule.length > 1) {
    const nextEntry = medicine.schedule[1];
    if (nextEntry && nextEntry.doses && nextEntry.doses.length > 0) {
      nextScheduledDose = nextEntry.doses[0].dosage;
    }
  } else if (medicine.schedule && medicine.schedule.length === 1 && medicine.schedule[0].doses.length > 1) {
    nextScheduledDose = medicine.schedule[0].doses[1].dosage;
  }

  const currentDoseVal = dose.dosage;
  const currentDays = parseInt(medicine.number_days) || (medicine.schedule?.length || 1);
  const extendedDays = currentDays + 1;

  const handleConfirm = async () => {
    await onConfirm(selectedOption);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      {/* Modal Card */}
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-gray-900/95 via-black/95 to-gray-950/95 p-6 sm:p-7 shadow-[0_0_50px_rgba(3,233,244,0.2)]">
        {/* Neon Glow Accents */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#03e9f4]/15 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <FaCalendarPlus className="text-xl" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                Missed Dose Resolution
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Choose how to reschedule missed medication
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <FaTimes size={16} />
          </button>
        </div>

        {/* Current Missed Dose Highlight Banner */}
        <div className="my-5 p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#03e9f4]/10 text-[#03e9f4]">
              <FaPills />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Medicine</p>
              <h4 className="text-base font-bold text-[#03e9f4]">{medicine.medicine_name}</h4>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-gray-400 block font-mono">Missed Dose:</span>
            <span className="text-sm font-bold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-lg border border-amber-500/30">
              {currentDoseVal}
            </span>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3.5">
          <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
            Select Resolution Strategy:
          </p>

          {/* Option 1: Continue with Next Dose (Skip Today & Append to End) */}
          <div
            onClick={() => setSelectedOption('skip_and_continue')}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
              selectedOption === 'skip_and_continue'
                ? 'border-[#03e9f4] bg-[#03e9f4]/10 shadow-[0_0_20px_rgba(3,233,244,0.15)]'
                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                    selectedOption === 'skip_and_continue'
                      ? 'border-[#03e9f4] bg-[#03e9f4] text-black'
                      : 'border-gray-500 bg-transparent'
                  }`}
                >
                  {selectedOption === 'skip_and_continue' && <FaCheckCircle className="text-xs" />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                      <FaForward className="text-xs text-[#03e9f4]" />
                      Continue with Next Scheduled Dose
                    </h4>
                  </div>
                  <p className="text-xs text-gray-300 mt-1">
                    Tomorrow takes the originally planned dose. Today&apos;s missed dose ({currentDoseVal}) will be added to the end of the course.
                  </p>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <span className="text-[10px] text-gray-400 block">Tomorrow:</span>
                <span className="text-xs font-bold text-[#03e9f4] bg-[#03e9f4]/20 px-2 py-0.5 rounded-md border border-[#03e9f4]/40">
                  {nextScheduledDose}
                </span>
              </div>
            </div>

            {/* Benefit / Extension Tag */}
            <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-emerald-400">
              <span className="flex items-center gap-1">
                <FaCalendarAlt className="text-[10px]" /> Extends schedule: {currentDays}d → {extendedDays}d
              </span>
              <span className="text-gray-400 italic">Zero wasted medicine</span>
            </div>
          </div>

          {/* Option 2: Carry Forward Today's Missed Dose (Shift Sequence) */}
          <div
            onClick={() => setSelectedOption('carry_forward_shift')}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
              selectedOption === 'carry_forward_shift'
                ? 'border-[#03e9f4] bg-[#03e9f4]/10 shadow-[0_0_20px_rgba(3,233,244,0.15)]'
                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                    selectedOption === 'carry_forward_shift'
                      ? 'border-[#03e9f4] bg-[#03e9f4] text-black'
                      : 'border-gray-500 bg-transparent'
                  }`}
                >
                  {selectedOption === 'carry_forward_shift' && <FaCheckCircle className="text-xs" />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                      <FaRedoAlt className="text-xs text-amber-400" />
                      Carry Forward Today&apos;s Missed Dose
                    </h4>
                  </div>
                  <p className="text-xs text-gray-300 mt-1">
                    Take today&apos;s missed dose ({currentDoseVal}) tomorrow instead. All subsequent doses shift forward by 1 day.
                  </p>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <span className="text-[10px] text-gray-400 block">Tomorrow:</span>
                <span className="text-xs font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/40">
                  {currentDoseVal}
                </span>
              </div>
            </div>

            {/* Benefit / Extension Tag */}
            <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-amber-300">
              <span className="flex items-center gap-1">
                <FaCalendarAlt className="text-[10px]" /> Extends schedule: {currentDays}d → {extendedDays}d
              </span>
              <span className="text-gray-400 italic">Preserves exact dosing pattern</span>
            </div>
          </div>
        </div>

        {/* Safety Guidance Alert */}
        <div className="mt-4 p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-start gap-2.5 text-xs text-blue-200">
          <FaInfoCircle className="text-sm text-[#03e9f4] shrink-0 mt-0.5" />
          <span>
            <strong>Safety Note:</strong> Never double up doses at the same time. The schedule will safely adjust your upcoming dates automatically.
          </span>
        </div>

        {/* Footer Action Buttons */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl border border-white/15 text-gray-300 font-semibold text-xs hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-[#03e9f4] text-black font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#03e9f4]/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading && (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black border-t-transparent" />
            )}
            Confirm &amp; Update Schedule
          </button>
        </div>
      </div>
    </div>
  );
}
