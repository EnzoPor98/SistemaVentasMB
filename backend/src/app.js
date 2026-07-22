const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");

const authRoutes = require("./routes/Auth");
const productRoutes = require("./routes/Product");
const saleRoutes = require("./routes/Sale");

const app = express();

// Middlewares de seguridad y registros
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*", // Ajustaremos esto con la URL exacta del Frontend en React
    credentials: true,
  }),
);

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Middleware para parsear JSON y urlencoded en los bodies de la petición
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta de comprobación de estado (Health Check)
app.get("/", (req, res) => {
  res.status(200).json({
    message: "API del Sistema de Ventas en ejecución",
  });
});

// Rutas
app.use("/auth", authRoutes);
app.use("/products", productRoutes);
app.use("/sales", saleRoutes);

// Manejo de rutas no encontradas (404)
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: `Ruta no encontrada - ${req.originalUrl}`,
  });
});

module.exports = app;
