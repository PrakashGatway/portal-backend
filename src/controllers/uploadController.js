import fs from "node:fs";
import path from "node:path";
import User from "../models/User.js";
import cloudinary from "../utils/cloudnary.js";
import { deleteFile } from "../middleware/upload.js";

const ALLOWED_TYPES = {
  pdf: {
    mimeTypes: ["application/pdf"],
    extensions: [".pdf"],
  },

  document: {
    mimeTypes: [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    extensions: [".doc", ".docx",".ppt", ".pptx"],
  },

  image: {
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    extensions: [".jpg", ".jpeg", ".png", ".webp", ".gif"],
  },

  video: {
    mimeTypes: ["video/mp4", "video/webm", "video/quicktime"],
    extensions: [".mp4", ".webm", ".mov"],
  },

  audio: {
    mimeTypes: ["audio/mpeg", "audio/wav", "audio/mp4", "audio/x-m4a"],
    extensions: [".mp3", ".wav", ".m4a"],
  },
};

export const uploadSingleImage = (req, res) => {
  try {
    const oldFile = req.body.oldfile;

    if (oldFile) {
      deleteFile(`uploads/${oldFile}`);
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      file: {
        filename: req.file.filename,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const uploadMultipleImages = (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No files uploaded" });
    }

    const filesData = req.files.map((file) => ({
      filename: file.filename,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size,
    }));

    res.status(200).json({
      success: true,
      message: "Images uploaded successfully",
      files: filesData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const uploadThumbnail = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "thumbnails",
      resource_type: "auto",
    });
    res.status(200).json({
      message: "File uploaded successfully",
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Cloudinary upload failed" });
  }
};

export const uploadBlogs = async (req, res) => {
  let tempFilePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image uploaded",
      });
    }

    tempFilePath = req.file.path;

    const result = await cloudinary.uploader.upload(tempFilePath, {
      folder: "blogs",
      resource_type: "image",

      transformation: [
        {
          quality: "auto",
          fetch_format: "auto",
        },
      ],
    });

    await fs.unlink(tempFilePath);
    tempFilePath = null;

    return res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      data: {
        url: result.secure_url,
        publicId: result.public_id,
      },
    });
  } catch (error) {
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (unlinkError) {
        console.error("Failed to delete temporary file:", unlinkError);
      }
    }

    return res.status(500).json({
      success: false,
      message: "Failed to upload image",
    });
  }
};

export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "profile",
      resource_type: "auto",
    });

    await User.findByIdAndUpdate(
      req.user._id,
      { profilePic: result.public_id },
      { new: true, runValidators: true },
    );

    res.status(200).json({
      message: "File uploaded successfully",
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Cloudinary upload failed" });
  }
};

export const uploadSingleAudio = (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No audio file uploaded" });
    }

    res.status(200).json({
      success: true,
      message: "uploaded successfully",
      file: {
        filename: req.file.filename,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

import { StudyMaterial } from "../models/Content.js";

const uploadDirectory = path.join(process.cwd(), "uploads", "study-materials");

export const uploadStudyMaterial = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Study material ID is required",
      });
    }
    const material = await StudyMaterial.findById(id);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Study material not found",
      });
    }
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a file",
      });
    }
    const materialType = String(material.materialType || "")
      .trim()
      .toLowerCase();

    const typeConfig = ALLOWED_TYPES[materialType];

    if (!typeConfig) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(400).json({
        success: false,
        message: `File upload is not supported for material type "${material.materialType}"`,
      });
    }
    if (!typeConfig.mimeTypes.includes(req.file.mimetype)) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(400).json({
        success: false,
        message: `Invalid file type. ${material.materialType} material requires: ${typeConfig.extensions.join(
          ", ",
        )}`,
      });
    }

    const extension = path.extname(req.file.originalname).toLowerCase();

    if (!typeConfig.extensions.includes(extension)) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: `Invalid file extension. Allowed: ${typeConfig.extensions.join(
          ", ",
        )}`,
      });
    }
    if (material.file?.publicId) {
      const oldFilePath = path.join(uploadDirectory, material.file.publicId);

      console.log("Old File Path:", oldFilePath);

      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
          console.log("Old file deleted successfully");
        } catch (deleteError) {
          console.error(
            "Failed to delete old study material file:",
            deleteError,
          );
        }
      } else {
        console.log("Old file does not exist:", oldFilePath);
      }
    }

    const fileUrl = `/study-materials/${req.file.filename}`;

    material.file = {
      mimetype: req.file.mimetype,
      size: req.file.size,
      publicId: req.file.filename,
      url: fileUrl,
    };

    await material.save();

    // --------------------------------------------------
    // Response
    // --------------------------------------------------

    return res.status(200).json({
      success: true,
      message: "Study material uploaded successfully",
      data: material,
    });
  } catch (error) {
    console.error("Upload study material error:", error);

    // Remove newly uploaded file if database update fails
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (deleteError) {
        console.error("Failed to remove uploaded file:", deleteError);
      }
    }

    return res.status(500).json({
      success: false,
      message: "Failed to upload study material",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
