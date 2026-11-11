import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../../context/StoreContext';
import { Product, ProductCategory, PaymentMethod, Customer, ActiveTab } from '../../types';
import { 
  Search, 
  Barcode, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  UserCheck, 
  Receipt, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  X, 
  Store as StoreIcon, 
  ShoppingBag, 
  RotateCcw, 
  History,
  Camera,
  Volume2,
  VolumeX,
  Radio,
  Zap,
  Info,
  Check,
  Sparkles
} from 'lucide-react';
import { CameraBarcodeScannerModal } from './CameraBarcodeScannerModal';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { playScanSuccessBeep, playScanErrorBeep, triggerHaptic } from '../../utils/audio';

export interface POSViewProps {
  onNavigateTab?: (tab: ActiveTab) => void;
}

export const POSView: React.FC<POSViewProps> = ({ onNavigateTab }) => {
  const { 
    products, 
    stores, 
    selectedStoreId, 
    setSelectedStoreId,
    selectedStore,
    formatMoney, 
    currency,
    createSale, 
    customers, 
    activeSession 
  } = useStore();

  // If consolidated view is selected, prompt or pick first store
  const effectiveStoreId = selectedStoreId === 'all' ? (stores[0]?.id || '') : selectedStoreId;
  const currentStore = stores.find(s => s.id === effectiveStoreId);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<Array<{
    product: Product;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
  }>>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  
  // Checkout modal state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountPaidInput, setAmountPaidInput] = useState<string>('');
  const [checkoutError, setCheckoutError] = useState<string>('');

  // Receipt Modal state
  const [lastCompletedSale, setLastCompletedSale] = useState<any | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Barcode input ref
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Barcode Scanner states (USB/Bluetooth & Camera)
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isScannerInfoOpen, setIsScannerInfoOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);
  const [scanToast, setScanToast] = useState<{
    type: 'success' | 'error' | 'warning';
    title: string;
    subtitle?: string;
    barcode?: string;
    timestamp: number;
  } | null>(null);

  // Auto-dismiss scan toast
  useEffect(() => {
    if (!scanToast) return;
    const timer = setTimeout(() => {
      setScanToast(null);
    }, 2800);
    return () => clearTimeout(timer);
  }, [scanToast]);

  const categories: Array<ProductCategory | 'all'> = [
    'all',
    'Épicerie Sèche',
    'Produits Frais',
    'Boissons & Jus',
    'Entretien & Ménage',
    'Hygiène & Soins',
    'Accessoires Maison',
  ];

  // Filter products by category, search, and store availability
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.barcode.includes(searchQuery);

      const matchesCat = selectedCategory === 'all' || product.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, selectedCategory]);

  // Cart calculations
  const cartSubtotal = cart.reduce((sum, item) => {
    const discountedPrice = item.unitPrice * (1 - item.discountPercent / 100);
    return sum + (discountedPrice * item.quantity);
  }, 0);

  const cartEstimatedProfit = cart.reduce((sum, item) => {
    const discountedPrice = item.unitPrice * (1 - item.discountPercent / 100);
    const profitPerUnit = discountedPrice - item.product.purchasePrice;
    return sum + (profitPerUnit * item.quantity);
  }, 0);

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  /**
   * Central Barcode Scanning Handler for USB guns, Bluetooth scanners, and Phone Camera
   */
  const handleScanBarcode = useCallback((rawBarcode: string): { success: boolean; productName?: string; error?: string } => {
    const cleanCode = rawBarcode.trim();
    if (!cleanCode) return { success: false, error: 'Code-barres vide' };

    const matchedProduct = products.find(p => 
      p.barcode.toLowerCase() === cleanCode.toLowerCase() || 
      p.sku.toLowerCase() === cleanCode.toLowerCase()
    );

    if (!matchedProduct) {
      if (soundEnabled) playScanErrorBeep();
      triggerHaptic(false);
      setScanToast({
        type: 'error',
        title: `Code "${cleanCode}" introuvable`,
        subtitle: 'Aucun article associé dans le catalogue de cette boutique',
        barcode: cleanCode,
        timestamp: Date.now(),
      });
      return { success: false, error: `Code "${cleanCode}" introuvable` };
    }

    const currentStock = matchedProduct.stockByStore[effectiveStoreId] || 0;
    const existing = cart.find(i => i.product.id === matchedProduct.id);
    const currentQtyInCart = existing ? existing.quantity : 0;

    if (currentQtyInCart + 1 > currentStock) {
      if (soundEnabled) playScanErrorBeep();
      triggerHaptic(false);
      setScanToast({
        type: 'warning',
        title: `Stock insuffisant : ${matchedProduct.name}`,
        subtitle: `Disponible : ${currentStock} ${matchedProduct.unit}(s) en rayon (${currentQtyInCart} déjà au panier)`,
        barcode: cleanCode,
        timestamp: Date.now(),
      });
      return { success: false, error: `Stock insuffisant (${currentStock} dispo)` };
    }

    // Success: add or increment in cart
    if (existing) {
      setCart(prev => prev.map(i => i.product.id === matchedProduct.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCart(prev => [...prev, {
        product: matchedProduct,
        quantity: 1,
        unitPrice: matchedProduct.sellingPrice,
        discountPercent: 0,
      }]);
    }

    if (soundEnabled) playScanSuccessBeep();
    triggerHaptic(true);

    // Glow highlight in cart
    setHighlightedProductId(matchedProduct.id);
    setTimeout(() => setHighlightedProductId(null), 2500);

    setScanToast({
      type: 'success',
      title: `${matchedProduct.name}`,
      subtitle: `+1 ajouté (${formatMoney(matchedProduct.sellingPrice)}) · Stock restant : ${currentStock - (currentQtyInCart + 1)}`,
      barcode: cleanCode,
      timestamp: Date.now(),
    });

    return { success: true, productName: matchedProduct.name };
  }, [products, effectiveStoreId, cart, soundEnabled, formatMoney]);

  // Global USB/Bluetooth Barcode Scanner Listener Hook
  const { isScannerReady, lastScannedCode, triggerManualScan } = useBarcodeScanner({
    onScan: (barcode) => {
      handleScanBarcode(barcode);
    },
    isEnabled: !isCheckoutOpen && !isReceiptOpen && !isCameraModalOpen,
  });

  const handleAddToCart = (product: Product) => {
    const stockInStore = product.stockByStore[effectiveStoreId] || 0;
    const existing = cart.find(item => item.product.id === product.id);
    const currentQtyInCart = existing ? existing.quantity : 0;

    if (currentQtyInCart + 1 > stockInStore) {
      if (soundEnabled) playScanErrorBeep();
      triggerHaptic(false);
      setScanToast({
        type: 'warning',
        title: `Stock insuffisant pour ${product.name}`,
        subtitle: `Stock disponible en magasin : ${stockInStore} ${product.unit}(s)`,
        timestamp: Date.now(),
      });
      return;
    }

    if (existing) {
      setCart(cart.map(item => 
        item.product.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        product,
        quantity: 1,
        unitPrice: product.sellingPrice,
        discountPercent: 0,
      }]);
    }

    if (soundEnabled) playScanSuccessBeep();
    triggerHaptic(true);
    setHighlightedProductId(product.id);
    setTimeout(() => setHighlightedProductId(null), 2000);
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    const item = cart.find(i => i.product.id === productId);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      handleRemoveItem(productId);
      return;
    }

    const stockInStore = item.product.stockByStore[effectiveStoreId] || 0;
    if (newQty > stockInStore) {
      if (soundEnabled) playScanErrorBeep();
      triggerHaptic(false);
      setScanToast({
        type: 'warning',
        title: `Plafond de stock atteint`,
        subtitle: `Maximum disponible en rayon : ${stockInStore} ${item.product.unit}(s)`,
        timestamp: Date.now(),
      });
      return;
    }

    setCart(cart.map(i => i.product.id === productId ? { ...i, quantity: newQty } : i));
  };

  const handleSetExactQuantity = (productId: string, qty: number) => {
    const item = cart.find(i => i.product.id === productId);
    if (!item) return;

    if (qty <= 0) {
      handleRemoveItem(productId);
      return;
    }

    const stockInStore = item.product.stockByStore[effectiveStoreId] || 0;
    if (qty > stockInStore) {
      if (soundEnabled) playScanErrorBeep();
      triggerHaptic(false);
      setScanToast({
        type: 'warning',
        title: `Quantité ajustée au stock disponible`,
        subtitle: `Maximum en magasin : ${stockInStore} ${item.product.unit}(s)`,
        timestamp: Date.now(),
      });
      setCart(cart.map(i => i.product.id === productId ? { ...i, quantity: stockInStore } : i));
      return;
    }

    setCart(cart.map(i => i.product.id === productId ? { ...i, quantity: qty } : i));
  };

  const handleRemoveItem = (productId: string) => {
    setCart(cart.filter(i => i.product.id !== productId));
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    setCart([]);
    setSelectedCustomerId('');
    setScanToast({
      type: 'warning',
      title: 'Panier réinitialisé',
      subtitle: 'Tous les articles ont été retirés',
      timestamp: Date.now(),
    });
  };

  // Barcode search form submit
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    handleScanBarcode(searchQuery);
    setSearchQuery('');
  };

  // Open checkout
  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setAmountPaidInput(cartSubtotal.toString());
    setPaymentMethod('cash');
    setCheckoutError('');
    setIsCheckoutOpen(true);
  };

  // Confirm payment
  const handleConfirmSale = () => {
    const amountPaid = parseFloat(amountPaidInput) || 0;

    if (paymentMethod === 'cash' && amountPaid < cartSubtotal) {
      setCheckoutError(`Le montant reçu (${formatMoney(amountPaid)}) est inférieur au total de ${formatMoney(cartSubtotal)}`);
      return;
    }

    if (paymentMethod === 'credit') {
      if (!selectedCustomerId) {
        setCheckoutError('Pour une vente à crédit, vous devez obligatoirement sélectionner un compte client.');
        return;
      }
      const customer = customers.find(c => c.id === selectedCustomerId);
      if (customer && (customer.creditBalance + cartSubtotal) > customer.creditLimit) {
        setCheckoutError(`Le plafond de crédit (${formatMoney(customer.creditLimit)}) de ${customer.name} serait dépassé (Solde actuel: ${formatMoney(customer.creditBalance)}).`);
        return;
      }
    }

    const customerObj = customers.find(c => c.id === selectedCustomerId);

    const result = createSale({
      storeId: effectiveStoreId,
      cashierName: activeSession?.cashierName || currentStore?.manager || 'Caissier Principal',
      customerId: selectedCustomerId || undefined,
      customerName: customerObj?.name || 'Client Comptoir',
      items: cart,
      paymentMethod,
      amountPaid: paymentMethod === 'cash' ? amountPaid : cartSubtotal,
    });

    if (result.success && result.sale) {
      setLastCompletedSale(result.sale);
      setCart([]);
      setSelectedCustomerId('');
      setIsCheckoutOpen(false);
      setIsReceiptOpen(true);
    } else {
      setCheckoutError(result.error || 'Erreur lors de la validation de la vente');
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Top Banner: Store Selector notice & Caisse shift details */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <StoreIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">
                Point de Vente : {currentStore?.name}
              </h1>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {currentStore?.code}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Gérant / Caissier : <span className="font-medium text-slate-700">{activeSession?.cashierName || currentStore?.manager}</span>
              {' · '}
              Session active : <span className="text-emerald-700 font-semibold">{activeSession ? 'Ouverte' : 'Session standard'}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Scanner Readiness Badge */}
          <button
            type="button"
            onClick={() => setIsScannerInfoOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors shadow-2xs"
            title="Scanner USB & Bluetooth actif. Cliquez pour le guide de configuration."
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px]">Scanner USB/BT Prêt</span>
            <Info className="w-3.5 h-3.5 text-emerald-600" />
          </button>

          {/* Sound Beep Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-lg border transition-colors ${
              soundEnabled 
                ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200' 
                : 'bg-rose-50 text-rose-600 border-rose-200'
            }`}
            title={soundEnabled ? 'Bip sonore de caisse actif' : 'Bip sonore muet'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Camera Scanner Button (Smartphone / Tablet / PC Webcam) */}
          <button
            type="button"
            onClick={() => setIsCameraModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 rounded-lg shadow-xs transition-all"
            title="Scanner via la caméra de votre smartphone ou ordinateur"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Scanner Caméra</span>
            <span className="hidden sm:inline-block px-1.5 py-0.2 bg-indigo-500 rounded text-[9px] font-black uppercase">
              Portable
            </span>
          </button>

          {/* Quick Scanner Simulator Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSimulatorOpen(!isSimulatorOpen)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors shadow-2xs"
              title="Tester le scan sans douchette matérielle"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden md:inline">Test Scan</span>
              <span className="text-slate-400 text-[10px]">▾</span>
            </button>
            {isSimulatorOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsSimulatorOpen(false)} />
                <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Simuler un scan de code-barres
                  </div>
                  <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                    {products.slice(0, 6).map(prod => (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => {
                          handleScanBarcode(prod.barcode);
                          setIsSimulatorOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-indigo-50 flex items-center justify-between text-slate-800 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-xs text-slate-900 truncate max-w-[150px]">{prod.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">Code: {prod.barcode}</p>
                        </div>
                        <span className="text-[11px] font-bold text-indigo-600 font-mono-numbers">
                          {formatMoney(prod.sellingPrice)}
                        </span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        handleScanBarcode('99999999');
                        setIsSimulatorOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-rose-50 text-rose-700 font-medium text-[11px] flex items-center gap-1.5"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Tester code inconnu (Erreur)</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('sales_history')}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
              title="Consulter les encaissements passés ou annuler une vente"
            >
              <History className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden lg:inline">Historique</span>
            </button>
          )}

          {/* Change Store for POS if in consolidated mode */}
          {stores.length > 1 && (
            <div className="flex items-center gap-1.5">
              <select
                value={effectiveStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {stores.map(st => (
                  <option key={st.id} value={st.id}>{st.name} ({st.code})</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Floating Scan Notification Toast */}
      {scanToast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-in slide-in-from-bottom-3 fade-in duration-200">
          <div className={`p-3.5 rounded-xl shadow-xl border flex items-start justify-between gap-3 ${
            scanToast.type === 'success' 
              ? 'bg-slate-900 border-emerald-500/80 text-white' 
              : scanToast.type === 'warning'
                ? 'bg-amber-900 border-amber-500 text-white'
                : 'bg-rose-900 border-rose-500 text-white'
          }`}>
            <div className="flex items-start gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                scanToast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white'
              }`}>
                {scanToast.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : scanToast.type === 'warning' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-300" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-300" />
                )}
              </div>
              <div>
                <h4 className="text-xs font-bold leading-tight">{scanToast.title}</h4>
                {scanToast.subtitle && (
                  <p className="text-[11px] opacity-90 mt-0.5 leading-snug">{scanToast.subtitle}</p>
                )}
                {scanToast.barcode && (
                  <span className="inline-block mt-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-slate-300">
                    Code: {scanToast.barcode}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setScanToast(null)}
              className="text-white/60 hover:text-white p-1 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main POS Split Layout: 8 cols catalog + 4 cols cart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Product Catalog & Search (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          
          {/* Search bar & Barcode Quick Scan */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
            <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  data-barcode-input="true"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher produit, code SKU ou flasher code-barres USB/BT..."
                  className="w-full pl-9 pr-24 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setIsCameraModalOpen(true)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200 transition-colors"
                  title="Scanner avec l'appareil photo du smartphone ou la webcam"
                >
                  <Camera className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden sm:inline">Caméra</span>
                </button>
              </div>

              {/* Submit / Scan Button */}
              <button
                type="submit"
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors shrink-0"
                title="Valider la recherche ou le code-barres"
              >
                <Barcode className="w-4 h-4 text-indigo-600" />
                <span>Ajouter</span>
              </button>
            </form>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {cat === 'all' ? 'Tous les rayons' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map((product) => {
              const currentStock = product.stockByStore[effectiveStoreId] || 0;
              const isOutOfStock = currentStock <= 0;
              const isLowStock = currentStock > 0 && currentStock <= product.minStockAlert;

              return (
                <div
                  key={product.id}
                  onClick={() => !isOutOfStock && handleAddToCart(product)}
                  className={`bg-white rounded-xl border p-3.5 flex flex-col justify-between transition-all select-none relative ${
                    isOutOfStock 
                      ? 'opacity-60 border-slate-200 cursor-not-allowed bg-slate-50/50' 
                      : 'border-slate-200 hover:border-indigo-400 hover:shadow-md cursor-pointer active:scale-98'
                  }`}
                >
                  <div>
                    {/* Category & Unit */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                      <span className="truncate max-w-[100px]">{product.category}</span>
                      <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-medium">
                        {product.unit}
                      </span>
                    </div>

                    {/* Product Name */}
                    <h3 className="text-xs font-semibold text-slate-900 line-clamp-2 leading-snug mb-2">
                      {product.name}
                    </h3>
                  </div>

                  <div>
                    {/* Price & Stock */}
                    <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-slate-100">
                      <span className="text-sm font-bold text-slate-900 font-mono-numbers">
                        {formatMoney(product.sellingPrice)}
                      </span>

                      {/* Stock availability badge */}
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        isOutOfStock 
                          ? 'bg-rose-50 text-rose-700' 
                          : isLowStock 
                            ? 'bg-amber-50 text-amber-700' 
                            : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {isOutOfStock ? 'Épuisé' : `Stock: ${currentStock}`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-slate-800">Aucun produit trouvé</h4>
              <p className="text-xs text-slate-500 mt-1">
                Modifiez vos critères de recherche ou sélectionnez un autre rayon.
              </p>
            </div>
          )}

        </div>

        {/* Right: Cart & Ticket Summary (4 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[calc(100vh-140px)] sticky top-20">
          
          {/* Cart Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Panier en cours ({cartItemsCount})
              </h2>
            </div>
            
            {cart.length > 0 && (
              <button
                type="button"
                onClick={handleClearCart}
                className="text-xs text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Vider</span>
              </button>
            )}
          </div>

          {/* Customer Selection */}
          <div className="p-3 bg-slate-50 border-b border-slate-200">
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              Client / Compte :
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Client Comptoir (Passage libre)</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.creditBalance > 0 ? `(Dette: ${formatMoney(c.creditBalance)})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <Receipt className="w-12 h-12 stroke-1 text-slate-300 mb-2" />
                <p className="text-xs font-medium text-slate-600">Le panier est vide</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                  Cliquez sur un article à gauche ou scannez un code-barres pour l'ajouter.
                </p>
              </div>
            ) : (
              cart.map((item) => {
                const lineTotal = (item.unitPrice * (1 - item.discountPercent / 100)) * item.quantity;
                const isHighlighted = item.product.id === highlightedProductId;
                return (
                  <div 
                    key={item.product.id} 
                    className={`py-3 first:pt-0 last:pb-0 px-2 rounded-xl transition-all duration-300 ${
                      isHighlighted ? 'bg-emerald-50 ring-2 ring-emerald-400 shadow-xs' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-semibold text-slate-900 leading-snug">
                            {item.product.name}
                          </h4>
                          {isHighlighted && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded animate-in fade-in zoom-in-75 duration-150">
                              <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                              Scanné
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono-numbers">
                          {formatMoney(item.unitPrice)} / {item.product.unit}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-900 font-mono-numbers shrink-0">
                        {formatMoney(lineTotal)}
                      </span>
                    </div>

                    {/* Qty controls & Discount */}
                    <div className="flex items-center justify-between mt-2 pt-1">
                      <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.product.id, -1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-slate-700 hover:bg-white transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleSetExactQuantity(item.product.id, parseInt(e.target.value) || 1)}
                          className="w-9 text-center text-xs font-bold bg-transparent text-slate-900 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.product.id, 1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-slate-700 hover:bg-white transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.product.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                        title="Supprimer la ligne"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Cart Footer & Totals */}
          {cart.length > 0 && (
            <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Sous-total articles :</span>
                  <span className="font-mono-numbers font-medium text-slate-800">
                    {formatMoney(cartSubtotal)}
                  </span>
                </div>
                
                {/* Manager profit indicator (subtle) */}
                <div className="flex justify-between text-[11px] text-emerald-600 bg-emerald-50/70 px-2 py-1 rounded">
                  <span>Marge brute estimée :</span>
                  <span className="font-mono-numbers font-bold">
                    +{formatMoney(cartEstimatedProfit)} ({cartSubtotal > 0 ? ((cartEstimatedProfit / cartSubtotal) * 100).toFixed(1) : 0}%)
                  </span>
                </div>

                <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 text-slate-900 font-bold">
                  <span className="text-sm">Total à Payer :</span>
                  <span className="text-lg text-indigo-600 font-mono-numbers">
                    {formatMoney(cartSubtotal)}
                  </span>
                </div>
              </div>

              {/* Action button */}
              <button
                type="button"
                onClick={handleOpenCheckout}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Banknote className="w-4 h-4" />
                <span>Encaisser {formatMoney(cartSubtotal)}</span>
              </button>
            </div>
          )}

        </div>

      </div>

      {/* MODAL 1: CHECKOUT & PAYMENT MODAL */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Encaissement de la Vente</h3>
                <p className="text-xs text-slate-300">Point de vente : {currentStore?.name}</p>
              </div>
              <button 
                onClick={() => setIsCheckoutOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              
              {/* Total to pay display */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center">
                <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider block">
                  Net à Régler
                </span>
                <span className="text-3xl font-extrabold text-indigo-900 font-mono-numbers block mt-1">
                  {formatMoney(cartSubtotal)}
                </span>
                <span className="text-xs text-indigo-600 mt-1 block">
                  {cartItemsCount} article(s) · {customers.find(c => c.id === selectedCustomerId)?.name || 'Client Comptoir'}
                </span>
              </div>

              {checkoutError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{checkoutError}</span>
                </div>
              )}

              {/* Mode de règlement tabs */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-2">
                  Mode de règlement :
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'cash' as PaymentMethod, label: 'Espèces', icon: Banknote },
                    { id: 'mobile_money' as PaymentMethod, label: 'Mobile Money', icon: Smartphone },
                    { id: 'card' as PaymentMethod, label: 'Carte Bancaire', icon: CreditCard },
                    { id: 'credit' as PaymentMethod, label: 'Dette / Crédit', icon: UserCheck },
                  ].map((mode) => {
                    const Icon = mode.icon;
                    const isSelected = paymentMethod === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(mode.id);
                          setCheckoutError('');
                          if (mode.id !== 'cash') {
                            setAmountPaidInput(cartSubtotal.toString());
                          }
                        }}
                        className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 font-bold ring-2 ring-indigo-500/20'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-xs">{mode.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Specific inputs for Cash */}
              {paymentMethod === 'cash' && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Montant reçu du client :
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={amountPaidInput}
                        onChange={(e) => setAmountPaidInput(e.target.value)}
                        placeholder="Montant en espèces..."
                        className="w-full text-lg font-bold font-mono-numbers px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        {currency}
                      </span>
                    </div>
                  </div>

                  {/* Quick bill denomination buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: 'Montant exact', val: cartSubtotal },
                      ...(currency === 'FCFA' || currency === 'GNF' || currency === 'FG' ? [
                        { label: '+500', val: Math.ceil(cartSubtotal / 500) * 500 },
                        { label: '+1 000', val: Math.ceil(cartSubtotal / 1000) * 1000 },
                        { label: '+2 000', val: Math.ceil(cartSubtotal / 2000) * 2000 },
                        { label: '+5 000', val: Math.ceil(cartSubtotal / 5000) * 5000 },
                        { label: '10 000', val: 10000 },
                        { label: '20 000', val: 20000 },
                        { label: '50 000', val: 50000 },
                      ] : [
                        { label: '+5', val: Math.ceil(cartSubtotal / 5) * 5 },
                        { label: '+10', val: Math.ceil(cartSubtotal / 10) * 10 },
                        { label: '+20', val: Math.ceil(cartSubtotal / 20) * 20 },
                        { label: '+50', val: Math.ceil(cartSubtotal / 50) * 50 },
                        { label: '100', val: 100 },
                      ])
                    ].map((btn, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAmountPaidInput(btn.val.toString())}
                        className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-colors"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  {/* Change returned calculation */}
                  {parseFloat(amountPaidInput) >= cartSubtotal && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-800">
                        Monnaie à rendre :
                      </span>
                      <span className="text-lg font-extrabold text-emerald-700 font-mono-numbers">
                        {formatMoney(parseFloat(amountPaidInput) - cartSubtotal)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Specific info for Mobile Money */}
              {paymentMethod === 'mobile_money' && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  <p className="font-semibold mb-1">Encaissement Mobile Money (Orange Money, Wave, MTN MoMo) :</p>
                  <p>Vérifiez la réception effective du SMS de confirmation sur le terminal de la boutique avant de valider.</p>
                </div>
              )}

              {/* Specific info for Credit / Dette */}
              {paymentMethod === 'credit' && (
                <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 space-y-1">
                  <p className="font-semibold">Vente à Crédit (Carnet d'ardoise) :</p>
                  <p>Le montant de {formatMoney(cartSubtotal)} sera ajouté à la dette du client sélectionné.</p>
                  {!selectedCustomerId && (
                    <p className="text-rose-600 font-medium">⚠️ Veuillez sélectionner un client dans le panier.</p>
                  )}
                </div>
              )}

            </div>

            {/* Modal actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmSale}
                className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Valider & Générer le Ticket</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: RECEIPT PREVIEW & PRINT (Thermal Receipt 80mm format) */}
      {isReceiptOpen && lastCompletedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Vente Enregistrée avec Succès !
              </span>
              <button 
                onClick={() => setIsReceiptOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Receipt Paper Container */}
            <div className="p-6 bg-slate-100 max-h-[70vh] overflow-y-auto">
              <div 
                id="printable-receipt"
                className="bg-white p-6 shadow-sm border border-slate-200 text-slate-800 text-[11px] leading-relaxed font-mono"
              >
                <div className="text-center pb-3 border-b border-dashed border-slate-300">
                  <h2 className="text-sm font-bold uppercase tracking-wider">{currentStore?.name}</h2>
                  <p className="text-[10px] text-slate-500">{currentStore?.address}</p>
                  <p className="text-[10px] text-slate-500">Tél : {currentStore?.phone}</p>
                  <p className="text-[10px] text-slate-500">Code Magasin : {currentStore?.code}</p>
                </div>

                <div className="py-2.5 border-b border-dashed border-slate-300 space-y-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span>Ticket : #{lastCompletedSale.receiptNumber}</span>
                    <span>{new Date(lastCompletedSale.createdAt).toLocaleDateString('fr-FR')} {new Date(lastCompletedSale.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Caissier : {lastCompletedSale.cashierName}</span>
                    <span>Client : {lastCompletedSale.customerName}</span>
                  </div>
                </div>

                {/* Receipt Line Items */}
                <div className="py-3 border-b border-dashed border-slate-300 space-y-2">
                  {lastCompletedSale.items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-start">
                      <div className="pr-2">
                        <p className="font-bold">{item.productName}</p>
                        <p className="text-[10px] text-slate-500">
                          {item.quantity} x {formatMoney(item.unitPrice)}
                        </p>
                      </div>
                      <span className="font-bold shrink-0">{formatMoney(item.total)}</span>
                    </div>
                  ))}
                </div>

                {/* Totals & Payments */}
                <div className="py-3 border-b border-dashed border-slate-300 space-y-1">
                  <div className="flex justify-between font-bold text-xs">
                    <span>TOTAL À PAYER :</span>
                    <span>{formatMoney(lastCompletedSale.total)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>Règlement ({lastCompletedSale.paymentMethod.toUpperCase()}) :</span>
                    <span>{formatMoney(lastCompletedSale.amountPaid || lastCompletedSale.total)}</span>
                  </div>
                  {lastCompletedSale.changeGiven > 0 && (
                    <div className="flex justify-between text-[10px] font-bold text-slate-800">
                      <span>Monnaie Rendue :</span>
                      <span>{formatMoney(lastCompletedSale.changeGiven)}</span>
                    </div>
                  )}
                </div>

                {/* Footer notes */}
                <div className="pt-3 text-center text-[10px] text-slate-500 space-y-1">
                  <p>Merci pour votre visite !</p>
                  <p>Conservez ce ticket en cas d'échange sous 48h.</p>
                  <div className="pt-2 flex justify-center text-slate-400">
                    ||| | |||| | |||||| ||| ||||
                  </div>
                </div>
              </div>
            </div>

            {/* Receipt Modal Footer Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span>Imprimer le Ticket</span>
                </button>

                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsReceiptOpen(false);
                      onNavigateTab('sales_history');
                    }}
                    className="px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    <span>Historique</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsReceiptOpen(false)}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>Nouvelle Vente</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 3: CAMERA BARCODE SCANNER (MOBILE PHONE / TABLET / PC WEBCAM) */}
      <CameraBarcodeScannerModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onBarcodeScanned={handleScanBarcode}
        storeName={currentStore?.name || 'Point de Vente'}
        cartCount={cartItemsCount}
      />

      {/* MODAL 4: SCANNER CONFIGURATION & HARDWARE DIAGNOSTICS */}
      {isScannerInfoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Système Scanner Codes-Barres</h3>
                  <p className="text-[11px] text-slate-300">Prise en charge USB, Bluetooth & Caméra Mobile</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsScannerInfoOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-600">
              
              {/* Hardware Scanner Status */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold text-slate-900">Écoute Globale USB / Bluetooth : Active</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                    Connecté
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Votre interface de caisse intercepte automatiquement les frappes ultrarapides des douchettes code-barres USB ou Bluetooth. Vous n'avez pas besoin de cliquer dans le champ de recherche avant de scanner !
                </p>
                <div className="pt-1 text-[11px] font-mono text-slate-500 flex items-center justify-between border-t border-emerald-200/60 mt-2">
                  <span>Dernier code capturé :</span>
                  <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-emerald-200">
                    {lastScannedCode ? `#${lastScannedCode}` : 'En attente de scan...'}
                  </span>
                </div>
              </div>

              {/* Mobile Phone Camera Scanner Instructions */}
              <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-indigo-950 font-bold">
                  <Smartphone className="w-4 h-4 text-indigo-600" />
                  <span>Utilisation sur Smartphone / Tablette (Portable)</span>
                </div>
                <p className="text-[11px] text-indigo-900 leading-relaxed">
                  Sur votre téléphone mobile, cliquez sur le bouton violet <strong>"Scanner Caméra"</strong> pour activer l'appareil photo. Le système lit instantanément les codes EAN-13, EAN-8, UPC et Code 128 avec vibration haptique et bip sonore.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsScannerInfoOpen(false);
                      setIsCameraModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Lancer le Scanner Caméra Maintenant</span>
                  </button>
                </div>
              </div>

              {/* Hardware Compatibility */}
              <div className="space-y-1.5 text-[11px]">
                <span className="font-bold text-slate-900 block">Matériels compatibles sans configuration :</span>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  <li>Lecteurs code-barres USB (Datalogic, Honeywell, Zebra, Netum, Eyoyo, Inateck...)</li>
                  <li>Douchettes Bluetooth connectées à votre smartphone Android, iPhone, iPad ou PC</li>
                  <li>Appareil photo de smartphone ou webcam intégrée</li>
                </ul>
              </div>

            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsScannerInfoOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
