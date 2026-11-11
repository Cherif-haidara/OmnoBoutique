export type StoreType = 'general' | 'food' | 'household' | 'kiosk';

export interface Store {
  id: string;
  name: string;
  code: string;
  type: StoreType;
  address: string;
  phone: string;
  manager: string;
  taxRate: number; // e.g. 0 or 18%
  currency: string; // e.g. 'FCFA', '€', '$'
  isActive: boolean;
  createdAt: string;
}

export type ProductCategory = 
  | 'Alimentaire'
  | 'Boissons & Jus'
  | 'Épicerie Sèche'
  | 'Produits Frais'
  | 'Entretien & Ménage'
  | 'Hygiène & Soins'
  | 'Accessoires Maison';

export type ProductUnit = 'unité' | 'kg' | 'litre' | 'paquet' | 'carton' | 'boîte' | 'bouteille';

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category: ProductCategory;
  unit: ProductUnit;
  purchasePrice: number; // Prix d'achat fournisseur unitaire
  sellingPrice: number;  // Prix de vente public
  minStockAlert: number; // Seuil minimum d'alerte
  stockByStore: Record<string, number>; // storeId -> quantity
  description?: string;
  supplierName?: string;
}

export type PaymentMethod = 'cash' | 'card' | 'mobile_money' | 'credit';

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  purchasePrice: number;
  discountPercent: number;
  total: number;
}

export interface SaleItem {
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  quantity: number;
  purchasePrice: number;
  unitPrice: number;
  discountPercent: number;
  total: number;
}

export interface Sale {
  id: string;
  receiptNumber: string;
  storeId: string;
  cashierName: string;
  customerId?: string;
  customerName?: string;
  items: SaleItem[];
  subtotal: number;
  discountTotal: number;
  taxAmount: number;
  total: number;
  costOfGoodsSold: number; // Total prix d'achat
  grossProfit: number;     // Bénéfice brut (total - cogs)
  profitMarginRate: number;// Taux de marge (%)
  paymentMethod: PaymentMethod;
  amountPaid: number;
  changeGiven: number;
  status: 'completed' | 'cancelled' | 'refunded';
  createdAt: string;
  notes?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
}

export type MovementType = 'reception' | 'sale' | 'transfer_out' | 'transfer_in' | 'adjustment' | 'loss';

export interface StockMovement {
  id: string;
  date: string;
  type: MovementType;
  productId: string;
  productName: string;
  storeId: string;
  toStoreId?: string;
  quantity: number;
  unitCost: number;
  reference?: string;
  reason: string;
  performedBy: string;
}

export interface StockTransfer {
  id: string;
  reference: string;
  fromStoreId: string;
  toStoreId: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitCost: number;
  }[];
  date: string;
  status: 'completed' | 'pending';
  performedBy: string;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  creditBalance: number; // Dettes impayées en cours
  creditLimit: number;   // Plafond autorisé
  totalSpent: number;
  purchasesCount: number;
  lastPurchaseDate?: string;
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  category: string;
  address: string;
}

export interface CashRegisterSession {
  id: string;
  storeId: string;
  cashierName: string;
  openedAt: string;
  closedAt?: string;
  openingBalance: number; // Fond de caisse initial
  cashSales: number;
  cardSales: number;
  mobileSales: number;
  creditSales: number;
  totalSales: number;
  salesCount: number;
  expectedCash: number;
  actualCash?: number;
  cashDifference?: number; // actualCash - expectedCash
  status: 'open' | 'closed';
  notes?: string;
}

export type ActiveTab = 'pos' | 'sales_history' | 'inventory' | 'transfers' | 'analytics' | 'sessions' | 'customers' | 'stores';

export interface StockAlert {
  id: string; // `${productId}-${storeId}`
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  category: ProductCategory;
  unit: ProductUnit;
  storeId: string;
  storeName: string;
  storeCode: string;
  currentStock: number;
  minThreshold: number;
  deficit: number;
  severity: 'out_of_stock' | 'critical';
  supplierName?: string;
  alternativeStoresWithStock: Array<{
    storeId: string;
    storeName: string;
    storeCode: string;
    stock: number;
  }>;
}
