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
} = require("../controllers/userController");
const auth = require("../middlewares/auth");

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

module.exports = router;
