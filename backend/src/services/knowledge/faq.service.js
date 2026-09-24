const pool = require("./../../config/database");


const getFAQs = async (
    businessId
) => {

    const result = await pool.query(
        `SELECT
            id,
            business_id,
            question,
            answer,
            category
         FROM faqs
         WHERE business_id = $1
         AND status = 'active'
         ORDER BY id ASC`,
        [
            businessId
        ]
    );

    return result.rows;
};


module.exports = {
    getFAQs
};