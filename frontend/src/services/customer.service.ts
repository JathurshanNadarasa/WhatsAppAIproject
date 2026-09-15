import api from './api'

import{
    Customer,
    CustomersResponse,
    CustomerResponse
} from '../types/customer'

export const getCustomers = async():Promise<CustomersResponse> =>{
    const response = await api.get<CustomersResponse>('/customers')
    return response.data
}

export const createCustomer = async (
    customer:{
        name?:string,
        phone:string,
        email?:string
    }

): Promise<CustomerResponse>=>{
    const response = await api.post<CustomerResponse>(
        '/customers'
    )
    return response.data
}

export const getCustomer = async (
    id:number

):Promise<CustomerResponse>=>{
    const response = await api.get<CustomerResponse>(`/customers/${id}`)
    return response.data
}