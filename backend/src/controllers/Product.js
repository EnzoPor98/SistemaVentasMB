const Product = require("../models/Product");

// @desc    Obtener todos los productos (con paginación, filtro y búsqueda)
// @route   GET /api/v1/products
// @access  Privado
const getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const { search, category, lowStock } = req.query;

    // Filtros de búsqueda
    let query = { active: true };

    if (category) {
      query.category = category;
    }

    if (lowStock === "true") {
      query.$expr = { $lte: ["$stock", "$minStock"] };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { barcode: search }, // Búsqueda exacta si se escanea código de barras
      ];
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ name: 1 });

    res.status(200).json({
      status: "success",
      results: products.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
      data: products,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// @desc    Obtener un producto por su ID de MongoDB
// @route   GET /api/v1/products/:id
// @access  Privado
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product || !product.active) {
      return res.status(404).json({
        status: "error",
        message: "Producto no encontrado",
      });
    }

    res.status(200).json({ status: "success", data: product });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// @desc    Obtener un producto por Código de Barras (Escáner POS)
// @route   GET /api/v1/products/barcode/:code
// @access  Privado
const getProductByBarcode = async (req, res) => {
  try {
    const product = await Product.findOne({
      barcode: req.params.code,
      active: true,
    });

    if (!product) {
      return res.status(404).json({
        status: "error",
        message: "Producto no encontrado con el código de barras proporcionado",
      });
    }

    res.status(200).json({ status: "success", data: product });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// @desc    Crear un nuevo producto
// @route   POST /api/v1/products
// @access  Privado (ADMIN)
const createProduct = async (req, res) => {
  try {
    const { barcode, sku } = req.body;

    // Verificar duplificados de SKU o Barcode
    if (sku) {
      const skuExists = await Product.findOne({ sku });
      if (skuExists) {
        return res.status(400).json({
          status: "error",
          message: "El SKU ya está asignado a otro producto",
        });
      }
    }

    if (barcode) {
      const barcodeExists = await Product.findOne({ barcode });
      if (barcodeExists) {
        return res.status(400).json({
          status: "error",
          message: "El Código de Barras ya está asignado a otro producto",
        });
      }
    }

    const newProduct = await Product.create(req.body);

    res.status(201).json({ status: "success", data: newProduct });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// @desc    Actualizar datos de un producto
// @route   PUT /api/v1/products/:id
// @access  Privado (ADMIN)
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!product || !product.active) {
      return res.status(404).json({
        status: "error",
        message: "Producto no encontrado",
      });
    }

    res.status(200).json({ status: "success", data: product });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// @desc    Desactivar / Borrado Lógico de Producto
// @route   DELETE /api/v1/products/:id
// @access  Privado (ADMIN)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true },
    );

    if (!product) {
      return res.status(404).json({
        status: "error",
        message: "Producto no encontrado",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Producto eliminado (desactivado) exitosamente",
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

module.exports = {
  getProducts,
  getProductById,
  getProductByBarcode,
  createProduct,
  updateProduct,
  deleteProduct,
};
