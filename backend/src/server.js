/**
 * Project: Vitality Core
 * Copyright (c) 2025 VitalityIP.ai. All rights reserved.
 *
 * This source code and associated documentation are the exclusive property of
 * VitalityIP.ai. Unauthorized use, reproduction, or distribution of this code,
 * in whole or in part, without prior written permission from VitalityIP.ai is
 * strictly prohibited.
 *
 * Created by: VitalityIP.ai
 * Date: January 2025
 */

// server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'vitality-core-backend'
  });
});

// API routes
app.get('/api/status', (req, res) => {
  res.json({ 
    message: 'Vitality Core Backend is running',
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Vitality Core Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API status: http://localhost:${PORT}/api/status`);
});
