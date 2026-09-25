const pool = require("../../config/database");


const getCourseByName = async (
    businessId,
    courseName
) => {

    const result = await pool.query(
        `SELECT
            id,
            business_id,
            name,
            description,
            duration,
            fee,
            schedule,
            requirements
         FROM courses
         WHERE business_id = $1
         AND LOWER(name) = LOWER($2)
         AND status = 'active'
         LIMIT 1`,
        [
            businessId,
            courseName
        ]
    );

    return result.rows[0] || null;
};


const getCourses = async (
    businessId
) => {

    const result = await pool.query(
        `SELECT
            id,
            business_id,
            name,
            description,
            duration,
            fee,
            schedule,
            requirements
         FROM courses
         WHERE business_id = $1
         AND status = 'active'
         ORDER BY name ASC`,
        [
            businessId
        ]
    );

    return result.rows;
};


const getCourseById = async (
    businessId,
    courseId
) => {

    const result = await pool.query(
        `SELECT
            id,
            business_id,
            name,
            description,
            duration,
            fee,
            schedule,
            requirements
         FROM courses
         WHERE business_id = $1
         AND id = $2
         AND status = 'active'
         LIMIT 1`,
        [
            businessId,
            courseId
        ]
    );

    return result.rows[0] || null;
};


module.exports = {
    getCourseByName,
    getCourses,
    getCourseById
};