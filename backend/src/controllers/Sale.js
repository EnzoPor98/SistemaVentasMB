const mongoose = require("mongoose");
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const Customer = require('../models/Customer');

// @desc    Registrar una venta individual (Online / POS en tiempo real)
// @route   POST /sales
// @access  Privado
const createSale = async (req, res) => {
  const { localId, items, payments, customer, discount, tax, soldAtLocal, channel } = req.body;

  // 1. Verificar idempotencia ANTES de iniciar la transacción pesada
  const existingSale = await Sale.findOne({ localId });
  if (existingSale) {
    return res.status(200).json({
      status: 'success',
      message: 'La venta ya había sido procesada anteriormente',
      data: existingSale,
    });
  }

  // 2. Iniciar la sesión y transacción para el descuento de stock
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let calculatedSubtotal = 0;
    const saleItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product).session(session);

      if (!product || !product.active) {
        throw new Error(`El producto con ID ${item.product} no existe o está inactivo`);
      }

      if (product.stock < item.quantity) {
        throw new Error(`Stock insuficiente para '${product.name}'. Disponible: ${product.stock}, Solicitado: ${item.quantity}`);
      }

      // Descontar stock
      product.stock -= item.quantity;
      await product.save({ session });

      const subtotal = item.quantity * item.unitPrice;
      calculatedSubtotal += subtotal;

      saleItems.push({
        product: product._id,
        code: product.barcode || product.sku,
        name: product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal,
      });
    }

    const totalDiscount = discount || 0;
    const totalTax = tax || 0;
    const finalTotal = calculatedSubtotal - totalDiscount + totalTax;

    const newSale = new Sale({
      localId,
      soldAtLocal: soldAtLocal || new Date(),
      seller: req.user._id,
      customer: customer || null,
      items: saleItems,
      payments,
      subtotal: calculatedSubtotal,
      discount: totalDiscount,
      tax: totalTax,
      total: finalTotal,
      channel: channel || 'POS_LOCAL',
      syncStatus: 'SYNCED',
    });

    await newSale.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      status: 'success',
      data: newSale,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    // Si MongoDB rechaza por índice duplicado (carrera de peticiones)
    if (error.code === 11000) {
      const duplicateSale = await Sale.findOne({ localId });
      return res.status(200).json({
        status: 'success',
        message: 'La venta ya había sido procesada anteriormente',
        data: duplicateSale,
      });
    }

    return res.status(400).json({ status: 'error', message: error.message });
  }
};

// @desc    Sincronización por Lotes (Batch Sync para Ventas Offline acumuladas)
// @route   POST /sales/sync
// @access  Privado
const syncOfflineSales = async (req, res) => {
  const { sales } = req.body; // Se espera un arreglo de objetos de ventas guardados en IndexedDB

  if (!Array.isArray(sales) || sales.length === 0) {
    return res.status(400).json({
      status: "error",
      message:
        "Se requiere un arreglo de ventas válido en el cuerpo de la petición",
    });
  }

  const results = {
    processed: 0,
    failed: 0,
    errors: [],
  };

  for (const saleData of sales) {
    try {
      // Verificar si ya existe por su localId
      const exists = await Sale.findOne({ localId: saleData.localId });
      if (exists) {
        results.processed++;
        continue;
      }

      // Descontar stock y registrar venta
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        let subtotal = 0;
        const saleItems = [];

        for (const item of saleData.items) {
          const product = await Product.findById(item.product).session(session);

          if (product && product.active) {
            product.stock = Math.max(0, product.stock - item.quantity); // Previene stock negativo en sync retrasado
            await product.save({ session });
          }

          const itemSubtotal = item.quantity * item.unitPrice;
          subtotal += itemSubtotal;

          saleItems.push({
            product: item.product,
            code: item.code || "",
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: itemSubtotal,
          });
        }

        const newSale = new Sale({
          ...saleData,
          seller: req.user._id,
          items: saleItems,
          subtotal,
          total: subtotal - (saleData.discount || 0) + (saleData.tax || 0),
          syncStatus: "SYNCED",
        });

        await newSale.save({ session });
        await session.commitTransaction();
        session.endSession();

        results.processed++;
      } catch (err) {
        await session.abortTransaction();
        session.endSession();
        results.failed++;
        results.errors.push({ localId: saleData.localId, error: err.message });
      }
    } catch (err) {
      results.failed++;
      results.errors.push({ localId: saleData.localId, error: err.message });
    }
  }

  res.status(200).json({
    status: "success",
    message: "Proceso de sincronización finalizado",
    data: results,
  });
};

// @desc    Obtener historial de ventas (con filtros de fecha y estado)
// @route   GET /sales
// @access  Privado
const getSales = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const { startDate, endDate, seller, channel } = req.query;

    let query = {};

    if (seller) query.seller = seller;
    if (channel) query.channel = channel;

    // Filtro por rango de fechas
    if (startDate || endDate) {
      query.soldAtLocal = {};
      if (startDate) query.soldAtLocal.$gte = new Date(startDate);
      if (endDate) query.soldAtLocal.$lte = new Date(endDate);
    }

    const total = await Sale.countDocuments(query);
    const sales = await Sale.find(query)
      .populate("seller", "name email")
      .populate("customer", "name identification")
      .skip(skip)
      .limit(limit)
      .sort({ soldAtLocal: -1 });

    res.status(200).json({
      status: "success",
      results: sales.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
      data: sales,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// @desc    Obtener una venta por ID
// @route   GET /sales/:id
// @access  Privado
const getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate("seller", "name email")
      .populate("customer")
      .populate("items.product", "name barcode sku");

    if (!sale) {
      return res.status(404).json({
        status: "error",
        message: "Venta no encontrada",
      });
    }

    res.status(200).json({ status: "success", data: sale });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

module.exports = {
  createSale,
  syncOfflineSales,
  getSales,
  getSaleById,
};
