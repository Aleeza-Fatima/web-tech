const express = require('express');
const path = require('path');
const mongoose = require('mongoose'); // Added mongoose to connect to database
const app = express();

// 1. DATABASE CONNECTION
// Replace the link below with the EXACT same connection string you have in your seed.js file!
const MONGO_URI = 'mongodb://localhost:27017/secondcup';


mongoose.connect(MONGO_URI)
    .then(() => console.log('Successfully connected to the database!'))
    .catch(err => console.error('Database connection error:', err));

// 2. DEFINE THE PRODUCT SCHEMA & MODEL
// This tells Express what a data item looks like so it can fetch it
const productSchema = new mongoose.Schema({
    name: String,
    price: Number,
    description: String,
    category: String,
    image: String,
    rating: { type: Number, default: 4.5 }, // Added for Requirement 1
    stock: { type: Number, default: 20 }    // Added for Requirement 1
});
const Product = mongoose.model('Product', productSchema);;

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Serve static files (CSS, Images, JS) from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Route for the landing page
app.get('/', (req, res) => {
    res.render('index'); // This looks for 'views/index.ejs'
});

// 3. NEW ROUTE FOR THE PRODUCTS PAGE
app.get('/products', async (req, res) => {
    try {
        // 1. FILTERING & SEARCHING LOGIC
        let query = {};

        // Search by name (case-insensitive)
        if (req.query.search) {
            query.name = { $regex: req.query.search, $options: 'i' };
        }

        // Filter by category
        if (req.query.category) {
            query.category = req.query.category;
        }

        // Filter by price range
        if (req.query.minPrice || req.query.maxPrice) {
            query.price = {};
            if (req.query.minPrice) query.price.$gte = Number(req.query.minPrice);
            if (req.query.maxPrice) query.price.$lte = Number(req.query.maxPrice);
        }

        // 2. PAGINATION LOGIC
        const limit = 8; // 8 products per page requirement
        const page = parseInt(req.query.page) || 1;
        const skip = (page - 1) * limit;

        // Get total count of matching products to calculate pages
        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);

        // Fetch the specific 8 items for this page
        const products = await Product.find(query)
                                      .skip(skip)
                                      .limit(limit);

        // 3. RENDER THE EJS TEMPLATE
        // Send all data, filters, and page counts to your views file
        res.render('products', {
            products,
            currentPage: page,
            totalPages,
            search: req.query.search || '',
            category: req.query.category || '',
            minPrice: req.query.minPrice || '',
            maxPrice: req.query.maxPrice || '',
            // List of your categories for the dropdown selector
            categories: ['Hot Drinks', 'Cold Drinks', 'Pastries', 'Sandwiches'] 
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading products");
    }
});

// THIS PART IS CRITICAL - It keeps the server running
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});