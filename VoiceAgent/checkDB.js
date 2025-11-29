/**
 * Check MongoDB database for users and transactions
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://FREDDY:FREDwin%40%2A09@cluster0.ste53hi.mongodb.net/taxwise';

async function checkDB() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected!\n');

    // Get all users
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    console.log('=== USERS IN DATABASE ===');
    console.log(`Total: ${users.length} users\n`);
    users.forEach(u => {
      console.log(`📱 Phone: ${u.phone || 'N/A'}`);
      console.log(`   Name: ${u.name || 'N/A'}`);
      console.log(`   Email: ${u.email || 'N/A'}`);
      console.log(`   Annual Income: ₹${u.annualIncome || 0}`);
      console.log('---');
    });

    // Get transactions
    const transactions = await mongoose.connection.db.collection('transactions').find({}).limit(10).toArray();
    console.log('\n=== RECENT TRANSACTIONS ===');
    console.log(`Total found: ${transactions.length}\n`);
    transactions.forEach(t => {
      console.log(`💰 Amount: ₹${t.amount} | Type: ${t.type} | Category: ${t.category}`);
    });

    // Get tax profiles
    const taxProfiles = await mongoose.connection.db.collection('taxprofiles').find({}).limit(5).toArray();
    console.log('\n=== TAX PROFILES ===');
    console.log(`Total found: ${taxProfiles.length}\n`);
    taxProfiles.forEach(t => {
      console.log(`📊 Salary Income: ₹${t.salaryIncome || 0}`);
      console.log(`   80C: ₹${t.section80C || 0} | 80D: ₹${t.section80D || 0}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkDB();
