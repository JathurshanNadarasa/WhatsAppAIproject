const {Pool} = require('pg')
const dotenv = require('dotenv')

dotenv.config()
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL)
const pool = new Pool({
    connectionString:process.env.DATABASE_URL
})

pool.connect()
    .then(client => {
        console.log('✅ PostgreSQL connected successfully')
        client.release()
    })
    .catch(error => {
        console.error('❌ PostgreSQL connection failed:')
        console.error(error.message)
    })

module.exports = pool