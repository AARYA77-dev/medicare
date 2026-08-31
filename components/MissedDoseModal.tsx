'use client';

import React, { useEffect, useState } from 'react';
import { Dose, MedicineWithSchedule } from '@/Interfaces/interface';
import { hasNoQuantityForDose } from '@/lib/medicineQuantity';
import { FaTimes, FaInfoCircle } from 'react-icons/fa';

interface MissedDoseModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicine: MedicineWithSchedule | null;
  dose: Dose | null;
  onConfirm: (action: 'skip_and_continue' | 'carry_forward_shift' | 'quantity_unavailable') => Promise<void>;
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
  const [selectedOption, setSelectedOption] = useState<'skip_and_continue' | 'carry_forward_shift' | 'quantity_unavailable'>('skip_and_continue');

  const doseHasNoStock = medicine && dose
    ? hasNoQuantityForDose(medicine.quantity, dose.dosage)
    : false;

  useEffect(() => {
    setSelectedOption(doseHasNoStock ? 'quantity_unavailable' : 'skip_and_continue');
  }, [dose?._id, doseHasNoStock, isOpen]);

  if (!isOpen || !medicine || !dose) return null;

  const currentDoseVal = dose.dosage;

  const handleConfirm = async () => {
    await onConfirm(selectedOption);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      {/* Modal Card */}
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0f071a]/95 p-5 sm:p-6 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-white">Missed Dose</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Adjust schedule for <span className="text-[#03e9f4] font-medium">{medicine.medicine_name}</span> ({currentDoseVal})
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <FaTimes size={15} />
          </button>
        </div>

        {/* Options */}
        <div className="mt-4 space-y-3">
          {doseHasNoStock && (
            <div
              onClick={() => setSelectedOption('quantity_unavailable')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                selectedOption === 'quantity_unavailable'
                  ? 'border-red-400 bg-red-500/10'
                  : 'border-red-500/30 bg-red-500/5 hover:border-red-400/60'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${selectedOption === 'quantity_unavailable' ? 'border-red-400 bg-red-400' : 'border-gray-500'}`}>
                  {selectedOption === 'quantity_unavailable' && <div className="h-1.5 w-1.5 rounded-full bg-black" />}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-red-300">Quantity unavailable</h4>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                    I missed this dose because {currentDoseVal} medicine quantity is zero.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Option 1: Continue with Next Dose */}
          {!doseHasNoStock && <div
            onClick={() => setSelectedOption('skip_and_continue')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              selectedOption === 'skip_and_continue'
                ? 'border-[#03e9f4] bg-[#03e9f4]/10'
                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all ${
                  selectedOption === 'skip_and_continue'
                    ? 'border-[#03e9f4] bg-[#03e9f4]'
                    : 'border-gray-500 bg-transparent'
                }`}
              >
                {selectedOption === 'skip_and_continue' && <div className="h-1.5 w-1.5 rounded-full bg-black" />}
              </div>

              <div>
                <h4 className="text-sm font-medium text-white">
                  Continue with Next Dose
                </h4>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                  Take tomorrow&apos;s scheduled dose as planned. Today&apos;s missed dose ({currentDoseVal}) will be added to the end of the course.
                </p>
              </div>
            </div>
          </div>}

          {/* Option 2: Carry Forward Today's Missed Dose */}
          {!doseHasNoStock && <div
            onClick={() => setSelectedOption('carry_forward_shift')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              selectedOption === 'carry_forward_shift'
                ? 'border-[#03e9f4] bg-[#03e9f4]/10'
                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all ${
                  selectedOption === 'carry_forward_shift'
                    ? 'border-[#03e9f4] bg-[#03e9f4]'
                    : 'border-gray-500 bg-transparent'
                }`}
              >
                {selectedOption === 'carry_forward_shift' && <div className="h-1.5 w-1.5 rounded-full bg-black" />}
              </div>

              <div>
                <h4 className="text-sm font-medium text-white">
                  Carry Forward Missed Dose
                </h4>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                  Take today&apos;s missed dose ({currentDoseVal}) tomorrow instead. All remaining doses shift forward by 1 day.
                </p>
              </div>
            </div>
          </div>}
        </div>

        {/* Safety Guidance Note */}
        <p className="text-[11px] text-gray-400 flex items-center gap-1.5 mt-3.5 px-0.5">
          <FaInfoCircle className="text-[#03e9f4] shrink-0 text-xs" />
          <span>The schedule automatically extends by 1 day so no dose is lost.</span>
        </p>

        {/* Footer Action Buttons */}
        <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-lg border border-white/10 text-gray-300 font-medium text-xs hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#03e9f4] hover:bg-[#02c4ce] text-black font-semibold text-xs transition-all cursor-pointer disabled:opacity-50 shadow-sm"
          >
            {isLoading && (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-black border-t-transparent" />
            )}
            Confirm Update
          </button>
        </div>
      </div>
    </div>
  );
}

