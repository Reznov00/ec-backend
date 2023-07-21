const mongoose = require("mongoose");
const colors = require("colors");
const dotenv = require("dotenv");

const User = require("./models/User");
const Transaction = require("./models/Transaction");

dotenv.config({ path: "./config/config.env" });

mongoose.connect(process.env.MONGO_URI, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
  dbName: "envirocontrol",
});

const resetAccounts = async () => {
  try {
    await User.updateMany({}, { balance: 100 });
    await Transaction.deleteMany();
    console.log("ACCOUNTS RESET!".yellow.inverse);
    process.exit();
  } catch (err) {
    console.log(err);
  }
};

const resetDB = async () => {
  try {
    await User.deleteMany();
    await Transaction.deleteMany();
    console.log("DB RESET!".red.inverse);
    process.exit();
  } catch (err) {
    console.log(err);
  }
};

process.argv[2] === "reset"
  ? process.argv[3] === "account"
    ? resetAccounts()
    : resetDB()
  : console.error("Invalid Command");
