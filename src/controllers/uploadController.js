import fs from "fs/promises";
import User from "../models/User.js";
import cloudinary from "../utils/cloudnary.js";

export const uploadSingleImage = (req, res) => {
  try {
    
    const oldFile = req.body.oldfile; 
    
    if (oldFile) {
      console.log("Old file to delete: ", oldFile);
      deleteFile(`uploads/${oldFile}`);
    }
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
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
      return res.status(400).json({ success: false, message: "No files uploaded" });
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
        publicId: result.public_id
      },
    });
  } catch (error) {
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (unlinkError) {
        console.error(
          "Failed to delete temporary file:",
          unlinkError
        );
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
      { new: true, runValidators: true }
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
      return res.status(400).json({ success: false, message: "No audio file uploaded" });
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
