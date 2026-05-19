const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true }, // e.g., 'Hot Drinks', 'Cold Drinks', 'Whole Beans'
    rating: { type: Number, default: 0 },
    stock: { type: Number, required: true }
});

module.exports = mongoose.model('Product', productSchema);