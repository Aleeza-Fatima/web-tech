const express = require('express');
const path = require('path');
const app = express();

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Serve static files (CSS, Images, JS) from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Route for the landing page
app.get('/', (req, res) => {
    res.render('index'); // This looks for 'views/index.ejs'
});

// THIS PART IS CRITICAL - It keeps the server running
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});