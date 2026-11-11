import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { Product, ProductCategory, ProductUnit } from '../../types';
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  ArrowRightLeft, 
  Truck, 
  SlidersHorizontal, 
  Download, 
  Edit3, 
  Trash2, 
  DollarSign, 
  Layers, 
  TrendingUp, 
  X, 
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';

export const InventoryView: React.FC = () => {
  const { 
    products, 
    stores, 
    selectedStoreId, 
    setSelectedStoreId,
    formatMoney, 
    currency,
    addProduct, 
    updateProduct, 
    deleteProduct,
    receiveSupplierDelivery,
    adjustStock,
    suppliers,
    pendingReceptionPrefill,
    setPendingReceptionPrefill,
    updateProductThreshold
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Quick Threshold Modal state
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);
  const [thresholdProduct, setThresholdProduct] = useState<Product | null>(null);
  const [newThresholdInput, setNewThresholdInput] = useState<number>(10);

  const [isReceptionModalOpen, setIsReceptionModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [selectedProductForAction, setSelectedProductForAction] = useState<Product | null>(null);

  // Product Form state
  const [productForm, setProductForm] = useState<{
    name: string;
    sku: string;
    barcode: string;
    category: ProductCategory;
    unit: ProductUnit;
    purchasePrice: number;
    sellingPrice: number;
    minStockAlert: number;
    description: string;
    supplierName: string;
    stockByStore: Record<string, number>;
  }>({
    name: '',
    sku: '',
    barcode: '',
    category: 'Épicerie Sèche',
    unit: 'unité',
    purchasePrice: 0,
    sellingPrice: 0,
    minStockAlert: 10,
    description: '',
    supplierName: '',
    stockByStore: {},
  });

  // Reception Form state
  const [receptionForm, setReceptionForm] = useState<{
    storeId: string;
    supplierName: string;
    reference: string;
    productId: string;
    quantity: number;
    unitCost: number;
  }>({
    storeId: stores[0]?.id || '',
    supplierName: suppliers[0]?.name || 'AgroDistribution Ouest',
    reference: `BL-${Date.now().toString().slice(-6)}`,
    productId: '',
    quantity: 10,
    unitCost: 0,
  });

  // Adjustment Form state
  const [adjForm, setAdjForm] = useState<{
    storeId: string;
    productId: string;
    deltaQuantity: number;
    reason: string;
    type: 'adjustment' | 'loss';
  }>({
    storeId: stores[0]?.id || '',
    productId: '',
    deltaQuantity: -1,
    reason: 'Casse / Marchandise abîmée',
    type: 'loss',
  });

  // Metrics computation
  const inventoryMetrics = useMemo(() => {
    let totalPurchaseValue = 0;
    let totalSellingValue = 0;
    let totalUnits = 0;
    let lowStockCount = 0;

    products.forEach(p => {
      let qty = 0;
      if (selectedStoreId === 'all') {
        qty = Object.values(p.stockByStore).reduce((a, b) => a + b, 0);
      } else {
        qty = p.stockByStore[selectedStoreId] || 0;
      }

      totalUnits += qty;
      totalPurchaseValue += (p.purchasePrice * qty);
      totalSellingValue += (p.sellingPrice * qty);

      if (qty <= p.minStockAlert) {
        lowStockCount++;
      }
    });

    const potentialGrossProfit = totalSellingValue - totalPurchaseValue;
    const potentialMarginRate = totalSellingValue > 0 ? (potentialGrossProfit / totalSellingValue) * 100 : 0;

    return {
      totalPurchaseValue,
      totalSellingValue,
      potentialGrossProfit,
      potentialMarginRate,
      totalUnits,
      lowStockCount,
      totalRefs: products.length,
    };
  }, [products, selectedStoreId]);

  // Filter products list
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode.includes(searchQuery) ||
        (p.supplierName && p.supplierName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;

      let currentStock = 0;
      if (selectedStoreId === 'all') {
        currentStock = Object.values(p.stockByStore).reduce((a, b) => a + b, 0);
      } else {
        currentStock = p.stockByStore[selectedStoreId] || 0;
      }

      const matchesLowStock = !showLowStockOnly || currentStock <= p.minStockAlert;

      return matchesSearch && matchesCat && matchesLowStock;
    });
  }, [products, searchQuery, selectedCategory, showLowStockOnly, selectedStoreId]);

  // Handle open Product Create/Edit modal
  const handleOpenProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        category: product.category,
        unit: product.unit,
        purchasePrice: product.purchasePrice,
        sellingPrice: product.sellingPrice,
        minStockAlert: product.minStockAlert,
        description: product.description || '',
        supplierName: product.supplierName || '',
        stockByStore: { ...product.stockByStore },
      });
    } else {
      setEditingProduct(null);
      const initialStocks: Record<string, number> = {};
      stores.forEach(s => { initialStocks[s.id] = 10; });
      setProductForm({
        name: '',
        sku: `ART-${Math.floor(100 + Math.random() * 900)}`,
        barcode: `600${Math.floor(1000 + Math.random() * 9000)}`,
        category: 'Épicerie Sèche',
        unit: 'unité',
        purchasePrice: 1000,
        sellingPrice: 1500,
        minStockAlert: 10,
        description: '',
        supplierName: suppliers[0]?.name || '',
        stockByStore: initialStocks,
      });
    }
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim()) return;

    if (editingProduct) {
      updateProduct({
        ...editingProduct,
        ...productForm,
      });
    } else {
      addProduct(productForm);
    }
    setIsProductModalOpen(false);
  };

  const handleDeleteProduct = (productId: string, name: string) => {
    if (confirm(`Confirmez-vous la suppression définitive de "${name}" du catalogue ?`)) {
      deleteProduct(productId);
    }
  };

  // Open Reception modal
  const handleOpenReception = (product?: Product) => {
    setReceptionForm({
      storeId: selectedStoreId === 'all' ? (stores[0]?.id || '') : selectedStoreId,
      supplierName: product?.supplierName || suppliers[0]?.name || 'AgroDistribution Ouest',
      reference: `BL-${Date.now().toString().slice(-5)}`,
      productId: product?.id || products[0]?.id || '',
      quantity: 20,
      unitCost: product ? product.purchasePrice : 1000,
    });
    setIsReceptionModalOpen(true);
  };

  // Listen for reception prefill from alerts notification center
  React.useEffect(() => {
    if (pendingReceptionPrefill) {
      const prod = products.find(p => p.id === pendingReceptionPrefill.productId);
      setReceptionForm({
        storeId: pendingReceptionPrefill.storeId || stores[0]?.id || '',
        supplierName: prod?.supplierName || suppliers[0]?.name || 'Distributeur Fournisseur',
        reference: `BL-${Date.now().toString().slice(-5)}`,
        productId: pendingReceptionPrefill.productId || products[0]?.id || '',
        quantity: 25,
        unitCost: prod ? prod.purchasePrice : 1000,
      });
      setIsReceptionModalOpen(true);
      setPendingReceptionPrefill(null);
    }
  }, [pendingReceptionPrefill, setPendingReceptionPrefill, products, stores, suppliers]);

  const handleSaveReception = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receptionForm.productId) return;

    receiveSupplierDelivery({
      storeId: receptionForm.storeId,
      supplierName: receptionForm.supplierName,
      reference: receptionForm.reference,
      items: [{
        productId: receptionForm.productId,
        quantity: Number(receptionForm.quantity),
        unitCost: Number(receptionForm.unitCost),
      }],
      performedBy: 'Responsable Stock',
    });

    setIsReceptionModalOpen(false);
  };

  // Open Adjustment modal
  const handleOpenAdjustment = (product: Product) => {
    setSelectedProductForAction(product);
    setAdjForm({
      storeId: selectedStoreId === 'all' ? (stores[0]?.id || '') : selectedStoreId,
      productId: product.id,
      deltaQuantity: -1,
      reason: 'Casse / Marchandise abîmée',
      type: 'loss',
    });
    setIsAdjustmentModalOpen(true);
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjForm.productId) return;

    adjustStock({
      storeId: adjForm.storeId,
      productId: adjForm.productId,
      deltaQuantity: Number(adjForm.deltaQuantity),
      reason: adjForm.reason,
      type: adjForm.type,
      performedBy: 'Responsable Inventaire',
    });

    setIsAdjustmentModalOpen(false);
  };

  // Export inventory CSV
  const handleExportCSV = () => {
    const headers = ['SKU', 'Code-barres', 'Désignation', 'Rayon', 'Unité', 'Prix Achat', 'Prix Vente', 'Marge Unitaire', 'Seuil Alerte'];
    stores.forEach(s => headers.push(`Stock ${s.name}`));
    headers.push('Stock Total', 'Valeur Achat Totale');

    const rows = products.map(p => {
      const totalQty = Object.values(p.stockByStore).reduce((a, b) => a + b, 0);
      const row = [
        p.sku,
        p.barcode,
        `"${p.name.replace(/"/g, '""')}"`,
        p.category,
        p.unit,
        p.purchasePrice,
        p.sellingPrice,
        p.sellingPrice - p.purchasePrice,
        p.minStockAlert,
      ];
      stores.forEach(s => {
        row.push(p.stockByStore[s.id] || 0);
      });
      row.push(totalQty);
      row.push(totalQty * p.purchasePrice);
      return row.join(';');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventaire_omniboutique_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Gestion Centralisée des Stocks
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi multi-magasins, valorisation d'inventaire et réapprovisionnements
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenReception()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg shadow-2xs transition-colors"
          >
            <Truck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Entrée Fournisseur</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenProductModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouveau Produit</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Valuation, Units, Margin */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Valeur Marchande (Vente)</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-slate-900 font-mono-numbers">
            {formatMoney(inventoryMetrics.totalSellingValue)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {inventoryMetrics.totalUnits} articles en réserve
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Valeur d'Achat (Coût)</span>
            <Layers className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-lg font-bold text-slate-900 font-mono-numbers">
            {formatMoney(inventoryMetrics.totalPurchaseValue)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Capital immobilisé en stock
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Bénéfice Brut en Réserve</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-lg font-bold text-indigo-600 font-mono-numbers">
            +{formatMoney(inventoryMetrics.potentialGrossProfit)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Marge prévisionnelle : <span className="font-semibold text-slate-700">{inventoryMetrics.potentialMarginRate.toFixed(1)}%</span>
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Alertes Stock Critique</span>
            <AlertTriangle className={`w-4 h-4 ${inventoryMetrics.lowStockCount > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
          </div>
          <div className="text-lg font-bold text-slate-900 font-mono-numbers">
            {inventoryMetrics.lowStockCount}
          </div>
          <button
            type="button"
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium mt-1 underline"
          >
            {showLowStockOnly ? 'Voir tous les stocks' : 'Filtrer les ruptures'}
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrer par nom, référence SKU, code-barres ou fournisseur..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          {/* Boutique view selector in table */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <span className="text-xs text-slate-500 font-medium">Boutique :</span>
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Vue Consolidée (Toutes les boutiques)</option>
              {stores.map(st => (
                <option key={st.id} value={st.id}>{st.name}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Categories Tab Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 scrollbar-none">
          {['all', 'Épicerie Sèche', 'Produits Frais', 'Boissons & Jus', 'Entretien & Ménage', 'Hygiène & Soins', 'Accessoires Maison'].map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'all' ? 'Tous les Rayons' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Stock Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Article & Code</th>
                <th className="py-3 px-3">Rayon / Unité</th>
                <th className="py-3 px-3 text-right">Prix Achat</th>
                <th className="py-3 px-3 text-right">Prix Vente</th>
                <th className="py-3 px-3 text-right">Marge Unitaire</th>
                
                {/* Store Stock Columns */}
                {selectedStoreId === 'all' ? (
                  stores.map(st => (
                    <th key={st.id} className="py-3 px-3 text-center truncate max-w-[120px]">
                      {st.name.split(' - ')[0]}
                    </th>
                  ))
                ) : (
                  <th className="py-3 px-3 text-center">
                    Stock ({stores.find(s => s.id === selectedStoreId)?.code})
                  </th>
                )}

                <th className="py-3 px-3 text-center">Stock Total</th>
                <th className="py-3 px-3 text-center">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredProducts.map((p) => {
                const totalStock = Object.values(p.stockByStore).reduce((a, b) => a + b, 0);
                const currentFilteredStock = selectedStoreId === 'all' 
                  ? totalStock 
                  : (p.stockByStore[selectedStoreId] || 0);

                const unitMargin = p.sellingPrice - p.purchasePrice;
                const marginRate = p.sellingPrice > 0 ? (unitMargin / p.sellingPrice) * 100 : 0;
                const isCritical = currentFilteredStock <= p.minStockAlert;
                const isOut = currentFilteredStock === 0;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Article Name & SKU & Barcode */}
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-semibold text-slate-900 block leading-tight">
                          {p.name}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono-numbers mt-0.5">
                          <span>{p.sku}</span>
                          <span>·</span>
                          <span>BC: {p.barcode}</span>
                          {p.supplierName && (
                            <>
                              <span>·</span>
                              <span className="text-slate-500 font-sans">{p.supplierName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category & Unit */}
                    <td className="py-3.5 px-3">
                      <span className="text-slate-800 block">{p.category}</span>
                      <span className="text-[11px] text-slate-500">{p.unit}</span>
                    </td>

                    {/* Purchase Price */}
                    <td className="py-3.5 px-3 text-right font-mono-numbers text-slate-600">
                      {formatMoney(p.purchasePrice)}
                    </td>

                    {/* Selling Price */}
                    <td className="py-3.5 px-3 text-right font-mono-numbers font-semibold text-slate-900">
                      {formatMoney(p.sellingPrice)}
                    </td>

                    {/* Unit Margin */}
                    <td className="py-3.5 px-3 text-right font-mono-numbers">
                      <span className="font-semibold text-emerald-700 block">
                        +{formatMoney(unitMargin)}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        ({marginRate.toFixed(0)}%)
                      </span>
                    </td>

                    {/* Stores stocks */}
                    {selectedStoreId === 'all' ? (
                      stores.map(st => {
                        const storeQty = p.stockByStore[st.id] || 0;
                        return (
                          <td key={st.id} className="py-3.5 px-3 text-center font-mono-numbers">
                            <span className={storeQty <= (p.minStockAlert / 2) ? 'text-amber-600 font-bold' : 'text-slate-800'}>
                              {storeQty}
                            </span>
                          </td>
                        );
                      })
                    ) : (
                      <td className="py-3.5 px-3 text-center font-mono-numbers font-semibold text-slate-900">
                        {p.stockByStore[selectedStoreId] || 0}
                      </td>
                    )}

                    {/* Total Stock */}
                    <td className="py-3.5 px-3 text-center font-mono-numbers font-bold text-slate-900">
                      {totalStock}
                    </td>

                    {/* Status Badge with interactive Threshold Setting */}
                    <td className="py-3.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setThresholdProduct(p);
                          setNewThresholdInput(p.minStockAlert);
                          setIsThresholdModalOpen(true);
                        }}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-all hover:ring-2 hover:ring-indigo-400/40 cursor-pointer ${
                          isOut 
                            ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                            : isCritical 
                              ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}
                        title={`Seuil critique actuel : ${p.minStockAlert}. Cliquer pour modifier.`}
                      >
                        <span>{isOut ? 'Rupture' : isCritical ? 'Stock Bas' : 'Normal'}</span>
                        <span className="text-[10px] opacity-75 font-mono-numbers">({p.minStockAlert})</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenAdjustment(p)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-100 transition-colors"
                          title="Ajustement / Perte / Casse"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenProductModal(p)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
                          title="Modifier l'article"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                          title="Supprimer du catalogue"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="p-12 text-center text-slate-500">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">Aucun produit ne correspond aux filtres</p>
            <p className="text-[11px] text-slate-400 mt-1">Réinitialisez votre recherche pour afficher le catalogue complet.</p>
          </div>
        )}
      </div>

      {/* MODAL: CREATE / EDIT PRODUCT */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">
                {editingProduct ? 'Modifier l\'Article' : 'Ajouter un Nouvel Article au Catalogue'}
              </h3>
              <button 
                onClick={() => setIsProductModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 overflow-y-auto space-y-4 text-xs">
              
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Désignation du Produit *</label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="ex: Riz Parfumé Jasmin Supérieur (5kg)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Code SKU / Référence</label>
                  <input
                    type="text"
                    required
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono-numbers"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Code-barres (EAN)</label>
                  <input
                    type="text"
                    required
                    value={productForm.barcode}
                    onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono-numbers"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Rayon / Catégorie</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value as ProductCategory })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="Épicerie Sèche">Épicerie Sèche</option>
                    <option value="Produits Frais">Produits Frais</option>
                    <option value="Boissons & Jus">Boissons & Jus</option>
                    <option value="Entretien & Ménage">Entretien & Ménage</option>
                    <option value="Hygiène & Soins">Hygiène & Soins</option>
                    <option value="Accessoires Maison">Accessoires Maison</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Unité de vente</label>
                  <select
                    value={productForm.unit}
                    onChange={(e) => setProductForm({ ...productForm, unit: e.target.value as ProductUnit })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="unité">Unité</option>
                    <option value="kg">Kilogramme (kg)</option>
                    <option value="litre">Litre (L)</option>
                    <option value="bouteille">Bouteille</option>
                    <option value="paquet">Paquet</option>
                    <option value="carton">Carton</option>
                    <option value="boîte">Boîte</option>
                  </select>
                </div>
              </div>

              {/* Price & Margins Section */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="font-semibold text-slate-800">Tarification & Calcul des Bénéfices</div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-slate-600 block mb-1">Prix d'Achat Fournisseur ({currency})</label>
                    <input
                      type="number"
                      min="0"
                      value={productForm.purchasePrice}
                      onChange={(e) => setProductForm({ ...productForm, purchasePrice: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono-numbers font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-medium text-slate-600 block mb-1">Prix de Vente Public ({currency})</label>
                    <input
                      type="number"
                      min="0"
                      value={productForm.sellingPrice}
                      onChange={(e) => setProductForm({ ...productForm, sellingPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono-numbers font-bold text-indigo-700"
                    />
                  </div>
                </div>

                {/* Computed Margin Preview */}
                <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Marge brute unitaire générée :</span>
                  <span className="font-bold text-emerald-700 font-mono-numbers">
                    +{formatMoney(productForm.sellingPrice - productForm.purchasePrice)} ({productForm.sellingPrice > 0 ? (((productForm.sellingPrice - productForm.purchasePrice) / productForm.sellingPrice) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>

              {/* Initial stock distribution per boutique */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="font-semibold text-slate-800">Répartition du Stock par Boutique</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {stores.map(st => (
                    <div key={st.id}>
                      <label className="text-[11px] text-slate-600 block truncate">{st.name}</label>
                      <input
                        type="number"
                        min="0"
                        value={productForm.stockByStore[st.id] ?? 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setProductForm({
                            ...productForm,
                            stockByStore: {
                              ...productForm.stockByStore,
                              [st.id]: val,
                            },
                          });
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono-numbers font-semibold"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Seuil Alerte Stock Bas</label>
                  <input
                    type="number"
                    min="1"
                    value={productForm.minStockAlert}
                    onChange={(e) => setProductForm({ ...productForm, minStockAlert: parseInt(e.target.value) || 5 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono-numbers"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Fournisseur</label>
                  <input
                    type="text"
                    value={productForm.supplierName}
                    onChange={(e) => setProductForm({ ...productForm, supplierName: e.target.value })}
                    placeholder="ex: AgroDistribution Ouest"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 -mx-6 -mb-6 mt-4">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  Enregistrer l'Article
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL: SUPPLIER RECEPTION */}
      {isReceptionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-400" />
                Réception Marchandise Fournisseur
              </h3>
              <button 
                onClick={() => setIsReceptionModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReception} className="p-6 space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Boutique de Destination *</label>
                  <select
                    value={receptionForm.storeId}
                    onChange={(e) => setReceptionForm({ ...receptionForm, storeId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    {stores.map(st => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">N° Bon de Livraison (BL)</label>
                  <input
                    type="text"
                    value={receptionForm.reference}
                    onChange={(e) => setReceptionForm({ ...receptionForm, reference: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono-numbers"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Fournisseur</label>
                <input
                  type="text"
                  value={receptionForm.supplierName}
                  onChange={(e) => setReceptionForm({ ...receptionForm, supplierName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Article à Réceptionner *</label>
                <select
                  value={receptionForm.productId}
                  onChange={(e) => {
                    const chosen = products.find(p => p.id === e.target.value);
                    setReceptionForm({
                      ...receptionForm,
                      productId: e.target.value,
                      unitCost: chosen ? chosen.purchasePrice : receptionForm.unitCost,
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Quantité Reçue</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={receptionForm.quantity}
                    onChange={(e) => setReceptionForm({ ...receptionForm, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono-numbers font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Coût d'Achat Unitaire ({currency})</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={receptionForm.unitCost}
                    onChange={(e) => setReceptionForm({ ...receptionForm, unitCost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono-numbers"
                  />
                </div>
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-900 flex justify-between items-center">
                <span>Valeur totale de la livraison :</span>
                <span className="font-bold font-mono-numbers text-sm">
                  {formatMoney(receptionForm.quantity * receptionForm.unitCost)}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReceptionModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  Valider l'Entrée en Stock
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL: ADJUSTMENT / LOSS */}
      {isAdjustmentModalOpen && selectedProductForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                Ajustement de Stock / Perte
              </h3>
              <button 
                onClick={() => setIsAdjustmentModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="p-6 space-y-4 text-xs">
              <div>
                <p className="font-bold text-slate-900 text-sm">{selectedProductForAction.name}</p>
                <p className="text-slate-500 font-mono-numbers text-[11px]">{selectedProductForAction.sku}</p>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Boutique concernée :</label>
                <select
                  value={adjForm.storeId}
                  onChange={(e) => setAdjForm({ ...adjForm, storeId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  {stores.map(st => (
                    <option key={st.id} value={st.id}>
                      {st.name} (Stock actuel: {selectedProductForAction.stockByStore[st.id] || 0})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Variation Quantité</label>
                  <input
                    type="number"
                    required
                    value={adjForm.deltaQuantity}
                    onChange={(e) => setAdjForm({ ...adjForm, deltaQuantity: parseInt(e.target.value) || 0 })}
                    placeholder="-1 ou +5"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono-numbers font-bold"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Négatif pour perte/casse</span>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Type d'opération</label>
                  <select
                    value={adjForm.type}
                    onChange={(e) => setAdjForm({ ...adjForm, type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="loss">Perte / Casse / Périmé</option>
                    <option value="adjustment">Régularisation Inventaire</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Motif / Justification *</label>
                <input
                  type="text"
                  required
                  value={adjForm.reason}
                  onChange={(e) => setAdjForm({ ...adjForm, reason: e.target.value })}
                  placeholder="ex: Flacon fissuré, date de péremption dépassée..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustmentModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs"
                >
                  Enregistrer l'Ajustement
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL: QUICK THRESHOLD ADJUSTMENT */}
      {isThresholdModalOpen && thresholdProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                Seuil Critique d'Alerte
              </span>
              <button 
                onClick={() => setIsThresholdModalOpen(false)} 
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateProductThreshold(thresholdProduct.id, newThresholdInput);
                setIsThresholdModalOpen(false);
              }}
              className="p-5 space-y-4 text-xs"
            >
              <div>
                <p className="font-bold text-slate-900 text-sm leading-snug">{thresholdProduct.name}</p>
                <p className="text-slate-500 text-[11px] mt-0.5 font-mono-numbers">{thresholdProduct.sku}</p>
                <p className="text-slate-500 text-[11px] mt-1">
                  Définissez la quantité minimale sous laquelle ce produit apparaîtra immédiatement en alerte visuelle critique.
                </p>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Seuil d'alerte critique ({thresholdProduct.unit}s) :
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newThresholdInput}
                  onChange={(e) => setNewThresholdInput(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold font-mono-numbers text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsThresholdModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  Valider le Nouveau Seuil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
