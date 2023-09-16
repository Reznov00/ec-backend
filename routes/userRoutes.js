const express = require("express");
const {
  getUsers,
  loginUser,
  registerUser,
  updateUser,
  deleteUser,
  verifyUser,
  changePassword,
  authorizeToken,
  sendPoints,
  getUserTransactions,
  getBiYearlyTransactions,
} = require("../controllers/userController");

const router = express.Router({ mergeParams: true });

router.route("/").get(getUsers);

router.route("/login").post(loginUser);
router.route("/register").post(registerUser);
router.route("/verify").post(verifyUser);
router.route("/auth").get(authorizeToken);

router.route("/update/:id").put(updateUser);
router.route("/delete/:id").delete(deleteUser);
router.route("/changePassword/:id").put(changePassword);

router.route("/sendPoints").post(sendPoints);

router.route("/transactions").get(getUserTransactions);
router.route("/biYearlyTransactions").get(getBiYearlyTransactions);

module.exports = router;
