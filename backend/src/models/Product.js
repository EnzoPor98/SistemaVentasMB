const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    // --- Identificación de Producto ---
    name: {
      type: String,
      required: [true, "El nombre del producto es obligatorio"],
      trim: true,
      index: true,
    },
    barcode: {
      type: String,
      unique: true,
      sparse: true, // Permite productos sin código de barras sin romper la restricción unique
      trim: true,
      index: true, // Escaneo ultrafast con lector de código de barras
    },
    sku: {
      type: String,
      unique: true,
      trim: true,
      required: [true, "El SKU o código interno es obligatorio"],
    },
    category: {
      type: String,
      default: "General",
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: "",
    },

    // --- Precios ---
    costPrice: {
      type: Number,
      required: [true, "El precio de costo es obligatorio"],
      min: [0, "El costo no puede ser negativo"],
    },
    price: {
      type: Number,
      required: [true, "El precio de venta al público (POS) es obligatorio"],
      min: [0, "El precio no puede ser negativo"],
    },
    meliPrice: {
      type: Number,
      default: null, // Si es null, se utiliza el 'price' base para MercadoLibre
    },

    // --- Control de Inventario / Stock ---
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "El stock no puede ser negativo"],
    },
    minStock: {
      type: Number,
      default: 5, // Alerta de stock bajo para reposición
    },

    // --- Integración con MercadoLibre ---
    meli: {
      itemId: {
        type: String,
        default: null, // Ej: MLA123456789 (Asignado por MercadoLibre al publicar)
        index: true,
      },
      isPublished: {
        type: Boolean,
        default: false,
      },
      syncStock: {
        type: Boolean,
        default: true, // Descontar stock de MeLi automáticamente cuando se vende en el POS
      },
      status: {
        type: String,
        enum: ["NOT_PUBLISHED", "ACTIVE", "PAUSED", "CLOSED"],
        default: "NOT_PUBLISHED",
      },
      permalink: {
        type: String,
        default: "",
      },
    },

    // --- Control de Estado ---
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Método virtual para calcular el margen de ganancia ($)
productSchema.virtual("profitMargin").get(function () {
  return this.price - this.costPrice;
});

// Método virtual para saber si el stock está en nivel crítico
productSchema.virtual("isLowStock").get(function () {
  return this.stock <= this.minStock;
});

module.exports = mongoose.model("Product", productSchema);
