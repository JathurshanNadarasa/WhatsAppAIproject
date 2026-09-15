const express = require('express')

const dotenv = require('dotenv')

const result = dotenv.config()

console.log('Dotenv result:', result.error || 'Loaded successfully')
console.log('WhatsApp token:', process.env.WHATSAPP_VERIFY_TOKEN)

const cors = require('cors')

const healthRoutes = require('./routes/health.routes')
const versionRoutes = require('./routes/version.routes')
const databaseRoutes = require('./routes/database.routes')
const authRoutes = require('./routes/auth.routes')
const customerRoutes = require('./routes/customer.routes')
const conversationRoutes = require("./routes/conversation.routes");
const whatsappRoutes = require("./routes/whatsapp.routes");

const notFound = require('./middleware/not-found.middleware')




const app = express()
app.use(cors({
    origin: 'http://localhost:3000'
}))
app.use(express.json())

app.use('/api/health',healthRoutes)
app.use('/api/version',versionRoutes)
app.use('/api/health/database',databaseRoutes)
app.use('/api/auth',authRoutes)
app.use('/api/customers',customerRoutes)
app.use("/api/conversations",conversationRoutes)
app.use("/api/whatsapp", whatsappRoutes);
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