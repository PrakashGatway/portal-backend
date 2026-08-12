


import mongoose from "mongoose";
import { Blog } from "../../models/WebsiteSchecmas/blogSchemas.js";

export const getBlogs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            category,
            search,
            from,
        } = req.query;

        const pageNumber = Math.max(Number(page) || 1, 1);
        const limitNumber = Math.max(Number(limit) || 10, 1);

        const filter = {};

        if (status !== undefined && status !== "" && status !== null) {
            filter.Status = status === "true";
        } else {
            filter.Status = true;
        }

        if (category && String(category).trim() !== "") {
            filter.category = {
                $regex: `^${String(category).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
                $options: "i",
            };
        }

        if (search && String(search).trim() !== "") {
            const searchText = String(search).trim();

            const regex = new RegExp(
                searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                "i"
            );

            filter.$or = [
                { blogTitle: regex },
                { blogDescription: regex },
                { keyword: regex },
                { descriptions: regex },
                { category: regex },
                { createdBy: regex },
            ];
        }

        let blogsQuery = Blog.find(filter)
            .sort({ createdAt: -1 })
            .limit(limitNumber)
            .skip((pageNumber - 1) * limitNumber);

        // if (from !== "admin") {
        //     blogsQuery = blogsQuery.select(
        //         "-metaDesctiptions -descriptions"
        //     );
        // }

        const blogs = await blogsQuery.lean();

        const total = await Blog.countDocuments(filter);

        return res.status(200).json({
            success: true,
            data: blogs,
            total,
            page: pageNumber,
            pages: Math.ceil(total / limitNumber),
        });
    } catch (error) {
        console.error("Error fetching Blogs:", error);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

export const getBlog = async (req, res) => {
    try {
        const { slug } = req.params;

        const blog = await Blog.findOne({
            Slug: slug,
            Status: true,
        }).lean();

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: blog,
        });
    } catch (error) {
        console.error("Get Blog error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

export const getBlogSlugs1 = async (req, res) => {
    try {
        const blogs = await Blog.find({
            Status: true,
            Slug: {
                $exists: true,
                $ne: "",
            },
        })
            .select("Slug createdAt")
            .lean();

        return res.status(200).json({
            success: true,
            data: blogs,
        });
    } catch (error) {
        console.error("Get Blog slugs error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch Blog slugs",
        });
    }
};

export const createBlog = async (req, res) => {
    try {
        const {
            blogTitle,
            blogDescription,
            image,
            Slug,
            keyword,
            descriptions,
            metaDesctiptions,
            Status = true,
            category = "Education",
            createdBy = "Admin",
        } = req.body;

        if (!blogTitle || String(blogTitle).trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Blog title is required",
            });
        }

        if (
            !blogDescription ||
            String(blogDescription).trim() === ""
        ) {
            return res.status(400).json({
                success: false,
                message: "Blog description is required",
            });
        }

        if (!Slug || String(Slug).trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Slug is required",
            });
        }

        const existingBlog = await Blog.findOne({
            Slug: String(Slug).trim(),
        });

        if (existingBlog) {
            return res.status(400).json({
                success: false,
                message: "Blog with this slug already exists",
            });
        }

        const blog = await Blog.create({
            blogTitle: String(blogTitle).trim(),
            blogDescription,
            image: image || "",
            Slug: String(Slug).trim(),
            keyword: keyword || "",
            descriptions: descriptions || "",
            metaDesctiptions: metaDesctiptions || "",
            Status:
                typeof Status === "string"
                    ? Status === "true"
                    : Status,
            category: category || "Education",
            createdBy: createdBy || "Admin",
        });

        return res.status(201).json({
            success: true,
            message: "Blog created successfully",
            data: blog,
        });
    } catch (error) {
        console.error("Create Blog error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

export const updateBlog = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid blog ID",
            });
        }

        const {
            blogTitle,
            blogDescription,
            image,
            Slug,
            keyword,
            descriptions,
            metaDesctiptions,
            Status,
            category,
            createdBy,
        } = req.body;

        if (Slug !== undefined && String(Slug).trim() !== "") {
            const existingBlog = await Blog.findOne({
                Slug: String(Slug).trim(),
                _id: {
                    $ne: id,
                },
            });

            if (existingBlog) {
                return res.status(400).json({
                    success: false,
                    message: "Slug already in use",
                });
            }
        }

        const updateData = {};

        if (blogTitle !== undefined) {
            updateData.blogTitle = blogTitle;
        }

        if (blogDescription !== undefined) {
            updateData.blogDescription = blogDescription;
        }

        if (image !== undefined) {
            updateData.image = image;
        }

        if (Slug !== undefined) {
            updateData.Slug = String(Slug).trim();
        }

        if (keyword !== undefined) {
            updateData.keyword = keyword;
        }

        if (descriptions !== undefined) {
            updateData.descriptions = descriptions;
        }

        if (metaDesctiptions !== undefined) {
            updateData.metaDesctiptions = metaDesctiptions;
        }

        if (Status !== undefined) {
            updateData.Status = Status;
        }

        if (category !== undefined) {
            updateData.category = category;
        }

        if (createdBy !== undefined) {
            updateData.createdBy = createdBy;
        }

        const blog = await Blog.findByIdAndUpdate(
            id,
            updateData,
            {
                new: true,
                runValidators: true,
            }
        ).lean();

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Blog updated successfully",
            data: blog,
        });
    } catch (error) {
        console.error("Update Blog error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

export const deleteBlog = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid blog ID",
            });
        }

        const blog = await Blog.findByIdAndDelete(id);

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Blog deleted successfully",
        });
    } catch (error) {
        console.error("Delete Blog error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

export const toggleBlogstatus = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid blog ID",
            });
        }

        const blog = await Blog.findById(id);

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found",
            });
        }

        blog.Status = !blog.Status;

        await blog.save();

        return res.status(200).json({
            success: true,
            message: `Blog ${blog.Status ? "activated" : "deactivated"
                } successfully`,
            data: blog,
        });
    } catch (error) {
        console.error("Toggle Blog status error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

export const logReadTime1 = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid blog ID",
            });
        }

        const blog = await Blog.findByIdAndUpdate(
            id,
            {
                $inc: {
                    viewCount: 1,
                },
            },
            {
                new: true,
            }
        ).select("viewCount");

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                viewCount: blog.viewCount,
            },
        });
    } catch (error) {
        console.error("Error logging read time:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};










