const User = require("../models/User");
const generateToken = require("../utils/generateToken");

// @desc    Registrar un nuevo usuario
// @route   POST auth/register
// @access  Público (o restringido a ADMIN)
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Verificar si el email ya existe
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        status: "error",
        message: "El correo electrónico ya se encuentra registrado",
      });
    }

    // Crear el usuario
    const user = await User.create({
      name,
      email,
      password,
      role: role || "VENDEDOR",
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      status: "success",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// @desc    Iniciar sesión (Login)
// @route   POST auth/login
// @access  Público
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Por favor ingrese email y contraseña",
      });
    }

    // Incluir explícitamente el campo password que por defecto está oculto
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        status: "error",
        message: "Credenciales inválidas",
      });
    }

    if (!user.active) {
      return res.status(401).json({
        status: "error",
        message: "Esta cuenta se encuentra desactivada",
      });
    }

    // Actualizar fecha de último login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      status: "success",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// @desc    Obtener datos del usuario autenticado actual
// @route   GET auth/me
// @access  Privado
const getMe = async (req, res) => {
  res.status(200).json({
    status: "success",
    data: req.user,
  });
};

module.exports = {
  register,
  login,
  getMe,
};
