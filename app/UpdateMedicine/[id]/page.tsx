"use client"
import { MedicineSchema } from '@/Schemas/yupSChemas';
import { useFormik } from 'formik';
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast';
import { FaArrowLeft, FaQuestionCircle } from 'react-icons/fa';
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
  const { id } = useParams();
  const route = useRouter();

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
            <FaQuestionCircle data-tooltip-id="my-tooltip-3"></FaQuestionCircle>
            <ReactTooltip
              id='my-tooltip-3'
              place='top'
              className="max-w-xs whitespace-pre-line"
            >
              <div>
                <strong>Instructions:</strong>
                <p>Enter how many times you need to take the medicine each day.</p>
              </div>
            </ReactTooltip>
          </div>
          <input onChange={handleChange} onBlur={handleBlur} value={values.frequency} className='w-full bg-black placeholder-[#03e9f4]  rounded-md border-2 border-[#03e9f4] px-3 py-2' pattern='^[0-9]+$' type='number' min="0" max="9" id='frequency' name='frequency' placeholder='1' />
          {errors.frequency && touched.frequency && <p className='text-red-500'>{errors.frequency}</p>}

          <div className='flex items-center gap-2 mt-3'>
            <label htmlFor="dosage_pattern" className='mt-3 font-bold'>Dorage Pattern(e.g.2,3,3):</label>
            <FaQuestionCircle data-tooltip-id="my-tooltip-2"></FaQuestionCircle>
            <ReactTooltip
              id="my-tooltip-2"
              place="top"
              className="max-w-xs whitespace-pre-line"
            >
              <div>
                <strong>Instructions:</strong>
                <ol className="list-decimal list-inside">
                  <li>
                    If you want to enter the same medicine dose daily like 2mg,
                    enter your dosage pattern like: <code>2</code>
                  </li>
                  <li>
                    If you have different doses like Monday 2mg, Tuesday 3mg, Wednesday 2mg,
                    enter pattern like: <code>2,3,2</code>
                  </li>
                </ol>
              </div>
            </ReactTooltip>
          </div>
          <input onChange={handleChange} onBlur={handleBlur} value={values.dosage_pattern} className='w-full bg-black placeholder-[#03e9f4] rounded-md border-2 border-[#03e9f4] px-3 py-2' name='dosage_pattern' id='dosage_pattern' type='text' placeholder='2,3,3' />
          {errors.dosage_pattern && touched.dosage_pattern && <p className='text-red-500'>{errors.dosage_pattern}</p>}

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
            <FaQuestionCircle data-tooltip-id="my-tooltip-1"></FaQuestionCircle>
            <ReactTooltip
              id="my-tooltip-1"
              place="top"
              className="max-w-xs whitespace-pre-line"
            >
              <div>
                <strong>Instructions:</strong>
                <ol className="list-decimal list-inside">
                  <li>
                    If you want to enter specific time then enter like Ex. <code>10:00PM</code>
                  </li>
                  <li>
                    If you want to enter part of day then enter like Evening
                  </li>
                  <li>
                    If you want to enter any time or part of day more then one
                    Like you have to take a medicine two times in a day then you have to enter your time details like Ex. 10:00AM,08:00PM
                    Or morning, evening
                  </li>
                </ol>
              </div>

            </ReactTooltip>
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