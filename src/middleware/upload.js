import multer from "multer";
import path from "path";
import fs from "fs";

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // folder where files will be stored
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // add extension
  },
});

const storageforAudio = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/audio";
    ensureDir(dir);
    cb(null, "uploads/audio/"); // folder where files will be stored
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // add extension
  },
});

const pteAnswerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/pteAnswers";
    ensureDir(dir);
    cb(null, "uploads/pteAnswers/");
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const iletsAnswerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/iletsAnswers";
    ensureDir(dir);
    cb(null, "uploads/iletsAnswers/");
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|svg|gif/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Only images are allowed (jpeg, jpg, png, gif)!"));
  }
};

const audioFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("audio/")) {
    cb(null, true);
  } else {
    cb(new Error("Only audio files are allowed!"), false);
  }
};

export const uploadAudio = multer({ storage: storageforAudio, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: audioFilter });

export const uploadPteAnswerAudio = multer({
  storage: pteAnswerStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: audioFilter,
});

export const uploadIeltsAnswerAudio = multer({
  storage: iletsAnswerStorage,
  limits: { fileSize: 20 * 1024 * 1024 }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter,
});

export default upload;
