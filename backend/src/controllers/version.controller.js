
const getVersion = (req,res) =>{
    res.status(200).json({
        success:true,
        application:'Nexora WhatsApp AI',
        version:'1.0.0'
    })
}

module.exports = {
    getVersion
}