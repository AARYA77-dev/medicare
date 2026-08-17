"use client";

import Header from '@/components/header';
import { MedicineSchema } from '@/Schemas/yupSChemas';
import { useFormik } from 'formik';
import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FaEdit, FaEllipsisV, FaInfoCircle, FaPlus, FaTrash } from 'react-icons/fa';
import { Tooltip as ReactTooltip } from "react-tooltip";
import { ScheduleEntry, Medicines, Dose } from '../../Interfaces/interface';
import Loading from '../loading';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchMedicines, addMedicineSchedule, deleteMedicine } from '@/store/medicineSlice';

const initialValues: Medicines = {
  medicine_name: "",
  quantity: "",
  frequency: "",
  dosage_pattern: "",
  times_days: "",
  number_days: "",
  startdate: "",
};

const MedicinePage = () => {
  const dispatch = useAppDispatch();
  const { medicines: medicineData, loading, actionLoading } = useAppSelector((state) => state.medicine);
  const [separateQuantity, setSeparateQuantity] = useState(false);
  const [dosageList, setDosageList] = useState<string[]>([""]);

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
  };

  const getUniqueDoses = (pattern: string): string[] => {
    if (!pattern) return [];
    const parts = pattern.split(',').map((p) => p.trim()).filter(Boolean);
    const nums: string[] = [];
    parts.forEach((p) => {
      const val = parseFloat(p);
      if (!isNaN(val)) {
        const formatted = `${val}mg`;
        if (!nums.includes(formatted)) {
          nums.push(formatted);
        }
      }
    });
    return nums;
  };

  const { errors, values, handleBlur, touched, handleChange, handleSubmit, setFieldValue } = useFormik<Medicines>({
    validationSchema: MedicineSchema,
    initialValues,
    onSubmit: async (formValues, { resetForm }) => {
      const result = getSchedule();
      try {
        await dispatch(addMedicineSchedule({ ...formValues, schedule: result })).unwrap();
        toast.success("Your schedule generated");
        resetForm();
        setSeparateQuantity(false);
        setDosageList([""]);
      } catch {
        toast.error("Something went wrong");
      }
    }
  });

  const uniqueDoses = getUniqueDoses(values.dosage_pattern);

  const getSchedule = () => {
    const { frequency, dosage_pattern, times_days, number_days, startdate } = values;

    const dosagePattern = dosage_pattern.split(",").map(p => parseFloat(p.trim()));
    const timesOfDays = times_days.split(",").map(p => p.trim());
    const freq = parseInt(frequency);
    const noOFDays = parseInt(number_days);
    const startDate = new Date(startdate);
    if (timesOfDays.length !== freq) {
      toast.error("Frequency and times of days logic check required");
    }

    const result: ScheduleEntry[] = [];

    for (let i = 0; i < noOFDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      let doses: Dose[] = [];
      if (freq === 1) {
        const index = i % dosagePattern.length;
        doses.push({
          time: timesOfDays[0],
          dosage: dosagePattern[index] + "mg"
        });
      } else {
        doses = timesOfDays.map((time, j) => ({
          time: time,
          dosage: dosagePattern[j % dosagePattern.length] + "mg"
        }));
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

  return (
    <>
      <Header />
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col lg:flex-row gap-6 px-3 sm:px-6">
          <div className="flex flex-col border border-white/10 rounded-2xl bg-white/5 backdrop-blur-md w-full lg:w-[45%] xl:w-[28%] mx-auto items-center shadow-2xl px-4 sm:px-8 xl:px-12">
            <label htmlFor="medicine_name" className='mt-3 font-bold'>Medicine Name:</label>
            <input className='w-full bg-black placeholder-[#03e9f4] rounded-md border-2 border-[#03e9f4] px-3 py-2' type='text' placeholder='Enter Medicine name' name='medicine_name' onBlur={handleBlur} value={values.medicine_name} onChange={handleChange} id='medicine_name' />
            {errors.medicine_name && touched.medicine_name && <p className='text-red-500'>{errors.medicine_name}</p>}

            <div className='flex items-center gap-2 mt-3'>
              <label htmlFor="frequency" className='mt-3 font-bold'>Frequency(Times Per Day)</label>
            </div>
            <input onChange={handleChange} onBlur={handleBlur} value={values.frequency} className='w-full bg-black placeholder-[#03e9f4] rounded-md border-2 border-[#03e9f4] px-3 py-2' pattern='^[0-9]+$' type='number' min="0" max="9" id='frequency' name='frequency' placeholder='1' />
            {errors.frequency && touched.frequency && <p className='text-red-500'>{errors.frequency}</p>}

            <div className='flex items-center gap-2 mt-3 w-full'>
              <label className='font-bold'>Dosage Pattern (mg):</label>
            </div>

            <div className="w-full space-y-2 mt-1">
              {dosageList.map((dose, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-mono min-w-[50px]">
                    Dose {idx + 1}:
                  </span>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0.1"
                      step="any"
                      placeholder={`e.g. ${idx === 0 ? "2" : "3"}`}
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

              <button
                type="button"
                onClick={handleAddDosage}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-dashed border-[#03e9f4]/60 text-[#03e9f4] text-xs font-semibold hover:bg-[#03e9f4]/15 transition-colors cursor-pointer active:scale-98 mt-2"
              >
                <FaPlus className="text-xs" />
                Add More Dosage
              </button>
            </div>
            {errors.dosage_pattern && touched.dosage_pattern && <p className='text-red-500 text-sm mt-1'>{errors.dosage_pattern}</p>}

            {/* Multiple Dosage Separation Question */}
            {uniqueDoses.length > 1 && (
              <div className="w-full mt-3 p-3 bg-white/5 border border-[#03e9f4]/40 rounded-lg transition-all">
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
                  <p className="text-red-500 text-sm">
                    {typeof errors.quantity === 'string' ? errors.quantity : "Please enter quantity for each dosage"}
                  </p>
                )}
              </div>
            ) : (
              <div className="w-full">
                <label htmlFor="quantity" className="mt-3 font-bold block">
                  {uniqueDoses.length === 1 ? `Quantity (${uniqueDoses[0]}):` : "Quantity (Total Pills):"}
                </label>
                <input
                  onChange={(e) => setFieldValue("quantity", e.target.value)}
                  value={typeof values.quantity === 'string' ? values.quantity : (Object.values(values.quantity || {})[0] ?? "")}
                  onBlur={handleBlur}
                  className="w-full bg-black placeholder-[#03e9f4] rounded-md border-2 border-[#03e9f4] px-3 py-2"
                  type="number"
                  id="quantity"
                  min="0"
                  max="999"
                  placeholder="30"
                  name="quantity"
                />
                {errors.quantity && touched.quantity && (
                  <p className="text-red-500">{typeof errors.quantity === 'string' ? errors.quantity : "please enter Quantity"}</p>
                )}
              </div>
            )}

            <div className='flex items-center gap-2 mt-3'>
              <label htmlFor="times_days" className='mt-3 font-bold'>Time(e.g.,Evening,Morning,10:00AM):</label>
            </div>
            <input onChange={handleChange} onBlur={handleBlur} value={values.times_days} className='w-full bg-black placeholder-[#03e9f4] rounded-md border-2 border-[#03e9f4] px-3 py-2' type='text' placeholder='Evening' id='times_days' name='times_days' />
            {errors.times_days && touched.times_days && <p className='text-red-500'>{errors.times_days}</p>}

            <label htmlFor="number_days" className='mt-3 font-bold'>Numbers of the Days:</label>
            <input onChange={handleChange} onBlur={handleBlur} value={values.number_days} className='w-full bg-black placeholder-[#03e9f4] rounded-md border-2 border-[#03e9f4] px-3 py-2' name='number_days' id='number_days' type='number' placeholder='15' />
            {errors.number_days && touched.number_days && <p className='text-red-500'>{errors.number_days}</p>}

            <label htmlFor="startdate" className='mt-3 font-bold'>Start Date:</label>
            <input onChange={handleChange} value={values.startdate} onBlur={handleBlur} className='w-full bg-black placeholder-[#03e9f4] rounded-md border-2 border-[#03e9f4] px-3 py-2' name='startdate' id='startdate' type='date' />
            {errors.startdate && touched.startdate && <p className='text-red-500'>{errors.startdate}</p>}

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full flex cursor-pointer justify-center items-center gap-2 bg-[#03e9f4] text-black font-semibold px-4 py-2 my-6 rounded shadow-lg active:scale-95 disabled:opacity-50"
            >
              {actionLoading && (
                <div className="h-[23px] w-[23px] animate-spin rounded-full border-4 border-solid border-black border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
              )}
              Generate Schedule
            </button>
          </div>

          <div className="flex flex-col w-full h-[fit-content] lg:w-[35%] xl:w-[20%] mx-auto border border-white/10 rounded-2xl bg-white/5 backdrop-blur-md items-center rounded-2xl">
            <div className='border border-white/10 rounded-2xl bg-white/5 backdrop-blur-md py-2 mb-2 text-center rounded-2xl xl:px-12 w-full font-bold'>
              <h1>Your Medicines</h1>
            </div>
            {medicineData.length === 0 ? (
              <h1 className='grid place-items-center my-3 font-mono'>No medicines found</h1>
            ) : (
              medicineData.map((item) => (
                <div key={item._id} className="mt-2 w-full">
                  <div className="flex flex-col items-center justify-between gap-2 relative">
                    <p className="font-bold text-center flex-1">
                      {item.medicine_name}
                    </p>
                    <MedicineMenu id={item._id!} />
                  </div>

                  <Link
                    className="w-[80%] m-[auto] flex cursor-pointer justify-center items-center gap-2 bg-[#03e9f4] text-black font-semibold px-4 py-2 my-6 rounded shadow-lg active:scale-95 text-sm"
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