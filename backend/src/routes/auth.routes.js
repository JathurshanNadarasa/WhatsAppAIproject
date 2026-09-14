const express = require('express')

const{
    register,
    login,
    getMe
} = require('../controllers/auth.controller')

const authenticate = require("../middleware/auth.middleware");

const router = express.Router()

router.post('/register',register)
router.post('/login',login)
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Auth route is working'
    })
})
router.get("/me", authenticate, getMe);

module.exports = router