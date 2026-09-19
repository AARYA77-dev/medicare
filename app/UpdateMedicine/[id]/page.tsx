"use client";

import { MedicineSchema } from '@/Schemas/yupSChemas';
import { useFormik } from 'formik';
import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FaArrowLeft, FaCalendarAlt, FaExclamationTriangle, FaPlus, FaSyncAlt, FaTrash } from 'react-icons/fa';
import axios from 'axios';
import { Medicines, ScheduleType, Dose, ScheduleEntry, MedicineWithSchedule } from '@/Interfaces/interface';
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

function formatScheduleDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseSafeDate(dateStr?: string): Date {
  if (!dateStr) return new Date();
  const str = String(dateStr).trim();
  const parts = str.split(/[\/\-\.]/).map(Number);
  if (parts.length === 3) {
    if (parts[0] > 1000) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    const year = parts[2] < 100 ? parts[2] + 2000 : parts[2];
    if (parts[0] > 12) {
      return new Date(year, parts[1] - 1, parts[0]);
    }
    if (parts[1] > 12) {
      return new Date(year, parts[0] - 1, parts[1]);
    }
    return new Date(year, parts[1] - 1, parts[0]);
  }
  const fallback = new Date(str);
  return !isNaN(fallback.getTime()) ? fallback : new Date();
}

function formatDisplayDate(value?: string): string {
  if (!value) return "";
  const d = parseSafeDate(value);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

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
  const [medicineData, setMedicineData] = useState<MedicineWithSchedule>();
  const [loading, setLoading] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [showStartDateModal, setShowStartDateModal] = useState(false);
  const [pendingFormValues, setPendingFormValues] = useState<Medicines | null>(null);

  const existingSchedule = medicineData?.schedule || [];
  const origNumDays = parseInt(medicineData?.number_days || "0") || existingSchedule.length;
  const remainingCount = existingSchedule.length;
  const completedDays = Math.max(0, origNumDays - remainingCount);

  const isCourseStarted = Boolean(
    completedDays > 0 ||
    (existingSchedule.length > 0 && (existingSchedule[0]?.day || 1) > 1) ||
    (medicineData?.startdate && parseSafeDate(medicineData.startdate).getTime() < new Date().setHours(0, 0, 0, 0))
  );

  const [scheduleType, setScheduleType] = useState<ScheduleType>("daily");
  const [separateQuantity, setSeparateQuantity] = useState(false);

  // Daily mode state
  const [dosageList, setDosageList] = useState<string[]>([""]);
  const [timeList, setTimeList] = useState<string[]>([""]);
  const [timeDoseIndices, setTimeDoseIndices] = useState<number[]>([0]);

  // Alternate mode state
  const [alternateCycle, setAlternateCycle] = useState<string[]>(["", ""]);
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

  // Mode changer - resets unselected tab states and updates form values
  const handleScheduleTypeChange = (type: ScheduleType) => {
    setScheduleType(type);
    setFieldValue("schedule_type", type);

    // Reset touched state so new tab starts fresh without old errors
    setFieldTouched("dosage_pattern", false);
    setFieldTouched("times_days", false);
    setFieldTouched("weekly_default_dose", false);
    setFieldTouched("weekly_override_dose", false);
    setFieldTouched("weekly_days", false);

    if (type === "daily") {
      // Clean alternate & weekly fields
      setAlternateCycle(["", ""]);
      setWeeklyDefaultDose("");
      setWeeklyOverrideDose("");
      setWeeklyDays([]);
      setFieldValue("weekly_default_dose", "");
      setFieldValue("weekly_override_dose", "");
      setFieldValue("weekly_days", []);

      const combinedDose = dosageList.join(",");
      setFieldValue("dosage_pattern", combinedDose);
      const combinedTime = timeList.join(",");
      setFieldValue("times_days", combinedTime || "08:00");
      setFieldValue("frequency", values.frequency || "1");
    } else if (type === "alternate") {
      // Clean daily & weekly fields
      setDosageList([""]);
      setTimeList([""]);
      setTimeDoseIndices([0]);
      setWeeklyDefaultDose("");
      setWeeklyOverrideDose("");
      setWeeklyDays([]);
      setFieldValue("weekly_default_dose", "");
      setFieldValue("weekly_override_dose", "");
      setFieldValue("weekly_days", []);

      const combinedDose = alternateCycle.join(",");
      setFieldValue("dosage_pattern", combinedDose);
      setFieldValue("times_days", singleTime || "08:00");
      setFieldValue("frequency", "1");
    } else if (type === "weekly") {
      // Clean daily & alternate fields
      setDosageList([""]);
      setTimeList([""]);
      setTimeDoseIndices([0]);
      setAlternateCycle(["", ""]);

      const defDose = weeklyDefaultDose || "3";
      const overDose = weeklyOverrideDose || "2";
      const wDays = weeklyDays.length > 0 ? weeklyDays : [1];
      setWeeklyDefaultDose(defDose);
      setWeeklyOverrideDose(overDose);
      setWeeklyDays(wDays);

      const doses = Array.from(new Set([defDose, overDose])).filter(Boolean);
      setFieldValue("dosage_pattern", doses.join(","));
      setFieldValue("times_days", singleTime || "08:00");
      setFieldValue("frequency", "1");
      setFieldValue("weekly_default_dose", defDose);
      setFieldValue("weekly_override_dose", overDose);
      setFieldValue("weekly_days", wDays);
    }
  };

  // Daily Handlers
  const handleDosageChange = (index: number, val: string) => {
    const updated = [...dosageList];
    updated[index] = val;
    setDosageList(updated);
    setFieldValue("dosage_pattern", updated.join(","));
  };

  const handleAddDosage = () => {
    setDosageList((prev) => {
      const updated = [...prev, ""];
      setFieldValue("dosage_pattern", updated.join(","));
      return updated;
    });
  };

  const handleRemoveDosage = (index: number) => {
    if (dosageList.length <= 1) return;
    const updated = dosageList.filter((_, i) => i !== index);
    setDosageList(updated);
    setFieldValue("dosage_pattern", updated.join(","));
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
    setFieldValue("times_days", updated.join(","));
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
    setFieldValue("dosage_pattern", updated.join(","));
  };

  const handleAddAlternateDay = () => {
    setAlternateCycle((prev) => {
      const updated = [...prev, ""];
      setFieldValue("dosage_pattern", updated.join(","));
      return updated;
    });
  };

  const handleRemoveAlternateDay = (index: number) => {
    if (alternateCycle.length <= 2) return;
    const updated = alternateCycle.filter((_, i) => i !== index);
    setAlternateCycle(updated);
    setFieldValue("dosage_pattern", updated.join(","));
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
      return alternateCycle.filter((d) => d.trim() !== "").map((d) => `${d}mg`);
    }
    if (scheduleType === "weekly") {
      return Array.from(new Set([weeklyDefaultDose, weeklyOverrideDose])).filter(Boolean).map((d) => `${d}mg`);
    }
    return dosageList.filter((d) => d.trim() !== "").map((d) => `${d}mg`);
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

  const generateDayDoses = (date: Date, cycleIdx: number): Dose[] => {
    const validDoses = parseDoses();
    const validTimes = parseTimes();

    if (scheduleType === "daily") {
      return validTimes.map((t, tIdx) => {
        const dIdx = timeDoseIndices[tIdx] !== undefined ? timeDoseIndices[tIdx] : 0;
        const assignedDose = validDoses[dIdx] || validDoses[0] || "5mg";
        return { time: t, dosage: assignedDose };
      });
    } else if (scheduleType === "alternate") {
      const cycleLength = validDoses.length || 2;
      const t = validTimes[0] || "08:00";
      const doseForDay = validDoses[cycleIdx % cycleLength] || "5mg";
      return [{ time: t, dosage: doseForDay }];
    } else if (scheduleType === "weekly") {
      const t = validTimes[0] || "08:00";
      const overrideVal = `${weeklyOverrideDose || "2"}mg`;
      const defaultVal = `${weeklyDefaultDose || "3"}mg`;
      const dayOfWeek = date.getDay();
      const doseForDay = weeklyDays.includes(dayOfWeek) ? overrideVal : defaultVal;
      return [{ time: t, dosage: doseForDay }];
    }
    return [];
  };

  const buildUpdatedSchedule = (
    formValues: Medicines,
    startDateMode: 'keep' | 'shift' | 'reset' = 'keep'
  ): ScheduleEntry[] => {
    const newTotalDays = parseInt(formValues.number_days) || 1;
    const newStartDate = formValues.startdate ? parseSafeDate(formValues.startdate) : new Date();

    // If reset mode requested, or if course has NOT started and startdate changed, regenerate full schedule
    if (startDateMode === 'reset' || (!isCourseStarted && medicineData && formValues.startdate !== medicineData.startdate)) {
      const result: ScheduleEntry[] = [];
      for (let i = 0; i < newTotalDays; i++) {
        const currentDate = addDays(newStartDate, i);
        result.push({
          day: i + 1,
          date: formatScheduleDate(currentDate),
          doses: generateDayDoses(currentDate, i),
        });
      }
      return result;
    }

    // If there is no existing schedule to preserve, generate new
    if (existingSchedule.length === 0) {
      const result: ScheduleEntry[] = [];
      for (let i = 0; i < newTotalDays; i++) {
        const currentDate = addDays(newStartDate, i);
        result.push({
          day: i + 1,
          date: formatScheduleDate(currentDate),
          doses: generateDayDoses(currentDate, i),
        });
      }
      return result;
    }

    // Otherwise, we are updating an ongoing course and preserving completed history!
    // 1. Calculate how many days need to remain in the schedule
    const targetRemainingDays = Math.max(1, newTotalDays - completedDays);

    // 2. Check if timing, dosage, frequency, or schedule_type changed
    const currentScheduleType = medicineData?.schedule_type || 'daily';
    const timingOrDoseChanged = Boolean(
      !medicineData ||
      formValues.times_days !== medicineData.times_days ||
      formValues.dosage_pattern !== medicineData.dosage_pattern ||
      formValues.frequency !== medicineData.frequency ||
      scheduleType !== currentScheduleType ||
      (scheduleType === 'weekly' && (
        formValues.weekly_default_dose !== (medicineData.weekly_default_dose || '') ||
        formValues.weekly_override_dose !== (medicineData.weekly_override_dose || '') ||
        JSON.stringify(weeklyDays.slice().sort()) !== JSON.stringify((medicineData.weekly_days || []).slice().sort())
      ))
    );

    // 3. Shift dates if startDateMode === 'shift'
    let dayShift = 0;
    if (startDateMode === 'shift' && medicineData?.startdate) {
      const oldStart = parseSafeDate(medicineData.startdate);
      dayShift = Math.round((newStartDate.getTime() - oldStart.getTime()) / (1000 * 60 * 60 * 24));
    }

    // 4. Update existing remaining entries
    const updatedEntries: ScheduleEntry[] = existingSchedule.map((entry, idx) => {
      const parsedEntryDate = parseSafeDate(entry.date);
      const shiftedDate = dayShift !== 0 ? addDays(parsedEntryDate, dayShift) : parsedEntryDate;
      const formattedDate = formatScheduleDate(shiftedDate);

      // If timing or dosage changed, regenerate doses for this day
      if (timingOrDoseChanged) {
        const courseDayIndex = (entry.day && entry.day > 0) ? (entry.day - 1) : (completedDays + idx);
        return {
          day: entry.day,
          date: formattedDate,
          doses: generateDayDoses(shiftedDate, courseDayIndex),
        };
      }

      // Otherwise preserve doses and dose IDs exactly as they are
      return {
        ...entry,
        date: formattedDate,
      };
    });

    // 5. Adjust length if newTotalDays extended or shortened
    if (updatedEntries.length > targetRemainingDays) {
      // Shorten: trim tail
      return updatedEntries.slice(0, targetRemainingDays);
    } else if (updatedEntries.length < targetRemainingDays) {
      // Extend: append additional days
      const lastEntry = updatedEntries[updatedEntries.length - 1];
      const lastDate = parseSafeDate(lastEntry.date);
      const lastDay = lastEntry.day;
      const daysToAdd = targetRemainingDays - updatedEntries.length;

      for (let k = 1; k <= daysToAdd; k++) {
        const nextDate = addDays(lastDate, k);
        const nextDay = lastDay + k;
        updatedEntries.push({
          day: nextDay,
          date: formatScheduleDate(nextDate),
          doses: generateDayDoses(nextDate, nextDay - 1),
        });
      }
      return updatedEntries;
    }

    return updatedEntries;
  };

  const executeSubmit = async (
    formValues: Medicines,
    startDateMode: 'keep' | 'shift' | 'reset' = 'keep'
  ) => {
    setButtonLoading(true);
    const result = buildUpdatedSchedule(formValues, startDateMode);
    const payload = {
      ...formValues,
      startdate: startDateMode === 'reset' || !isCourseStarted ? formValues.startdate : (medicineData?.startdate || formValues.startdate),
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
      setShowStartDateModal(false);
      setPendingFormValues(null);
    }
  };

  const { values, errors, touched, handleBlur, handleChange, handleSubmit, setFieldValue, setFieldTouched } = useFormik({
    validationSchema: MedicineSchema,
    enableReinitialize: true,
    initialValues: medicineData ?? initialValues,
    onSubmit: async (formValues) => {
      // If course has started and start date was changed, ask user how to apply it
      const startDateChanged = Boolean(medicineData && formValues.startdate !== medicineData.startdate);
      if (isCourseStarted && startDateChanged) {
        setPendingFormValues(formValues);
        setShowStartDateModal(true);
        return;
      }

      await executeSubmit(formValues, 'keep');
    },
  });

  const applyMedicineData = useCallback((data: MedicineWithSchedule) => {
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
        setAlternateCycle(splitDoses.length > 0 ? splitDoses : ["", ""]);
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

          {/* Ongoing course progress badge */}
          {isCourseStarted && (
            <div className="w-full p-3 bg-[#03e9f4]/10 border border-[#03e9f4]/30 rounded-xl mb-4 text-xs text-gray-200">
              <div className="flex items-center justify-between font-semibold text-[#03e9f4] mb-1">
                <span className="flex items-center gap-1.5">
                  <FaCalendarAlt className="text-xs" /> Course In Progress
                </span>
                <span className="bg-[#03e9f4]/20 text-[#03e9f4] px-2 py-0.5 rounded text-[11px] font-mono font-bold">
                  {completedDays} / {origNumDays} Days Completed
                </span>
              </div>
              <p>
                {completedDays} {completedDays === 1 ? 'day' : 'days'} completed &bull; {remainingCount} {remainingCount === 1 ? 'day' : 'days'} remaining.
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                Past completed doses are preserved and will not be regenerated.
              </p>
            </div>
          )}

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
                          name="dosage_pattern"
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
                              name="times_days"
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
                          name="dosage_pattern"
                          onChange={(e) => handleAlternateCycleChange(idx, e.target.value)}
                          onBlur={handleBlur}
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
                {errors.dosage_pattern && touched.dosage_pattern && <p className='text-red-500 text-xs mt-1'>{errors.dosage_pattern}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Time of Dose:</label>
                <input
                  type="time"
                  value={singleTime}
                  name="times_days"
                  onChange={(e) => handleSingleTimeChange(e.target.value)}
                  onBlur={handleBlur}
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
                    name="weekly_default_dose"
                    onChange={(e) => handleWeeklyDefaultChange(e.target.value)}
                    onBlur={handleBlur}
                    className="w-full bg-black placeholder-gray-500 rounded-md border-2 border-[#03e9f4] px-3 py-2 pr-10 text-sm"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#03e9f4] font-semibold">
                    mg
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Applied to regular / unselected days.</p>
                {errors.weekly_default_dose && touched.weekly_default_dose && <p className='text-red-500 text-xs mt-1'>{errors.weekly_default_dose}</p>}
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
                {errors.weekly_days && touched.weekly_days && <p className='text-red-500 text-xs mt-1'>{typeof errors.weekly_days === 'string' ? errors.weekly_days : "Please select at least 1 day"}</p>}
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
                    name="weekly_override_dose"
                    onChange={(e) => handleWeeklyOverrideChange(e.target.value)}
                    onBlur={handleBlur}
                    className="w-full bg-black placeholder-gray-500 rounded-md border-2 border-[#03e9f4] px-3 py-2 pr-10 text-sm"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#03e9f4] font-semibold">
                    mg
                  </span>
                </div>
                {errors.weekly_override_dose && touched.weekly_override_dose && <p className='text-red-500 text-xs mt-1'>{errors.weekly_override_dose}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Time of Dose:</label>
                <input
                  type="time"
                  value={singleTime}
                  name="times_days"
                  onChange={(e) => handleSingleTimeChange(e.target.value)}
                  onBlur={handleBlur}
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
                    setFieldTouched("quantity", false);
                    if (checked) {
                      const initialQuantities: Record<string, string> = {};
                      uniqueDoses.forEach((dose) => {
                        initialQuantities[dose] = "";
                      });
                      setFieldValue("quantity", initialQuantities);
                    } else {
                      setFieldValue("quantity", "");
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
                      name="quantity"
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
                value={typeof values.quantity === 'string' ? values.quantity : ""}
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
            <div className="flex items-center justify-between">
              <label htmlFor="number_days" className='font-bold block text-sm'>Course Duration (Days):</label>
              {isCourseStarted && (
                <span className="text-xs text-gray-400">
                  ({remainingCount} days remaining)
                </span>
              )}
            </div>
            <input
              onChange={handleChange}
              onBlur={handleBlur}
              value={values.number_days}
              className='w-full bg-black placeholder-[#03e9f4] rounded-md border-2 border-[#03e9f4] px-3 py-2 mt-1'
              name='number_days'
              id='number_days'
              type='number'
              min={isCourseStarted ? completedDays + 1 : 1}
              placeholder='15'
            />
            {isCourseStarted && (
              <p className="text-[11px] text-gray-400 mt-1">
                Total course days ({completedDays} already completed). You can extend or shorten the remaining days.
              </p>
            )}
            {errors.number_days && touched.number_days && <p className='text-red-500 text-xs mt-1'>{errors.number_days}</p>}
          </div>

          <div className="w-full mt-3">
            <div className="flex items-center justify-between">
              <label htmlFor="startdate" className='font-bold block text-sm'>Start Date:</label>
              {isCourseStarted && (
                <span className="text-[11px] text-[#03e9f4] font-semibold">
                  Started: {formatDisplayDate(medicineData?.startdate)}
                </span>
              )}
            </div>
            <input
              onChange={handleChange}
              value={values.startdate}
              onBlur={handleBlur}
              className='w-full bg-black placeholder-[#03e9f4] rounded-md border-2 border-[#03e9f4] px-3 py-2 mt-1'
              name='startdate'
              id='startdate'
              type='date'
            />
            {isCourseStarted && medicineData && values.startdate !== medicineData.startdate && (
              <p className="text-[11px] text-amber-300 mt-1 flex items-center gap-1">
                <FaExclamationTriangle className="text-xs shrink-0" />
                You changed the start date. You will be prompted on submit to choose how to apply this change.
              </p>
            )}
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

      {/* Start Date Change Confirmation Modal */}
      {showStartDateModal && pendingFormValues && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-[#03e9f4]/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-amber-500/20 text-amber-400">
                <FaExclamationTriangle className="text-xl" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Start Date Changed</h3>
                <p className="text-xs text-gray-400">Choose how to update this ongoing course</p>
              </div>
            </div>

            <div className="bg-black/50 border border-white/10 rounded-xl p-3 text-xs text-gray-300 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-400">Original Start Date:</span>
                <span className="font-semibold text-white">{formatDisplayDate(medicineData?.startdate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">New Start Date:</span>
                <span className="font-semibold text-[#03e9f4]">{formatDisplayDate(pendingFormValues.startdate)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-white/10">
                <span className="text-gray-400">Course Progress:</span>
                <span className="font-semibold text-white">{completedDays} days completed &bull; {remainingCount} days left</span>
              </div>
            </div>

            <p className="text-xs text-gray-300">
              This medicine already has recorded history. How would you like to apply the new start date?
            </p>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                disabled={buttonLoading}
                onClick={() => executeSubmit(pendingFormValues, 'shift')}
                className="w-full text-left p-3 rounded-xl border border-[#03e9f4]/50 bg-[#03e9f4]/15 hover:bg-[#03e9f4]/25 transition cursor-pointer"
              >
                <p className="text-xs font-bold text-[#03e9f4]">
                  1. Shift Remaining Schedule (Recommended)
                </p>
                <p className="text-[11px] text-gray-300 mt-0.5">
                  Preserves all your completed doses and shifts the remaining {remainingCount} days to align with the new timeline.
                </p>
              </button>

              <button
                type="button"
                disabled={buttonLoading}
                onClick={() => executeSubmit(pendingFormValues, 'reset')}
                className="w-full text-left p-3 rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 transition cursor-pointer"
              >
                <p className="text-xs font-bold text-red-400">
                  2. Reset & Regenerate From Start
                </p>
                <p className="text-[11px] text-gray-300 mt-0.5">
                  Wipes previous progress and restarts all {pendingFormValues.number_days} days fresh from {formatDisplayDate(pendingFormValues.startdate)}. Use if original schedule was wrong from day 1.
                </p>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                disabled={buttonLoading}
                onClick={() => {
                  setShowStartDateModal(false);
                  setPendingFormValues(null);
                  setFieldValue("startdate", medicineData?.startdate || "");
                }}
                className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white transition cursor-pointer"
              >
                Cancel & Revert Date
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UpdateMedicine;