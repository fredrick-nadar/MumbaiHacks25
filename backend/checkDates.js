const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Transaction = require('./src/models/Transaction');
  
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 4);
  console.log('Looking for transactions after:', startDate.toISOString());
  
  const recentCount = await Transaction.countDocuments({ date: { $gte: startDate } });
  const allCount = await Transaction.countDocuments();
  
  console.log('Transactions in last 4 months:', recentCount);
  console.log('Total transactions:', allCount);
  
  const dateRange = await Transaction.aggregate([
    { $group: { _id: null, minDate: { $min: '$date' }, maxDate: { $max: '$date' } } }
  ]);
  console.log('Date range in DB:', dateRange);
  
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
