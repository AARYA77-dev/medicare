"use client";

import Header from '@/components/header';
import { MedicineSchema } from '@/Schemas/yupSChemas';
import { useFormik } from 'formik';
import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FaEdit, FaEllipsisV, FaPlus, FaTrash } from 'react-icons/fa';
import { ScheduleEntry, Medicines, Dose, ScheduleType } from '@/Interfaces/interface';
import Loading from '../loading';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchMedicines, addMedicineSchedule, deleteMedicine } from '@/store/medicineSlice';

const initialValues: Medicines = {
  medicine_name: "",
  quantity: "",
  frequency: "1",
  dosage_pattern: "",
  times_days: "",
  number_days: "",
  startdate: "",
  schedule_type: "daily",
  weekly_default_dose: "",
  weekly_override_dose: "",
  weekly_days: [],
};

const WEEKDAYS = [
  { day: 1, label: "Mon", full: "Monday" },
  { day: 2, label: "Tue", full: "Tuesday" },
  { day: 3, label: "Wed", full: "Wednesday" },
  { day: 4, label: "Thu", full: "Thursday" },
  { day: 5, label: "Fri", full: "Friday" },
  { day: 6, label: "Sat", full: "Saturday" },
  { day: 0, label: "Sun", full: "Sunday" },
];

const MedicinePage = () => {
  const dispatch = useAppDispatch();
  const { medicines: medicineData, loading, actionLoading } = useAppSelector((state) => state.medicine);

  const [scheduleType, setScheduleType] = useState<ScheduleType>("daily");
  const [separateQuantity, setSeparateQuantity] = useState(false);

  // Daily mode state
  const [dosageList, setDosageList] = useState<string[]>([""]);
  const [timeList, setTimeList] = useState<string[]>([""]);
  const [timeDoseIndices, setTimeDoseIndices] = useState<number[]>([0]);

  // Alternate mode state (e.g. Day 1: 2mg, Day 2: 3mg)
  const [alternateCycle, setAlternateCycle] = useState<string[]>(["2", "3"]);
  const [singleTime, setSingleTime] = useState<string>("08:00");

  // Specific Weekdays mode state (e.g. 2mg on Monday, 3mg rest of week)
  const [weeklyDefaultDose, setWeeklyDefaultDose] = useState<string>("3");
  const [weeklyOverrideDose, setWeeklyOverrideDose] = useState<string>("2");
  const [weeklyDays, setWeeklyDays] = useState<number[]>([1]); // default: Monday

  // Sync dosage_pattern and times_days when mode changes or values change
  const handleScheduleTypeChange = (type: ScheduleType) => {
    setScheduleType(type);
    setFieldValue("schedule_type", type);

    if (type === "daily") {
      const combinedDose = dosageList.filter((d) => d.trim() !== "").join(",");
      setFieldValue("dosage_pattern", combinedDose);
      const combinedTime = timeList.filter((t) => t.trim() !== "").join(",");
      setFieldValue("times_days", combinedTime || "08:00");
      setFieldValue("frequency", String(timeList.length || 1));
    } else if (type === "alternate") {
      const combinedDose = alternateCycle.filter((d) => d.trim() !== "").join(",");
      setFieldValue("dosage_pattern", combinedDose);
      setFieldValue("times_days", singleTime || "08:00");
      setFieldValue("frequency", "1");
    } else if (type === "weekly") {
      const doses = Array.from(new Set([weeklyDefaultDose, weeklyOverrideDose])).filter(Boolean);
      setFieldValue("dosage_pattern", doses.join(","));
      setFieldValue("times_days", singleTime || "08:00");
      setFieldValue("frequency", "1");
      setFieldValue("weekly_default_dose", weeklyDefaultDose);
      setFieldValue("weekly_override_dose", weeklyOverrideDose);
      setFieldValue("weekly_days", weeklyDays);
    }
  };

  // Daily Mode Handlers
  const handleDosageChange = (index: number, val: string) => {
    const updated = [...dosageList];
    updated[index] = val;
    setDosageList(updated);
    const combined = updated.filter((d) => d.trim() !== "").join(",");
    setFieldValue("dosage_pattern", combined);
  };

  const handleAddDosage = () => {
    setDosageList((prev) => [...prev, ""]);
  };

  const handleRemoveDosage = (index: number) => {
    if (dosageList.length <= 1) return;
    const updated = dosageList.filter((_, i) => i !== index);
    setDosageList(updated);
    const combined = updated.filter((d) => d.trim() !== "").join(",");
    setFieldValue("dosage_pattern", combined);

    setTimeDoseIndices((prev) =>
      prev.map((dIdx) => {
        if (dIdx === index) return 0;
        if (dIdx > index) return dIdx - 1;
        return dIdx;
      })
    );
  };

  const handleTimeChange = (index: number, val: string) => {
    const updated = [...timeList];
    updated[index] = val;
    setTimeList(updated);
    const combined = updated.filter((t) => t.trim() !== "").join(",");
    setFieldValue("times_days", combined);
  };

  const handleTimeDoseChange = (timeIndex: number, doseIndex: number) => {
    const updated = [...timeDoseIndices];
    updated[timeIndex] = doseIndex;
    setTimeDoseIndices(updated);
  };

  // Alternate Mode Handlers
  const handleAlternateCycleChange = (index: number, val: string) => {
    const updated = [...alternateCycle];
    updated[index] = val;
    setAlternateCycle(updated);
    const combined = updated.filter((d) => d.trim() !== "").join(",");
    setFieldValue("dosage_pattern", combined);
  };

  const handleAddAlternateDay = () => {
    setAlternateCycle((prev) => [...prev, ""]);
  };

  const handleRemoveAlternateDay = (index: number) => {
    if (alternateCycle.length <= 2) {
      toast.error("Alternate schedule requires at least 2 days in cycle");
      return;
    }
    const updated = alternateCycle.filter((_, i) => i !== index);
    setAlternateCycle(updated);
    const combined = updated.filter((d) => d.trim() !== "").join(",");
    setFieldValue("dosage_pattern", combined);
  };

  // Weekday Mode Handlers
  const toggleWeekday = (day: number) => {
    let updated: number[];
    if (weeklyDays.includes(day)) {
      if (weeklyDays.length <= 1) {
        toast.error("Please select at least 1 day for custom dosage");
        return;
      }
      updated = weeklyDays.filter((d) => d !== day);
    } else {
      updated = [...weeklyDays, day];
    }
    setWeeklyDays(updated);
    setFieldValue("weekly_days", updated);
  };

  const handleWeeklyDefaultChange = (val: string) => {
    setWeeklyDefaultDose(val);
    setFieldValue("weekly_default_dose", val);
    const doses = Array.from(new Set([val, weeklyOverrideDose])).filter(Boolean);
    setFieldValue("dosage_pattern", doses.join(","));
  };

  const handleWeeklyOverrideChange = (val: string) => {
    setWeeklyOverrideDose(val);
    setFieldValue("weekly_override_dose", val);
    const doses = Array.from(new Set([weeklyDefaultDose, val])).filter(Boolean);
    setFieldValue("dosage_pattern", doses.join(","));
  };

  const handleSingleTimeChange = (val: string) => {
    setSingleTime(val);
    setFieldValue("times_days", val);
  };

  // Unique Doses calculation for quantity management
  const getUniqueDoses = (): string[] => {
    let doses: string[] = [];
    if (scheduleType === "daily") {
      doses = dosageList;
    } else if (scheduleType === "alternate") {
      doses = alternateCycle;
    } else if (scheduleType === "weekly") {
      doses = [weeklyDefaultDose, weeklyOverrideDose];
    }

    const unique: string[] = [];
    doses.forEach((d) => {
      const val = parseFloat(d);
      if (!isNaN(val)) {
        const formatted = `${val}mg`;
        if (!unique.includes(formatted)) {
          unique.push(formatted);
        }
      }
    });
    return unique;
  };

  const uniqueDoses = getUniqueDoses();

  const { errors, values, handleBlur, touched, handleChange, handleSubmit, setFieldValue } = useFormik<Medicines>({
    validationSchema: MedicineSchema,
    initialValues,
    onSubmit: async (formValues, { resetForm }) => {
      const result = getSchedule();
      try {
        await dispatch(addMedicineSchedule({
          ...formValues,
          schedule_type: scheduleType,
          weekly_default_dose: scheduleType === 'weekly' ? weeklyDefaultDose : undefined,
          weekly_override_dose: scheduleType === 'weekly' ? weeklyOverrideDose : undefined,
          weekly_days: scheduleType === 'weekly' ? weeklyDays : undefined,
          schedule: result
        })).unwrap();
        toast.success("Your schedule generated");
        resetForm();
        setSeparateQuantity(false);
        setScheduleType("daily");
        setDosageList([""]);
        setTimeList([""]);
        setTimeDoseIndices([0]);
        setAlternateCycle(["2", "3"]);
        setSingleTime("08:00");
        setWeeklyDefaultDose("3");
        setWeeklyOverrideDose("2");
        setWeeklyDays([1]);
      } catch {
        toast.error("Something went wrong");
      }
    }
  });

  // Keep daily time slots synchronized with frequency
  useEffect(() => {
    if (scheduleType === "daily") {
      const freq = parseInt(values.frequency);
      if (!isNaN(freq) && freq > 0) {
        setTimeDoseIndices((prev) => {
          return Array.from({ length: freq }).map((_, idx) => {
            if (prev[idx] !== undefined && prev[idx] < Math.max(1, dosageList.length)) {
              return prev[idx];
            }
            return idx < dosageList.length ? idx : 0;
          });
        });
        setTimeList((prev) => {
          if (prev.length === freq) return prev;
          return Array.from({ length: freq }).map((_, idx) => prev[idx] || "");
        });
      }
    }
  }, [values.frequency, dosageList.length, scheduleType]);

  // Synchronize initial times_days and dosage_pattern when switching to alternate or weekly
  useEffect(() => {
    if (scheduleType === "alternate") {
      const combinedDose = alternateCycle.filter((d) => d.trim() !== "").join(",");
      setFieldValue("dosage_pattern", combinedDose);
      setFieldValue("times_days", singleTime || "08:00");
      setFieldValue("frequency", "1");
    } else if (scheduleType === "weekly") {
      const doses = Array.from(new Set([weeklyDefaultDose, weeklyOverrideDose])).filter(Boolean);
      setFieldValue("dosage_pattern", doses.join(","));
      setFieldValue("times_days", singleTime || "08:00");
      setFieldValue("frequency", "1");
      setFieldValue("weekly_default_dose", weeklyDefaultDose);
      setFieldValue("weekly_override_dose", weeklyOverrideDose);
      setFieldValue("weekly_days", weeklyDays);
    }
  }, [scheduleType]);

  // Schedule Generation Algorithm
  const getSchedule = () => {
    const { frequency, dosage_pattern, times_days, number_days, startdate } = values;
    const noOFDays = parseInt(number_days) || 1;
    const startDate = new Date(startdate);
    const result: ScheduleEntry[] = [];

    if (scheduleType === "alternate") {
      const cycle = alternateCycle.map((p) => parseFloat(p.trim())).filter((n) => !isNaN(n));
      const activeCycle = cycle.length > 0 ? cycle : [parseFloat(dosage_pattern) || 0];
      const timeVal = singleTime || "08:00";

      for (let i = 0; i < noOFDays; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const doseVal = activeCycle[i % activeCycle.length] ?? 0;
        result.push({
          day: i + 1,
          date: currentDate.toLocaleDateString(),
          doses: [
            {
              time: timeVal,
              dosage: `${doseVal}mg`
            }
          ]
        });
      }
      return result;
    }

    if (scheduleType === "weekly") {
      const defDose = parseFloat(weeklyDefaultDose) || 0;
      const overDose = parseFloat(weeklyOverrideDose) || defDose;
      const timeVal = singleTime || "08:00";

      for (let i = 0; i < noOFDays; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const dayOfWeek = currentDate.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
        const isOverride = weeklyDays.includes(dayOfWeek);
        const doseVal = isOverride ? overDose : defDose;

        result.push({
          day: i + 1,
          date: currentDate.toLocaleDateString(),
          doses: [
            {
              time: timeVal,
              dosage: `${doseVal}mg`
            }
          ]
        });
      }
      return result;
    }

    // Daily Schedule Mode
    const dosagePattern = dosage_pattern.split(",").map((p) => parseFloat(p.trim())).filter((n) => !isNaN(n));
    const timesOfDays = times_days.split(",").map((p) => p.trim()).filter(Boolean);
    const freq = parseInt(frequency) || 1;

    for (let i = 0; i < noOFDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      let doses: Dose[] = [];

      if (freq === 1) {
        const doseVal = dosagePattern[0] ?? 0;
        doses.push({
          time: timesOfDays[0] || "08:00",
          dosage: `${doseVal}mg`
        });
      } else {
        doses = timesOfDays.map((time, j) => {
          const selectedDoseIdx = timeDoseIndices[j] !== undefined ? timeDoseIndices[j] : (j % (dosagePattern.length || 1));
          const doseVal = dosagePattern[selectedDoseIdx] ?? dosagePattern[0] ?? 0;
          return {
            time: time,
            dosage: `${doseVal}mg`
          };
        });
      }

      result.push({
        day: i + 1,
        date: currentDate.toLocaleDateString(),
        doses
      });
    }
    return result;
  };

  useEffect(() => {
    dispatch(fetchMedicines());
  }, [dispatch]);

  if (loading) {
    return <Loading />;
  }

  const MedicineMenu = ({ id }: { id: string }) => {
    const [editOpen, setEditOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          setEditOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleDelete = async () => {
      setIsDeleting(true);
      try {
        await dispatch(deleteMedicine(id)).unwrap();
        toast.success("Medicine deleted successfully");
        setEditOpen(false);
      } catch {
        toast.error("Failed to delete medicine");
      } finally {
        setIsDeleting(false);
      }
    };

    return (
      <div ref={menuRef} className="absolute right-2">
        <button
          type="button"
          onClick={() => setEditOpen((prev) => !prev)}
          className="cursor-pointer p-1 text-gray-300 hover:text-white transition-colors"
          aria-label="Medicine options"
        >
          <FaEllipsisV />
        </button>

        <div
          className={`absolute right-0 mt-2 bg-black text-white border-2 border-[#03e9f4] rounded-lg shadow-xl z-50 py-1.5 w-28 transform transition-all duration-300 origin-top-right
        ${editOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-90 invisible"}`}
        >
          <Link
            href={`/UpdateMedicine/${id}`}
            onClick={() => setEditOpen(false)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-[#03e9f4]/20 hover:text-[#03e9f4] transition-colors"
          >
            <FaEdit className="text-xs" />
            <span>Edit</span>
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors text-left cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
            ) : (
              <FaTrash className="text-xs" />
            )}
            <span>Delete</span>
          </button>
        </div>
      </div>
    );
  };

  // Determine if "Which Dose" selector should show in Daily mode
  const isMultiFreq = (parseInt(values.frequency) || 1) > 1;
  const isMultiDose = dosageList.length > 1;
  // NOTE: Only show "Which Dose" selector when frequency > 1 AND multi-dose
  const showDoseSelector = isMultiFreq && isMultiDose;

  return (
    <>
      <Header />
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col lg:flex-row gap-6 px-3 sm:px-6">
          <div className="flex flex-col border border-white/10 rounded-2xl bg-white/5 backdrop-blur-md w-full lg:w-[48%] xl:w-[32%] mx-auto items-center shadow-2xl px-4 sm:px-8 py-4">

            {/* Medicine Name */}
            <div className="w-full">
              <label htmlFor="medicine_name" className='mt-2 font-bold block text-sm'>Medicine Name:</label>
              <input
                className='w-full bg-black placeholder-[#03e9f4] rounded-md border-2 border-[#03e9f4] px-3 py-2 mt-1'
                type='text'
                placeholder='Enter Medicine name'
                name='medicine_name'
                onBlur={handleBlur}
                value={values.medicine_name}
                onChange={handleChange}
                id='medicine_name'
              />
              {errors.medicine_name && touched.medicine_name && <p className='text-red-500 text-xs mt-1'>{errors.medicine_name}</p>}
            </div>

            {/* Schedule Pattern Selector */}
            <div className="w-full mt-4">
              <label className="font-bold block text-sm mb-1.5">Schedule Pattern:</label>
              <div className="grid grid-cols-3 gap-1.5 bg-black/60 p-1.5 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => handleScheduleTypeChange('daily')}
                  className={`py-2 px-1 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    scheduleType === 'daily'
                      ? 'bg-[#03e9f4] text-black font-bold shadow-md'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>📅 Daily</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleScheduleTypeChange('alternate')}
                  className={`py-2 px-1 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    scheduleType === 'alternate'
                      ? 'bg-[#03e9f4] text-black font-bold shadow-md'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>🔄 Alternate</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleScheduleTypeChange('weekly')}
                  className={`py-2 px-1 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    scheduleType === 'weekly'
                      ? 'bg-[#03e9f4] text-black font-bold shadow-md'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>🗓️ Weekdays</span>
                </button>
              </div>
            </div>

            {/* -------------------- MODE 1: DAILY / EVERY DAY -------------------- */}
            {scheduleType === "daily" && (
              <div className="w-full mt-3 space-y-3">
                <div>
                  <label htmlFor="frequency" className='font-bold block text-sm'>Frequency (Times Per Day):</label>
                  <input
                    onChange={handleChange}
                    onBlur={handleBlur}
                    value={values.frequency}
                    className='w-full bg-black placeholder-[#03e9f4] rounded-md border-2 border-[#03e9f4] px-3 py-2 mt-1'
                    pattern='^[0-9]+$'
                    type='number'
                    min="1"
                    max="9"
                    id='frequency'
                    name='frequency'
                    placeholder='1'
                  />
                  {errors.frequency && touched.frequency && <p className='text-red-500 text-xs mt-1'>{errors.frequency}</p>}
                </div>

                <div>
                  <label className='font-bold block text-sm'>Dosage Strength (mg):</label>
                  <div className="space-y-2 mt-1.5">
                    {dosageList.map((dose, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        {dosageList.length > 1 && (
                          <span className="text-xs text-gray-400 font-mono min-w-[50px]">
                            Dose {idx + 1}:
                          </span>
                        )}
                        <div className="relative flex-1">
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            placeholder={idx === 0 ? "e.g. 5" : "e.g. 10"}
                            value={dose}
                            onChange={(e) => handleDosageChange(idx, e.target.value)}
                            onBlur={handleBlur}
                            className="w-full bg-black placeholder-gray-500 rounded-md border-2 border-[#03e9f4] px-3 py-2 pr-10 text-sm"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#03e9f4] font-semibold">
                            mg
                          </span>
                        </div>
                        {dosageList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDosage(idx)}
                            className="text-red-400 hover:text-red-300 p-2 rounded hover:bg-red-500/10 cursor-pointer transition-colors"
                            title="Remove this dose"
                          >
                            <FaTrash className="text-xs" />
                          </button>
                        )}
                      </div>
                    ))}

                    {isMultiFreq && (
                      <button
                        type="button"
                        onClick={handleAddDosage}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-dashed border-[#03e9f4]/60 text-[#03e9f4] text-xs font-semibold hover:bg-[#03e9f4]/15 transition-colors cursor-pointer active:scale-98"
                      >
                        <FaPlus className="text-xs" />
                        Add Variant Dosage Strength
                      </button>
                    )}
                  </div>
                  {errors.dosage_pattern && touched.dosage_pattern && <p className='text-red-500 text-xs mt-1'>{errors.dosage_pattern}</p>}
                </div>

                {/* Daily Time Slots */}
                <div>
                  <div className='flex items-center justify-between mb-1.5'>
                    <label className='font-bold text-sm'>Dose Time{parseInt(values.frequency) > 1 ? 's' : ''}:</label>
                    <span className='text-xs text-gray-400'>
                      ({values.frequency ? `${values.frequency} time${parseInt(values.frequency) > 1 ? 's' : ''}/day` : '1 time/day'})
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {Array.from({ length: Math.max(1, parseInt(values.frequency) || 1) }).map((_, idx) => {
                      const selectedDoseIdx = timeDoseIndices[idx] ?? (idx % Math.max(1, dosageList.length));

                      return (
                        <div
                          key={idx}
                          className="p-2.5 bg-black/40 border border-[#03e9f4]/40 rounded-lg space-y-2 transition-all hover:border-[#03e9f4]"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#03e9f4] uppercase tracking-wider">
                              Time Slot #{idx + 1}
                            </span>
                            {timeList[idx] && (
                              <span className="text-xs text-[#03e9f4] font-mono">
                                {(() => {
                                  const [h, m] = (timeList[idx] || "00:00").split(":");
                                  const hr = parseInt(h);
                                  const ampm = hr >= 12 ? "PM" : "AM";
                                  const hr12 = hr % 12 || 12;
                                  return `${hr12}:${m} ${ampm}`;
                                })()}
                              </span>
                            )}
                          </div>

                          <div className={`grid ${showDoseSelector ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-2 items-center`}>
                            <div>
                              <label className="block text-[11px] text-gray-400 mb-1">Time:</label>
                              <input
                                type="time"
                                value={timeList[idx] ?? ""}
                                onChange={(e) => handleTimeChange(idx, e.target.value)}
                                onBlur={handleBlur}
                                className="w-full bg-black text-white rounded-md border-2 border-[#03e9f4] px-3 py-1.5 text-sm [color-scheme:dark]"
                              />
                            </div>

                            {/* NOTE: "Which Dose?" dropdown only renders if multi-frequency AND multi-dose */}
                            {showDoseSelector && (
                              <div>
                                <label className="block text-[11px] text-gray-400 mb-1">Which Dose?</label>
                                <select
                                  value={selectedDoseIdx}
                                  onChange={(e) => handleTimeDoseChange(idx, Number(e.target.value))}
                                  className="w-full bg-black text-white rounded-md border-2 border-[#03e9f4] px-2.5 py-2 text-sm cursor-pointer"
                                >
                                  {dosageList.map((dose, dIdx) => (
                                    <option key={dIdx} value={dIdx} className="bg-black text-white">
                                      Dose {dIdx + 1}: {dose ? `${dose}mg` : "(empty)"}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {errors.times_days && touched.times_days && <p className='text-red-500 text-xs mt-1'>{errors.times_days}</p>}
                </div>
              </div>
            )}

            {/* -------------------- MODE 2: ALTERNATING DAYS -------------------- */}
            {scheduleType === "alternate" && (
              <div className="w-full mt-3 space-y-3">
                <div className="p-2.5 bg-[#03e9f4]/10 border border-[#03e9f4]/30 rounded-lg text-xs text-gray-300">
                  <p className="font-semibold text-[#03e9f4] mb-0.5">🔄 Alternating Day Cycle</p>
                  <p>Takes 1 dose per day, automatically alternating doses across consecutive days.</p>
                </div>

                <div>
                  <label className="font-bold block text-sm mb-1.5">Cycle Dosage Sequence (mg):</label>
                  <div className="space-y-2">
                    {alternateCycle.map((dose, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs text-[#03e9f4] font-mono min-w-[55px] font-bold">
                          Day {idx + 1}:
                        </span>
                        <div className="relative flex-1">
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            placeholder={`e.g. ${idx % 2 === 0 ? "2" : "3"}`}
                            value={dose}
                            onChange={(e) => handleAlternateCycleChange(idx, e.target.value)}
                            className="w-full bg-black placeholder-gray-500 rounded-md border-2 border-[#03e9f4] px-3 py-2 pr-10 text-sm"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#03e9f4] font-semibold">
                            mg
                          </span>
                        </div>
                        {alternateCycle.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAlternateDay(idx)}
                            className="text-red-400 hover:text-red-300 p-2 rounded hover:bg-red-500/10 cursor-pointer transition-colors"
                            title="Remove cycle day"
                          >
                            <FaTrash className="text-xs" />
                          </button>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={handleAddAlternateDay}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-dashed border-[#03e9f4]/60 text-[#03e9f4] text-xs font-semibold hover:bg-[#03e9f4]/15 transition-colors cursor-pointer active:scale-98"
                    >
                      <FaPlus className="text-xs" />
                      Add More Days in Cycle
                    </button>
                  </div>
                </div>

                {/* Time of Dose */}
                <div>
                  <label className="block text-sm font-bold mb-1">Time of Dose:</label>
                  <input
                    type="time"
                    value={singleTime}
                    onChange={(e) => handleSingleTimeChange(e.target.value)}
                    className="w-full bg-black text-white rounded-md border-2 border-[#03e9f4] px-3 py-2 text-sm [color-scheme:dark]"
                  />
                </div>
              </div>
            )}

            {/* -------------------- MODE 3: SPECIFIC WEEKDAYS -------------------- */}
            {scheduleType === "weekly" && (
              <div className="w-full mt-3 space-y-3">
                <div className="p-2.5 bg-[#03e9f4]/10 border border-[#03e9f4]/30 rounded-lg text-xs text-gray-300">
                  <p className="font-semibold text-[#03e9f4] mb-0.5">🗓️ Specific Weekdays Schedule</p>
                  <p>Takes a different dosage strength on selected days of the week (e.g. 2mg on Monday, 3mg other days).</p>
                </div>

                {/* Default Dose */}
                <div>
                  <label className="block text-sm font-bold mb-1">Default Daily Dose (mg):</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0.1"
                      step="any"
                      placeholder="e.g. 3"
                      value={weeklyDefaultDose}
                      onChange={(e) => handleWeeklyDefaultChange(e.target.value)}
                      className="w-full bg-black placeholder-gray-500 rounded-md border-2 border-[#03e9f4] px-3 py-2 pr-10 text-sm"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#03e9f4] font-semibold">
                      mg
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Applied to regular / unselected days.</p>
                </div>

                {/* Weekday Selector */}
                <div>
                  <label className="block text-sm font-bold mb-1.5">Select Custom Dose Days:</label>
                  <div className="grid grid-cols-7 gap-1">
                    {WEEKDAYS.map((wd) => {
                      const isSelected = weeklyDays.includes(wd.day);
                      return (
                        <button
                          key={wd.day}
                          type="button"
                          onClick={() => toggleWeekday(wd.day)}
                          className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#03e9f4] border-[#03e9f4] text-black shadow-md scale-102'
                              : 'bg-black/50 border-white/20 text-gray-400 hover:border-[#03e9f4]/60 hover:text-white'
                          }`}
                          title={wd.full}
                        >
                          {wd.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Override Dose */}
                <div>
                  <label className="block text-sm font-bold mb-1">
                    Dose on Selected Days ({weeklyDays.map(d => WEEKDAYS.find(w => w.day === d)?.label).join(", ")}):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0.1"
                      step="any"
                      placeholder="e.g. 2"
                      value={weeklyOverrideDose}
                      onChange={(e) => handleWeeklyOverrideChange(e.target.value)}
                      className="w-full bg-black placeholder-gray-500 rounded-md border-2 border-[#03e9f4] px-3 py-2 pr-10 text-sm"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#03e9f4] font-semibold">
                      mg
                    </span>
                  </div>
                </div>

                {/* Time of Dose */}
                <div>
                  <label className="block text-sm font-bold mb-1">Time of Dose:</label>
                  <input
                    type="time"
                    value={singleTime}
                    onChange={(e) => handleSingleTimeChange(e.target.value)}
                    className="w-full bg-black text-white rounded-md border-2 border-[#03e9f4] px-3 py-2 text-sm [color-scheme:dark]"
                  />
                </div>
              </div>
            )}

            {/* Multiple Dosage Separation Question */}
            {uniqueDoses.length > 1 && (
              <div className="w-full mt-4 p-3 bg-white/5 border border-[#03e9f4]/40 rounded-lg transition-all">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs sm:text-sm font-semibold text-white">
                  <input
                    type="checkbox"
                    checked={separateQuantity}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSeparateQuantity(checked);
                      if (checked) {
                        const initialQuantities: Record<string, string> = {};
                        uniqueDoses.forEach((dose) => {
                          initialQuantities[dose] =
                            typeof values.quantity === 'object' && values.quantity !== null && (values.quantity as Record<string, string>)[dose]
                              ? String((values.quantity as Record<string, string>)[dose])
                              : (typeof values.quantity === 'string' ? values.quantity : "");
                        });
                        setFieldValue("quantity", initialQuantities);
                      } else {
                        const firstVal =
                          typeof values.quantity === 'object' && values.quantity !== null
                            ? Object.values(values.quantity as Record<string, string>)[0] || ""
                            : (typeof values.quantity === 'string' ? values.quantity : "");
                        setFieldValue("quantity", firstVal);
                      }
                    }}
                    className="mt-0.5 w-4 h-4 rounded cursor-pointer accent-[#03e9f4]"
                  />
                  <span>
                    Separate quantity for each dosage packet ({uniqueDoses.join(", ")})
                  </span>
                </label>
                <p className="text-[11px] text-gray-400 mt-1 pl-6">
                  Check this if different dosage strengths come in separate medicine packets/bottles.
                </p>
              </div>
            )}

            {/* Quantity Inputs */}
            {uniqueDoses.length > 1 && separateQuantity ? (
              <div className="w-full mt-3 space-y-2">
                <label className="font-bold block text-sm">Quantity per Dosage Variant:</label>
                {uniqueDoses.map((dose) => {
                  const qtyMap = (typeof values.quantity === 'object' && values.quantity !== null ? values.quantity : {}) as Record<string, string>;
                  const qtyVal = qtyMap[dose] ?? "";
                  return (
                    <div key={dose} className="flex items-center gap-2">
                      <span className="min-w-[70px] text-xs font-mono bg-[#03e9f4]/20 border border-[#03e9f4] text-white px-2 py-2 rounded text-center font-bold">
                        {dose}
                      </span>
                      <input
                        type="number"
                        min="0"
                        max="999"
                        placeholder={`Pills for ${dose}`}
                        value={qtyVal}
                        onChange={(e) => {
                          const newMap = { ...qtyMap, [dose]: e.target.value };
                          setFieldValue("quantity", newMap);
                        }}
                        onBlur={handleBlur}
                        name={`quantity_${dose}`}
                        className="w-full bg-black placeholder-gray-500 rounded-md border-2 border-[#03e9f4] px-3 py-2 text-sm"
                      />
                    </div>
                  );
                })}
                {errors.quantity && touched.quantity && (
                  <p className="text-red-500 text-xs">
                    {typeof errors.quantity === 'string' ? errors.quantity : "Please enter quantity for each dosage"}
                  </p>
                )}
              </div>
            ) : (
              <div className="w-full mt-3">
                <label htmlFor="quantity" className="font-bold block text-sm">
                  {uniqueDoses.length === 1 ? `Quantity (${uniqueDoses[0]}):` : "Quantity (Total Pills):"}
                </label>
                <input
                  onChange={(e) => setFieldValue("quantity", e.target.value)}
                  value={typeof values.quantity === 'string' ? values.quantity : (Object.values(values.quantity || {})[0] ?? "")}
                  onBlur={handleBlur}
                  className="w-full bg-black placeholder-[#03e9f4] rounded-md border-2 border-[#03e9f4] px-3 py-2 mt-1"
                  type="number"
                  id="quantity"
                  min="0"
                  max="999"
                  placeholder="30"
                  name="quantity"
                />
                {errors.quantity && touched.quantity && (
                  <p className="text-red-500 text-xs mt-1">{typeof errors.quantity === 'string' ? errors.quantity : "please enter Quantity"}</p>
                )}
              </div>
            )}

            {/* Total Schedule Days & Start Date */}
            <div className="w-full mt-3">
              <label htmlFor="number_days" className='font-bold block text-sm'>Numbers of the Days:</label>
              <input
                onChange={handleChange}
                onBlur={handleBlur}
                value={values.number_days}
                className='w-full bg-black placeholder-[#03e9f4] rounded-md border-2 border-[#03e9f4] px-3 py-2 mt-1'
                name='number_days'
                id='number_days'
                type='number'
                placeholder='15'
              />
              {errors.number_days && touched.number_days && <p className='text-red-500 text-xs mt-1'>{errors.number_days}</p>}
            </div>

            <div className="w-full mt-3">
              <label htmlFor="startdate" className='font-bold block text-sm'>Start Date:</label>
              <input
                onChange={handleChange}
                value={values.startdate}
                onBlur={handleBlur}
                className='w-full bg-black placeholder-[#03e9f4] rounded-md border-2 border-[#03e9f4] px-3 py-2 mt-1'
                name='startdate'
                id='startdate'
                type='date'
              />
              {errors.startdate && touched.startdate && <p className='text-red-500 text-xs mt-1'>{errors.startdate}</p>}
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full flex cursor-pointer justify-center items-center gap-2 bg-[#03e9f4] text-black font-semibold px-4 py-2.5 my-5 rounded-lg shadow-lg active:scale-95 disabled:opacity-50 transition-all hover:bg-[#00c5cf]"
            >
              {actionLoading && (
                <div className="h-[20px] w-[20px] animate-spin rounded-full border-3 border-solid border-black border-r-transparent" />
              )}
              Generate Schedule
            </button>
          </div>

          {/* Medicines List Sidebar */}
          <div className="flex flex-col w-full h-[fit-content] lg:w-[35%] xl:w-[22%] mx-auto border border-white/10 rounded-2xl bg-white/5 backdrop-blur-md items-center rounded-2xl p-3">
            <div className='border border-white/10 rounded-xl bg-white/5 backdrop-blur-md py-2.5 mb-2 text-center rounded-xl w-full font-bold'>
              <h1>Your Medicines</h1>
            </div>
            {medicineData.length === 0 ? (
              <h1 className='grid place-items-center my-6 font-mono text-sm text-gray-400'>No medicines found</h1>
            ) : (
              medicineData.map((item) => (
                <div key={item._id} className="mt-2 w-full p-2.5 bg-black/40 border border-white/10 rounded-xl">
                  <div className="flex items-center justify-between gap-2 relative">
                    <p className="font-bold text-sm text-white truncate flex-1">
                      {item.medicine_name}
                    </p>
                    <MedicineMenu id={item._id!} />
                  </div>

                  <Link
                    className="w-full mt-3 flex cursor-pointer justify-center items-center gap-2 bg-[#03e9f4] text-black font-semibold px-3 py-1.5 rounded-lg shadow-md active:scale-95 text-xs hover:bg-[#00c5cf] transition-all"
                    href={`/Medicines/MedicineTable/${item._id}`}
                  >
                    See Schedule
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </form>
    </>
  );
};

export default MedicinePage;