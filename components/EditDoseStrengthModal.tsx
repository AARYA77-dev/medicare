'use client';

import React, { useState, useMemo } from 'react';
import { EditDoseStrengthModalProps } from '@/Interfaces/interface';
import { isDosageInPattern } from '@/lib/medicineQuantity';
import { FaTimes, FaPills, FaCheck, FaInfoCircle, FaExclamationCircle } from 'react-icons/fa';

export default function EditDoseStrengthModal({
  isOpen,
  onClose,
  medicine,
  dose,
  dayNumber,
  scheduledDate,
  onConfirm,
  isLoading,
}: EditDoseStrengthModalProps) {
  const [prevDoseId, setPrevDoseId] = useState(dose?._id);
  const [dosageInput, setDosageInput] = useState(() =>
    dose?.dosage ? dose.dosage.replace(/mg$/i, '').trim() : ''
  );
  const [error, setError] = useState<string | null>(null);

  if (dose?._id !== prevDoseId) {
    setPrevDoseId(dose?._id);
    setDosageInput(dose?.dosage ? dose.dosage.replace(/mg$/i, '').trim() : '');
    setError(null);
  }

  const dosagePattern = medicine?.dosage_pattern;
  const medicineQuantity = medicine?.quantity;

  const normalizeDosage = (val?: string | null): string => {
    if (!val) return '';
    const trimmed = val.trim().toLowerCase();
    const numVal = parseFloat(trimmed);
    if (!isNaN(numVal) && numVal > 0) {
      const unitPart = trimmed.replace(/^[0-9.]+\s*/, '').trim();
      if (!unitPart || unitPart === 'mg') {
        return `${numVal}mg`;
      }
      return `${numVal}${unitPart}`;
    }
    return trimmed;
  };

  // Check if current strength differs from initial strength
  const isChanged = useMemo(() => {
    if (!dosageInput.trim()) return false;
    const numVal = parseFloat(dosageInput.trim());
    if (isNaN(numVal) || numVal <= 0) return false;
    return normalizeDosage(dosageInput) !== normalizeDosage(dose?.dosage);
  }, [dosageInput, dose?.dosage]);

  // Extract configured dosage pattern options for this medicine
  const patternOptions = useMemo(() => {
    if (!dosagePattern) return [];
    return dosagePattern
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0 && !isNaN(Number(p)));
  }, [dosagePattern]);

  // Check if current input matches the medicine's dosage pattern
  const isPatternMatch = useMemo(() => {
    if (!dosageInput.trim()) return false;
    return isDosageInPattern(dosageInput, dosagePattern);
  }, [dosageInput, dosagePattern]);

  // Current stock remaining info
  const stockInfo = useMemo(() => {
    if (medicineQuantity === undefined || medicineQuantity === null) return null;
    if (typeof medicineQuantity === 'object') {
      const match = Object.keys(medicineQuantity).find(
        (candidate) => parseFloat(candidate) === parseFloat(dosageInput)
      );
      if (match !== undefined) {
        return `${medicineQuantity[match]} pills in stock for ${match}`;
      }
      return 'No stock tracked for this variant';
    }
    return `${medicineQuantity} pills remaining`;
  }, [medicineQuantity, dosageInput]);

  if (!isOpen || !medicine || !dose) return null;

  const isSaveDisabled = isLoading || !dosageInput.trim() || !isChanged;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isChanged || isLoading) return;

    const trimmed = dosageInput.trim();
    if (!trimmed) {
      setError('Please enter a dose strength');
      return;
    }

    const numVal = parseFloat(trimmed);
    if (isNaN(numVal) || numVal <= 0) {
      setError('Please enter a valid positive number');
      return;
    }

    // Standardize to e.g. "500mg" or keep unit if user typed custom unit
    const finalDosage = trimmed.toLowerCase().endsWith('mg')
      ? trimmed
      : `${numVal}mg`;

    setError(null);
    await onConfirm(finalDosage);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      {/* Modal Card */}
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0f071a]/95 p-5 sm:p-6 shadow-2xl backdrop-blur-xl">
        {/* Glow Accent */}
        <div className="pointer-events-none absolute -top-10 -right-10 w-28 h-28 blur-3xl rounded-full bg-[#03e9f4]/15" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
              <FaPills className="text-[#03e9f4] text-sm" />
              <span>Edit Dose Strength</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              <span className="text-[#03e9f4] font-medium">{medicine.medicine_name}</span>
              {dose.time && <span> • {dose.time}</span>}
              {dayNumber && <span> • Day {dayNumber}</span>}
              {scheduledDate && <span> ({scheduledDate})</span>}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close"
          >
            <FaTimes size={15} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Current Strength indicator */}
          <div className="flex items-center justify-between text-xs text-gray-400 bg-white/5 p-2.5 rounded-xl border border-white/5">
            <span>Current Dose Strength:</span>
            <span className="font-mono font-semibold text-white bg-white/10 px-2 py-0.5 rounded">
              {dose.dosage}
            </span>
          </div>

          {/* Quick Selection for Configured Dosage Pattern */}
          {patternOptions.length > 0 && (
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5">
                Existing Dosage Pattern
              </label>
              <div className="flex flex-wrap gap-1.5">
                {patternOptions.map((patternVal) => {
                  const isSelected = parseFloat(dosageInput) === parseFloat(patternVal);
                  return (
                    <button
                      key={patternVal}
                      type="button"
                      onClick={() => {
                        setDosageInput(patternVal);
                        setError(null);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#03e9f4] text-black shadow-md shadow-[#03e9f4]/25 scale-102'
                          : 'bg-white/5 border border-white/15 text-gray-300 hover:border-[#03e9f4]/60 hover:text-white'
                      }`}
                    >
                      {patternVal}mg
                      {isSelected && <FaCheck className="text-[10px]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dose Strength Field */}
          <div>
            <label htmlFor="dose-strength-input" className="block text-sm font-medium text-white mb-1.5">
              Dose Strength (mg):
            </label>
            <div className="relative text-white">
              <input
                id="dose-strength-input"
                type="text"
                inputMode="decimal"
                value={dosageInput}
                onChange={(e) => {
                  setDosageInput(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. 500 or 2.5"
                disabled={isLoading}
                className={`w-full bg-black/60 rounded-xl border-2 px-3.5 py-2.5 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#03e9f4] transition-colors pr-12 font-mono ${
                  error ? 'border-rose-500' : 'border-[#03e9f4]/50'
                }`}
                autoFocus
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-400 pointer-events-none">
                mg
              </span>
            </div>
            {error && (
              <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                <FaExclamationCircle className="text-[11px]" />
                {error}
              </p>
            )}
          </div>

          {/* Quantity Stock Impact Note */}
          <div
            className={`p-3 rounded-xl border text-xs transition-all ${
              isPatternMatch
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            <div className="flex items-start gap-2">
              {isPatternMatch ? (
                <FaCheck className="text-emerald-400 text-xs shrink-0 mt-0.5" />
              ) : (
                <FaInfoCircle className="text-amber-400 text-xs shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                {isPatternMatch ? (
                  <>
                    <p className="font-semibold text-emerald-200">
                      Matches existing dosage pattern
                    </p>
                    <p className="text-[11px] text-emerald-300/80">
                      When marked done, this dose will decrease the medicine quantity ({stockInfo}).
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-amber-200">
                      Custom dose strength
                    </p>
                    <p className="text-[11px] text-amber-300/80">
                      Because this differs from the configured pattern ({medicine.dosage_pattern}), this dose will <span className="font-bold underline">not decrease</span> your medicine quantity stock.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaveDisabled}
              className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#03e9f4] text-black shadow-lg shadow-[#03e9f4]/20 transition-all flex items-center gap-2 ${
                isSaveDisabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-[#00c5cf] hover:scale-[1.02] active:scale-95 cursor-pointer'
              }`}
            >
              {isLoading && (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black border-t-transparent" />
              )}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
