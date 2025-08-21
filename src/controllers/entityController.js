import Entity from "../models/Entities.js";

export const createEntity = async (req, res) => {
    try {
        const entity = new Entity(req.body);
        await entity.save();

        res.status(201).json({
            success: true,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

export const getEntities = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sort = "-createdAt",
            search,
            type,
            country,
            minRating,
            maxRating,
            duration,
        } = req.query;

        const query = {};

        // Search across title, subTitle, description
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { subTitle: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
            ];
        }

        if (type) {
            query.type = type;
        }

        if (country) {
            query.country = country;
        }

        if (duration) {
            query.duration = duration;
        }

        if (minRating !== undefined || maxRating !== undefined) {
            query.rating = {};
            if (minRating) query.rating.$gte = parseFloat(minRating);
            if (maxRating) query.rating.$lte = parseFloat(maxRating);
        }

        const sortOptions = sort.split(",").join(" ");

        const skip = (page - 1) * limit;
        const limitInt = parseInt(limit);

        const entities = await Entity.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(limitInt)
            .select("-__v");

        const total = await Entity.countDocuments(query);

        res.json({
            success: true,
            data: entities,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limitInt),
                totalItems: total,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

export const getEntityById = async (req, res) => {
    try {
        const { id } = req.params;

        const entity = await Entity.findById(id)

        if (!entity) {
            return res.status(404).json({
                success: false,
                message: "Entity not found",
            });
        }
        res.json({
            success: true,
            data: entity,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

export const updateEntity = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const entity = await Entity.findOneAndUpdate({ _id: id },
            updateData,
            {
                new: true,
                runValidators: true,
            }
        ).select("-__v");

        if (!entity) {
            return res.status(404).json({
                success: false,
                message: "Entity not found",
            });
        }

        res.json({
            success: true,
            data: entity,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

export const deleteEntity = async (req, res) => {
    try {
        const { id } = req.params;

        const entity = await Entity.findOneAndDelete({ _id: id });

        if (!entity) {
            return res.status(404).json({
                success: false,
                message: "Entity not found",
            });
        }
        res.json({
            success: true,
            message: "Entity deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};