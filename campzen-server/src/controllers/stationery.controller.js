const StationeryItem = require('../models/stationeryItem.model');
const Vendor = require('../models/vendor.model');
const Category = require('../models/category.model');
const mongoose = require('mongoose');

// @desc    Get stationery items (Catalog / Marketplace)
// @route   GET /api/stationery
// @access  Public
const getStationeryItems = async (req, res, next) => {
    try {
        const { vendorId, category, categoryId, search, inStockOnly, includeDisabled, brand } = req.query;

        const query = {};
        if (includeDisabled !== 'true') {
            query.isAvailable = true;
        }

        if (vendorId) {
            query.vendorId = vendorId;
        }

        if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
            query.categoryId = categoryId;
        } else if (category && category !== 'all') {
            // Check if matching a category slug or exact category string
            const foundCategory = await Category.findOne({ slug: category.toLowerCase() });
            if (foundCategory) {
                // If it's a parent category, include its children as well!
                const children = await Category.find({ parentId: foundCategory._id });
                const catIds = [foundCategory._id, ...children.map(c => c._id)];
                query.$or = [
                    { categoryId: { $in: catIds } },
                    { category: category }
                ];
            } else {
                query.category = category;
            }
        }

        if (inStockOnly === 'true') {
            query.stock = { $gt: 0 };
        }

        if (brand) {
            query.brand = { $regex: brand, $options: 'i' };
        }

        if (search) {
            const searchRegex = { $regex: search, $options: 'i' };
            const textQuery = [
                { name: searchRegex },
                { description: searchRegex },
                { brand: searchRegex },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
            if (query.$or) {
                query.$and = [{ $or: query.$or }, { $or: textQuery }];
                delete query.$or;
            } else {
                query.$or = textQuery;
            }
        }

        const items = await StationeryItem.find(query)
            .sort({ createdAt: -1 })
            .populate('vendorId', 'name address')
            .populate('categoryId', 'name slug icon');

        res.status(200).json({
            success: true,
            count: items.length,
            data: items
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single stationery item details
// @route   GET /api/stationery/:id
// @access  Public
const getStationeryItemById = async (req, res, next) => {
    try {
        const item = await StationeryItem.findById(req.params.id)
            .populate('vendorId', 'name address contact')
            .populate('categoryId', 'name slug icon');

        if (!item || !item.isAvailable) {
            return res.status(404).json({ success: false, message: 'Stationery item not found' });
        }

        res.status(200).json({
            success: true,
            data: item
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create new stationery item in vendor inventory
// @route   POST /api/stationery
// @access  Private (Vendor Owner / Staff / Admin)
const createStationeryItem = async (req, res, next) => {
    try {
        const { vendorId, name, description, category, categoryId, price, stock, images, tags, sku, variants, brand } = req.body;

        if (!vendorId || !name || price === undefined) {
            return res.status(400).json({
                success: false,
                message: 'vendorId, name, and price are required'
            });
        }

        const vendor = await Vendor.findById(vendorId);
        if (!vendor) {
            return res.status(404).json({ success: false, message: 'Vendor not found' });
        }

        // RBAC check
        const isOwner = vendor.ownerId.toString() === req.user.id.toString();
        const isStaff = vendor.staffIds && vendor.staffIds.some(s => s.toString() === req.user.id.toString());
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isStaff && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to add inventory for this vendor' });
        }

        let resolvedCategoryId = null;
        let resolvedCategorySlug = category || 'stationery';

        if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
            const catDoc = await Category.findById(categoryId);
            if (catDoc) {
                if (!catDoc.isActive) {
                    return res.status(400).json({ success: false, message: 'Selected category is inactive and unavailable for new listings' });
                }
                resolvedCategoryId = catDoc._id;
                resolvedCategorySlug = catDoc.slug;
            }
        } else if (category) {
            const catDoc = await Category.findOne({ slug: category.toLowerCase() });
            if (catDoc) {
                resolvedCategoryId = catDoc._id;
                resolvedCategorySlug = catDoc.slug;
            }
        }

        const item = await StationeryItem.create({
            vendorId,
            categoryId: resolvedCategoryId,
            category: resolvedCategorySlug,
            name: name.trim(),
            description,
            price: Number(price),
            stock: stock !== undefined ? Number(stock) : 10,
            variants: Array.isArray(variants) ? variants : [],
            brand,
            images: images || [],
            tags: tags || [],
            sku
        });

        res.status(201).json({
            success: true,
            data: item
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update stationery item details / stock / variants
// @route   PUT /api/stationery/:id
// @access  Private (Vendor Owner / Staff / Admin)
const updateStationeryItem = async (req, res, next) => {
    try {
        const item = await StationeryItem.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        const vendor = await Vendor.findById(item.vendorId);
        const isOwner = vendor && vendor.ownerId.toString() === req.user.id.toString();
        const isStaff = vendor && vendor.staffIds && vendor.staffIds.some(s => s.toString() === req.user.id.toString());
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isStaff && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this item' });
        }

        if (req.body.categoryId && mongoose.Types.ObjectId.isValid(req.body.categoryId)) {
            const catDoc = await Category.findById(req.body.categoryId);
            if (catDoc) {
                req.body.category = catDoc.slug;
            }
        }

        const updated = await StationeryItem.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        ).populate('categoryId', 'name slug');

        res.status(200).json({
            success: true,
            data: updated
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete stationery item (Soft delete)
// @route   DELETE /api/stationery/:id
// @access  Private (Vendor Owner / Admin)
const deleteStationeryItem = async (req, res, next) => {
    try {
        const item = await StationeryItem.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        const vendor = await Vendor.findById(item.vendorId);
        const isOwner = vendor && vendor.ownerId.toString() === req.user.id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this item' });
        }

        item.isAvailable = false;
        await item.save();

        res.status(200).json({
            success: true,
            message: 'Item deactivated from marketplace'
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get vendor inventory performance stats
// @route   GET /api/stationery/vendor/:vendorId/performance
// @access  Private (Vendor Owner / Staff / Admin)
const getVendorProductPerformance = async (req, res, next) => {
    try {
        const { vendorId } = req.params;
        const vendor = await Vendor.findById(vendorId);
        if (!vendor) {
            return res.status(404).json({ success: false, message: 'Vendor not found' });
        }

        const isOwner = vendor.ownerId.toString() === req.user.id.toString();
        const isStaff = vendor.staffIds && vendor.staffIds.some(s => s.toString() === req.user.id.toString());
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isStaff && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to view performance for this vendor' });
        }

        const items = await StationeryItem.find({ vendorId });
        const totalProducts = items.length;
        const activeProducts = items.filter(i => i.isAvailable).length;
        const lowStockItems = items.filter(i => i.isAvailable && i.stock <= 5);
        const outOfStockItems = items.filter(i => i.isAvailable && i.stock === 0);
        const topSellers = [...items].sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0)).slice(0, 5);

        res.status(200).json({
            success: true,
            data: {
                totalProducts,
                activeProducts,
                lowStockCount: lowStockItems.length,
                outOfStockCount: outOfStockItems.length,
                lowStockItems,
                topSellers
            }
        });
    } catch (error) {
        next ? next(error) : res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getStationeryItems,
    getStationeryItemById,
    createStationeryItem,
    updateStationeryItem,
    deleteStationeryItem,
    getVendorProductPerformance
};
