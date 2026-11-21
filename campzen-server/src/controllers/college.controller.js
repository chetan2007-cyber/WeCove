const College = require('../models/college.model');

// @desc    Get all active colleges
// @route   GET /api/colleges
// @access  Public
const getColleges = async (req, res, next) => {
    try {
        // Only return colleges where isActive is true
        const colleges = await College.find({ isActive: true });
        res.status(200).json({ success: true, count: colleges.length, data: colleges });
    } catch (error) {
        next(error);
    }
};

// @desc    Add a new college
// @route   POST /api/colleges
// @access  Private/Admin
const createCollege = async (req, res, next) => {
    try {
        const college = await College.create(req.body);
        res.status(201).json({ success: true, data: college });
    } catch (error) {
        next(error);
    }
};

module.exports = { getColleges, createCollege };