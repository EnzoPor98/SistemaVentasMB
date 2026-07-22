const express = require("express");
const router = express.Router();

const {
  getProducts,
  getProductById,
  getProductByBarcode,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/Product");

const { protect, authorize } = require("../middlewares/Auth");

// Aplicar autenticación a todas las rutas de productos
router.use(protect);

// Rutas de lectura (Permitidas para VENDEDOR y ADMIN)
router.get("/", getProducts);
router.get("/barcode/:code", getProductByBarcode);
router.get("/:id", getProductById);

// Rutas de escritura y modificación (Solo ADMIN)
router.post("/", authorize("ADMIN"), createProduct);
router.put("/:id", authorize("ADMIN"), updateProduct);
router.delete("/:id", authorize("ADMIN"), deleteProduct);

module.exports = router;
