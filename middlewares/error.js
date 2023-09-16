const ErrorResponse = require("../utils/errorResponse");
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  //Error Message for Dev
  console.error(err);

  if (err.name === "CastError") {
    const msg = `No data with id ${err.value} was found`;
    error = new ErrorResponse(404, msg);
  }
  if (err.code === 11000) {
    const msg = `Duplicate Field Values Entered!`;
    error = new ErrorResponse(400, msg);
  }
  if (err.name === "ValidationError") {
    const msg = Object.values(err.errors).map((val) => val.message);
    error = new ErrorResponse(400, msg);
  }
  res
    .status(error.statusCode || 500)
    .json({ success: false, error: error.message || "Server Error" });
};

module.exports = errorHandler;
