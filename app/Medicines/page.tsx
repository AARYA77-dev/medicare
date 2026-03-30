"use client"
import Header from '@/components/header'
import { MedicineSchema } from '@/Schemas/yupSChemas';
import { useFormik } from 'formik';
import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast';
import { FaEllipsisV, FaInfoCircle } from 'react-icons/fa';
import { Tooltip as ReactTooltip } from "react-tooltip";
import { ScheduleEntry, Medicines, Dose } from '../../Interfaces/interface';
import axios from 'axios';
import Loading from '../loading';

const initialValues: Medicines = {
  medicine_name: "",
  quantity: "",
  frequency: "",
  dosage_pattern: "",
  times_days: "",
  number_days: "",
  startdate: "",
}

const MedicinePage = () => {
  const [medicineData, setMedicineData] = useState<Medicines[]>([]);
  const [loading, setLoading] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  const { errors, values, handleBlur, touched, handleChange, handleSubmit } = useFormik<Medicines>({
    validationSchema: MedicineSchema,
    initialValues,
    onSubmit: (values, { resetForm }) => {
      setButtonLoading(true);
      const result = getSchedule();
      axios.post('api/medicareDB', { ...values, schedule: result })
        .then(() => {
          toast.success("Your schedule generated")
          resetForm()
        }).catch((error) => {
          console.log("Error:", error)
          toast.error("something went wrong")
        }).finally(() => {
          setButtonLoading(false);
        })
    }
  })

  const getSchedule = () => {
    const { frequency, dosage_pattern, times_days, number_days, startdate, } = values;

    const dosagePattern = dosage_pattern.split(",").map(p => parseFloat(p.trim()));
    const timesOfDays = times_days.split(",").map(p => p.trim());
    const freq = parseInt(frequency);
    const noOFDays = parseInt(number_days);
    const startDate = new Date(startdate);
    if (timesOfDays.length !== freq) {
      toast.error("frequancy and times of days are not making reasonable logic")
    }

    const result: ScheduleEntry[] = [];

    for (let i = 0; i < noOFDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      let doses: Dose[] = []
      if (freq == 1) {
        const index = i % dosagePattern.length
        doses.push({
          time: timesOfDays[0],
          dosage: dosagePattern[index] + "mg"
        })
      } else {
        doses = timesOfDays.map((time, j) => ({
          time: time,
          dosage: dosagePattern[j % dosagePattern.length] + "mg"
        }))
      }
      result.push({
        day: i + 1,
        date: currentDate.toLocaleDateString(),
        doses
      })
    }
    return result
  }
  useEffect(() => {
    setLoading(true);
    axios.get("/api/medicareDB")
      .then((response) => {
        setMedicineData(response.data.result);
      })
      .catch((error) => {
        console.log("ERROR", error);
        toast.error("something went wrong");
      }).finally(() => {
        setLoading(false);
      })
  }, [])

  if (loading === true) {
    return (<Loading />)
  }

  const MedicineMenu = ({ id }: { id: string }) => {
    const [editOpen, setEditOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          setEditOpen(false)
        }
      }
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    return (
      <div ref={menuRef} className="absolute right-2">
        <button
          type="button"
          onClick={() => setEditOpen((prev) => !prev)}
          className="cursor-pointer"
        >
          <FaEllipsisV />
        </button>

        <div
          className={`absolute right-0 mt-2 bg-black text-white border-2 border-[#03e9f4] rounded-lg shadow-md z-50 px-4 py-2 transform transition-all duration-300 origin-top-right
        ${editOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-90 invisible"}`}
        >
          <Link
            href={`/UpdateMedicine/${id}`}
            className="block hover:underline"
          >
            Edit
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <Header></Header>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col lg:flex-row gap-6 px-3 sm:px-6">
          <div className="flex flex-col border border-white/10 rounded-2xl bg-white/5 backdrop-blur-md  w-full lg:w-[45%] xl:w-[28%] mx-auto items-center rounded-2xl shadow-2xl px-4 sm:px-8 xl:px-12">
            <label htmlFor="medicine_name" className='mt-3 font-bold'>Medicine Name:</label>
            <input className='w-full bg-black placeholder-[#03e9f4] rounded-md border-2 border-[#03e9f4] px-3 py-2' type='text' placeholder='Enter Medicine name' name='medicine_name' onBlur={handleBlur} value={values.medicine_name} onChange={handleChange} id='medicine_name' />
            {errors.medicine_name && touched.medicine_name && <p className='text-red-500'>{errors.medicine_name}</p>}

            <label htmlFor="quantity" className='mt-3 font-bold'>Quantity:</label>
            <input onChange={handleChange} value={values.quantity} onBlur={handleBlur} className='w-full bg-black placeholder-[#03e9f4] rounded-md border-2 border-[#03e9f4] px-3 py-2' type='number' id='quantity' min="0" max="99" maxLength={2} placeholder='30' name='quantity' />
            {errors.quantity && touched.quantity && <p className='text-red-500'>{errors.quantity}</p>}

            <div className='flex items-center gap-2 mt-3'>
              <label htmlFor="frequency" className='mt-3 font-bold'>Frequency(Times Per Day)</label>
              <FaInfoCircle data-tooltip-id="my-tooltip-3"></FaInfoCircle>
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
            <input onChange={handleChange} onBlur={handleBlur} value={values.frequency} className='w-full bg-black placeholder-[#03e9f4] rounded-md border-2 border-[#03e9f4] px-3 py-2' pattern='^[0-9]+$' type='number' min="0" max="9" id='frequency' name='frequency' placeholder='1' />
            {errors.frequency && touched.frequency && <p className='text-red-500'>{errors.frequency}</p>}

            <div className='flex items-center gap-2 mt-3'>
              <label htmlFor="dosage_pattern" className='mt-3 font-bold'>Dorage Pattern(e.g.2,3,3):</label>
              <FaInfoCircle data-tooltip-id="my-tooltip-2"></FaInfoCircle>
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

            <div className='flex items-center gap-2 mt-3'>
              <label htmlFor="times_days" className='mt-3 font-bold'>Time(e.g.,Evening,Morning,10:00AM):</label>
              <FaInfoCircle data-tooltip-id="my-tooltip-1"></FaInfoCircle>
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
              Generate Schedule</button>
          </div>

          <div className="flex flex-col w-full h-[fit-content] lg:w-[35%] xl:w-[20%] mx-auto border border-white/10 rounded-2xl bg-white/5 backdrop-blur-md items-center rounded-2xl">
            <div className='border border-white/10 rounded-2xl bg-white/5 backdrop-blur-md py-2 mb-2 text-center rounded-2xl xl:px-12 w-full font-bold'>
              <h1>Your Medicines</h1>
            </div>
            {
              loading === false && medicineData.length === 0 ? <h1 className='grid place-items-center my-3 font-mono'>No medicines found</h1> : (medicineData.map((item) => (
                <div
                  key={item._id}
                  className="mt-2 w-full"
                >
                  <div className="flex flex-col items-center justify-between gap-2 relative">
                    <p className="font-bold text-center flex-1">
                      {item.medicine_name}
                    </p>
                    <MedicineMenu id={item._id!} />
                  </div>

                  {/* Schedule button */}
                  <Link
                    className="w-[80%] m-[auto] flex cursor-pointer justify-center items-center gap-2 bg-[#03e9f4] text-black font-semibold px-4 py-2 my-6 rounded shadow-lg active:scale-95"
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
  )
}

export default MedicinePage