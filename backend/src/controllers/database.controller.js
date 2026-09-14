const {
    checkDatabaseConnection
} = require('../services/database.service')

const getDatabaseHealth = async(req,res) =>{
    try{
        const result = await checkDatabaseConnection()

        res.status(200).json({
            success:true,
            database:'connected',
            time:result.now
        })
    }catch(error){
    console.error('Database connection error:',error.message);

    res.status(200).json({
        success:false,
        database:'disconnected'
    })
    
    }   
} 

module.exports = {
        getDatabaseHealth
    }