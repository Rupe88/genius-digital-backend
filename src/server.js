import app from './app.js';
import { config } from './config/env.js';
import { prisma } from './config/database.js';

const PORT = process.env.PORT || config.port;

// Graceful shutdown
const shutdown = async () => {
  console.log('\nShutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✓ Database connected successfully');
  } catch (error) {
    console.error('⚠️  Database connection failed:', error.message);
    console.warn('⚠️  Server will start anyway, but database operations will fail.');
    console.warn('⚠️  Please check:');
    console.warn('   1. Supabase project is active (not paused)');
    console.warn('   2. Database credentials are correct');
    console.warn('   3. Network/firewall allows connection to Supabase');
  }

  // Start server regardless of database connection
  app.listen(PORT, () => {
    console.log(`✓ Server running on port ${PORT}`);
    console.log(`✓ Environment: ${config.nodeEnv}`);
    console.log(`✓ Health check: http://localhost:${PORT}/health`);
  });
};

startServer();

