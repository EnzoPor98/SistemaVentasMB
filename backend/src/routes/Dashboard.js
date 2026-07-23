const express = require("express");
const router = express.Router();
const { getDashboardMetrics } = require("../controllers/dashboard");
const { protect, authorize } = require("../middlewares/auth");

// Protegido: Solo accesible por Administradores
router.use(protect);
router.use(authorize("ADMIN"));

router.get("/", getDashboardMetrics);

module.exports = router;
