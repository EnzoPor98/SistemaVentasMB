const mongoose = require("mongoose");

// Subesquema para los ítems de la venta (snapshot histórico)
const saleItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    code: { type: String, default: "" }, // Código de barras o SKU al momento de la venta
    name: { type: String, required: true },
    quantity: {
      type: Number,
      required: true,
      min: [1, "La cantidad debe ser al menos 1"],
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, "El precio no puede ser negativo"],
    },
    subtotal: {
      type: Number,
      required: true,
    },
  },
  { _id: false },
);

// Subesquema para los métodos de pago (soporta pago mixto)
const paymentMethodSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "EFECTIVO",
        "MERCADOPAGO_QR",
        "MERCADOPAGO_POINT",
        "TARJETA_CREDITO",
        "TARJETA_DEBITO",
        "TRANSFERENCIA",
      ],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, "El monto debe ser positivo"],
    },
    reference: {
      type: String,
      default: "", // Ej: ID de transacción de MercadoPago o N° de comprobante
    },
  },
  { _id: false },
);

const saleSchema = new mongoose.Schema(
  {
    // --- Identificación y Sincronización Offline ---
    localId: {
      type: String,
      required: true,
      unique: true,
      index: true, // ID único (UUID v4) generado por el Frontend/PWA sin conexión
    },
    syncStatus: {
      type: String,
      enum: ["SYNCED", "PENDING"],
      default: "SYNCED",
    },
    soldAtLocal: {
      type: Date,
      required: true, // Fecha real de cuando el cliente pagó en caja (incluso sin internet)
    },

    // --- Relaciones ---
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "El vendedor es obligatorio"],
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null, // null = Consumidor Final / Venta rápida
    },

    // --- Detalle de la Operación ---
    items: [saleItemSchema],
    payments: [paymentMethodSchema],

    // --- Totales Financieros ---
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },

    // --- Canal de Venta e Integraciones ---
    channel: {
      type: String,
      enum: ["POS_LOCAL", "MERCADOLIBRE", "ECOMMERCE_WEB"],
      default: "POS_LOCAL",
    },
    meliOrderId: {
      type: String,
      default: null,
      index: true, // Para vincular las ventas que entren desde la API de MercadoLibre
    },
    status: {
      type: String,
      enum: ["COMPLETADA", "CANCELADA", "DEVUELTA"],
      default: "COMPLETADA",
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Sale", saleSchema);
