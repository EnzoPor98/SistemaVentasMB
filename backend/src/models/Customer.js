const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre o razón social es obligatorio"],
      trim: true,
      index: true,
    },
    docType: {
      type: String,
      enum: ["DNI", "CUIT", "PASAPORTE", "OTRO"],
      default: "DNI",
    },
    docNumber: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    address: {
      street: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      zipCode: { type: String, default: "" },
    },
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
    // Datos de integración con MercadoLibre
    meliBuyerId: {
      type: String,
      default: null,
      index: true,
    },
    notes: {
      type: String,
      default: "",
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

module.exports = mongoose.model("Customer", customerSchema);
