const Customer = require("../models/Customer");

// @desc    Obtener lista de clientes (con búsqueda y paginación)
// @route   GET /customers
// @access  Privado (ADMIN, VENDEDOR)
const getCustomers = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;

    const query = { active: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { docNumber: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const count = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ name: 1 });

    res.status(200).json({
      status: "success",
      total: count,
      page: Number(page),
      totalPages: Math.ceil(count / limit),
      data: customers,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// @desc    Obtener cliente por ID
// @route   GET /customers/:id
// @access  Privado
const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      active: true,
    });

    if (!customer) {
      return res
        .status(404)
        .json({ status: "fail", message: "Cliente no encontrado" });
    }

    res.status(200).json({ status: "success", data: customer });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// @desc    Crear un nuevo cliente
// @route   POST /customers
// @access  Privado
const createCustomer = async (req, res) => {
  try {
    const { docNumber } = req.body;

    // Verificar si ya existe un cliente activo con el mismo documento
    if (docNumber) {
      const existingCustomer = await Customer.findOne({
        docNumber,
        active: true,
      });

      if (existingCustomer) {
        return res.status(400).json({
          status: "fail",
          message:
            "Ya existe un cliente registrado con ese número de documento",
        });
      }
    }

    const customer = await Customer.create(req.body);

    res.status(201).json({ status: "success", data: customer });
  } catch (error) {
    res.status(400).json({ status: "fail", message: error.message });
  }
};

// @desc    Actualizar cliente
// @route   PUT /customers/:id
// @access  Privado
const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, active: true },
      req.body,
      { new: true, runValidators: true },
    );

    if (!customer) {
      return res
        .status(404)
        .json({ status: "fail", message: "Cliente no encontrado" });
    }

    res.status(200).json({ status: "success", data: customer });
  } catch (error) {
    res.status(400).json({ status: "fail", message: error.message });
  }
};

// @desc    Eliminación lógica de cliente (soft delete)
// @route   DELETE /customers/:id
// @access  Privado (Solo ADMIN)
const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true },
    );

    if (!customer) {
      return res
        .status(404)
        .json({ status: "fail", message: "Cliente no encontrado" });
    }

    res.status(200).json({
      status: "success",
      message: "Cliente desactivado correctamente",
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
