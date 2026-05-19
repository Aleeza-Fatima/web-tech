const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    totalPrice: { type: Number, required: true }, // quantity * price
    purchaseDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);