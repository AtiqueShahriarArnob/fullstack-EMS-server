import Payslip from "../models/Payslip.js";
import Employee from "../models/Employee.js";

// Create Payslip
export const createPayslip = async (req, res) => {
    try {
        const {
            employeeId,
            month,
            year,
            basicSalary,
            allowances,
            deductions,
        } = req.body;

        if (!employeeId) {
            return res.status(400).json({ error: "Select Employee" });
        }

        const netSalary =
            Number(basicSalary) +
            Number(allowances || 0) -
            Number(deductions || 0);

        const payslip = await Payslip.create({
            employeeId,
            month: Number(month),
            year: Number(year),
            basicSalary: Number(basicSalary),
            allowances: Number(allowances || 0),
            deductions: Number(deductions || 0),
            netSalary,
        });

        res.status(201).json(payslip);
    } catch (error) {
        console.log("Create Payslip Error:", error);

        res.status(500).json({
            error: error.message,
        });
    }
};

// Get All Payslips
export const getPayslips = async (req, res) => {
    try {
        // ✅ JWT data comes from middleware
        const session = req.session;

        if (!session) {
            return res.status(401).json({
                error: "Unauthorized - no token",
            });
        }

        // IMPORTANT: support all possible token formats
        const userId = session.userId || session.id || session._id;
        const role = session.role;

        if (!userId) {
            return res.status(401).json({
                error: "Invalid token - userId missing",
            });
        }

        const isAdmin = role === "ADMIN";

        // ADMIN VIEW
        if (isAdmin) {
            const payslips = await Payslip.find()
                .populate("employeeId")
                .sort({ createdAt: -1 });

            const data = payslips.map((p) => {
                const obj = p.toObject();

                return {
                    ...obj,
                    id: obj._id.toString(),
                    employee: obj.employeeId,
                    employeeId: obj.employeeId?._id?.toString(),
                };
            });

            return res.json({ data });
        }

        // EMPLOYEE VIEW
        const employee = await Employee.findOne({ userId });

        if (!employee) {
            return res.status(404).json({
                error: "Employee not found",
            });
        }

        const payslips = await Payslip.find({
            employeeId: employee._id,
        }).sort({ createdAt: -1 });

        return res.json({
            data: payslips,
        });

    } catch (error) {
        console.error("Get Payslips Error:", error);

        return res.status(500).json({
            error: error.message,
        });
    }
};

// Get Single Payslip
export const getPayslipById = async (req, res) => {
    try {
        const payslip = await Payslip.findById(req.params.id)
            .populate("employeeId")
            .lean();

        if (!payslip) {
            return res.status(404).json({
                error: "Not found",
            });
        }

        const result = {
            ...payslip,
            id: payslip._id.toString(),
            employee: payslip.employeeId,
        };

        return res.json(result);
    } catch (error) {
        console.error("Get Payslip By Id Error:", error);

        return res.status(500).json({
            error: "Failed",
        });
    }
};

// Delete Payslip
export const deletePayslip = async (req, res) => {
    try {
        const payslip = await Payslip.findByIdAndDelete(req.params.id);

        if (!payslip) {
            return res.status(404).json({
                error: "Payslip not found",
            });
        }

        return res.json({
            success: true,
            message: "Payslip deleted successfully",
        });
    } catch (error) {
        console.error("Delete Payslip Error:", error);

        return res.status(500).json({
            error: "Failed to delete payslip",
        });
    }
};