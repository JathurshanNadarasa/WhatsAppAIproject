const jwt = require('jsonwebtoken')

const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: 'Authorization token required'
            })
        }

        const [type, token] = authHeader.split(' ')

        if (type !== 'Bearer' || !token) {
            return res.status(401).json({
                success: false,
                message: 'Invalid authorization format'
            })
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        )

        req.user = decoded

        next()

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or Expired Token'
        })
    }
}

module.exports = authenticate