import mongoose from "mongoose";
import { Faq } from "../../models/WebsiteSchecmas/WebsiteSchemas.js";

export const getFaq = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            category,
            search,
        } = req.query;

        const pageNumber = Math.max(Number(page) || 1, 1);
        const limitNumber = Math.max(Number(limit) || 10, 1);
        const skip = (pageNumber - 1) * limitNumber;

        const filter = {};

        if (category) {
            filter.category = {
                $regex: category,
                $options: "i",
            };
        }

        if (search) {
            filter.$or = [
                {
                    title: {
                        $regex: search,
                        $options: "i",
                    },
                },
                {
                    content: {
                        $regex: search,
                        $options: "i",
                    },
                },
            ];
        }

        const [faqs, total] = await Promise.all([
            Faq.find(filter)
                .sort({ _id: -1 })
                .skip(skip)
                .limit(limitNumber)
                .lean(),

            Faq.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            message: "FAQs fetched successfully",
            data: faqs,
            pagination: {
                total,
                page: pageNumber,
                limit: limitNumber,
                totalPages: Math.ceil(total / limitNumber),
                hasNextPage: pageNumber < Math.ceil(total / limitNumber),
                hasPreviousPage: pageNumber > 1,
            },
        });
    } catch (error) {
        console.error("Get FAQ error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch FAQs",
            error: error.message,
        });
    }
};


export const createFaq = async (req, res) => {
    try {
        const {
            title,
            content,
            category,
        } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({
                success: false,
                message: "Title is required",
            });
        }

        if (!content || !content.trim()) {
            return res.status(400).json({
                success: false,
                message: "Content is required",
            });
        }

        const faq = await Faq.create({
            title: title.trim(),
            content: content.trim(),
            category: category?.trim() || "About",
        });

        return res.status(201).json({
            success: true,
            message: "FAQ created successfully",
            data: faq,
        });
    } catch (error) {
        console.error("Create FAQ error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create FAQ",
            error: error.message,
        });
    }
};


export const updateFaq = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid FAQ ID",
            });
        }

        // Never allow _id to be changed
        const {
            _id,
            title,
            content,
            category,
        } = req.body;

        const updateData = {};

        if (title !== undefined) {
            updateData.title = title.trim();
        }

        if (content !== undefined) {
            updateData.content = content.trim();
        }

        if (category !== undefined) {
            updateData.category = category.trim();
        }

        const faq = await Faq.findByIdAndUpdate(
            id,
            {
                $set: updateData,
            },
            {
                new: true,
                runValidators: true,
            }
        ).lean();

        if (!faq) {
            return res.status(404).json({
                success: false,
                message: "FAQ not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "FAQ updated successfully",
            data: faq,
        });
    } catch (error) {
        console.error("Update FAQ error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update FAQ",
            error: error.message,
        });
    }
};


export const deleteFaq = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid FAQ ID",
            });
        }

        const faq = await Faq.findByIdAndDelete(id);

        if (!faq) {
            return res.status(404).json({
                success: false,
                message: "FAQ not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "FAQ deleted successfully",
            data: faq,
        });
    } catch (error) {
        console.error("Delete FAQ error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete FAQ",
            error: error.message,
        });
    }
};