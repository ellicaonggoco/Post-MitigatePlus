const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

// Enforce strict TLS in production; allow self-signed local dev bypass only if STRICT_SSL is not true
if (process.env.NODE_ENV === 'development' && process.env.STRICT_SSL !== 'true') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}
dotenv.config();

const connectDB = require('./config/db');

const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);

// Disable fingerprinting header
app.disable('x-powered-by');

// Enterprise Security Headers (HSTS, Anti-Sniffing, Anti-Clickjacking)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },
  noSniff: true,
}));

const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim()) 
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8081', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'];

const checkOrigin = (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || origin.endsWith('.onrender.com')) {
    callback(null, true);
  } else {
    callback(new Error('Not allowed by CORS'));
  }
};

const io = socketIo(server, {
  cors: {
    origin: checkOrigin,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true,
  },
});

app.use(cors({
  origin: checkOrigin,
  credentials: true,
}));

// Request Payload Body Size Limiter (Prevents DoS through large payload flooding)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));

// NoSQL Injection Sanitization (Strips $ and . operators from requests)
app.use(mongoSanitize());

// Multi-Tier Rate Limiting Architecture
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' }
});
app.use('/api/', globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please try again after 15 minutes.' }
});
app.use('/api/auth/login', authLimiter);

const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many OTP requests from this address. Please try again after 1 hour.' }
});
app.use('/api/auth/send-otp', otpLimiter);
app.use('/api/auth/forgot-password', otpLimiter);

// Set socket.io instance accessible in route handlers
app.set('io', io);

// Socket.IO Room Management
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('join_barangay_room', (barangayCode) => {
    socket.join(`barangay:${barangayCode}`);
    console.log(`Socket ${socket.id} joined room: barangay:${barangayCode}`);
  });

  socket.on('join_household_room', (householdId) => {
    socket.join(`household:${householdId}`);
    console.log(`Socket ${socket.id} joined room: household:${householdId}`);
  });

  socket.on('join_admin_room', () => {
    socket.join('admin_room');
    console.log(`Socket ${socket.id} joined admin_room`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/households', require('./routes/householdRoutes'));
app.use('/api/assistance-requests', require('./routes/assistanceRoutes'));
app.use('/api/distributions', require('./routes/distributionRoutes'));
app.use('/api/damage-reports', require('./routes/damageReportRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/announcements', require('./routes/announcementRoutes'));
app.use('/api/incidents', require('./routes/incidentRoutes'));
app.use('/api/audit-logs', require('./routes/auditLogRoutes'));
app.use('/api/warehouse', require('./routes/warehouseRoutes'));
app.use('/api/recovery', require('./routes/recoveryRoutes'));
app.use('/api/policy', require('./routes/policyRoutes'));

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    app: 'MitigatePlus Backend API',
    scope: 'Manila City Post-Disaster Recovery System',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 5000;
const bootstrapSystem = require('./utils/bootstrap');

connectDB().then(async () => {
  await bootstrapSystem();

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[PORT CONFLICT] Port ${PORT} is already in use by another running terminal.`);
      console.error(`Close any other open terminal running the backend or use a different port (e.g. PORT=5001).\n`);
      process.exit(1);
    } else {
      console.error('Server error:', err);
    }
  });

  server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`MitigatePlus API Server running on port ${PORT}`);
    console.log(`Target Scope: Manila City Post-Disaster Recovery System`);
    console.log(`====================================================`);
  });
});
