const CashRegister = require("../models/CashRegister");
const Sale = require("../models/Sale");

// @desc    Abrir una nueva caja/turno
// @route   POST /cash-registers/open
// @access  Privado (Vendedor / Admin)
const openRegister = async (req, res) => {
  try {
    const { initialAmount } = req.body;

    if (initialAmount === undefined || initialAmount < 0) {
      return res.status(400).json({
        status: "error",
        message: "Debe ingresar un monto inicial válido (mayor o igual a 0)",
      });
    }

    // Verificar si el usuario ya tiene una caja abierta
    const existingOpen = await CashRegister.findOne({
      seller: req.user._id,
      status: "OPEN",
    });

    if (existingOpen) {
      return res.status(400).json({
        status: "error",
        message:
          "Ya tienes una caja abierta. Debes cerrarla antes de abrir una nueva.",
        data: existingOpen,
      });
    }

    const newRegister = await CashRegister.create({
      seller: req.user._id,
      initialAmount,
      openedAt: new Date(),
      status: "OPEN",
    });

    res.status(201).json({
      status: "success",
      data: newRegister,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// @desc    Obtener la caja abierta actual del usuario autenticado
// @route   GET /cash-registers/current
// @access  Privado
const getCurrentRegister = async (req, res) => {
  try {
    const activeRegister = await CashRegister.findOne({
      seller: req.user._id,
      status: "OPEN",
    });

    if (!activeRegister) {
      return res.status(200).json({
        status: "success",
        data: null,
        message: "No hay ninguna caja abierta actualmente",
      });
    }

    // Calcular en tiempo real las ventas realizadas durante este turno
    const sales = await Sale.find({
      seller: req.user._id,
      createdAt: { $gte: activeRegister.openedAt },
      status: "COMPLETADA",
    });

    let totalSalesCash = 0;
    let totalSalesCard = 0;
    let totalSalesMercadoPago = 0;
    let totalSalesTransfer = 0;

    // Cambiar payment.method por payment.type
    sales.forEach((sale) => {
      if (sale.payments && Array.isArray(sale.payments)) {
        sale.payments.forEach((payment) => {
          const methodType = payment.type || payment.method; // Soporta ambos por compatibilidad
          if (methodType === "EFECTIVO") totalSalesCash += payment.amount;
          if (
            methodType === "TARJETA_CREDITO" ||
            methodType === "TARJETA_DEBITO" ||
            methodType === "TARJETA"
          )
            totalSalesCard += payment.amount;
          if (
            methodType === "MERCADOPAGO_QR" ||
            methodType === "MERCADOPAGO_POINT" ||
            methodType === "MERCADOPAGO"
          )
            totalSalesMercadoPago += payment.amount;
          if (methodType === "TRANSFERENCIA")
            totalSalesTransfer += payment.amount;
        });
      }
    });

    // Sumar ingresos y restar egresos manuales de efectivo
    let totalManualIncome = 0;
    let totalManualExpenses = 0;

    activeRegister.movements.forEach((mov) => {
      if (mov.type === "INCOME") totalManualIncome += mov.amount;
      if (mov.type === "EXPENSE") totalManualExpenses += mov.amount;
    });

    const expectedCash =
      activeRegister.initialAmount +
      totalSalesCash +
      totalManualIncome -
      totalManualExpenses;

    res.status(200).json({
      status: "success",
      data: {
        register: activeRegister,
        liveMetrics: {
          totalSalesCash,
          totalSalesCard,
          totalSalesMercadoPago,
          totalSalesTransfer,
          totalManualIncome,
          totalManualExpenses,
          expectedCash,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// @desc    Registrar movimiento manual de dinero (Ingreso / Retiro)
// @route   POST /cash-registers/movement
// @access  Privado
const addMovement = async (req, res) => {
  try {
    const { type, amount, description } = req.body;

    if (!["INCOME", "EXPENSE"].includes(type) || !amount || amount <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Tipo de movimiento o monto inválido",
      });
    }

    const activeRegister = await CashRegister.findOne({
      seller: req.user._id,
      status: "OPEN",
    });

    if (!activeRegister) {
      return res.status(400).json({
        status: "error",
        message: "No tienes una caja abierta para registrar movimientos",
      });
    }

    activeRegister.movements.push({
      type,
      amount,
      description: description || "",
      createdAt: new Date(),
    });

    await activeRegister.save();

    res.status(200).json({
      status: "success",
      data: activeRegister,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// @desc    Cerrar la caja actual y realizar el arqueo
// @route   POST /cash-registers/close
// @access  Privado
const closeRegister = async (req, res) => {
  try {
    const { actualCash, notes } = req.body;

    if (actualCash === undefined || actualCash < 0) {
      return res.status(400).json({
        status: "error",
        message: "Debe declarar la cantidad física de efectivo en caja",
      });
    }

    const activeRegister = await CashRegister.findOne({
      seller: req.user._id,
      status: "OPEN",
    });

    if (!activeRegister) {
      return res.status(400).json({
        status: "error",
        message: "No hay ninguna caja abierta para cerrar",
      });
    }

    // Consolidar ventas del turno
    const sales = await Sale.find({
      seller: req.user._id,
      createdAt: { $gte: activeRegister.openedAt },
      status: "COMPLETADA",
    });

    let totalSalesCash = 0;
    let totalSalesCard = 0;
    let totalSalesMercadoPago = 0;
    let totalSalesTransfer = 0;

    sales.forEach((sale) => {
      if (sale.payments && Array.isArray(sale.payments)) {
        sale.payments.forEach((p) => {
          const methodType = p.type || p.method;
          if (methodType === "EFECTIVO") totalSalesCash += p.amount;
          if (
            methodType === "TARJETA_CREDITO" ||
            methodType === "TARJETA_DEBITO" ||
            methodType === "TARJETA"
          )
            totalSalesCard += p.amount;
          if (
            methodType === "MERCADOPAGO_QR" ||
            methodType === "MERCADOPAGO_POINT" ||
            methodType === "MERCADOPAGO"
          )
            totalSalesMercadoPago += p.amount;
          if (methodType === "TRANSFERENCIA") totalSalesTransfer += p.amount;
        });
      }
    });

    let totalManualIncome = 0;
    let totalManualExpenses = 0;

    activeRegister.movements.forEach((mov) => {
      if (mov.type === "INCOME") totalManualIncome += mov.amount;
      if (mov.type === "EXPENSE") totalManualExpenses += mov.amount;
    });

    const expectedCash =
      activeRegister.initialAmount +
      totalSalesCash +
      totalManualIncome -
      totalManualExpenses;
    const difference = actualCash - expectedCash;

    // Guardar resumen final de cierre
    activeRegister.status = "CLOSED";
    activeRegister.closedAt = new Date();
    activeRegister.notes = notes || "";
    activeRegister.summary = {
      totalSalesCash,
      totalSalesCard,
      totalSalesMercadoPago,
      totalSalesTransfer,
      expectedCash,
      actualCash,
      difference,
    };

    await activeRegister.save();

    res.status(200).json({
      status: "success",
      message: "Caja cerrada exitosamente",
      data: activeRegister,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

module.exports = {
  openRegister,
  getCurrentRegister,
  addMovement,
  closeRegister,
};
