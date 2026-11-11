import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { 
  Store, 
  Product, 
  Customer, 
  Supplier, 
  Sale, 
  StockMovement, 
  StockTransfer, 
  CashRegisterSession,
  PaymentMethod,
  StockAlert 
} from '../types';
import { 
  INITIAL_STORES, 
  INITIAL_PRODUCTS, 
  INITIAL_CUSTOMERS, 
  INITIAL_SUPPLIERS, 
  INITIAL_SALES, 
  INITIAL_TRANSFERS, 
  INITIAL_MOVEMENTS, 
  INITIAL_SESSIONS 
} from '../data/mockData';

const STORAGE_KEY = 'omniboutique_pro_state_v1';

interface StoreContextType {
  stores: Store[];
  selectedStoreId: string; // 'all' or specific storeId
  setSelectedStoreId: (id: string) => void;
  selectedStore: Store | undefined;
  
  currency: string;
  setCurrency: (c: string) => void;
  formatMoney: (amount: number, customCurrency?: string) => string;

  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;

  sales: Sale[];
  createSale: (saleData: {
    storeId: string;
    cashierName: string;
    customerId?: string;
    customerName?: string;
    items: Array<{
      product: Product;
      quantity: number;
      discountPercent?: number;
      unitPrice?: number;
    }>;
    paymentMethod: PaymentMethod;
    amountPaid: number;
    notes?: string;
  }) => { success: boolean; sale?: Sale; error?: string };
  cancelSale: (data: {
    saleId: string;
    reason: string;
    restockItems: boolean;
    cancelledBy: string;
  }) => { success: boolean; error?: string };

  transfers: StockTransfer[];
  executeTransfer: (data: {
    fromStoreId: string;
    toStoreId: string;
    items: Array<{ productId: string; quantity: number }>;
    performedBy: string;
    notes?: string;
  }) => { success: boolean; error?: string };

  movements: StockMovement[];
  receiveSupplierDelivery: (data: {
    storeId: string;
    supplierName: string;
    items: Array<{ productId: string; quantity: number; unitCost: number }>;
    reference: string;
    performedBy: string;
  }) => void;
  adjustStock: (data: {
    storeId: string;
    productId: string;
    deltaQuantity: number;
    reason: string;
    type: 'adjustment' | 'loss';
    performedBy: string;
  }) => void;

  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id' | 'totalSpent' | 'purchasesCount' | 'creditBalance'>) => void;
  updateCustomer: (customer: Customer) => void;
  recordDebtPayment: (customerId: string, amount: number, paymentMethod: PaymentMethod, note?: string) => void;

  suppliers: Supplier[];
  addSupplier: (supplier: Omit<Supplier, 'id'>) => void;

  sessions: CashRegisterSession[];
  activeSession: CashRegisterSession | undefined;
  openCashSession: (storeId: string, cashierName: string, openingBalance: number) => CashRegisterSession;
  closeCashSession: (sessionId: string, actualCash: number, notes?: string) => CashRegisterSession | null;

  addStore: (store: Omit<Store, 'id' | 'createdAt'>) => void;
  updateStore: (store: Store) => void;

  // Visual Stock Alerts System
  stockAlerts: StockAlert[];
  dismissedAlertIds: string[];
  dismissAlert: (alertId: string) => void;
  restoreAlerts: () => void;
  updateProductThreshold: (productId: string, newThreshold: number) => void;
  pendingTransferPrefill: { fromStoreId?: string; toStoreId?: string; productId?: string } | null;
  setPendingTransferPrefill: (data: { fromStoreId?: string; toStoreId?: string; productId?: string } | null) => void;
  pendingReceptionPrefill: { storeId?: string; productId?: string } | null;
  setPendingReceptionPrefill: (data: { storeId?: string; productId?: string } | null) => void;

  resetToDemo: () => void;
  exportJSON: () => string;
  importJSON: (jsonString: string) => boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [stores, setStores] = useState<Store[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_stores`);
    return saved ? JSON.parse(saved) : INITIAL_STORES;
  });

  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');
  const [currency, setCurrency] = useState<string>('FCFA');

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_products`);
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_sales`);
    return saved ? JSON.parse(saved) : INITIAL_SALES;
  });

  const [transfers, setTransfers] = useState<StockTransfer[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_transfers`);
    return saved ? JSON.parse(saved) : INITIAL_TRANSFERS;
  });

  const [movements, setMovements] = useState<StockMovement[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_movements`);
    return saved ? JSON.parse(saved) : INITIAL_MOVEMENTS;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_customers`);
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_suppliers`);
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
  });

  const [sessions, setSessions] = useState<CashRegisterSession[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_sessions`);
    return saved ? JSON.parse(saved) : INITIAL_SESSIONS;
  });

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_stores`, JSON.stringify(stores));
  }, [stores]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_products`, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_sales`, JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_transfers`, JSON.stringify(transfers));
  }, [transfers]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_movements`, JSON.stringify(movements));
  }, [movements]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_customers`, JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_suppliers`, JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_sessions`, JSON.stringify(sessions));
  }, [sessions]);

  // Stock alert state
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);
  const [pendingTransferPrefill, setPendingTransferPrefill] = useState<{ fromStoreId?: string; toStoreId?: string; productId?: string } | null>(null);
  const [pendingReceptionPrefill, setPendingReceptionPrefill] = useState<{ storeId?: string; productId?: string } | null>(null);

  // Compute real-time stock alerts based on defined critical thresholds (minStockAlert)
  const stockAlerts = useMemo(() => {
    const alerts: StockAlert[] = [];

    products.forEach(product => {
      stores.forEach(store => {
        // If a specific boutique is selected in header, only report alerts for that store; if 'all', report all stores
        if (selectedStoreId !== 'all' && store.id !== selectedStoreId) {
          return;
        }

        const stock = product.stockByStore[store.id] ?? 0;
        if (stock <= product.minStockAlert) {
          const alertId = `${product.id}-${store.id}`;
          if (dismissedAlertIds.includes(alertId)) return;

          // Check which other stores in the network currently have stock available for an inter-store transfer
          const alternatives = stores
            .filter(s => s.id !== store.id && (product.stockByStore[s.id] || 0) > 0)
            .map(s => ({
              storeId: s.id,
              storeName: s.name,
              storeCode: s.code,
              stock: product.stockByStore[s.id] || 0,
            }));

          alerts.push({
            id: alertId,
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            barcode: product.barcode,
            category: product.category,
            unit: product.unit,
            storeId: store.id,
            storeName: store.name,
            storeCode: store.code,
            currentStock: stock,
            minThreshold: product.minStockAlert,
            deficit: Math.max(1, product.minStockAlert - stock),
            severity: stock === 0 ? 'out_of_stock' : 'critical',
            supplierName: product.supplierName,
            alternativeStoresWithStock: alternatives,
          });
        }
      });
    });

    // Rank: Total ruptures first, then by deficit
    return alerts.sort((a, b) => {
      if (a.severity === 'out_of_stock' && b.severity !== 'out_of_stock') return -1;
      if (b.severity === 'out_of_stock' && a.severity !== 'out_of_stock') return 1;
      return b.deficit - a.deficit;
    });
  }, [products, stores, selectedStoreId, dismissedAlertIds]);

  const dismissAlert = (alertId: string) => {
    setDismissedAlertIds(prev => [...prev, alertId]);
  };

  const restoreAlerts = () => {
    setDismissedAlertIds([]);
  };

  const updateProductThreshold = (productId: string, newThreshold: number) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, minStockAlert: Math.max(1, newThreshold) } : p));
  };

  const selectedStore = selectedStoreId === 'all' 
    ? undefined 
    : stores.find(s => s.id === selectedStoreId);

  // Active session for the currently selected store (or first open session if 'all')
  const activeSession = selectedStoreId === 'all'
    ? sessions.find(s => s.status === 'open')
    : sessions.find(s => s.storeId === selectedStoreId && s.status === 'open');

  const formatMoney = (amount: number, customCurrency?: string) => {
    const curr = customCurrency || currency;
    const isZeroDecimal = curr === 'FCFA' || curr === 'GNF' || curr === 'FG';
    const formattedNum = new Intl.NumberFormat('fr-FR', {
      maximumFractionDigits: isZeroDecimal ? 0 : 2,
      minimumFractionDigits: isZeroDecimal ? 0 : 2,
    }).format(amount);

    if (curr === 'FCFA') return `${formattedNum} FCFA`;
    if (curr === 'GNF' || curr === 'FG') return `${formattedNum} GNF`;
    if (curr === '€') return `${formattedNum} €`;
    if (curr === '$') return `$${formattedNum}`;
    return `${formattedNum} ${curr}`;
  };

  const addProduct = (prodData: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...prodData,
      id: `prod-${Date.now()}`,
    };
    setProducts(prev => [newProduct, ...prev]);
  };

  const updateProduct = (updated: Product) => {
    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const createSale = (saleData: {
    storeId: string;
    cashierName: string;
    customerId?: string;
    customerName?: string;
    items: Array<{
      product: Product;
      quantity: number;
      discountPercent?: number;
      unitPrice?: number;
    }>;
    paymentMethod: PaymentMethod;
    amountPaid: number;
    notes?: string;
  }) => {
    if (saleData.items.length === 0) {
      return { success: false, error: 'Le panier est vide' };
    }

    const targetStore = stores.find(s => s.id === saleData.storeId);
    if (!targetStore) {
      return { success: false, error: 'Boutique introuvable' };
    }

    // Verify stock availability
    for (const item of saleData.items) {
      const prodInStore = products.find(p => p.id === item.product.id);
      const currentStock = prodInStore?.stockByStore[saleData.storeId] || 0;
      if (currentStock < item.quantity) {
        return { 
          success: false, 
          error: `Stock insuffisant pour "${item.product.name}" (${currentStock} disponible(s), ${item.quantity} demandé(s))` 
        };
      }
    }

    let subtotal = 0;
    let costOfGoodsSold = 0;
    const saleItems = saleData.items.map(item => {
      const unitP = item.unitPrice ?? item.product.sellingPrice;
      const discountPct = item.discountPercent || 0;
      const discountedUnitP = unitP * (1 - discountPct / 100);
      const lineTotal = discountedUnitP * item.quantity;
      const lineCost = item.product.purchasePrice * item.quantity;

      subtotal += lineTotal;
      costOfGoodsSold += lineCost;

      return {
        productId: item.product.id,
        productName: item.product.name,
        sku: item.product.sku,
        unit: item.product.unit,
        quantity: item.quantity,
        purchasePrice: item.product.purchasePrice,
        unitPrice: unitP,
        discountPercent: discountPct,
        total: lineTotal,
      };
    });

    const taxAmount = 0; // Tax included or 0
    const total = subtotal;
    const grossProfit = total - costOfGoodsSold;
    const profitMarginRate = total > 0 ? (grossProfit / total) * 100 : 0;
    const changeGiven = saleData.paymentMethod === 'cash' 
      ? Math.max(0, saleData.amountPaid - total) 
      : 0;

    const receiptNum = `TC-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${(sales.length + 1).toString().padStart(4, '0')}`;

    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      receiptNumber: receiptNum,
      storeId: saleData.storeId,
      cashierName: saleData.cashierName,
      customerId: saleData.customerId,
      customerName: saleData.customerName,
      items: saleItems,
      subtotal,
      discountTotal: 0,
      taxAmount,
      total,
      costOfGoodsSold,
      grossProfit,
      profitMarginRate,
      paymentMethod: saleData.paymentMethod,
      amountPaid: saleData.paymentMethod === 'credit' ? 0 : saleData.amountPaid,
      changeGiven,
      status: 'completed',
      createdAt: new Date().toISOString(),
      notes: saleData.notes,
    };

    // Update stock levels
    setProducts(prevProducts => {
      return prevProducts.map(p => {
        const soldItem = saleData.items.find(i => i.product.id === p.id);
        if (!soldItem) return p;

        const currentQty = p.stockByStore[saleData.storeId] || 0;
        return {
          ...p,
          stockByStore: {
            ...p.stockByStore,
            [saleData.storeId]: Math.max(0, currentQty - soldItem.quantity),
          },
        };
      });
    });

    // Record stock movements
    const newMovements: StockMovement[] = saleData.items.map(i => ({
      id: `mov-${Date.now()}-${i.product.id}`,
      date: new Date().toISOString(),
      type: 'sale',
      productId: i.product.id,
      productName: i.product.name,
      storeId: saleData.storeId,
      quantity: -i.quantity,
      unitCost: i.product.purchasePrice,
      reference: receiptNum,
      reason: `Vente caisse #${receiptNum}`,
      performedBy: saleData.cashierName,
    }));
    setMovements(prev => [...newMovements, ...prev]);

    // Update customer stats and credit balance if applicable
    if (saleData.customerId) {
      setCustomers(prevCustomers => {
        return prevCustomers.map(c => {
          if (c.id !== saleData.customerId) return c;
          const addedCredit = saleData.paymentMethod === 'credit' ? total : 0;
          return {
            ...c,
            totalSpent: c.totalSpent + total,
            purchasesCount: c.purchasesCount + 1,
            creditBalance: c.creditBalance + addedCredit,
            lastPurchaseDate: new Date().toISOString(),
          };
        });
      });
    }

    // Update active register session for this store if exists
    setSessions(prevSessions => {
      return prevSessions.map(sess => {
        if (sess.storeId === saleData.storeId && sess.status === 'open') {
          const cashAmount = saleData.paymentMethod === 'cash' ? total : 0;
          const cardAmount = saleData.paymentMethod === 'card' ? total : 0;
          const mobileAmount = saleData.paymentMethod === 'mobile_money' ? total : 0;
          const creditAmount = saleData.paymentMethod === 'credit' ? total : 0;

          return {
            ...sess,
            cashSales: sess.cashSales + cashAmount,
            cardSales: sess.cardSales + cardAmount,
            mobileSales: sess.mobileSales + mobileAmount,
            creditSales: sess.creditSales + creditAmount,
            totalSales: sess.totalSales + total,
            salesCount: sess.salesCount + 1,
            expectedCash: sess.expectedCash + cashAmount,
          };
        }
        return sess;
      });
    });

    setSales(prev => [newSale, ...prev]);
    return { success: true, sale: newSale };
  };

  const cancelSale = (data: {
    saleId: string;
    reason: string;
    restockItems: boolean;
    cancelledBy: string;
  }): { success: boolean; error?: string } => {
    const saleToCancel = sales.find(s => s.id === data.saleId);
    if (!saleToCancel) {
      return { success: false, error: 'Vente introuvable' };
    }
    if (saleToCancel.status === 'cancelled') {
      return { success: false, error: 'Cette transaction a déjà été annulée' };
    }

    const now = new Date().toISOString();

    // 1. Restock items in the corresponding store if enabled
    if (data.restockItems) {
      setProducts(prevProducts => {
        return prevProducts.map(prod => {
          const itemInSale = saleToCancel.items.find(i => i.productId === prod.id);
          if (!itemInSale) return prod;
          const currentQty = prod.stockByStore[saleToCancel.storeId] || 0;
          return {
            ...prod,
            stockByStore: {
              ...prod.stockByStore,
              [saleToCancel.storeId]: currentQty + itemInSale.quantity,
            },
          };
        });
      });

      // Log movement for restock
      const restockMovements: StockMovement[] = saleToCancel.items.map(item => ({
        id: `mov-${Date.now()}-${item.productId}-cancel`,
        date: now,
        type: 'adjustment',
        productId: item.productId,
        productName: item.productName,
        storeId: saleToCancel.storeId,
        quantity: item.quantity,
        unitCost: item.purchasePrice,
        reference: saleToCancel.receiptNumber,
        reason: `Annulation vente ticket #${saleToCancel.receiptNumber}: ${data.reason}`,
        performedBy: data.cancelledBy,
      }));
      setMovements(prev => [...restockMovements, ...prev]);
    }

    // 2. Adjust customer ledger if customer is linked
    if (saleToCancel.customerId) {
      setCustomers(prev => prev.map(c => {
        if (c.id !== saleToCancel.customerId) return c;
        const creditReversal = saleToCancel.paymentMethod === 'credit' ? saleToCancel.total : 0;
        return {
          ...c,
          totalSpent: Math.max(0, c.totalSpent - saleToCancel.total),
          purchasesCount: Math.max(0, c.purchasesCount - 1),
          creditBalance: Math.max(0, c.creditBalance - creditReversal),
          notes: `${c.notes ? c.notes + ' | ' : ''}Annulation ticket #${saleToCancel.receiptNumber} (-${saleToCancel.total})`,
        };
      }));
    }

    // 3. Adjust active register session for this store if exists
    setSessions(prevSessions => {
      return prevSessions.map(sess => {
        if (sess.storeId === saleToCancel.storeId && sess.status === 'open') {
          const cashAmount = saleToCancel.paymentMethod === 'cash' ? saleToCancel.total : 0;
          const cardAmount = saleToCancel.paymentMethod === 'card' ? saleToCancel.total : 0;
          const mobileAmount = saleToCancel.paymentMethod === 'mobile_money' ? saleToCancel.total : 0;
          const creditAmount = saleToCancel.paymentMethod === 'credit' ? saleToCancel.total : 0;

          return {
            ...sess,
            cashSales: Math.max(0, sess.cashSales - cashAmount),
            cardSales: Math.max(0, sess.cardSales - cardAmount),
            mobileSales: Math.max(0, sess.mobileSales - mobileAmount),
            creditSales: Math.max(0, sess.creditSales - creditAmount),
            totalSales: Math.max(0, sess.totalSales - saleToCancel.total),
            salesCount: Math.max(0, sess.salesCount - 1),
            expectedCash: Math.max(0, sess.expectedCash - cashAmount),
          };
        }
        return sess;
      });
    });

    // 4. Update the sale status in sales list
    setSales(prev => prev.map(s => {
      if (s.id !== data.saleId) return s;
      return {
        ...s,
        status: 'cancelled',
        cancellationReason: data.reason,
        cancelledAt: now,
        cancelledBy: data.cancelledBy,
      };
    }));

    return { success: true };
  };

  const executeTransfer = (data: {
    fromStoreId: string;
    toStoreId: string;
    items: Array<{ productId: string; quantity: number }>;
    performedBy: string;
    notes?: string;
  }) => {
    if (data.fromStoreId === data.toStoreId) {
      return { success: false, error: 'La boutique source et destination doivent être différentes.' };
    }
    if (data.items.length === 0) {
      return { success: false, error: 'Veuillez sélectionner au moins un article à transférer.' };
    }

    // Verify sufficient stock in source store
    for (const item of data.items) {
      const prod = products.find(p => p.id === item.productId);
      const available = prod?.stockByStore[data.fromStoreId] || 0;
      if (available < item.quantity) {
        return { 
          success: false, 
          error: `Stock insuffisant à l'entrepôt source pour "${prod?.name}" (${available} en stock, ${item.quantity} demandé)` 
        };
      }
    }

    const transferRef = `TR-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${(transfers.length + 1).toString().padStart(2, '0')}`;

    const transferItemsWithDetails = data.items.map(it => {
      const prod = products.find(p => p.id === it.productId)!;
      return {
        productId: it.productId,
        productName: prod.name,
        quantity: it.quantity,
        unitCost: prod.purchasePrice,
      };
    });

    const newTransfer: StockTransfer = {
      id: `tr-${Date.now()}`,
      reference: transferRef,
      fromStoreId: data.fromStoreId,
      toStoreId: data.toStoreId,
      items: transferItemsWithDetails,
      date: new Date().toISOString(),
      status: 'completed',
      performedBy: data.performedBy,
      notes: data.notes,
    };

    // Update stocks atomically
    setProducts(prev => {
      return prev.map(p => {
        const transferredItem = data.items.find(i => i.productId === p.id);
        if (!transferredItem) return p;

        const currentFrom = p.stockByStore[data.fromStoreId] || 0;
        const currentTo = p.stockByStore[data.toStoreId] || 0;

        return {
          ...p,
          stockByStore: {
            ...p.stockByStore,
            [data.fromStoreId]: Math.max(0, currentFrom - transferredItem.quantity),
            [data.toStoreId]: currentTo + transferredItem.quantity,
          },
        };
      });
    });

    // Create stock movement ledger records (out & in)
    const newMovements: StockMovement[] = [];
    transferItemsWithDetails.forEach(item => {
      newMovements.push({
        id: `mov-${Date.now()}-out-${item.productId}`,
        date: new Date().toISOString(),
        type: 'transfer_out',
        productId: item.productId,
        productName: item.productName,
        storeId: data.fromStoreId,
        toStoreId: data.toStoreId,
        quantity: -item.quantity,
        unitCost: item.unitCost,
        reference: transferRef,
        reason: `Transfert sortant vers ${stores.find(s => s.id === data.toStoreId)?.name}`,
        performedBy: data.performedBy,
      });
      newMovements.push({
        id: `mov-${Date.now()}-in-${item.productId}`,
        date: new Date().toISOString(),
        type: 'transfer_in',
        productId: item.productId,
        productName: item.productName,
        storeId: data.toStoreId,
        toStoreId: data.fromStoreId,
        quantity: item.quantity,
        unitCost: item.unitCost,
        reference: transferRef,
        reason: `Réception transfert depuis ${stores.find(s => s.id === data.fromStoreId)?.name}`,
        performedBy: data.performedBy,
      });
    });

    setMovements(prev => [...newMovements, ...prev]);
    setTransfers(prev => [newTransfer, ...prev]);

    return { success: true };
  };

  const receiveSupplierDelivery = (data: {
    storeId: string;
    supplierName: string;
    items: Array<{ productId: string; quantity: number; unitCost: number }>;
    reference: string;
    performedBy: string;
  }) => {
    setProducts(prev => {
      return prev.map(p => {
        const receivedItem = data.items.find(i => i.productId === p.id);
        if (!receivedItem) return p;

        const currentQty = p.stockByStore[data.storeId] || 0;
        return {
          ...p,
          purchasePrice: receivedItem.unitCost > 0 ? receivedItem.unitCost : p.purchasePrice,
          stockByStore: {
            ...p.stockByStore,
            [data.storeId]: currentQty + receivedItem.quantity,
          },
        };
      });
    });

    const newMovements: StockMovement[] = data.items.map(item => {
      const prod = products.find(p => p.id === item.productId);
      return {
        id: `mov-${Date.now()}-${item.productId}`,
        date: new Date().toISOString(),
        type: 'reception',
        productId: item.productId,
        productName: prod ? prod.name : 'Article',
        storeId: data.storeId,
        quantity: item.quantity,
        unitCost: item.unitCost,
        reference: data.reference,
        reason: `Livraison fournisseur: ${data.supplierName}`,
        performedBy: data.performedBy,
      };
    });

    setMovements(prev => [...newMovements, ...prev]);
  };

  const adjustStock = (data: {
    storeId: string;
    productId: string;
    deltaQuantity: number;
    reason: string;
    type: 'adjustment' | 'loss';
    performedBy: string;
  }) => {
    const prod = products.find(p => p.id === data.productId);
    if (!prod) return;

    setProducts(prev => {
      return prev.map(p => {
        if (p.id !== data.productId) return p;
        const currentQty = p.stockByStore[data.storeId] || 0;
        const newQty = Math.max(0, currentQty + data.deltaQuantity);
        return {
          ...p,
          stockByStore: {
            ...p.stockByStore,
            [data.storeId]: newQty,
          },
        };
      });
    });

    const newMov: StockMovement = {
      id: `mov-${Date.now()}`,
      date: new Date().toISOString(),
      type: data.type,
      productId: data.productId,
      productName: prod.name,
      storeId: data.storeId,
      quantity: data.deltaQuantity,
      unitCost: prod.purchasePrice,
      reason: data.reason,
      performedBy: data.performedBy,
    };

    setMovements(prev => [newMov, ...prev]);
  };

  const addCustomer = (customerData: Omit<Customer, 'id' | 'totalSpent' | 'purchasesCount' | 'creditBalance'>) => {
    const newCust: Customer = {
      ...customerData,
      id: `cust-${Date.now()}`,
      creditBalance: 0,
      totalSpent: 0,
      purchasesCount: 0,
    };
    setCustomers(prev => [newCust, ...prev]);
  };

  const updateCustomer = (updated: Customer) => {
    setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  const recordDebtPayment = (customerId: string, amount: number, paymentMethod: PaymentMethod, note?: string) => {
    setCustomers(prev => {
      return prev.map(c => {
        if (c.id !== customerId) return c;
        const newBalance = Math.max(0, c.creditBalance - amount);
        return {
          ...c,
          creditBalance: newBalance,
          notes: note ? `${c.notes ? c.notes + ' | ' : ''}Règlement de ${amount} (${paymentMethod})` : c.notes,
        };
      });
    });
  };

  const addSupplier = (supData: Omit<Supplier, 'id'>) => {
    const newSup: Supplier = {
      ...supData,
      id: `sup-${Date.now()}`,
    };
    setSuppliers(prev => [...prev, newSup]);
  };

  const openCashSession = (storeId: string, cashierName: string, openingBalance: number): CashRegisterSession => {
    const newSession: CashRegisterSession = {
      id: `sess-${Date.now()}`,
      storeId,
      cashierName,
      openedAt: new Date().toISOString(),
      openingBalance,
      cashSales: 0,
      cardSales: 0,
      mobileSales: 0,
      creditSales: 0,
      totalSales: 0,
      salesCount: 0,
      expectedCash: openingBalance,
      status: 'open',
    };
    setSessions(prev => [newSession, ...prev]);
    return newSession;
  };

  const closeCashSession = (sessionId: string, actualCash: number, notes?: string): CashRegisterSession | null => {
    let closed: CashRegisterSession | null = null;
    setSessions(prev => {
      return prev.map(s => {
        if (s.id !== sessionId) return s;
        const cashDiff = actualCash - s.expectedCash;
        closed = {
          ...s,
          closedAt: new Date().toISOString(),
          actualCash,
          cashDifference: cashDiff,
          status: 'closed',
          notes,
        };
        return closed;
      });
    });
    return closed;
  };

  const addStore = (storeData: Omit<Store, 'id' | 'createdAt'>) => {
    const newStore: Store = {
      ...storeData,
      id: `store-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setStores(prev => [...prev, newStore]);
  };

  const updateStore = (updated: Store) => {
    setStores(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  const resetToDemo = () => {
    localStorage.removeItem(`${STORAGE_KEY}_stores`);
    localStorage.removeItem(`${STORAGE_KEY}_products`);
    localStorage.removeItem(`${STORAGE_KEY}_sales`);
    localStorage.removeItem(`${STORAGE_KEY}_transfers`);
    localStorage.removeItem(`${STORAGE_KEY}_movements`);
    localStorage.removeItem(`${STORAGE_KEY}_customers`);
    localStorage.removeItem(`${STORAGE_KEY}_suppliers`);
    localStorage.removeItem(`${STORAGE_KEY}_sessions`);

    setStores(INITIAL_STORES);
    setProducts(INITIAL_PRODUCTS);
    setSales(INITIAL_SALES);
    setTransfers(INITIAL_TRANSFERS);
    setMovements(INITIAL_MOVEMENTS);
    setCustomers(INITIAL_CUSTOMERS);
    setSuppliers(INITIAL_SUPPLIERS);
    setSessions(INITIAL_SESSIONS);
    setSelectedStoreId('all');
  };

  const exportJSON = () => {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      stores,
      products,
      sales,
      transfers,
      movements,
      customers,
      suppliers,
      sessions,
    };
    return JSON.stringify(backup, null, 2);
  };

  const importJSON = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (data.stores && data.products) {
        if (data.stores) setStores(data.stores);
        if (data.products) setProducts(data.products);
        if (data.sales) setSales(data.sales);
        if (data.transfers) setTransfers(data.transfers);
        if (data.movements) setMovements(data.movements);
        if (data.customers) setCustomers(data.customers);
        if (data.suppliers) setSuppliers(data.suppliers);
        if (data.sessions) setSessions(data.sessions);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return (
    <StoreContext.Provider
      value={{
        stores,
        selectedStoreId,
        setSelectedStoreId,
        selectedStore,
        currency,
        setCurrency,
        formatMoney,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        sales,
        createSale,
        cancelSale,
        transfers,
        executeTransfer,
        movements,
        receiveSupplierDelivery,
        adjustStock,
        customers,
        addCustomer,
        updateCustomer,
        recordDebtPayment,
        suppliers,
        addSupplier,
        sessions,
        activeSession,
        openCashSession,
        closeCashSession,
        addStore,
        updateStore,
        stockAlerts,
        dismissedAlertIds,
        dismissAlert,
        restoreAlerts,
        updateProductThreshold,
        pendingTransferPrefill,
        setPendingTransferPrefill,
        pendingReceptionPrefill,
        setPendingReceptionPrefill,
        resetToDemo,
        exportJSON,
        importJSON,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
