"use client"
import { MedicineSchema } from '@/Schemas/yupSChemas';
import { useFormik } from 'formik';
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast';
import { FaArrowLeft, FaPlus, FaQuestionCircle, FaTrash } from 'react-icons/fa';
import { Tooltip as ReactTooltip } from "react-tooltip";
import axios from 'axios';
import { Medicines } from '@/Interfaces/interface';
import { useParams } from 'next/navigation';
import Loading from '@/app/loading';
import { useRouter } from 'next/navigation';

const initialValues: Medicines = {
  medicine_name: "",
  quantity: "",
  frequency: "",
  dosage_pattern: "",
  times_days: "",
  number_days: "",
  startdate: "",
}

const UpdateMedicine = () => {
  const [medicineData, setMedicineData] = useState<Medicines>();
  const [loading, setLoading] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [separateQuantity, setSeparateQuantity] = useState(false);
  const [dosageList, setDosageList] = useState<string[]>([""]);
  const [timeList, setTimeList] = useState<string[]>([""]);
  const { id } = useParams();
  const route = useRouter();

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

  const handleTimeChange = (index: number, val: string) => {
    const updated = [...timeList];
    updated[index] = val;
    setTimeList(updated);
    const combined = updated.filter((t) => t.trim() !== "").join(",");
    setFieldValue("times_days", combined);
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
    enableReinitialize: true,
    initialValues: medicineData ?? initialValues,
    onSubmit: (values) => {
      setButtonLoading(true);
      //   const result = getSchedule();
      axios.put(`/api/medicareDB/${id}`, { ...values, })
        .then(() => {
          toast.success("Your schedule generated")
        }).catch((error) => {
          console.log("Error:", error)
          toast.error("something went wrong")
        }).finally(() => {
          setButtonLoading(false);
        })
    }
  });

  const uniqueDoses = getUniqueDoses(values.dosage_pattern);

  useEffect(() => {
    setLoading(true);
    axios.get(`/api/medicareDB/${id}`)
      .then((response) => {
        const data = response.data.result;
        setMedicineData(data);
        if (data && typeof data.quantity === 'object' && data.quantity !== null) {
          setSeparateQuantity(true);
        }
        if (data && data.dosage_pattern) {
          const splitDoses = data.dosage_pattern.split(',').map((s: string) => s.trim()).filter(Boolean);
          setDosageList(splitDoses.length > 0 ? splitDoses : [""]);
        }
        if (data && data.times_days) {
          const splitTimes = data.times_days.split(',').map((s: string) => s.trim()).filter(Boolean);
          setTimeList(splitTimes.length > 0 ? splitTimes : [""]);
        }
        console.log(response.data.result, "data collected")
      }
      ).catch((error) => {
        console.log("Error:", error)
        toast.error("something went wrong")
      }).finally(() => {
        setLoading(false);
      })

  }, [id])

  if (loading === true) {
    return (<Loading />)
  }


  if (!medicineData) {
    return null
  }
  return (
    <>
      <div className='flex gap-2 px-4 mt-2'>
        <button onClick={() => { route.push("/Medicines") }} className='flex gap-2 bg-[#03e9f4] cursor-pointer items-center text-black font-semibold px-4 py-2 rounded transition duration-150 ease-in-out transform active:scale-95 shadow-lg'><FaArrowLeft></FaArrowLeft>Back</button>
      </div>
      <form onSubmit={handleSubmit} className='flex justify-center px-3 mt-6'>
        <div className='flex flex-col border border-white/10 rounded-2xl bg-white/5 backdrop-blur-md w-full sm:w-[90%] md:w-[70%] lg:w-[40%] xl:w-[28%]items-center rounded-2xl shadow-2xl px-4 sm:px-8 xl:px-12'>
          <label htmlFor="medicine_name" className='mt-3 font-bold'>Medicine Name:</label>
          <input className='w-full bg-black placeholder-[#03e9f4] rounded-md border-2 border-[#03e9f4] px-3 py-2' type='text' placeholder='Enter Medicine name' name='medicine_name' onBlur={handleBlur} value={values.medicine_name} onChange={handleChange} id='medicine_name' />
          {errors.medicine_name && touched.medicine_name && <p className='text-red-500'>{errors.medicine_name}</p>}

          <div className='flex items-center gap-2 mt-3'>
            <label htmlFor="frequency" className='mt-3 font-bold'>Frequency(Times Per Day)</label>
          </div>
          <input onChange={handleChange} onBlur={handleBlur} value={values.frequency} className='w-full bg-black placeholder-[#03e9f4]  rounded-md border-2 border-[#03e9f4] px-3 py-2' pattern='^[0-9]+$' type='number' min="0" max="9" id='frequency' name='frequency' placeholder='1' />
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

          <div className='flex items-center gap-2 mt-3 w-full'>
            <label className='font-bold'>Time of Dose:</label>
            <span className='text-xs text-gray-400'>({values.frequency ? `${values.frequency} time${parseInt(values.frequency) > 1 ? 's' : ''} per day` : 'set frequency first'})</span>
          </div>

          <div className="w-full space-y-2 mt-1">
            {Array.from({ length: Math.max(1, parseInt(values.frequency) || 1) }).map((_, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-mono min-w-[50px]">
                  Time {idx + 1}:
                </span>
                <input
                  type="time"
                  value={timeList[idx] ?? ""}
                  onChange={(e) => handleTimeChange(idx, e.target.value)}
                  onBlur={handleBlur}
                  className="flex-1 bg-black text-white rounded-md border-2 border-[#03e9f4] px-3 py-2 text-sm [color-scheme:dark]"
                />
                {timeList[idx] && (
                  <span className="text-xs text-[#03e9f4] font-mono min-w-[55px] text-right">
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
            ))}
          </div>
          {errors.times_days && touched.times_days && <p className='text-red-500 text-sm mt-1'>{errors.times_days}</p>}

          <label htmlFor="number_days" className='mt-3 font-bold'>Numbers of the Days:</label>
          <input onChange={handleChange} onBlur={handleBlur} value={values.number_days} className='w-full bg-black placeholder-[#03e9f4] rounded-md border-2 border-[#03e9f4] px-3 py-2' name='number_days' id='number_days' type='number' placeholder='15' />
          {errors.number_days && touched.number_days && <p className='text-red-500'>{errors.number_days}</p>}

          <label htmlFor="startdate" className='mt-3 font-bold'>Start Date:</label>
          <input onChange={handleChange} value={values.startdate} onBlur={handleBlur} className='w-full bg-black placeholder-[#03e9f4] rounded-md border-2 border-[#03e9f4] px-3 py-2' name='startdate' id='startdate' type='date' />
          {errors.startdate && touched.startdate && <p className='text-red-500'>{errors.startdate}</p>}

          <button
            type="submit"
            className="w-full flex cursor-pointer justify-center items-center gap-2 bg-[#03e9f4] text-black font-semibold px-4 py-2 my-6 rounded shadow-lg active:scale-95"
          >{buttonLoading && <div
            className="h-[23px] w-[23px] animate-spin rounded-full border-4 border-solid border-black border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]">
          </div>}
            Update Schedule</button>
        </div>
      </form>
    </>
  )
}

export default UpdateMedicine