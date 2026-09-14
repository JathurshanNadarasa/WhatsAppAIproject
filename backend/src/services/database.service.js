const pool = require('../config/database')

const checkDatabaseConnection = async ()=>{
    const result = await pool.query("SELECT NOW()")
    return result.rows[0]
}


module.exports = {
    checkDatabaseConnection
}
