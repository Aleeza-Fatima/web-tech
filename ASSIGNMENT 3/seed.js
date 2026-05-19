const mongoose = require('mongoose');
const Product = require('./Product');

// This uses standard HTTPS fallback protocol which network firewalls cannot block
const MONGO_URI = 'mongodb://localhost:27017/secondcup';

const coffeeShopItems = [
    { name: "Caffé Latte", price: 645, category: "Hot Drinks", rating: 4.6, stock: 50 },
    { name: "Cappuccino", price: 645, category: "Hot Drinks", rating: 4.7, stock: 45 },
    { name: "Caffé Americano", price: 495, category: "Hot Drinks", rating: 4.2, stock: 60 },
    { name: "Caramel Corretto", price: 725, category: "Hot Drinks", rating: 4.8, stock: 30 },
    { name: "Vanilla Bean Latte", price: 695, category: "Hot Drinks", rating: 4.5, stock: 25 },
    { name: "White Mocha", price: 745, category: "Hot Drinks", rating: 4.7, stock: 20 },
    { name: "Hot Chocolate", price: 595, category: "Hot Drinks", rating: 4.4, stock: 35 },
    { name: "Espresso Solo", price: 395, category: "Hot Drinks", rating: 4.1, stock: 100 },
    
    { name: "Iced Latte", price: 685, category: "Cold Drinks", rating: 4.5, stock: 40 },
    { name: "Caramel Loop Chill", price: 795, category: "Cold Drinks", rating: 4.9, stock: 15 },
    { name: "Mocaccino Chill", price: 765, category: "Cold Drinks", rating: 4.6, stock: 22 },
    { name: "Iced Americano", price: 525, category: "Cold Drinks", rating: 4.3, stock: 50 },
    { name: "Strawberry Smoothie", price: 725, category: "Cold Drinks", rating: 4.4, stock: 18 },
    { name: "Mango Passion Frappe", price: 750, category: "Cold Drinks", rating: 4.5, stock: 20 },
    { name: "Iced White Mocha", price: 785, category: "Cold Drinks", rating: 4.7, stock: 25 },
    
    { name: "Signature Blend Beans", price: 2800, category: "Whole Beans", rating: 4.9, stock: 15 },
    { name: "Dark Roast Espresso Beans", price: 2950, category: "Whole Beans", rating: 4.8, stock: 12 },
    { name: "Decaf Blend Beans", price: 2850, category: "Whole Beans", rating: 4.0, stock: 8 },
    { name: "Colombia Single Origin", price: 3200, category: "Whole Beans", rating: 4.7, stock: 10 },
    { name: "Ethiopian Yirgacheffe", price: 3400, category: "Whole Beans", rating: 4.9, stock: 7 },
    
    { name: "Chocolate Fudge Cake Slice", price: 495, category: "Snacks", rating: 4.6, stock: 14 },
    { name: "Butter Croissant", price: 295, category: "Snacks", rating: 4.3, stock: 30 },
    { name: "Blueberry Muffin", price: 345, category: "Snacks", rating: 4.5, stock: 20 },
    { name: "Almond Biscotti", price: 195, category: "Snacks", rating: 4.2, stock: 40 }
];

async function seedDatabase() {
    try {
        console.log("Connecting to cloud database...");
        // Explicitly await the connection first
        await mongoose.connect(MONGO_URI);
        console.log("Connected successfully! Seeding data...");

        // Run database queries sequentially
        await Product.deleteMany({}); 
        await Product.insertMany(coffeeShopItems);
        
        console.log("Database successfully seeded with 24 Second Cup items!");
    } catch (error) {
        console.error("Database error occurred:", error);
    } finally {
        await mongoose.connection.close();
        console.log("Connection closed smoothly.");
    }
}

seedDatabase();