const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const Product = require('./models/items');
const Order = require('./models/Order');

const jwt = require('jsonwebtoken');

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB Atlas Cloud successfully! 🎉"))
  .catch(err => {
      console.error("❌ Database Connection Failed!");
      console.error("Your .env MONGO_URI value is currently:", process.env.MONGO_URI);
  });

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

const MONGO_URI = 'mongodb://localhost:27017/secondcup';

const session = require('express-session');
const connectMongo = require('connect-mongo');
const MongoStore = connectMongo.default || connectMongo;
const flash = require('connect-flash');

app.get('/dashboard', async (req, res) => {
    try {
        const products = await Product.find(); 
        res.render('dashboard', { products: products }); 
    } catch (err) {
        res.status(500).send("Error loading dashboard data");
    }
});

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, default: 'customer' } // Automatically defaults to customer
});

// PASSWORD HASHING MIDDLEWARE 
userSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 10);
});

const User = mongoose.model('User', userSchema);

// 2. DEFINE THE PRODUCT SCHEMA & MODEL
const productSchema = new mongoose.Schema({
    name: String,
    price: Number,
    description: String,
    category: String,
    image: String,
    rating: { type: Number, default: 4.5 }, // Added for Requirement 1
    stock: { type: Number, default: 20 }    // Added for Requirement 1
});

const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{ name: String, quantity: Number, price: Number }],
    totalAmount: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

// 1. Setup Session Cookies stored inside your MongoDB Atlas
app.use(session({
    secret: 'supersecretsecondcupkey',
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({
        // Automatically finds whatever name you used for your database string variable
        mongoUrl: typeof MONGO_URI !== 'undefined' ? MONGO_URI : (typeof dbURI !== 'undefined' ? dbURI : mongoURI),
        collectionName: 'sessions'
    })
}));

// 2. Setup Flash Messages (Requirement 4)
app.use(flash());

// 3. Global Variables Middleware (Passes user info and flash alerts to EVERY single EJS layout automatically)
app.use((req, res, next) => {
    res.locals.currentUser = req.session.user || null; // Requirement 2 (Dynamic UI)
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});

// 4. REQUIREMENT 3: AUTHORIZATION MIDDLEWARE SECURITY GUARDS
const isLoggedIn = (req, res, next) => {
    if (!req.session.user) {
        req.flash('error', 'You must be signed in first!');
        return res.redirect('/login');
    }
    next();
};

const isAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        req.flash('error', 'Access Denied! Administrators Only.');
        return res.redirect('/products');
    }
    next();
};

// REQUIREMENT 3: JWT AUTHENTICATION MIDDLEWARE
const verifyToken = (req, res, next) => {
    // 1. Grab token from the Authorization Header
    const authHeader = req.headers['authorization'];
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Access Denied. Missing or malformed token." });
    }

    // 2. Extract the actual token string out from 'Bearer <token>'
    const token = authHeader.split(' ')[1];

    try {
        // 3. Verify token signature using our secret env key
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 4. Attach decoded token user payload directly to the request object
        req.user = decoded; 
        next();
    } catch (err) {
        return res.status(403).json({ message: "Invalid or expired token." });
    }
};

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

async function getSalesStats() {
    const revenueData = await Order.aggregate([
        { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);
    const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

    const totalOrders = await Order.countDocuments();

    const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5);

    return { totalRevenue, totalOrders, recentOrders };
}

app.get('/sales', async (req, res) => {
    try {
        const allProducts = await Product.find();
        const totalOrders = await Order.countDocuments();

        const revenueData = await Order.aggregate([
            { $group: { _id: null, total: { $sum: "$totalPrice" } } }
        ]);
        const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

        const topSellingData = await Order.aggregate([
            { $group: { _id: "$productName", totalSold: { $sum: "$quantity" } } },
            { $sort: { totalSold: -1 } },
            { $limit: 1 }
        ]);
        const topProduct = topSellingData.length > 0 ? topSellingData[0]._id : "No sales yet";
        const recentTransactions = await Order.find().sort({ purchaseDate: -1 }).limit(5);
        res.render('sales', { 
            products: allProducts, 
            totalRevenue: totalRevenue, 
            totalOrders: totalOrders, 
            topProduct: topProduct,
            transactions: recentTransactions
        }); 

    } catch (err) {
        console.error(err);
        res.status(500).send("Error compiling dashboard analytics.");
    }
});

// Route 2: This spits out raw numbers for our automatic background updating
app.get('/api/sales-data', isAdmin, async (req, res) => {
    try {
        const stats = await getSalesStats(); // run our calculator again
        res.json({
            totalRevenue: stats.totalRevenue,
            totalOrders: stats.totalOrders,
            recentOrders: stats.recentOrders
        });
    } catch (err) {
        res.status(500).json({ error: "Data error" });
    }
});

// This route fetches your items and renders items.ejs
app.get('/items', async (req, res) => {
    try {
        // 1. Fetch all documents from your collection
        const allItems = await Product.find(); 
        
        // 2. Render items.ejs and pass the data into it as a variable named 'products'
        res.render('items', { products: allItems }); 
    } catch (err) {
        console.error("Error loading items:", err);
        res.status(500).send("Error loading database items.");
    }
});

app.get('/show-products', async (req, res) => {
    try {
        const allProducts = await Product.find();

        const totalOrders = await Order.countDocuments();

        const revenueData = await Order.aggregate([
            { $group: { _id: null, total: { $sum: "$totalPrice" } } }
        ]);
        const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

        const topSellingData = await Order.aggregate([
            { $group: { _id: "$productName", totalSold: { $sum: "$quantity" } } },
            { $sort: { totalSold: -1 } },
            { $limit: 1 }
        ]);
        const topProduct = topSellingData.length > 0 ? topSellingData[0]._id : "No sales yet";
        const recentTransactions = await Order.find().sort({ purchaseDate: -1 }).limit(5);

        res.render('dashboard', { 
            products: allProducts, 
            totalRevenue: totalRevenue, 
            totalOrders: totalOrders, 
            topProduct: topProduct,
            transactions: recentTransactions
        }); 

    } catch (err) {
        console.error("Dashboard controller error:", err);
        res.status(500).send("Error compiling dashboard analytics data.");
    }
});

const multer = require('multer');

// Configure where Multer saves files and how it names them
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/'); // Saves inside public/uploads
    },
    filename: (req, file, cb) => {
        // Renames file to: timestamp-original-name.jpg to avoid duplicates
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// MIDDLEWARE to parse incoming form fields (Crucial for text data)
app.use(express.urlencoded({ extended: true }));


// ROUTE 1 (READ): The Admin Dashboard Table
app.get('/admin', isAdmin, async (req, res) => {
    try {
        const products = await Product.find({});
        res.render('admin/dashboard', { products });
    } catch (err) {
        res.status(500).send("Error loading dashboard");
    }
});

// ROUTE 2 (CREATE): Show the Add Product Form
app.get('/admin/add', isAdmin, (req, res) => {
    res.render('admin/add-product');
});

// ROUTE 3 (CREATE): Handle the submitted Form Data + Image Upload
app.post('/admin/edit/:id', isAdmin, upload.single('image'), async (req, res) => {
    try {
        const { name, price, description, category, rating, stock } = req.body;
        
        // Force strings into numbers safely. If empty, fall back to a default number.
        let updateData = {
            name: name,
            price: price ? Number(price) : 0,
            description: description,
            category: category,
            rating: rating ? Number(rating) : 4.5,
            stock: stock ? Number(stock) : 0
        };

        // If a new image was uploaded during edit, include it
        if (req.file) {
            updateData.image = `/uploads/${req.file.filename}`;
        }

        // Use findByIdAndUpdate to push changes
        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
        
        if (!updatedProduct) {
            return res.status(404).send("Product not found in the database.");
        }

        res.redirect('/admin');
    } catch (err) {
        // This line prints the exact reason for the failure in your VS Code terminal!
        console.error("DATABASE UPDATE ERROR:", err); 
        res.status(500).send("Error updating product");
    }
});

// ROUTE 4 (UPDATE): Show Edit Form populated with existing data
app.get('/admin/edit/:id', isAdmin, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).send("Product not found");
        res.render('admin/edit-product', { product });
    } catch (err) {
        res.status(500).send("Error loading edit page");
    }
});

// ROUTE 5 (UPDATE): Handle saving changes from Edit Form
app.post('/admin/edit/:id', isAdmin, upload.single('image'), async (req, res) => {
    try {
        const { name, price, description, category, rating, stock } = req.body;
        
        let updateData = {
            name,
            price: Number(price),
            description,
            category,
            rating: Number(rating),
            stock: Number(stock)
        };

        // If a new image was uploaded during edit, swap the path
        if (req.file) {
            updateData.image = `/uploads/${req.file.filename}`;
        }

        await Product.findByIdAndUpdate(req.params.id, updateData);
        res.redirect('/admin');
    } catch (err) {
        res.status(500).send("Error updating product");
    }
});

// ROUTE 6 (DELETE): Remove product from database
app.post('/admin/delete/:id', isAdmin, async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.redirect('/admin');
    } catch (err) {
        res.status(500).send("Error deleting product");
    }
});

// THIS PART IS CRITICAL - It keeps the server running
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});

// SHOW REGISTER FORM
app.get('/register', (req, res) => {
    res.render('auth/register');
});

// HANDLE REGISTER LOGIC
// HANDLE REGISTER LOGIC WITH DETAILED CONSOLE LOGGING
app.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        
        // Form field sanity validation check
        if (!name || !email || !password) {
            req.flash('error', 'All fields (Name, Email, Password) are strictly required.');
            return res.redirect('/register');
        }

        if (password.length < 6) {
            req.flash('error', 'Password must be at least 6 characters long.');
            return res.redirect('/register');
        }

        // Convert email string to lowercase to prevent unique index duplicates
        const normalEmail = email.toLowerCase().trim();

        // Check if user already exists
        const existingUser = await User.findOne({ email: normalEmail });
        if (existingUser) {
            req.flash('error', 'An account with that email already exists.');
            return res.redirect('/register');
        }

        // Create the user document structure safely
        await User.create({ 
            name: name.trim(), 
            email: normalEmail, 
            password: password, 
            role: role || 'customer' 
        });
        
        req.flash('success', 'Registration successful! Please login.');
        res.redirect('/login');
    } catch (err) {
        // CRITICAL: This line prints the exact reason for the failure in your VS Code terminal!
        console.error("❌ DETAILED REGISTRATION DATABASE ERROR:", err); 
        res.status(500).send("Error creating account");
    }
});

// SHOW LOGIN FORM
app.get('/login', (req, res) => {
    res.render('auth/login');
});

// HANDLE LOGIN LOGIC
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            req.flash('error', 'Invalid email or password.');
            return res.redirect('/login');
        }

        // Compare password hashes using bcrypt
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            req.flash('error', 'Invalid email or password.');
            return res.redirect('/login');
        }

        // Store user details into the secure session cookie
        req.session.user = { id: user._id, name: user.name, role: user.role };
        
        req.flash('success', `Welcome back, ${user.name}!`);
        
        // If they are admin, send them to dashboard, otherwise send to products
        if (user.role === 'admin') {
            res.redirect('/admin');
        } else {
            res.redirect('/products');
        }
    } catch (err) {
        res.status(500).send("Login error");
    }
});

// HANDLE LOGOUT LOGIC
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        // Because session is dead, we redirect to a plain page with feedback notice
        res.redirect('/login'); 
    });
});

// ==========================================
// REQUIREMENT 2: JWT SIGN-IN ENDPOINT
// ==========================================
app.post('/api/v1/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "Invalid email or password." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password." });
        }

        // Generate the JWT Token (encodes user_id and role) expiring in 1 hour
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Return the token payload response
        res.json({
            message: "Login successful!",
            token: token,
            user: { name: user.name, email: user.email, role: user.role }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// REQUIREMENT 1: PUBLIC API ENDPOINTS
// ==========================================

// GET ALL PRODUCTS (With quick query filtering support)
app.get('/api/v1/products', async (req, res) => {
    try {
        let query = {};
        if (req.query.category) {
            query.category = req.query.category;
        }
        const products = await Product.find(query);
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET SINGLE PRODUCT BY ID
app.get('/api/v1/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: "Product not found" });
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// PROTECTED API ENDPOINTS (JWT)
// ==========================================

// GET USER PROFILE
app.get('/api/v1/user/profile', verifyToken, async (req, res) => {
    try {
        // req.user has our decoded ID token payload from the middleware
        const user = await User.findById(req.user.id).select('-password'); 
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// SUBMIT NEW ORDER
app.post('/api/v1/orders', verifyToken, async (req, res) => {
    try {
        const { items, totalAmount } = req.body;
        
        if (!items || !totalAmount) {
            return res.status(400).json({ message: "Missing order items or total validation fields." });
        }

        const newOrder = await Order.create({
            userId: req.user.id, // pulled straight out from the JWT token string!
            items,
            totalAmount
        });

        res.status(201).json({
            message: "Order placed successfully! ☕",
            order: newOrder
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});