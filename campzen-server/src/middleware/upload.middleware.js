const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads and previews directories exist
const uploadsDir = path.resolve('uploads');
const previewsDir = path.resolve('uploads/previews');
try {
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    if (!fs.existsSync(previewsDir)) fs.mkdirSync(previewsDir, { recursive: true });
} catch (e) {
    console.warn('[Upload] Notice: Could not ensure uploads directory:', e.message);
}

// Local storage configuration (Easily swappable to multer-s3 later)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        } catch (_) {}
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        // Generate a unique filename: timestamp + random number + original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// Validate file type
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
        'image/jpeg',
        'image/png'
    ];

    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    const forbiddenExtensions = ['.exe', '.sh', '.bat', '.cmd', '.js', '.vbs', '.ps1', '.html', '.php', '.py', '.phtml', '.jar'];

    // Reject dangerous extensions or null-byte poisoning attempts immediately
    if (forbiddenExtensions.includes(ext) || file.originalname.includes('\0')) {
        return cb(new Error('Dangerous file format or executable extension is strictly forbidden.'), false);
    }

    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
        // Normalize generic or mobile octet-stream MIME types based on file extension
        if (!allowedMimeTypes.includes(file.mimetype)) {
            if (ext === '.pdf') file.mimetype = 'application/pdf';
            else if (ext === '.docx') file.mimetype = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            else if (ext === '.doc') file.mimetype = 'application/msword';
            else if (ext === '.jpg' || ext === '.jpeg') file.mimetype = 'image/jpeg';
            else if (ext === '.png') file.mimetype = 'image/png';
        }
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, DOCX, JPG, and PNG are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
    fileFilter: fileFilter
});

module.exports = upload;
