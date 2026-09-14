const express = require("express");

const {
    getAllCustomers,
    addCustomer,
    getCustomer
} = require("../controllers/customer.controller");

const authenticate = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", authenticate, getAllCustomers);

router.post("/", authenticate, addCustomer);

router.get("/:id", authenticate, getCustomer);

module.exports = router;