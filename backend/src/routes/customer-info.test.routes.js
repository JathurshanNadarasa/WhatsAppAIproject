const express = require("express");


const {
    testCustomerInfoExtraction
} = require(
    "../controllers/customer-info.test.controller"
);


const router =
    express.Router();


router.post(
    "/test-customer-info",
    testCustomerInfoExtraction
);


module.exports = router;