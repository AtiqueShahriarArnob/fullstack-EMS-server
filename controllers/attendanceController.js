import Attendance from "../models/attendance.js";
import Employee from "../models/Employee.js";

// POST /api/attendance
export const clockInOut = async (req, res) => {
    try {
        // ✅ FIX: safer session check
        if (!req.session?.userId) {
            return res.status(401).json({ error: "Unauthorized user" });
        }

        // get employee
        const employee = await Employee.findOne({ userId: req.session.userId });

        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }

        if (employee.isDeleted) {
            return res.status(403).json({ error: "Account deactivated" });
        }

        // today range (IMPORTANT FIX for duplicate issue)
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const now = new Date();

        // ✅ FIX: prevent duplicate correctly
        const existing = await Attendance.findOne({
            employeeId: employee._id,
            date: { $gte: todayStart, $lte: todayEnd }
        });

        // =========================
        // CLOCK IN
        // =========================
        if (!existing) {
            const isLate = now.getHours() > 9;

            const attendance = await Attendance.create({
                employeeId: employee._id, // ✅ guaranteed NOT null
                date: now,
                checkIn: now,
                status: isLate ? "LATE" : "PRESENT"
            });

            return res.json({
                success: true,
                type: "CHECK_IN",
                data: attendance
            });
        }

        // =========================
        // CLOCK OUT
        // =========================
        if (!existing.checkOut) {
            const diff =
                (now.getTime() - new Date(existing.checkIn).getTime()) /
                (1000 * 60 * 60);

            existing.checkOut = now;
            existing.workingHours = Number(diff.toFixed(2));

            if (diff >= 8) existing.dayType = "Full Day";
            else if (diff >= 6) existing.dayType = "Three Quarter Day";
            else if (diff >= 4) existing.dayType = "Half Day";
            else existing.dayType = "Short Day";

            await existing.save();

            return res.json({
                success: true,
                type: "CHECK_OUT",
                data: existing
            });
        }

        return res.json({
            success: true,
            data: existing
        });

    } catch (error) {
        console.error("attendance error:", error);
        return res.status(500).json({ error: error.message });
    }
};

// =========================
// GET ATTENDANCE HISTORY
// =========================
export const getAttendance = async (req, res) => {
    try {
        if (!req.session?.userId) {
            return res.status(401).json({ error: "Unauthorized user" });
        }

        const employee = await Employee.findOne({ userId: req.session.userId });

        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }

        const limit = parseInt(req.query.limit || 30);

        const history = await Attendance.find({
            employeeId: employee._id
        })
            .sort({ date: -1 })
            .limit(limit);

        return res.json({
            data: history,
            employee: { isDeleted: employee.isDeleted }
        });

    } catch (error) {
        return res.status(500).json({ error: "Failed to fetch attendance" });
    }
};