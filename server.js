// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const connectDB = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// connect to MongoDB then start server
connectDB().then(() => {
  app.use('/api/auth', authRoutes);

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  const port = process.env.PORT || 4000;
  app.listen(port, () => console.log(`Auth server listening on port ${port}`));
});
