const User = require("../models/User");
const Notification = require("../models/Notification");

const asyncHandler = require("../middlewares/async");
const { authorize } = require("../utils/authorize");

// @desc      Get All Notification
// @route     GET /notifications
// @access    Admin
exports.getNotifications = asyncHandler(async (req, res, next) => {
  const user = await authorize(req);
  if (!user) return res.status(404).json({ message: "Bad request" });

  if (user.role !== "admin") {
    return res.status(401).json({
      message: "Not Authorized",
    });
  }

  try {
    const notifications = await Notification.find({});

    const updatedNotifications = await Promise.all(
      notifications.map(async (noti) => {
        const userData = await User.findOne({ _id: noti.user }); // Assuming `user` field in Notification is the user ID
        if (!userData) {
          console.error(`User not found for notification: ${noti._id}`);
          return noti;
        }
        const updatedNoti = {
          ...noti.toObject(), // Convert Mongoose document to plain JavaScript object
          user: { id: userData._id, name: userData.name },
        };

        return updatedNoti;
      })
    );

    res.status(200).json({
      success: true,
      count: updatedNotifications.length,
      data: updatedNotifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// @desc      Send a notification
// @route     POST /notify
// @access    Admin
exports.sendNotification = asyncHandler(async (req, res, next) => {
  const user = await authorize(req);
  if (!user) res.status(404).json({ message: "Bad request" });
  const { title, content } = req.body;
  if (!title || !content) res.status(400).json({ message: "Bad request" });
  const data = await Notification.create({
    user: user._id,
    title,
    content,
  });
  res.status(200).json({
    success: true,
    data: data,
  });
});
