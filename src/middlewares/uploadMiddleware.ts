/**
 * FILE UPLOAD MIDDLEWARE
 * Configures Multer for PDF file uploads
 */

import multer from "multer";
import { Request } from "express";

// Memory storage - files stored in memory as Buffer objects
// No disk writes needed since we process immediately
const storage = multer.memoryStorage();

// File filter - only accept PDFs
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"));
  }
};

// Multer configuration for PDF uploads
export const pdfUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1, // Only one file per request
  },
});

/**
 * Middleware wrapper - makes file upload optional
 * Use this in routes where PDF upload is optional
 */
export const optionalPDFUpload = pdfUpload.single("file");
