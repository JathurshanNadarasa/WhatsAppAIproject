'use client'
import { useEffect, useState } from 'react'
import {Customer} from '../types/customer'
import { getCustomer, getCustomers } from '@/services/customer.service'

export default function CustomerList(){
    const [customers,setCustomers] = useState<Customer[]>([])

    const [loading,setLoading] = useState(true)
    const [error, setError] =
        useState("");

    useEffect(()=>{
        const loadCustomers = async ()=>{
            try{
                const response = await getCustomers()
                setCustomers(
                    response.customers
                )

            }catch(error)
                {
                    console.error(error);
                    setError(
                        'Faild to load customers'
                    )
                    
            }finally{
                setLoading(false)
            }
        }
        loadCustomers()
    },[])

    if (loading){
        return(
            <div className='p-6'>Loading Customers</div>
        )
    }

    if(error){
        return(
            <div className='p-6 text-red-500'>{error}</div>
        )
    }

    return (
        <div className='space-y-4'>
            <div>
                <h2 className='text-2xl font-bold'>Customers</h2>
                <p className='text-gray-500'>
                    Manage Your Whatspp customers
                </p>
            </div>

            <div className='grid gap-4'>
                {customers.map((customer)=>(
                    <div key={customer.id} className='rounded-lg border bg-white p-5 shadow-sm'>
                        <h3 className='font-semibold'>
                            {customer.name||'Unknown Customer'}
                            </h3>    
                        <p className='text-sm text-gray-600'>
                            {customer.phone}</p>
                        {customer.email&&(
                            <p className='text-sm text-gray-500'>
                                {customer.email}
                            </p>
                        )}        

                    </div>
                ))}

            </div>
        </div>
    )

}