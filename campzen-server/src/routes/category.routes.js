const express = require('express');
const {
    getCategories,
    getCategoryByIdOrSlug,
    createCategory,
    updateCategory,
    deleteCategory,
    seedCategories
} = require('../controllers/category.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Public routes for category browsing
router.get('/', getCategories);
router.get('/:idOrSlug', getCategoryByIdOrSlug);

// Admin-only management routes
router.post('/', protect, authorize('admin'), createCategory);
router.put('/:id', protect, authorize('admin'), updateCategory);
router.delete('/:id', protect, authorize('admin'), deleteCategory);
router.post('/seed', protect, authorize('admin'), seedCategories);

module.exports = router;
