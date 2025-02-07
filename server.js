const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const dotenv = require("dotenv");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Ensure 'uploads' directory exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`)
});

const upload = multer({ storage });

// Upload Route
app.post("/upload", upload.array("files"), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: "No files uploaded" });

    const uploadPromises = req.files.map(async (file) => {
      const result = await cloudinary.uploader.upload(file.path, { resource_type: "auto" });
      fs.unlinkSync(file.path); // Remove file from local storage
      return { url: result.secure_url, public_id: result.public_id };
    });

    const uploadedFiles = await Promise.all(uploadPromises);
    res.json(uploadedFiles);
  } catch (error) {
    res.status(500).json({ error: "Upload failed", details: error.message });
  }
});

// Extract Public ID from URL
const extractPublicId = (url) => {
  const urlObj = new URL(url);
  const pathname = urlObj.pathname;
  return pathname.split("/").slice(-2).join("/").split(".")[0];
};

// Delete File by URL
app.post("/delete", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "No URL provided" });

    const public_id = extractPublicId(url);
    console.log("Extracted Public ID:", public_id); // Debugging log

    const result = await cloudinary.uploader.destroy(public_id);
    console.log("Cloudinary Response:", result); // Debugging log

    res.json(result);
  } catch (error) {
    console.error("Delete Error:", error); // Log full error
    res.status(500).json({ error: "Delete failed", details: error.message });
  }
});


// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
