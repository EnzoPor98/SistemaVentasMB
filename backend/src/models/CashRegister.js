const mongoose = require("mongoose");

const cashRegisterSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["OPEN", "CLOSED"],
      default: "OPEN",
    },
    // --- Apertura ---
    openedAt: {
      type: Date,
      default: Date.now,
    },
    initialAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // --- Movimientos manuales (Ingresos / Retiros de efectivo) ---
    movements: [
      {
        type: {
          type: String,
          enum: ["INCOME", "EXPENSE"], // Ingreso extra o Retiro/Gasto
          required: true,
        },
        amount: { type: Number, required: true },
        description: { type: String, default: "" },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // --- Cierre y Arqueo ---
    closedAt: {
      type: Date,
      default: null,
    },
    summary: {
      totalSalesCash: { type: Number, default: 0 },
      totalSalesCard: { type: Number, default: 0 },
      totalSalesMercadoPago: { type: Number, default: 0 },
      totalSalesTransfer: { type: Number, default: 0 },
      expectedCash: { type: Number, default: 0 }, // Calculado por el sistema
      actualCash: { type: Number, default: 0 }, // Declarado por el cajero
      difference: { type: Number, default: 0 }, // (actualCash - expectedCash)
    },
    notes: {
      type: String,
      default: "", // Justificación en caso de que falte o sobre dinero
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("CashRegister", cashRegisterSchema);
