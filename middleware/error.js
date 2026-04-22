const notFound = (req, res, next) => {
  res.status(404);
  next(new Error("Route not found: " + req.originalUrl));
};

const errorHandler = (err, req, res, next) => {
  console.error("ERROR:", err.message);
  res.status(res.statusCode === 200 ? 500 : res.statusCode).json({
    success: false,
    message: err.message || "Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
