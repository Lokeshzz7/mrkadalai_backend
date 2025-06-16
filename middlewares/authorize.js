const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    const { role } = req.user;

    if (!allowedRoles.includes(role)) {
      
      return res.status(403).json({ error: "Forbidden - You don't have access" });
    }

    next();
  };
};

export default authorize;