const pool = require("../../config/database");

const DEFAULT_CUSTOMER_NAME = "WhatsApp Customer";


// --------------------------------------------------
// Update Customer Name (marks it confirmed)
// --------------------------------------------------

const updateCustomerName = async (
    customerId,
    name
) => {

    const result = await pool.query(
        `UPDATE customers
         SET name = $1,
             name_confirmed = TRUE,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING
            id,
            business_id,
            name,
            phone,
            email,
            name_confirmed`,
        [name, customerId]
    );

    return result.rows[0] || null;
};


// --------------------------------------------------
// Does this customer have a real (confirmed) name?
// --------------------------------------------------

const hasKnownName = (customer) =>
    Boolean(
        customer &&
        customer.name_confirmed &&
        customer.name &&
        customer.name !== DEFAULT_CUSTOMER_NAME
    );


// First name only, for friendly replies
const getFirstName = (customer) =>
    hasKnownName(customer)
        ? customer.name.split(" ")[0]
        : null;


module.exports = {
    DEFAULT_CUSTOMER_NAME,
    updateCustomerName,
    hasKnownName,
    getFirstName
};
