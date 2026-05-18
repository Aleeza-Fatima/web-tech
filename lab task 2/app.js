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
    image: String
});
const Product = mongoose.model('Product', productSchema);

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
        // Fetch all 24 items from your database
        const products = await Product.find({});
        
        // Send the products data to your 'views/products.ejs' file
        res.render('products', { products }); 
    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching products from the database");
    }
});

// THIS PART IS CRITICAL - It keeps the server running
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});