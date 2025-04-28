require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const PDFDocument = require('pdfkit');

// Initialize Express app
const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

// Add session middleware
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
}));

// Serve static files from the "public" directory
app.use(express.static('public'));

// Load environment variables
const mongoURI = process.env.uri_mongo ||'mongodb://localhost:27017/';
const PORT = process.env.port || 3000;

// Connect to MongoDB
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.error('Error connecting to MongoDB:', err);
});

// Define a schema for bookings
const bookingSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    departure: String,
    destination: String,
    date: String,
    seats: Number,
});

// Create a model for bookings
const Booking = mongoose.model('Booking', bookingSchema);

// API endpoint to handle form submissions
app.post('/submit-booking', async (req, res) => {
    try {
        const booking = new Booking(req.body);
        await booking.save();

        // Store booking details in the session
        req.session.booking = req.body;

        // Redirect to the ticket page
        res.redirect('/ticket.html');
    } catch (error) {
        res.status(500).send({ message: 'Error saving booking', error });
    }
});

// Root route to serve index.html
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// API endpoint to get ticket details
app.get('/api/ticket', (req, res) => {
    if (req.session.booking) {
        res.json(req.session.booking);
    } else {
        res.status(404).send({ message: 'No ticket found' });
    }
});

app.get('/download-ticket', (req, res) => {
    if (!req.session.booking) {
        return res.status(404).send({ message: 'No ticket found' });
    }

    const booking = req.session.booking;

    // Create a new PDF document
    const doc = new PDFDocument();

    // Set the response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=ticket.pdf');

    // Pipe the PDF document to the response
    doc.pipe(res);

    // Add content to the PDF
    doc.fontSize(20).text('Bus Ticket', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Name: ${booking.name}`);
    doc.text(`Email: ${booking.email}`);
    doc.text(`Phone: ${booking.phone}`);
    doc.text(`Departure: ${booking.departure}`);
    doc.text(`Destination: ${booking.destination}`);
    doc.text(`Date: ${booking.date}`);
    doc.text(`Seats: ${booking.seats}`);
    doc.moveDown();
    doc.text('Thank you for booking with us!', { align: 'center' });

    // Finalize the PDF and end the stream
    doc.end();
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});