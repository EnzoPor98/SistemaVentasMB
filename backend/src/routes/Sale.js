const express = require("express");
const router = express.Router();

const {
  createSale,
  syncOfflineSales,
  getSales,
  getSaleById,
} = require("../controllers/Sale");

const { protect } = require("../middlewares/Auth");

// Todas las rutas de ventas requieren autenticación (Vendedor o Admin)
router.use(protect);

router.post("/", createSale);
router.post("/sync", syncOfflineSales);
router.get("/", getSales);
router.get("/:id", getSaleById);

module.exports = router;
