const express = require("express");
const {
  getUsers,
  loginUser,
  registerUser,
  deleteUser,
  verifyUser,
  changePassword,
  authorizeToken,
  sendPoints,
  getUserTransactions,
  getBiYearlyTransactions,
  getSingleUser,
  makeTopPerformer,
  updateBalance,
  getTransactions,
  calculateFootprint,
} = require("../controllers/user.controller");
const {
  sendNotification,
  getNotifications,
} = require("../controllers/notification.controller");

const router = express.Router({ mergeParams: true });

// General routes
router.route("/login").post(loginUser);
router.route("/register").post(registerUser);
router.route("/verify").post(verifyUser);
router.route("/auth").get(authorizeToken);

// Admin Routes
router.route("/").get(getUsers);
router.route("/transactions").get(getTransactions);
router.route("/user/:id").get(getSingleUser);
router.route("/balance/:id").put(updateBalance);
router.route("/topPerformer/:id").put(makeTopPerformer);
router.route("/delete/:id").delete(deleteUser);
router.route("/notifications").get(getNotifications);

// User Routes
router.route("/sendPoints").post(sendPoints);
router.route("/calculate/").put(calculateFootprint);
router.route("/user-transactions").get(getUserTransactions);
router.route("/biYearlyTransactions").get(getBiYearlyTransactions);
router.route("/notify").post(sendNotification);

// Unused routes
router.route("/changePassword/:id").put(changePassword);

module.exports = router;
