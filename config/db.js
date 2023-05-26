const mongoose = require('mongoose');

const connectDB = async () => {
    const conn = await mongoose.connect(process.env.MONGO_URI,{
        useUnifiedTopology: true,
        useNewUrlParser: true,
        dbName: 'envirocontrol'
    });

    console.log('MongoDB Connected'.bold.green.inverse);
}

module.exports = connectDB;