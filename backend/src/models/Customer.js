const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre o razón social es obligatorio"],
      trim: true,
    },
    docType: {
      type: String,
      enum: ["DNI", "CUIT", "PASAPORTE", "OTRO"],
      default: "DNI",
    },
    docNumber: {
      type: String,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      street: String,
      city: String,
      zipCode: String,
    },
    // Para facturación o perfil de precios
    taxCondition: {
      type: String,
      enum: [
        "CONSUMIDOR_FINAL",
        "RESPONSABLE_INSCRIPTO",
        "MONOTRIBUTO",
        "EXENTO",
      ],
      default: "CONSUMIDOR_FINAL",
    },
    // Cuenta Corriente / Saldo adeudado
    currentBalance: {
      type: Number,
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Búsqueda por texto (Nombre o Documento)
customerSchema.index({ name: "text", docNumber: "text" });

module.exports = mongoose.model("Customer", customerSchema);
