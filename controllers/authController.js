import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

/* ---------------- LOGIN ---------------- */
export const login = async (req, res) => {
    try {
        const { email, password, role_type } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: "email and password are required"
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                error: "Invalid credentials"
            });
        }

        if (role_type === "admin" && user.role !== "ADMIN") {
            return res.status(401).json({ error: "not authorized as admin" });
        }

        if (role_type === "employee" && user.role !== "EMPLOYEE") {
            return res.status(401).json({ error: "not authorized as employee" });
        }

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            return res.status(401).json({ error: "invalid credentials" });
        }

        const payload = {
            userId: user._id.toString(),
            role: user.role,
            email: user.email,
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: "7d"
        });

        return res.json({ user: payload, token });

    } catch (error) {
        console.error("login error:", error);
        return res.status(500).json({ error: "Login failed" });
    }
};

/* ---------------- SESSION ---------------- */
export const session = (req, res) => {
    return res.json({ user: req.session });
};

/* ---------------- CHANGE PASSWORD ---------------- */
export const changePassword = async (req, res) => {
    try {
        const session = req.session;
        console.log("SESSION:", req.session);
        console.log("BODY:", req.body);

        console.log("SESSION DEBUG:", session);

        if (!session || !session.userId) {
            return res.status(401).json({ error: "Unauthorized - no session" });
        }

        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: "Both passwords required" });
        }

        const user = await User.findById(session.userId);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const isValid = await bcrypt.compare(currentPassword, user.password);

        if (!isValid) {
            return res.status(400).json({ error: "Current password wrong" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedPassword;
        await user.save();

        return res.json({
            success: true,
            message: "Password changed successfully"
        });

    } catch (error) {
        console.error("CHANGE PASSWORD ERROR:", error);

        return res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
};