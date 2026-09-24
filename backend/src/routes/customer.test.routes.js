const express = require("express");

const {
    testCustomerNameUpdate
} = require(
    "../controllers/customer.test.controller"
);

const router =
    express.Router();


router.post(
    "/test-customer-name-update",
    testCustomerNameUpdate
);


module.exports = router;