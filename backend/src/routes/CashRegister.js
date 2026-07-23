const express = require("express");
const router = express.Router();
const {
  openRegister,
  getCurrentRegister,
  addMovement,
  closeRegister,
} = require("../controllers/CashRegister");
const { protect } = require("../middlewares/Auth");

// Todas las rutas de caja requieren autenticación
router.use(protect);

router.post("/open", openRegister);
router.get("/current", getCurrentRegister);
router.post("/movement", addMovement);
router.post("/close", closeRegister);

module.exports = router;
