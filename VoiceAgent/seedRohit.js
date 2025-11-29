/**
 * Seed Rohit's data in MongoDB
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://FREDDY:FREDwin%40%2A09@cluster0.ste53hi.mongodb.net/taxwise';

async function seedRohit() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected!\n');

    // Find Rohit
    const user = await mongoose.connection.db.collection('users').findOne({ 
      email: 'rohi1764375933047@taxwise.local' 
    });
    
    if (!user) {
      console.log('❌ Rohit not found!');
      process.exit(1);
    }
    
    console.log('Found Rohit:', user.name);
    console.log('User ID:', user._id);
    console.log('Current Phone:', user.phone || 'N/A');

    // Update phone number if not set
    if (!user.phone) {
      await mongoose.connection.db.collection('users').updateOne(
        { _id: user._id },
        { $set: { phone: '+12242314556', annualIncome: 600000 } }
      );
      console.log('✅ Updated phone to: +12242314556');
    }

    // Check/Create Tax Profile
    let taxProfile = await mongoose.connection.db.collection('taxprofiles').findOne({ 
      userId: user._id 
    });
    
    if (!taxProfile) {
      await mongoose.connection.db.collection('taxprofiles').insertOne({
        userId: user._id,
        assessmentYear: '2025-26',
        salaryIncome: 600000,
        section80C: 50000,
        section80D: 25000,
        recommendedRegime: 'new',
        createdAt: new Date()
      });
      console.log('✅ Created tax profile: ₹600,000 income, ₹50,000 80C, ₹25,000 80D');
    } else {
      console.log('Tax profile exists:', `₹${taxProfile.salaryIncome} income`);
    }

    // Check/Create Transactions
    const transactions = await mongoose.connection.db.collection('transactions')
      .find({ userId: user._id }).toArray();
    
    console.log(`\nExisting transactions: ${transactions.length}`);
    
    if (transactions.length === 0) {
      await mongoose.connection.db.collection('transactions').insertMany([
        {
          userId: user._id,
          type: 'credit',
          amount: 50000,
          category: 'Salary',
          description: 'Monthly salary - November',
          date: new Date(),
          source: 'manual'
        },
        {
          userId: user._id,
          type: 'debit',
          amount: 15000,
          category: 'Rent',
          description: 'Monthly rent',
          date: new Date(),
          source: 'manual'
        },
        {
          userId: user._id,
          type: 'debit',
          amount: 5000,
          category: 'Food',
          description: 'Groceries and dining',
          date: new Date(),
          source: 'manual'
        },
        {
          userId: user._id,
          type: 'debit',
          amount: 3000,
          category: 'Transport',
          description: 'Fuel and travel',
          date: new Date(),
          source: 'manual'
        },
        {
          userId: user._id,
          type: 'debit',
          amount: 2000,
          category: 'Utilities',
          description: 'Electricity and internet',
          date: new Date(),
          source: 'manual'
        }
      ]);
      console.log('✅ Created 5 sample transactions:');
      console.log('   - Income: ₹50,000 (Salary)');
      console.log('   - Expenses: ₹15,000 (Rent) + ₹5,000 (Food) + ₹3,000 (Transport) + ₹2,000 (Utilities)');
      console.log('   - Total Expenses: ₹25,000');
      console.log('   - Net Savings: ₹25,000');
    }

    console.log('\n✅ Rohit is now ready for voice agent!');
    console.log('Phone: +12242314556');
    console.log('Income: ₹50,000/month (₹600,000/year)');
    console.log('Expenses: ₹25,000/month');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

seedRohit();
