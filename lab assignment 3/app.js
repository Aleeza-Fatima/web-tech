const express = require('express');
const path = require('path');
const mongoose = require('mongoose'); // Added mongoose to connect to database
const app = express();


// 1. DATABASE CONNECTION
const MONGO_URI = 'mongodb://localhost:27017/secondcup';

const session = require('express-session');
const connectMongo = require('connect-mongo');
const MongoStore = connectMongo.default || connectMongo;
const flash = require('connect-flash');

mongoose.connect(MONGO_URI)
    .then(() => console.log('Successfully connected to the database!'))
    .catch(err => console.error('Database connection error:', err));

    const bcrypt = require('bcryptjs');

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
// Tell Express that the views folder is inside the 'assignment 4' folder
app.set('views', path.join(__dirname, 'views'));

// Serve static files (CSS, Images, JS) from the 'public' folder
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