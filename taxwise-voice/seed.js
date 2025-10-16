const { connectDB } = require('./src/config/mongo');
const User = require('./src/models/User');
const Alert = require('./src/models/Alert');
const config = require('./src/config/env');

const seedData = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to database
    await connectDB();
    
    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Alert.deleteMany({});
    
    // Create test users
    const testUsers = [
      {
        phone: '+917058513631', // Your actual WhatsApp number
        name: 'Fredrick Marsh',
        email: 'fredrickmarsh2006@gmail.com',
        vitals: {
          financeScore: 45, // Low score to trigger alerts
          monthIncome: 65000,
          monthExpense: 58000, // High expense ratio
          utilization: 75, // High utilization to trigger alerts
          cibilEstimate: 620 // Below threshold to trigger CIBIL alert
        }
      },
      {
        phone: '+917058513632', // Test number (your number + 1)
        name: 'Dhaval Khandhadia',
        email: 'dhaval@example.com',
        vitals: {
          financeScore: 85, // Good score
          monthIncome: 120000,
          monthExpense: 75000,
          utilization: 25, // Healthy utilization
          cibilEstimate: 780 // Good CIBIL score
        }
      },
      {
        phone: '+917058513633', // Test number (your number + 2)
        name: 'Test User Critical',
        email: 'testcritical@example.com',
        vitals: {
          financeScore: 25, // Very low score
          monthIncome: 40000,
          monthExpense: 42000, // Spending more than income
          utilization: 85, // Very high utilization
          cibilEstimate: 580 // Very low CIBIL (will trigger critical alerts)
        }
      }
    ];
    
    console.log('👥 Creating test users...');
    const createdUsers = [];
    
    for (const userData of testUsers) {
      try {
        const user = new User(userData);
        await user.save();
        createdUsers.push(user);
        
        console.log(`✅ Created user: ${user.name} (${user.phoneFormatted})`);
        console.log(`   Finance Score: ${user.vitals.financeScore}`);
        console.log(`   CIBIL Score: ${user.vitals.cibilEstimate}`);
        console.log(`   Utilization: ${user.vitals.utilization}%`);
        console.log(`   Monthly: Income ₹${user.vitals.monthIncome.toLocaleString('en-IN')}, Expense ₹${user.vitals.monthExpense.toLocaleString('en-IN')}`);
        console.log('');
      } catch (error) {
        console.error(`❌ Failed to create user ${userData.name}:`, error.message);
        if (error.code === 11000) {
          console.log('   (User with this phone number already exists)');
        }
      }
    }
    
    // Create some sample alerts for testing
    console.log('🚨 Creating sample alerts...');
    
    if (createdUsers.length > 0) {
      const criticalUser = createdUsers.find(u => u.vitals.cibilEstimate < config.CIBIL_THRESHOLD);
      
      if (criticalUser) {
        const sampleAlert = await Alert.createCibilDropAlert(
          criticalUser._id,
          criticalUser.vitals.cibilEstimate,
          config.CIBIL_THRESHOLD + 50, // Simulate previous higher score
          config.CIBIL_THRESHOLD
        );
        
        console.log(`✅ Created sample CIBIL drop alert for ${criticalUser.name}`);
        console.log(`   Alert ID: ${sampleAlert._id}`);
        console.log(`   Severity: ${sampleAlert.severity}`);
      }
    }
    
    // Display summary
    console.log('\n📊 Seeding Summary:');
    console.log('=' .repeat(50));
    console.log(`👥 Users created: ${createdUsers.length}`);
    console.log(`🚨 Alerts created: ${createdUsers.length > 0 ? 1 : 0}`);
    
    if (createdUsers.length > 0) {
      console.log('\n🧪 Test Information:');
      console.log('Call-me endpoint test:');
      createdUsers.forEach(user => {
        console.log(`   POST /voice/call-me?userId=${user._id}`);
        console.log(`   User: ${user.name} (${user.phoneFormatted})`);
      });
      
      console.log('\nVAPI tool query test:');
      createdUsers.forEach(user => {
        console.log(`   POST /vapi/tool/query`);
        console.log(`   Body: { "phone": "${user.phone}", "question": "what's my cibil score?" }`);
      });
      
      console.log('\nTest alert endpoint (development):');
      createdUsers.forEach(user => {
        console.log(`   POST /test/alert/${user._id}`);
      });
    }
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Update .env file with your actual Twilio and VAPI credentials');
    console.log('2. Replace phone numbers in this seed file with real test numbers');
    console.log('3. Configure Twilio webhook URLs');
    console.log('4. Set up VAPI agent with tool configuration');
    console.log('5. Start the server: npm run dev');
    console.log('6. Test the endpoints using the information above');
    
    console.log('\n✅ Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    process.exit(0);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedData();
}

module.exports = { seedData };