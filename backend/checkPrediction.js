const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Prediction = require('./src/models/Prediction');
  
  const latest = await Prediction.findOne().sort({createdAt: -1});
  console.log('Latest prediction:');
  console.log(JSON.stringify(latest, null, 2));
  
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
