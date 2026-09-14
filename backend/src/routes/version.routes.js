const express = require('express')

const {getVersion} = require('../controllers/version.controller')

const router = express.Router()

router.get('/',getVersion)

module.exports = router