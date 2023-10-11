const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const handlebars = require("handlebars");

const User = require("../models/User");
const Transaction = require("../models/Transaction");

const web3 = require("../utils/Web3Provider");
const asyncHandler = require("../middlewares/async");
const ErrorResponse = require("../utils/errorResponse");

// @desc      Get all users
// @route     GET /api/users
// @access    Admin
exports.getUsers = asyncHandler(async (req, res, next) => {
  const user = await authorize(req);
  if (user) {
    if (user.role !== "admin") {
      res.status(401).json({
        message: "Not Authorized",
      });
      return;
    }
    const users = await User.find({ role: { $ne: "admin" } });
    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } else {
    res.status(404).json({
      message: "Bad request",
    });
  }
});

// @desc      Get single user
// @route     GET /api/users/:id
// @access    Private
exports.getLoggedUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) return next(new ErrorResponse(404, "User not found"));
  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc      Login user
// @route     POST /api/login
// @access    Private
exports.loginUser = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password)
    return next(new ErrorResponse(403, "Fields missing"));
  const user = await User.findOne({ email });
  if (!user) {
    res.status(404).json({ success: false, message: "Invalid Credentials" });
    return next(new ErrorResponse(404, "User not found"));
  }
  await bcrypt.compare(password, user.password, (err, same) => {
    if (err) return next(new ErrorResponse(500, "Failed to compare password"));
    if (same) {
      const token = jwt.sign({ user }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
      });
      res.status(200).json({
        token: token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          wallet: user.walletAddress,
          privateKey: user.privateKey,
          balance: user.balance,
          role: user.role,
          sharedPoints: user.sharedPoints,
        },
      });
    } else {
      return next(new ErrorResponse(401, "Passwords do not match"));
    }
  });
});

const authorize = async (req) => {
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

// @desc      Authorize Token
// @route     GET api/auth/
// @access    Private
exports.authorizeToken = asyncHandler(async (req, res, next) => {
  try {
    const user = await authorize(req);
    res.status(200).json({
      authenticated: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        wallet: user.walletAddress,
        privateKey: user.privateKey,
        balance: user.balance,
        role: user.role,
        sharedPoints: user.sharedPoints,
      },
    });
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: "Invalid Token" });
  }
});

// @desc      Create user
// @route     POST api/signup
// @access    Private
exports.registerUser = asyncHandler(async (req, res, next) => {
  let data = req.body;
  if (data.role && data.role === "admin") {
    res.status(500).send("Fatal Error");
    console.error("Fatal Error");
    return;
  }
  const { name, email, password } = data;
  if (!name || !email || !password)
    return next(new ErrorResponse(400, "Fields missing"));
  const wallet = web3.eth.accounts.create();
  data = Object.assign(req.body, {
    walletAddress: wallet.address,
    privateKey: wallet.privateKey,
  });

  // Check for existing users
  const user = await User.findOne({ email });
  if (user) return next(new ErrorResponse(400, "User already exists"));

  const newUser = await User.create(data);
  const token = jwt.sign({ user: newUser }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  res.status(201).json({ token });
});

// @desc      Send Points
// @route     POST api/sendPoints
// @access    Private
exports.sendPoints = asyncHandler(async (req, res, next) => {
  let { mode, email, snd_address, privateKey, rcv_address, value } = req.body;
  let data;
  if (mode === "wallet") {
    data = {
      from: snd_address,
      to: rcv_address,
      value: parseInt(value),
      gas: 21000,
    };
  } else {
    const rec = await User.findOne({ email: rcv_address });
    data = {
      from: snd_address,
      to: rec.walletAddress,
      value: parseInt(value),
      gas: 21000,
    };
  }
  if (mode === "email") {
    query = { email: rcv_address };
  } else {
    query = { walletAddress: rcv_address };
  }
  web3.eth.accounts
    .signTransaction(data, privateKey)
    .then(async (signedTx) => {
      const userByEmail = await User.findOneAndUpdate(
        { email: email },
        { $inc: { balance: -value, sharedPoints: value } },
        { new: true }
      );
      const userByWallet = await User.findOneAndUpdate(
        query,
        { $inc: { balance: value } },
        { new: true }
      );

      const tx = await Transaction.create({
        txHash: signedTx.transactionHash,
        from: data.from,
        to: data.to,
        value: value,
        createdAt: Date.now(),
      });
    })
    .catch((error) => {
      console.error("Failed to sign transaction:", error);
    });

  res.status(200).json({
    success: true,
    data: data,
  });
});

// @desc      Get User Transactios
// @route     GET /api/transactions/
// @access    Private
exports.getUserTransactions = asyncHandler(async (req, res, next) => {
  try {
    const user = await authorize(req);
    if (!user) res.status(403).send({ error: "User not authorized" });
    const transactions = await Transaction.aggregate([
      {
        $match: {
          $or: [{ from: user.walletAddress }, { to: user.walletAddress }],
        },
      },
      {
        $group: {
          _id: "$_id",
          transaction: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: { newRoot: "$transaction" },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);
    res.status(200).send({
      success: true,
      data: transactions,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .send({ error: "Something went wrong. Please try again later" });
  }
});

// @desc      Get User's 6 months transactions
// @route     GET /api/biyearly-transactions
// @access    Private
exports.getBiYearlyTransactions = asyncHandler(async (req, res, next) => {
  try {
    const user = await authorize(req);
    if (!user) res.status(403).send({ error: "User not authorized" });
    const biYearlyTransactions = await Transaction.aggregate([
      {
        $match: {
          $or: [{ from: user.walletAddress }, { to: user.walletAddress }],
        },
      },
      {
        $group: {
          _id: {
            month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          },
          count: { $sum: 1 }, // Count the number of transactions in each group
          transactions: { $push: "$$ROOT" }, // Store the transactions in each group
        },
      },
      {
        $sort: {
          "_id.month": 1, // Sort by month in descending order (newest first)
        },
      },
    ]);
    const data = biYearlyTransactions.map((transaction) => ({
      month: transaction._id.month,
      count: transaction.count,
    }));

    res.status(200).send({
      success: true,
      data: data,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .send({ error: "Something went wrong. Please try again later" });
  }
});

// @desc      Create user
// @route     POST /api/verify
// @access    Private
exports.verifyUser = asyncHandler(async (req, res, next) => {
  const user = await User.find({ email: req.body.email });
  if (user.length > 0) {
    res.status(403).json({
      error: true,
      msg: "User already exists",
    });
    // return next(new ErrorResponse(403, 'User Already Registered'));
  } else {
    const filePath = path.join(__dirname, "../views/email.handlebars");
    const source = fs.readFileSync(filePath, "utf8");
    const template = handlebars.compile(source);

    var transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_SENDER,
        pass: process.env.MAIL_PASSWORD,
      },
    });
    var OTP = Math.floor(100000 + Math.random() * 100001);
    const name = req.body.name;
    const html = template({ name, OTP });
    var mailOptions = {
      from: process.env.MAIL_SENDER,
      to: req.body.email,
      subject: "Email Verification - EnviroControl",
      html: html,
      // subject: "Verify User",
      // text: `Hello, ${req.body.name}! Your OTP is ${OTP}`,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        res.status(404).json({
          error,
        });
      } else {
        res.status(200).json({
          OTP,
        });
      }
    });
  }
});

// @desc      Change Password
// @route     PUT /api/users/changePassword/:id
// @access    Private
exports.changePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  const salt = await bcrypt.genSalt(10);
  const password = await bcrypt.hash(req.body.new, salt);
  await bcrypt.compare(req.body.old, user.password, async (err, same) => {
    if (err) return next(new ErrorResponse(500, "Failed to compare password"));
    if (same) {
      const newUser = await User.findByIdAndUpdate(
        user.id,
        {
          password: password,
        },
        { returnOriginal: false }
      );
    } else {
      res.status(404).json({
        error: true,
        msg: "Wrong password entered",
      });
    }
  });
  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc      Update user
// @route     GET /api/user/:id
// @access    Private/Admin
exports.getSingleUser = asyncHandler(async (req, res, next) => {
  try {
    const userLoggedIn = await authorize(req);
    if (!userLoggedIn && userLoggedIn.role !== "admin")
      res.status(403).send({ error: "User not authorized" });
    const user = await User.findById(req.params.id);
    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        wallet: user.walletAddress,
        privateKey: user.privateKey,
        balance: user.balance,
        role: user.role,
        sharedPoints: user.sharedPoints,
      },
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .send({ error: "Something went wrong. Please try again later" });
  }
});

// @desc      Update user
// @route     PUT /api/users/:id
// @access    Private/Admin
exports.updateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc      Delete user
// @route     DELETE /api/users/:id
// @access    Private/Admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
  await User.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
  });
});
