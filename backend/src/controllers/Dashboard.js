const Sale = require("../models/Sale");
const Product = require("../models/Product");

// @desc    Obtener métricas consolidadas del Dashboard
// @route   GET /dashboard
// @access  Privado (Solo ADMIN)
const getDashboardMetrics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Rango de fechas por defecto: Mes actual
    const now = new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate
      ? new Date(endDate)
      : new Date(now.setHours(23, 59, 59, 999));

    const dateFilter = {
      soldAtLocal: { $gte: start, $lte: end },
      status: "COMPLETADA",
    };

    // 1. Resumen General (Monto Total, Cantidad de Ventas y Promedio)
    const salesSummary = await Sale.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" },
          totalSalesCount: { $sum: 1 },
          avgTicket: { $avg: "$total" },
        },
      },
    ]);

    const summary = salesSummary[0] || {
      totalRevenue: 0,
      totalSalesCount: 0,
      avgTicket: 0,
    };

    // 2. Total por Métodos de Pago
    const paymentMetrics = await Sale.aggregate([
      { $match: dateFilter },
      { $unwind: "$payments" },
      {
        $group: {
          _id: "$payments.type",
          totalAmount: { $sum: "$payments.amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // 3. Ventas por Canal (POS Local vs MercadoLibre)
    const channelMetrics = await Sale.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$channel",
          totalRevenue: { $sum: "$total" },
          salesCount: { $sum: 1 },
        },
      },
    ]);

    // 4. Top 5 Productos más vendidos en el período
    const topProducts = await Sale.aggregate([
      { $match: dateFilter },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          productName: { $first: "$items.name" },
          productCode: { $first: "$items.code" },
          totalUnitsSold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.subtotal" },
        },
      },
      { $sort: { totalUnitsSold: -1 } },
      { $limit: 5 },
    ]);

    // 5. Alertas de Stock Bajo
    const lowStockProducts = await Product.find({
      active: true,
      $expr: { $lte: ["$stock", "$minStock"] },
    }).select("name barcode sku stock minStock price");

    const totalProductsCount = await Product.countDocuments({ active: true });

    // 6. Evolución Diaria de Ventas (Para gráficos de líneas/barras)
    const dailySales = await Sale.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$soldAtLocal" },
          },
          revenue: { $sum: "$total" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      status: "success",
      data: {
        period: {
          start,
          end,
        },
        kpis: {
          totalRevenue: summary.totalRevenue,
          totalSalesCount: summary.totalSalesCount,
          avgTicket: Math.round(summary.avgTicket || 0),
          lowStockAlertsCount: lowStockProducts.length,
          totalProductsInCatalog: totalProductsCount,
        },
        paymentMethods: paymentMetrics,
        channels: channelMetrics,
        topProducts,
        lowStockProducts,
        dailySalesTrend: dailySales,
      },
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

module.exports = {
  getDashboardMetrics,
};
