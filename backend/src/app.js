const express = require('express')
require('dotenv').config()
const healthRoutes = require('./routes/health.routes')
const versionRoutes = require('./routes/version.routes')
const databaseRoutes = require('./routes/database.routes')
const notFound = require('./middleware/not-found.middleware')


const app = express()

app.use(express.json())

app.use('/api/health',healthRoutes)
app.use('/api/version',versionRoutes)
app.use('/api/health/database',databaseRoutes)
app.use(notFound)
// app.get('/api/health',(req,res)=>{
//     res.json({
//         success:true,
//         message:'Nexora WhatsApp AI API is running'
//     })
// })

const PORT = 5000

app.listen(PORT,()=>{
    console.log(`Server running on the http://localhost:${PORT}`)
})