require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/config/db");

const PORT = process.env.PORT || 5000;

// Conectar a MongoDB e iniciar el servidor
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(
      `🚀 Servidor ejecutándose en el puerto ${PORT} [Modo: ${process.env.NODE_ENV}]`,
    );
  });
});
