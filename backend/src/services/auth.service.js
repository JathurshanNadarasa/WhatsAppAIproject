const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const pool = require('../config/database')

const registerUser = async ({
    businessId,
    name,
    email,
    password,
    role = 'admin'
}) => {

    const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
    )

    if (existingUser.rows.length > 0) {
        throw new Error('User already exists')
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const result = await pool.query(
        `INSERT INTO users
        (business_id, name, email, password_hash, role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, business_id, name, email, role, created_at`,
        [businessId, name, email, passwordHash, role]
    )

    return result.rows[0]
}

const loginUser = async (email, password) => {

    const result = await pool.query(
        `SELECT
            id,
            business_id,
            name,
            email,
            password_hash,
            role
        FROM users
        WHERE email = $1`,
        [email]
    )

    if (result.rows.length === 0) {
        throw new Error('Invalid email or password')
    }

    const user = result.rows[0]

    const passwordMatch = await bcrypt.compare(
        password,
        user.password_hash
    )

    if (!passwordMatch) {
        throw new Error('Invalid email or password')
    }

    const token = jwt.sign(
        {
            userId: user.id,
            businessId: user.business_id,
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: '1d'
        }
    )

    return {
        user: {
            id: user.id,
            businessId: user.business_id,
            name: user.name,
            email: user.email,
            role: user.role
        },
        token
    }
}

module.exports = {
    registerUser,
    loginUser
}