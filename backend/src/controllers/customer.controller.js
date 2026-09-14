const {
    getCustomers,
    createCustomer,
    getCustomerById
} = require("../services/customer.service");

const getAllCustomers = async (req, res) => {
    try {
        const businessId = req.user.businessId;

        const customers = await getCustomers(businessId);

        res.status(200).json({
            success: true,
            count: customers.length,
            customers
        });
    } catch (error) {
        console.error("Get customers error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to get customers"
        });
    }
};

const addCustomer = async (req, res) => {
    try {
        const businessId = req.user.businessId;

        const {
            name,
            phone,
            email
        } = req.body;

        if (!phone) {
            return res.status(400).json({
                success: false,
                message: "Phone number is required"
            });
        }

        const customer = await createCustomer({
            businessId,
            name,
            phone,
            email
        });

        res.status(201).json({
            success: true,
            message: "Customer created successfully",
            customer
        });
    } catch (error) {
        console.error("Create customer error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to create customer"
        });
    }
};

const getCustomer = async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const customerId = req.params.id;

        const customer = await getCustomerById(
            customerId,
            businessId
        );

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        res.status(200).json({
            success: true,
            customer
        });
    } catch (error) {
        console.error("Get customer error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to get customer"
        });
    }
};

module.exports = {
    getAllCustomers,
    addCustomer,
    getCustomer
};