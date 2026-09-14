const pool = require('../config/database')

const getCustomers = async (businessId) => {
    const result = await pool.query(
        `SELECT
            id,
            name,
            phone,
            email,
            created_at
        FROM customers
        WHERE business_id = $1
        ORDER BY created_at DESC`,
        [businessId]
    )

    return result.rows
}

const createCustomer = async ({
    businessId,
    name,
    phone,
    email
}) => {
    const result = await pool.query(
        `INSERT INTO customers
            (business_id, name, phone, email)
        VALUES ($1, $2, $3, $4)
        RETURNING
            id,
            business_id,
            name,
            phone,
            email,
            created_at`,
        [
            businessId,
            name,
            phone,
            email || null
        ]
    )

    return result.rows[0]
}

const getCustomerById = async (customerId, businessId) => {
    const result = await pool.query(
        `SELECT
            id,
            business_id,
            name,
            phone,
            email,
            created_at
        FROM customers
        WHERE id = $1
        AND business_id = $2`,
        [customerId, businessId]
    )

    return result.rows[0]
}

module.exports = {
    getCustomers,
    createCustomer,
    getCustomerById
}