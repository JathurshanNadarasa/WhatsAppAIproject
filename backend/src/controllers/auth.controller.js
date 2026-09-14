const{
    registerUser,
    loginUser,
} = require('../services/auth.service')

const register = async(req,res) =>{
    try{
        const{
            businessId,
            name,
            email,
            password,

        } = req.body
        if(!businessId || !name || !email || !password){
            return res.status(400).json({
                success:false,
                message:'All fields are required'
            })
        }
        const user = await registerUser({
            businessId,
            name,
            email,
            password
        })
        res.status(200).json({
            success:true,
            message:'User registerd successfully',
            user

        })
    }catch(error){
        console.error('Registration error:',error.message)
        res.status(400).json({
            success:false,
            message:error.message
        })
    }
} 

const login = async (req, res) => {
    try {
        const {
            email,
            password
        } = req.body

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            })
        }

        const result = await loginUser(email, password)

        res.status(200).json({
            success: true,
            message: 'Login successful',
            ...result
        })

    } catch (error) {
        console.error('Login error:', error.message)

        res.status(401).json({
            success: false,
            message: error.message
        })
    }
}
const getMe = async (req, res) => {
    res.status(200).json({
        success: true,
        user: req.user
    });
};

module.exports ={
    register,
    login,
    getMe
}