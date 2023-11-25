const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.authorize = async (req) => {
  try {
    if (!req.headers.authorization) return;
    const token = String(req?.headers?.authorization?.replace("Bearer ", ""));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ email: decoded.user.email });
    return user;
  } catch (e) {
    console.error(e);
  }
};
