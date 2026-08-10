import multer from "multer";
import fs from "fs";
import path from "path";

const uploadDir = "uploads/temp";

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
        const uniqueName =
            `${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;

        cb(null, uniqueName);
    },
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/svg+xml",
        "image/svg",
        "image/jpg",
        "image/bmp",
        "image/tiff",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
        return cb(new Error("Only image files are allowed"), false);
    }

    cb(null, true);
};

export const uploadBlogImage = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024,
    },
});