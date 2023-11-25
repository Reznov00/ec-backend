const mongoose = require("mongoose");

const NotificationSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
  },
  title: {
    type: String,
  },
  content: {
    type: String,
  },
});

module.exports = new mongoose.model("Notifications", NotificationSchema);
