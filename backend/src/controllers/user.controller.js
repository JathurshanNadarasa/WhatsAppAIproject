const service = require("../services/user.service");


const wrap = (message, fn) => async (req, res) => {
    try {
        return await fn(req, res);
    } catch (error) {
        console.error(`${message}:`, error.message);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : message
        });
    }
};


module.exports = {

    // GET /api/users            active team (everyone: for "Assign to")
    // GET /api/users?all=true   incl. deactivated (admin)
    list: wrap("Failed to load team", async (req, res) => {
        const includeInactive = req.query.all === "true" && req.user.role === "admin";
        const users = await service.listUsers(req.user.businessId, { includeInactive });
        return res.json({ success: true, users });
    }),

    // POST /api/users   { name, email, password, role }   (admin)
    create: wrap("Failed to add team member", async (req, res) => {
        const user = await service.addUser(req.user.businessId, req.body || {});
        return res.status(201).json({ success: true, user });
    }),

    // PATCH /api/users/:id   { name?, role?, is_active?, password? }   (admin)
    update: wrap("Failed to update team member", async (req, res) => {
        const user = await service.updateUser(
            req.user.businessId,
            Number(req.params.id),
            req.body || {},
            req.user.userId
        );
        return user
            ? res.json({ success: true, user })
            : res.status(404).json({ success: false, message: "Team member not found" });
    })
};
