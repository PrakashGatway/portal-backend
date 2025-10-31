import { Category } from "../../models/WebsiteSchecmas/WebsiteSchemas.js";
import mongoose from "mongoose";

export const getCategories = async (req, res) => {
    try {
        const { page = 1, limit = 10, isActive } = req.query;

        const filter = {};
        if (isActive !== undefined && isActive !== '' && isActive !== null) {
            filter.isActive = isActive === 'true';
        }

        const categories = await Category.find(filter)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const total = await Category.countDocuments(filter);

        res.json({
            success: true,
            count: categories.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            data: categories,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

export const getCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const query = mongoose.Types.ObjectId.isValid(id)
            ? { _id: id }
            : { slug: id };

        const category = await Category.findOne(query);

        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        res.json({ success: true, data: category });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

export const createCategory = async (req, res) => {
    try {
        const { name, description, isActive = true, slug } = req.body;

        const category = await Category.create({
            name,
            slug,
            description,
            isActive,
        });

        res.status(201).json({ success: true, data: category });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Category with this name or slug already exists' });
        }
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

export const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, isActive, slug } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid category ID' });
        }

        const updateData = { description, isActive };

        const category = await Category.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        res.json({ success: true, data: category });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Slug or name already in use' });
        }
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid category ID' });
        }

        const category = await Category.findByIdAndDelete(id);

        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        res.json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};