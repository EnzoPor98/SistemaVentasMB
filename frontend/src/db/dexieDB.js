import Dexie from "dexie";

export const db = new Dexie("PosOfflineDB");

// Definir tablas e índices para consultas rápidas
db.version(1).stores({
  products: "_id, barcode, sku, name, category, price, stock",
  customers: "_id, docNumber, name",
  salesPending: "++id, localId, soldAtLocal, syncStatus",
  activeCashRegister: "id, openedAt, status",
});

// Función auxiliar para guardar/actualizar catálogo de productos desde el backend
export const syncProductsToLocal = async (products) => {
  await db.products.bulkPut(products);
};

// Función para guardar venta en cola offline
export const saveSaleOffline = async (saleData) => {
  return await db.salesPending.add({
    ...saleData,
    syncStatus: "PENDING",
    createdAtLocal: new Date().toISOString(),
  });
};
