const {
    updateCustomerName
} = require("../services/customer/customer.service");


// --------------------------------------------------
// Test Customer Name Update
// --------------------------------------------------

const testCustomerNameUpdate = async (
    req,
    res
) => {

    try {

        const {
            customerId,
            name
        } = req.body;


        const customer =
            await updateCustomerName(
                customerId,
                name
            );


        return res.json({

            success: true,

            data: customer

        });

    } catch (error) {

        console.error(
            "Customer Name Update Error:",
            error.message
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to update customer name"

        });
    }
};


module.exports = {
    testCustomerNameUpdate
};