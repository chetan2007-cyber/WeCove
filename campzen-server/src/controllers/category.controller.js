const Category = require('../models/category.model');
const { ensureDefaultCategories, INITIAL_CATEGORY_TREE, seedCategoriesRecursive } = require('../utils/defaultCategories.util');
const mongoose = require('mongoose');

// Helper to construct nested category tree
const buildCategoryTree = (categories, parentId = null) => {
    return categories
        .filter(cat => {
            if (parentId === null) {
                return !cat.parentId;
            }
            return cat.parentId && cat.parentId.toString() === parentId.toString();
        })
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0) || a.name.localeCompare(b.name))
        .map(cat => ({
            _id: cat._id,
            name: cat.name,
            slug: cat.slug,
            description: cat.description,
            parentId: cat.parentId,
            level: cat.level,
            applicableListingTypes: cat.applicableListingTypes,
            icon: cat.icon,
            isActive: cat.isActive,
            displayOrder: cat.displayOrder,
            subcategories: buildCategoryTree(categories, cat._id)
        }));
};

// @desc    Get all categories (flat or tree hierarchy)
// @route   GET /api/categories
// @access  Public
const getCategories = async (req, res, next) => {
    try {
        const { tree, listingType, parentId, level, includeDisabled, search } = req.query;

        const query = {};

        if (includeDisabled !== 'true') {
            query.isActive = true;
        }

        if (listingType) {
            query.applicableListingTypes = listingType;
        }

        if (level !== undefined && level !== '') {
            query.level = Number(level);
        }

        if (parentId !== undefined && parentId !== '') {
            if (parentId === 'null' || parentId === 'root') {
                query.parentId = null;
            } else if (mongoose.Types.ObjectId.isValid(parentId)) {
                query.parentId = parentId;
            }
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { slug: { $regex: search, $options: 'i' } }
            ];
        }

        // If tree is requested, fetch all matching (plus their parents if needed)
        if (tree === 'true') {
            const allActive = await Category.find(includeDisabled === 'true' ? {} : { isActive: true })
                .sort({ level: 1, displayOrder: 1, name: 1 })
                .lean();

            let filtered = allActive;
            if (listingType) {
                // Keep categories that support the listing type or have children that do
                const matchingIds = new Set();
                allActive.forEach(c => {
                    if (c.applicableListingTypes && c.applicableListingTypes.includes(listingType)) {
                        matchingIds.add(c._id.toString());
                        // Mark ancestors
                        let curr = c;
                        while (curr && curr.parentId) {
                            matchingIds.add(curr.parentId.toString());
                            curr = allActive.find(p => p._id.toString() === curr.parentId.toString());
                        }
                    }
                });
                filtered = allActive.filter(c => matchingIds.has(c._id.toString()));
            }

            const treeData = buildCategoryTree(filtered, null);
            return res.status(200).json({
                success: true,
                count: treeData.length,
                data: treeData
            });
        }

        const categories = await Category.find(query)
            .sort({ level: 1, displayOrder: 1, name: 1 })
            .populate('parentId', 'name slug');

        res.status(200).json({
            success: true,
            count: categories.length,
            data: categories
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single category by ID or slug
// @route   GET /api/categories/:idOrSlug
// @access  Public
const getCategoryByIdOrSlug = async (req, res, next) => {
    try {
        const { idOrSlug } = req.params;

        let category;
        if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
            category = await Category.findById(idOrSlug)
                .populate('parentId', 'name slug applicableListingTypes')
                .populate('subcategories');
        } else {
            category = await Category.findOne({ slug: idOrSlug.toLowerCase() })
                .populate('parentId', 'name slug applicableListingTypes')
                .populate('subcategories');
        }

        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        res.status(200).json({
            success: true,
            data: category
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create new category
// @route   POST /api/categories
// @access  Private (Admin)
const createCategory = async (req, res, next) => {
    try {
        const { name, slug, description, parentId, applicableListingTypes, icon, displayOrder } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }

        const generatedSlug = (slug || name)
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');

        const existing = await Category.findOne({ slug: generatedSlug });
        if (existing) {
            return res.status(400).json({ success: false, message: `Category with slug '${generatedSlug}' already exists` });
        }

        let level = 0;
        let validParentId = null;

        if (parentId) {
            if (!mongoose.Types.ObjectId.isValid(parentId)) {
                return res.status(400).json({ success: false, message: 'Invalid parentId format' });
            }
            const parent = await Category.findById(parentId);
            if (!parent) {
                return res.status(404).json({ success: false, message: 'Parent category not found' });
            }
            level = (parent.level || 0) + 1;
            validParentId = parent._id;
        }

        const category = await Category.create({
            name: name.trim(),
            slug: generatedSlug,
            description,
            parentId: validParentId,
            level,
            applicableListingTypes: applicableListingTypes && applicableListingTypes.length > 0
                ? applicableListingTypes
                : ['VENDOR_PRODUCT', 'STUDENT_RESALE', 'PRINTABLE_RESOURCE'],
            icon,
            displayOrder: displayOrder !== undefined ? displayOrder : 0,
            isActive: true
        });

        res.status(201).json({
            success: true,
            data: category
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private (Admin)
const updateCategory = async (req, res, next) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        // Prevent setting itself as parent
        if (req.body.parentId && req.body.parentId.toString() === req.params.id.toString()) {
            return res.status(400).json({ success: false, message: 'Category cannot be its own parent' });
        }

        if (req.body.parentId !== undefined) {
            if (req.body.parentId === null) {
                category.parentId = null;
                category.level = 0;
            } else {
                const parent = await Category.findById(req.body.parentId);
                if (!parent) {
                    return res.status(404).json({ success: false, message: 'Parent category not found' });
                }
                category.parentId = parent._id;
                category.level = (parent.level || 0) + 1;
            }
        }

        if (req.body.name) category.name = req.body.name.trim();
        if (req.body.description !== undefined) category.description = req.body.description;
        if (req.body.applicableListingTypes) category.applicableListingTypes = req.body.applicableListingTypes;
        if (req.body.icon !== undefined) category.icon = req.body.icon;
        if (req.body.displayOrder !== undefined) category.displayOrder = req.body.displayOrder;
        if (req.body.isActive !== undefined) category.isActive = req.body.isActive;

        await category.save();

        res.status(200).json({
            success: true,
            data: category
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Soft delete / deactivate category
// @route   DELETE /api/categories/:id
// @access  Private (Admin)
const deleteCategory = async (req, res, next) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        category.isActive = false;
        await category.save();

        // Also deactivate all descendants
        const deactivateDescendants = async (parentId) => {
            const children = await Category.find({ parentId });
            for (const child of children) {
                child.isActive = false;
                await child.save();
                await deactivateDescendants(child._id);
            }
        };
        await deactivateDescendants(category._id);

        res.status(200).json({
            success: true,
            message: 'Category and its subcategories deactivated successfully'
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Seed initial hierarchical category tree
// @route   POST /api/categories/seed
// @access  Private (Admin)
const seedCategories = async (req, res, next) => {
    try {
        await ensureDefaultCategories();
        const all = await Category.find().sort({ level: 1, displayOrder: 1 });
        res.status(200).json({
            success: true,
            message: 'Default categories ensured',
            count: all.length,
            data: all
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getCategories,
    getCategoryByIdOrSlug,
    createCategory,
    updateCategory,
    deleteCategory,
    seedCategories
};
