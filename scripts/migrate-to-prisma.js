#!/usr/bin/env node

/**
 * Migration script to help transition from raw PostgreSQL to Prisma
 * This script provides commands to set up the database with Prisma
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Prisma migration setup...\n');

// Check if .env file exists
if (!fs.existsSync('.env')) {
  console.log('❌ .env file not found!');
  console.log('Please create a .env file with your DATABASE_URL and other environment variables.');
  console.log('See PRISMA_SETUP.md for details.\n');
  process.exit(1);
}

// Check if DATABASE_URL is set
require('dotenv').config();
if (!process.env.DATABASE_URL) {
  console.log('❌ DATABASE_URL not found in .env file!');
  console.log('Please add DATABASE_URL to your .env file.');
  console.log('Example: DATABASE_URL="postgresql://username:password@localhost:5432/vederra_db"\n');
  process.exit(1);
}

try {
  console.log('📦 Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  
  console.log('\n🔧 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  console.log('\n🗄️  Pushing schema to database...');
  execSync('npx prisma db push', { stdio: 'inherit' });
  
  console.log('\n✅ Migration setup complete!');
  console.log('\nNext steps:');
  console.log('1. Start your development server: npm run dev');
  console.log('2. Open Prisma Studio: npm run db:studio');
  console.log('3. Check your database to verify the tables were created');
  
} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  console.log('\nTroubleshooting:');
  console.log('1. Make sure your PostgreSQL database is running');
  console.log('2. Verify your DATABASE_URL is correct');
  console.log('3. Check that you have the necessary permissions');
  process.exit(1);
}
