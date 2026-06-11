const mongoose = require('mongoose');

const uri = 'mongodb+srv://rushidorinel:rushidorinel@cluster0.cgjgkjb.mongodb.net/votoni?retryWrites=true&w=majority';

console.log('Testing MongoDB Atlas connection...');
mongoose.connect(uri)
  .then(() => {
    console.log('✅ CONNECTED SUCCESSFULLY!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ FAILED:', err.message);
    process.exit(1);
  });
