const express = require('express')

const{
    getDatabaseHealth
} = require('../controllers/database.controller')

const router = express.Router()

router.get('/',getDatabaseHealth)

module.exports = router