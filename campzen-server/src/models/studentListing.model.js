const mongoose = require('mongoose');

const studentListingSchema = new mongoose.Schema({
    sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Seller ID is required']
    },
    collegeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'College',
        required: [true, 'College campus is required']
    },
    visibilityType: {
        type: String,
        enum: ['MY_COLLEGE_ONLY', 'SELECTED_COLLEGES', 'ALL_COLLEGES'],
        default: 'MY_COLLEGE_ONLY'
    },
    visibleCollegeIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'College'
    }],
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Category is required']
    },
    title: {
        type: String,
        required: [true, 'Item title is required'],
        trim: true,
        maxlength: [120, 'Title cannot exceed 120 characters']
    },
    description: {
        type: String,
        required: [true, 'Item description is required'],
        trim: true,
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    condition: {
        type: String,
        enum: ['NEW', 'LIKE_NEW', 'GOOD', 'ACCEPTABLE'],
        required: [true, 'Condition is required']
    },
    price: {
        type: Number,
        required: [true, 'Asking price is required'],
        min: [0, 'Price cannot be negative']
    },
    quantity: {
        type: Number,
        default: 1,
        min: [0, 'Quantity cannot be negative']
    },
    images: [{
        type: String,
        trim: true
    }],
    brand: {
        type: String,
        trim: true
    },
    modelNumber: {
        type: String,
        trim: true
    },
    preferredHandover: {
        type: String,
        enum: ['in_person_campus', 'hostel_pickup', 'department_handover', 'other'],
        default: 'in_person_campus'
    },
    pickupLocation: {
        type: String,
        trim: true,
        maxlength: [200, 'Pickup location cannot exceed 200 characters']
    },
    academicTags: {
        department: { type: String, trim: true },
        course: { type: String, trim: true },
        semester: { type: Number, min: 1, max: 12 },
        subject: { type: String, trim: true }
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'RESERVED', 'SOLD', 'DELISTED'],
        default: 'ACTIVE'
    },
    activeReservationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ResaleTransaction',
        default: null
    },
    listingType: {
        type: String,
        enum: ['STUDENT_RESALE'],
        default: 'STUDENT_RESALE'
    },
    viewsCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Indexes for fast campus filtering, category browsing, and search
studentListingSchema.index({ visibilityType: 1, visibleCollegeIds: 1 });
studentListingSchema.index({ collegeId: 1, status: 1, createdAt: -1 });
studentListingSchema.index({ categoryId: 1, status: 1 });
studentListingSchema.index({ sellerId: 1, status: 1 });
studentListingSchema.index({ title: 'text', description: 'text', brand: 'text', 'academicTags.subject': 'text' });

module.exports = mongoose.model('StudentListing', studentListingSchema);
