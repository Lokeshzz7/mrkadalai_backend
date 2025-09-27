import multer from "multer";
import { uploadImage } from "../config/s3.js";

// Configure multer for multiple file uploads
const storage = multer.memoryStorage();

export const uploadDocuments = multer({
  storage: storage,
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 2 // Maximum 2 files (Aadhar and PAN)
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"), false);
    }
    cb(null, true);
  },
}).fields([
  { name: 'aadhar', maxCount: 1 },
  { name: 'pan', maxCount: 1 }
]);

// Helper function to upload files to S3
export const uploadFilesToS3 = async (files) => {
  const uploadPromises = [];
  const uploadedUrls = {};

  if (files.aadhar && files.aadhar[0]) {
    const aadharFile = files.aadhar[0];
    const aadharUrl = await uploadImage(aadharFile.buffer, `aadhar-${aadharFile.originalname}`);
    uploadedUrls.aadharUrl = aadharUrl;
  }

  if (files.pan && files.pan[0]) {
    const panFile = files.pan[0];
    const panUrl = await uploadImage(panFile.buffer, `pan-${panFile.originalname}`);
    uploadedUrls.panUrl = panUrl;
  }

  return uploadedUrls;
};
