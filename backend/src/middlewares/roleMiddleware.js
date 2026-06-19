export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.type) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Role not found",
      });
    }

    if (!allowedRoles.includes(req.user.type)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden - You do not have permission to perform this action",
      });
    }

    next();
  };
};
