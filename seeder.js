const mongoose = require("mongoose");
const colors = require("colors");
const dotenv = require("dotenv");

const User = require("./models/User");
const Transaction = require("./models/Transaction");
const Notification = require("./models/Notification");

dotenv.config({ path: "./config/config.env" });

mongoose.connect(process.env.MONGO_URI, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
  dbName: "envirocontrol",
});

const resetAccounts = async () => {
  try {
    await User.updateMany({}, { balance: 1000 });
    await Transaction.deleteMany();
    await Notification.deleteMany();
    console.log("ACCOUNTS RESET!".yellow.inverse);
    process.exit();
  } catch (err) {
    console.error(err);
  }
};

const resetDB = async () => {
  try {
    await User.deleteMany({ role: { $ne: "admin" } });
    await Transaction.deleteMany();
    await Notification.deleteMany();
    console.log("DB RESET!".red.inverse);
    process.exit();
  } catch (err) {
    console.error(err);
  }
};

process.argv[2] === "reset"
  ? process.argv[3] === "account"
    ? resetAccounts()
    : resetDB()
  : console.error("Invalid Command");
