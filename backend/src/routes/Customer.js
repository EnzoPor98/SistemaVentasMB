const express = require("express");
const router = express.Router();
const {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} = require("../controllers/Customer");
const { protect, authorize } = require("../middlewares/Auth");

router.use(protect); // Todas las rutas requieren autenticación

router.route("/").get(getCustomers).post(createCustomer);

router
  .route("/:id")
  .get(getCustomerById)
  .put(updateCustomer)
  .delete(authorize("ADMIN"), deleteCustomer);

module.exports = router;
