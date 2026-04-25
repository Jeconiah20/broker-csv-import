import express from 'express';
import cors from 'cors';
import importRoutes from './routes/import';

// Create the Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allows requests from different origins
app.use(express.json()); // Parses incoming JSON requests

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Import routes (CSV upload endpoint)
app.use('/api', importRoutes);

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📝 POST /api/import - Upload CSV file to import trades`);
});