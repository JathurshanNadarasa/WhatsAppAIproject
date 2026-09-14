const getHealth = (req,res) =>{
    res.status(200).json({
        success:true,
        message:'Nexora WhatsApp AI API is runnings'
    })
}

module.exports ={
    getHealth
}