"use client"
import Loading from '@/app/loading';
import { MedicineWithSchedule } from '@/Interfaces/interface';
import axios from 'axios';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Image from "next/image";

const MedicineTablePage = () => {
    const [medicineData, setMedicineData] = useState<MedicineWithSchedule>();
    const [loading, setLoading] = useState(false);
    const { id } = useParams()
    console.log(id)
    useEffect(() => {
        setLoading(true);
        axios.get(`/api/medicareDB/${id}`)
            .then((response) => {
                setMedicineData(response.data.result)
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

    return (
        <div>
            <div className='absolute top-12 right-4 flex gap-2'>
                <Link href="/Medicines" className='bg-[#03e9f4] text-black font-semibold px-4 mb-6 my-2 py-2 rounded transition duration-150 ease-in-out transform active:scale-75 active:shadow-inner shadow-lg'>Back</Link>
                <Link href="/Home" className='bg-[#03e9f4] text-black font-semibold px-4 mb-6 my-2 py-2 rounded transition duration-150 ease-in-out transform active:scale-75 active:shadow-inner shadow-lg'>Home</Link>
            </div>
            <div className="box box-2">
                {!medicineData ? (
                   <div className="flex items-center justify-center gap-1 h-screen">
                               <Image
                                 src="/not_found.png"
                                 height={62}
                                 width={162}
                                 alt="logo"
                               />
                               <h1 className="font-mono text-5xl">No medicines found</h1>
                             </div>
                ) : (
                    <>
                        <p className='font-mono ml-5 text-4xl font-bold my-2'>Your Medicine Schedule</p>
                        <div className="info-box">
                            <div className="info-item">
                                <span className="label">Name:</span>
                                <span className="value">{medicineData.medicine_name}</span>
                            </div>
                            <div className="info-item">
                                <span className="label">Quantity:</span>
                                <span className="value">{medicineData.quantity}</span>
                            </div>
                            <div className="info-item">
                                <span className="label">No. of Days of Your Schedule:</span>
                                <span className="value">{medicineData.number_days} </span>
                            </div>
                            <div className="info-item">
                                <span className="label">Current No. of Days of Your Schedule:</span>
                                <span className="value">{medicineData.schedule.length} </span>
                            </div>
                        </div>

                        <div className="table-container">
                            <table className="table-ocean">
                                <thead>
                                    <tr>
                                        <th className='text-center'>Date</th>
                                        <th className='text-center'>no of Days</th>
                                        <th className='text-center'>Time</th>
                                        <th className='text-center'>Dose</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {medicineData.schedule && medicineData.schedule.map((item, id: number) => (
                                        <tr key={id}>
                                            <td className='text-center '>{item.date}</td>
                                            <td className='text-center '>{item.day}</td>
                                            <td className='text-center no-padding'>
                                                {
                                                    item.doses.map((tim, idx: number) => (
                                                        <div key={idx} style={{
                                                            border: item.doses.length > 1 ? "1px solid #800080" : "none",
                                                            width: "100%",
                                                            display: "block",
                                                            padding: "0.5rem 1.5rem"
                                                        }} >{tim.time}</div>
                                                    ))
                                                }
                                            </td>
                                            <td className='text-center no-padding'>
                                                {
                                                    item.doses.map((dos, idy: number) => (
                                                        <div key={idy} style={{
                                                            border: item.doses.length > 1 ? '1px solid #800080' : "none",
                                                            width: "100%",
                                                            display: "block",
                                                            padding: "0.5rem 1.5rem"
                                                        }}>{dos.dosage}</div>
                                                    ))
                                                }
                                            </td>
                                        </tr>
                                    ))
                                    }
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default MedicineTablePage