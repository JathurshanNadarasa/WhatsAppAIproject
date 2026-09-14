const express = require('express')

const app = express()

app.use(express.json())

app.get('/api/health',(req,res)=>{
    res.json({
        success:true,
        message:'Nexora WhatsApp AI API is running'
    })
})

const PORT = 5000

app.listen(PORT,()=>{
    console.log(`Server running on the http://localhost:${PORT}`)
})