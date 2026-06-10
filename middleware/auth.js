import jwt from "jsonwebtoken";

/* =========================
   PROTECT (USER AUTH)
========================= */
export const protect = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                error: "Unauthorized - No Token Found",
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded || !decoded.userId) {
            return res.status(401).json({
                error: "Invalid token",
            });
        }

        // attach user data to request
        req.session = {
            userId: decoded.userId,
            role: decoded.role,
            email: decoded.email,
        };

        next();

    } catch (error) {
        console.error("JWT Error:", error);

        return res.status(401).json({
            error: "Invalid or expired token",
        });
    }
};

/* =========================
   PROTECT ADMIN ONLY
========================= */
export const protectAdmin = (req, res, next) => {
    try {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({
                error: "Unauthorized",
            });
        }

        if (req.session.role !== "ADMIN") {
            return res.status(403).json({
                error: "Admin access required",
            });
        }

        next();

    } catch (error) {
        console.error("Admin Middleware Error:", error);

        return res.status(500).json({
            error: "Authorization failed",
        });
    }
};