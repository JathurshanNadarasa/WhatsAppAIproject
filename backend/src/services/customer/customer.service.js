const pool = require("../../config/database");


// --------------------------------------------------
// Update Customer Name
// --------------------------------------------------

const updateCustomerName = async (
    customerId,
    name
) => {

    const result =
        await pool.query(
            `UPDATE customers
             SET name = $1
             WHERE id = $2
             RETURNING
                id,
                business_id,
                name,
                phone,
                email`,
            [
                name,
                customerId
            ]
        );


    return result.rows[0] || null;
};


module.exports = {
    updateCustomerName
};