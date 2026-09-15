export interface Customer{
    id:number,
    business_id?:number,
    name:string|null,
    phone:string,
    email:string | null,
    created_at:string
}

export interface CustomersResponse {
    success: boolean;
    count: number;
    customers: Customer[];
}

export interface CustomerResponse{
    success:boolean,
    customer:Customer

}