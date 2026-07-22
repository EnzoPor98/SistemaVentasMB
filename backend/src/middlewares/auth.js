const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware para verificar token JWT
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Obtener el usuario omitiendo el password
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user || !req.user.active) {
        return res.status(401).json({
          status: "error",
          message: "Usuario no autorizado o inactivo",
        });
      }

      return next();
    } catch (error) {
      return res.status(401).json({
        status: "error",
        message: "Token inválido o expirado",
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      status: "error",
      message: "Acceso denegado, no se proporcionó un token",
    });
  }
};

// Middleware para verificar roles permitidos
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: `El rol '${req.user ? req.user.role : "Desconocido"}' no está autorizado para acceder a esta función`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
