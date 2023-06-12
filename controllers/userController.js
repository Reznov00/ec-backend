const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middlewares/async");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const web3 = require("../utils/Web3Provider");

// @desc      Get all users
// @route     GET /api/users
// @access    Admin
exports.getUsers = asyncHandler(async (req, res, next) => {
  const users = await User.find();
  res.status(200).json({
    success: true,
    count: users.length,
    data: users,
  });
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

// @desc      Get single user/Login user
// @route     GET /api/users/:email/:password
// @access    Private
exports.loginUser = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password)
    return next(new ErrorResponse(403, "Fields missing"));
  const user = await User.findOne({ email });
  if (!user) return next(new ErrorResponse(404, "User not found"));
  await bcrypt.compare(password, user.password, (err, same) => {
    if (err) return next(new ErrorResponse(500, "Failed to compare password"));
    if (same) {
      const token = jwt.sign({ user }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
      });
      console.log(user);
      res.status(200).json({ token });
    } else {
      return next(new ErrorResponse(401, "Passwords do not match"));
    }
  });
});

const authorize = async (req) => {
  try {
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
        name: user.name,
        email: user.email,
        wallet: user.walletAddress,
        privateKey: user.privateKey,
        balance: user.balance,
      },
    });
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid Token" });
  }
});

// @desc      Create user
// @route     POST api/signup
// @access    Private
exports.registerUser = asyncHandler(async (req, res, next) => {
  let data = req.body;
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
    console.log(data);
  } else {
    const rec = await User.findOne({ email });
    data = {
      from: snd_address,
      to: rec.walletAddress,
      value: parseInt(value),
      gas: 21000,
    };
    console.log(data);
  }
  if (mode === "email") {
    query = { email: rcv_address };
  } else {
    query = { walletAddress: rcv_address };
  }
  web3.eth.accounts
    .signTransaction(data, privateKey)
    .then(async (signedTx) => {
      console.log(signedTx);
      const userByEmail = await User.findOneAndUpdate(
        { email: email },
        { $inc: { balance: -value } },
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
    const tx = await Transaction.find({ from: user.walletAddress });
    res.status(200).send({
      success: true,
      data: tx,
    });
  } catch (e) {
    console.error(e);
    res
      .status(500)
      .send({ error: "Something went wrong. Please try again later" });
  }
});

// @desc      Create user
// @route     POST /api/users/verify
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
    var transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_SENDER,
        pass: process.env.MAIL_PASSWORD,
      },
    });
    var OTP = Math.floor(100000 + Math.random() * 100001);
    var mailOptions = {
      from: process.env.MAIL_SENDER,
      to: req.body.email,
      subject: "Verify User",
      text: `Hello, ${req.body.name}! Your OTP is ${OTP}`,
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
      console.log(user.password, newUser.password);
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
