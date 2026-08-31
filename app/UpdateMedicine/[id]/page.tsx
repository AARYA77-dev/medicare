"use client";

import { MedicineSchema } from '@/Schemas/yupSChemas';
import { useFormik } from 'formik';
import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FaArrowLeft, FaCalendarAlt, FaPlus, FaSyncAlt, FaTrash } from 'react-icons/fa';
import axios from 'axios';
import { Medicines, ScheduleType, Dose, ScheduleEntry } from '@/Interfaces/interface';
import { useParams, useRouter } from 'next/navigation';
import Loading from '@/app/loading';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateMedicineSchedule } from '@/store/medicineSlice';

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

const UpdateMedicine = () => {
  const dispatch = useAppDispatch();
  const { medicines } = useAppSelector((state) => state.medicine);
  const { viewingOwnerId, role } = useAppSelector((state) => state.sharing);
  const [medicineData, setMedicineData] = useState<Medicines>();
  const [loading, setLoading] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);

  const [scheduleType, setScheduleType] = useState<ScheduleType>("daily");
  const [separateQuantity, setSeparateQuantity] = useState(false);

  // Daily mode state
  const [dosageList, setDosageList] = useState<string[]>([""]);
  const [timeList, setTimeList] = useState<string[]>([""]);
  const [timeDoseIndices, setTimeDoseIndices] = useState<number[]>([0]);

  // Alternate mode state
  const [alternateCycle, setAlternateCycle] = useState<string[]>(["2", "3"]);
  const [singleTime, setSingleTime] = useState<string>("08:00");

  // Specific Weekdays mode state
  const [weeklyDefaultDose, setWeeklyDefaultDose] = useState<string>("3");
  const [weeklyOverrideDose, setWeeklyOverrideDose] = useState<string>("2");
  const [weeklyDays, setWeeklyDays] = useState<number[]>([1]);

  const { id } = useParams();
  const route = useRouter();

  // Redirect if collaborator doesn't have co-manager (admin) role
  useEffect(() => {
    if (viewingOwnerId && role !== 'admin') {
      toast.error("Co-Manager role required to edit medicines.");
      route.push('/Medicines');
    }
  }, [viewingOwnerId, role, route]);

  // Mode changer
  const handleScheduleTypeChange = (type: ScheduleType) => {
    setScheduleType(type);
    setFieldValue("schedule_type", type);
  };

  // Daily Handlers
  const handleDosageChange = (index: number, val: string) => {
    const updated = [...dosageList];
    updated[index] = val;
    setDosageList(updated);
  };

  const handleAddDosage = () => {
    setDosageList((prev) => [...prev, ""]);
  };

  const handleRemoveDosage = (index: number) => {
    if (dosageList.length <= 1) return;
    const updated = dosageList.filter((_, i) => i !== index);
    setDosageList(updated);
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
  };

  // Weekday Mode Handlers
  const toggleWeekday = (day: number) => {
    if (weeklyDays.includes(day)) {
      if (weeklyDays.length <= 1) {
        toast.error("Please select at least 1 day for custom dosage");
        return;
      }
      setWeeklyDays(weeklyDays.filter((d) => d !== day));
    } else {
      setWeeklyDays([...weeklyDays, day]);
    }
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

  const parseDoses = () => {
    if (scheduleType === "alternate") {
      return alternateCycle.filter((d) => d.trim() !== "").map((d) => `${d} mg`);
    }
    if (scheduleType === "weekly") {
      return Array.from(new Set([weeklyDefaultDose, weeklyOverrideDose])).filter(Boolean).map((d) => `${d} mg`);
    }
    return dosageList.filter((d) => d.trim() !== "").map((d) => `${d} mg`);
  };

  const parseTimes = () => {
    if (scheduleType === "alternate" || scheduleType === "weekly") {
      return [singleTime || "08:00"];
    }
    return timeList.filter((t) => t.trim() !== "");
  };

  function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  const getSchedule = (): ScheduleEntry[] => {
    const validDoses = parseDoses();
    const validTimes = parseTimes();
    const numDays = parseInt(values.number_days) || 1;
    const start = values.startdate ? new Date(values.startdate) : new Date();

    const result: ScheduleEntry[] = [];

    if (scheduleType === "daily") {
      for (let i = 0; i < numDays; i++) {
        const currentDate = addDays(start, i);
        const dayDoses: Dose[] = validTimes.map((t, tIdx) => {
          const dIdx = timeDoseIndices[tIdx] !== undefined ? timeDoseIndices[tIdx] : 0;
          const assignedDose = validDoses[dIdx] || validDoses[0] || "5 mg";
          return { time: t, dosage: assignedDose };
        });

        result.push({
          day: i + 1,
          date: currentDate.toLocaleDateString(),
          doses: dayDoses,
        });
      }
    } else if (scheduleType === "alternate") {
      const cycleLength = validDoses.length || 2;
      const t = validTimes[0] || "08:00";

      for (let i = 0; i < numDays; i++) {
        const currentDate = addDays(start, i);
        const doseForDay = validDoses[i % cycleLength] || "5 mg";

        result.push({
          day: i + 1,
          date: currentDate.toLocaleDateString(),
          doses: [{ time: t, dosage: doseForDay }],
        });
      }
    } else if (scheduleType === "weekly") {
      const t = validTimes[0] || "08:00";
      const overrideVal = `${weeklyOverrideDose || "2"} mg`;
      const defaultVal = `${weeklyDefaultDose || "3"} mg`;

      for (let i = 0; i < numDays; i++) {
        const currentDate = addDays(start, i);
        const dayOfWeek = currentDate.getDay();
        const doseForDay = weeklyDays.includes(dayOfWeek) ? overrideVal : defaultVal;

        result.push({
          day: i + 1,
          date: currentDate.toLocaleDateString(),
          doses: [{ time: t, dosage: doseForDay }],
        });
      }
    }

    return result;
  };

  const { values, errors, touched, handleBlur, handleChange, handleSubmit, setFieldValue } = useFormik({
    validationSchema: MedicineSchema,
    enableReinitialize: true,
    initialValues: medicineData ?? initialValues,
    onSubmit: async (formValues) => {
      setButtonLoading(true);
      const result = getSchedule();
      const payload = {
        ...formValues,
        schedule_type: scheduleType,
        weekly_default_dose: scheduleType === 'weekly' ? weeklyDefaultDose : undefined,
        weekly_override_dose: scheduleType === 'weekly' ? weeklyOverrideDose : undefined,
        weekly_days: scheduleType === 'weekly' ? weeklyDays : undefined,
        schedule: result,
      };

      try {
        await dispatch(updateMedicineSchedule({ id: id as string, payload })).unwrap();
        toast.success("Your schedule updated successfully");
        route.push("/Medicines");
      } catch (error) {
        console.log("Error:", error);
        toast.error("Something went wrong");
      } finally {
        setButtonLoading(false);
      }
    },
  });

  const applyMedicineData = useCallback((data: Medicines & { schedule?: ScheduleEntry[] }) => {
    setMedicineData(data);
    if (data) {
      const mode: ScheduleType = data.schedule_type || "daily";
      setScheduleType(mode);

      if (typeof data.quantity === 'object' && data.quantity !== null) {
        setSeparateQuantity(true);
      }

      let splitDoses: string[] = [];
      if (data.dosage_pattern) {
        splitDoses = data.dosage_pattern.split(',').map((s: string) => s.trim()).filter(Boolean);
      }

      if (mode === "alternate") {
        if (splitDoses.length > 0) setAlternateCycle(splitDoses);
        if (data.times_days) setSingleTime(data.times_days.split(',')[0] || "08:00");
      } else if (mode === "weekly") {
        if (data.weekly_default_dose) setWeeklyDefaultDose(data.weekly_default_dose);
        if (data.weekly_override_dose) setWeeklyOverrideDose(data.weekly_override_dose);
        if (data.weekly_days && Array.isArray(data.weekly_days)) setWeeklyDays(data.weekly_days);
        if (data.times_days) setSingleTime(data.times_days.split(',')[0] || "08:00");
      } else {
        setDosageList(splitDoses.length > 0 ? splitDoses : [""]);
        if (data.times_days) {
          const splitTimes = data.times_days.split(',').map((s: string) => s.trim()).filter(Boolean);
          setTimeList(splitTimes.length > 0 ? splitTimes : [""]);
        }
        if (data.schedule && data.schedule[0] && data.schedule[0].doses && splitDoses.length > 0) {
          const initialIndices = data.schedule[0].doses.map((d: Dose) => {
            const dNum = parseFloat(d.dosage);
            const foundIdx = splitDoses.findIndex((sd: string) => parseFloat(sd) === dNum);
            return foundIdx >= 0 ? foundIdx : 0;
          });
          if (initialIndices.length > 0) {
            setTimeDoseIndices(initialIndices);
          }
        }
      }
    }
  }, [setScheduleType]);

  useEffect(() => {
    if (scheduleType === "daily") {
      const freq = parseInt(values.frequency);
      if (!isNaN(freq) && freq > 0) {
        const dl = dosageList.length;
        Promise.resolve({ freq, dl }).then(({ freq: f, dl: dLen }) => {
          setTimeList((prev) => {
            if (prev.length === f) return prev;
            return Array.from({ length: f }).map((_, idx) => prev[idx] || "");
          });
          setTimeDoseIndices((prev) => {
            if (prev.length === f) return prev;
            return Array.from({ length: f }).map((_, idx) => {
              if (prev[idx] !== undefined && prev[idx] < Math.max(1, dLen)) {
                return prev[idx];
              }
              return idx < dLen ? idx : 0;
            });
          });
        });
      }
    }
  }, [values.frequency, dosageList.length, scheduleType]);

  // Load existing medicine data
  useEffect(() => {
    const existing = medicines.find((m) => m._id === id);
    if (existing) {
      Promise.resolve(existing).then(applyMedicineData);
      return;
    }

    Promise.resolve().then(() => {
      setLoading(true);
      axios.get(`/api/medicareDB/${id}`)
        .then((response) => {
          const data = response.data.result;
          applyMedicineData(data);
        })
        .catch((error) => {
          console.log("Error:", error);
          toast.error("something went wrong");
        }).finally(() => {
          setLoading(false);
        });
    });
  }, [id, medicines, applyMedicineData]);

  if (loading) {
    return <Loading />;
  }

  if (!medicineData) {
    return null;
  }

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
  const isMultiFreq = (parseInt(values.frequency) || 1) > 1;
  const isMultiDose = dosageList.length > 1;
  const showDoseSelector = isMultiFreq && isMultiDose;

  return (
    <>
      <div className='flex gap-2 px-4 mt-2'>
        <button
          onClick={() => { route.push("/Medicines"); }}
          className='flex gap-2 bg-[#03e9f4] cursor-pointer items-center text-black font-semibold px-4 py-2 rounded-lg transition duration-150 ease-in-out transform active:scale-95 shadow-lg'
        >
          <FaArrowLeft /> Back
        </button>
      </div>

      <form onSubmit={handleSubmit} className='flex justify-center px-3 my-6'>
        <div className='flex flex-col border border-white/10 rounded-2xl bg-white/5 backdrop-blur-md w-full sm:w-[90%] md:w-[70%] lg:w-[48%] xl:w-[32%] items-center shadow-2xl px-4 sm:px-8 py-6'>

          <h2 className="text-xl font-bold text-[#03e9f4] mb-2">Edit Medicine Schedule</h2>

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
                className={`py-2 px-1 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${scheduleType === 'daily'
                    ? 'bg-[#03e9f4] text-black font-bold shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                <span className="flex items-center justify-center gap-1"><FaCalendarAlt aria-hidden="true" /> Daily</span>
              </button>
              <button
                type="button"
                onClick={() => handleScheduleTypeChange('alternate')}
                className={`py-2 px-1 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${scheduleType === 'alternate'
                    ? 'bg-[#03e9f4] text-black font-bold shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                <span className="flex items-center justify-center gap-1"><FaSyncAlt aria-hidden="true" /> Alternate</span>
              </button>
              <button
                type="button"
                onClick={() => handleScheduleTypeChange('weekly')}
                className={`py-2 px-1 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${scheduleType === 'weekly'
                    ? 'bg-[#03e9f4] text-black font-bold shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                <span className="flex items-center justify-center gap-1"><FaCalendarAlt aria-hidden="true" /> Weekdays</span>
              </button>
            </div>
          </div>

          {/* -------------------- MODE 1: DAILY -------------------- */}
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
                <p className="flex items-center gap-1 font-semibold text-[#03e9f4] mb-0.5"><FaSyncAlt aria-hidden="true" /> Alternating Day Cycle</p>
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
                <p className="flex items-center gap-1 font-semibold text-[#03e9f4] mb-0.5"><FaCalendarAlt aria-hidden="true" /> Specific Weekdays Schedule</p>
                <p>Takes a different dosage strength on selected days of the week (e.g. 2mg on Monday, 3mg other days).</p>
              </div>

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
                        className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${isSelected
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

          {/* Numbers of the Days & Start Date */}
          <div className="w-full mt-3">
            <label htmlFor="number_days" className='font-bold block text-sm'>Course Duration (Days):</label>
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
            disabled={buttonLoading}
            className="w-full flex cursor-pointer justify-center items-center gap-2 bg-[#03e9f4] text-black font-semibold px-4 py-2.5 my-6 rounded-lg shadow-lg active:scale-95 disabled:opacity-50 transition-all hover:bg-[#00c5cf]"
          >
            {buttonLoading && (
              <div className="h-[20px] w-[20px] animate-spin rounded-full border-3 border-solid border-black border-r-transparent" />
            )}
            Update Schedule
          </button>
        </div>
      </form>
    </>
  );
};

export default UpdateMedicine;