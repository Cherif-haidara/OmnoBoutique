import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { Sale, ActiveTab, StockAlert } from '../../types';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  CreditCard, 
  Calendar, 
  Building2, 
  Download, 
  ArrowUpRight, 
  Receipt, 
  Search, 
  CheckCircle2, 
  FileSpreadsheet, 
  X,
  Printer,
  AlertTriangle,
  SlidersHorizontal,
  ArrowRightLeft,
  Truck,
  Bell,
  Package,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface AnalyticsViewProps {
  onNavigateTab?: (tab: ActiveTab) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ onNavigateTab }) => {
  const { 
    sales, 
    stores, 
    products, 
    selectedStoreId, 
    setSelectedStoreId,
    formatMoney, 
    currency,
    stockAlerts,
    dismissAlert,
    updateProductThreshold,
    setPendingTransferPrefill,
    setPendingReceptionPrefill
  } = useStore();

  const [timePeriod, setTimePeriod] = useState<'today' | '7days' | 'month' | 'year' | 'all'>('all');
  const [searchSaleQuery, setSearchSaleQuery] = useState('');
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<Sale | null>(null);

  // Notification Banner interactive states
  const [isAlertsCollapsed, setIsAlertsCollapsed] = useState(false);
  const [alertSeverityFilter, setAlertSeverityFilter] = useState<'all' | 'out_of_stock' | 'critical'>('all');
  const [editingThresholdProduct, setEditingThresholdProduct] = useState<{ id: string; name: string; threshold: number } | null>(null);
  const [thresholdInputValue, setThresholdInputValue] = useState<number>(10);

  // Filter sales based on store and date
  const filteredSales = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = startOfToday - (7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

    return sales.filter(s => {
      // Store filter
      if (selectedStoreId !== 'all' && s.storeId !== selectedStoreId) {
        return false;
      }

      // Date filter
      const saleTime = new Date(s.createdAt).getTime();
      if (timePeriod === 'today' && saleTime < startOfToday) return false;
      if (timePeriod === '7days' && saleTime < sevenDaysAgo) return false;
      if (timePeriod === 'month' && saleTime < startOfMonth) return false;
      if (timePeriod === 'year' && saleTime < startOfYear) return false;

      // Search query in table
      if (searchSaleQuery.trim()) {
        const q = searchSaleQuery.toLowerCase();
        const matchesQuery = 
          s.receiptNumber.toLowerCase().includes(q) ||
          s.cashierName.toLowerCase().includes(q) ||
          (s.customerName && s.customerName.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }

      return true;
    });
  }, [sales, selectedStoreId, timePeriod, searchSaleQuery]);

  // Aggregate KPI metrics
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalCOGS = 0;
    let totalGrossProfit = 0;
    let totalTransactions = filteredSales.length;

    filteredSales.forEach(s => {
      totalRevenue += s.total;
      totalCOGS += s.costOfGoodsSold;
      totalGrossProfit += s.grossProfit;
    });

    const averageBasket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const overallMarginRate = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCOGS,
      totalGrossProfit,
      overallMarginRate,
      averageBasket,
      totalTransactions,
    };
  }, [filteredSales]);

  // Performance breakdown by Store
  const storePerformance = useMemo(() => {
    return stores.map(store => {
      const storeSales = sales.filter(s => s.storeId === store.id);
      const revenue = storeSales.reduce((sum, s) => sum + s.total, 0);
      const profit = storeSales.reduce((sum, s) => sum + s.grossProfit, 0);
      const count = storeSales.length;
      const marginRate = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        store,
        revenue,
        profit,
        count,
        marginRate,
      };
    });
  }, [stores, sales]);

  // Top products by generated profit
  const topProfitableProducts = useMemo(() => {
    const profitMap: Record<string, { name: string; sku: string; units: number; profit: number; revenue: number }> = {};

    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        if (!profitMap[item.productId]) {
          profitMap[item.productId] = {
            name: item.productName,
            sku: item.sku,
            units: 0,
            profit: 0,
            revenue: 0,
          };
        }
        const itemProfit = item.total - (item.purchasePrice * item.quantity);
        profitMap[item.productId].units += item.quantity;
        profitMap[item.productId].profit += itemProfit;
        profitMap[item.productId].revenue += item.total;
      });
    });

    return Object.values(profitMap)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);
  }, [filteredSales]);

  // Top products by sales volume
  const topVolumeProducts = useMemo(() => {
    const volumeMap: Record<string, { name: string; sku: string; units: number; revenue: number }> = {};

    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        if (!volumeMap[item.productId]) {
          volumeMap[item.productId] = {
            name: item.productName,
            sku: item.sku,
            units: 0,
            revenue: 0,
          };
        }
        volumeMap[item.productId].units += item.quantity;
        volumeMap[item.productId].revenue += item.total;
      });
    });

    return Object.values(volumeMap)
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);
  }, [filteredSales]);

  // Export financial report CSV
  const handleExportSalesCSV = () => {
    const headers = ['N° Ticket', 'Date', 'Boutique', 'Caissier', 'Client', 'Total Vente', 'Coût Achat (COGS)', 'Bénéfice Brut', 'Taux Marge %', 'Mode Règlement'];
    const rows = filteredSales.map(s => {
      const storeName = stores.find(st => st.id === s.storeId)?.name || s.storeId;
      return [
        s.receiptNumber,
        new Date(s.createdAt).toLocaleDateString('fr-FR') + ' ' + new Date(s.createdAt).toLocaleTimeString('fr-FR'),
        `"${storeName.replace(/"/g, '""')}"`,
        `"${s.cashierName.replace(/"/g, '""')}"`,
        `"${(s.customerName || 'Client Comptoir').replace(/"/g, '""')}"`,
        s.total,
        s.costOfGoodsSold,
        s.grossProfit,
        s.profitMarginRate.toFixed(2),
        s.paymentMethod,
      ].join(';');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rapport_ventes_benefices_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Suivi des Bénéfices & Rentabilité
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tableau de bord financier, marges commerciales brutes et rentabilité multi-boutiques
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time period filter pills */}
          <div className="flex items-center bg-white p-1 rounded-lg border border-slate-200 shadow-2xs text-xs font-medium text-slate-600">
            {[
              { id: 'today', label: 'Aujourd\'hui' },
              { id: '7days', label: '7 jours' },
              { id: 'month', label: 'Ce mois' },
              { id: 'year', label: 'Année' },
              { id: 'all', label: 'Tout' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTimePeriod(tab.id as any)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  timePeriod === tab.id 
                    ? 'bg-slate-900 text-white font-semibold' 
                    : 'hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportSalesCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Rapport CSV</span>
          </button>
        </div>
      </div>

      {/* VISUAL STOCK ALERTS & CRITICAL THRESHOLD NOTIFICATIONS */}
      {stockAlerts.length > 0 ? (
        <section aria-label="Notifications Stocks Critiques" className="bg-white rounded-2xl border border-amber-300 shadow-sm overflow-hidden">
          {/* Alert Header Strip */}
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 sm:p-5 border-b border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900">
                    Système d'Alerte : {stockAlerts.length} Produit(s) sous le Seuil Critique
                  </h2>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                    {stockAlerts.filter(a => a.severity === 'out_of_stock').length > 0 && (
                      <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                        {stockAlerts.filter(a => a.severity === 'out_of_stock').length} rupture(s) totale(s)
                      </span>
                    )}
                    {stockAlerts.filter(a => a.severity === 'critical').length > 0 && (
                      <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        {stockAlerts.filter(a => a.severity === 'critical').length} stock(s) sous le seuil
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Points de vente concernés · Risque d'interruption des ventes en caisse
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <div className="flex items-center bg-white p-0.5 rounded-lg border border-amber-200 text-[11px] font-medium text-slate-600">
                <button
                  type="button"
                  onClick={() => setAlertSeverityFilter('all')}
                  className={`px-2 py-1 rounded-md transition-colors ${alertSeverityFilter === 'all' ? 'bg-slate-900 text-white font-bold' : 'hover:text-slate-900'}`}
                >
                  Tous ({stockAlerts.length})
                </button>
                {stockAlerts.filter(a => a.severity === 'out_of_stock').length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAlertSeverityFilter('out_of_stock')}
                    className={`px-2 py-1 rounded-md transition-colors ${alertSeverityFilter === 'out_of_stock' ? 'bg-rose-600 text-white font-bold' : 'hover:text-rose-700'}`}
                  >
                    Ruptures ({stockAlerts.filter(a => a.severity === 'out_of_stock').length})
                  </button>
                )}
                {stockAlerts.filter(a => a.severity === 'critical').length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAlertSeverityFilter('critical')}
                    className={`px-2 py-1 rounded-md transition-colors ${alertSeverityFilter === 'critical' ? 'bg-amber-600 text-white font-bold' : 'hover:text-amber-800'}`}
                  >
                    Critiques ({stockAlerts.filter(a => a.severity === 'critical').length})
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsAlertsCollapsed(!isAlertsCollapsed)}
                className="p-1.5 text-slate-500 hover:text-slate-800 bg-white border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors"
                title={isAlertsCollapsed ? 'Développer les alertes' : 'Réduire les alertes'}
              >
                {isAlertsCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          {!isAlertsCollapsed && (
            <div className="p-4 sm:p-5 bg-amber-50/20">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {stockAlerts
                  .filter(a => {
                    if (alertSeverityFilter === 'out_of_stock') return a.severity === 'out_of_stock';
                    if (alertSeverityFilter === 'critical') return a.severity === 'critical';
                    return true;
                  })
                  .map(alert => {
                    const isOut = alert.severity === 'out_of_stock';
                    const fillPercentage = alert.minThreshold > 0 
                      ? Math.min(100, Math.round((alert.currentStock / alert.minThreshold) * 100))
                      : 0;

                    return (
                      <div 
                        key={alert.id}
                        className={`rounded-xl border p-4 bg-white shadow-2xs flex flex-col justify-between space-y-3.5 transition-all ${
                          isOut 
                            ? 'border-rose-200 hover:border-rose-300' 
                            : 'border-amber-200 hover:border-amber-300'
                        }`}
                      >
                        {/* Top title and dismiss */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${isOut ? 'bg-rose-600' : 'bg-amber-500'}`} />
                              <h3 className="text-xs font-bold text-slate-900 line-clamp-1 leading-snug">
                                {alert.productName}
                              </h3>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                              <span className="font-semibold text-slate-700">{alert.storeName}</span>
                              <span>·</span>
                              <span>{alert.sku}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => dismissAlert(alert.id)}
                            className="text-slate-400 hover:text-slate-600 p-1"
                            title="Masquer cette alerte"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Stock Level Bar Gauge */}
                        <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <div className="flex justify-between items-baseline text-xs">
                            <span className="text-slate-500">Stock restant :</span>
                            <span className={`font-mono-numbers font-bold ${isOut ? 'text-rose-600' : 'text-amber-700'}`}>
                              {alert.currentStock} / {alert.minThreshold} {alert.unit}(s)
                            </span>
                          </div>

                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${isOut ? 'bg-rose-500 w-1' : 'bg-amber-500'}`}
                              style={{ width: `${Math.max(4, fillPercentage)}%` }}
                            />
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-slate-500 pt-0.5">
                            <span className={isOut ? 'text-rose-600 font-bold' : 'text-amber-700 font-semibold'}>
                              {isOut ? 'Rupture complète' : `Déficit de -${alert.deficit} ${alert.unit}(s)`}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingThresholdProduct({ id: alert.productId, name: alert.productName, threshold: alert.minThreshold });
                                setThresholdInputValue(alert.minThreshold);
                              }}
                              className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 hover:underline"
                              title="Modifier le seuil critique pour cet article"
                            >
                              <SlidersHorizontal className="w-3 h-3" />
                              <span>Seuil: {alert.minThreshold}</span>
                            </button>
                          </div>
                        </div>

                        {/* Network Logistical Intelligence: Transfer or Supplier Reorder */}
                        <div className="pt-1">
                          {alert.alternativeStoresWithStock.length > 0 ? (
                            <div className="bg-indigo-50/70 border border-indigo-100 rounded-lg p-2.5 space-y-2 text-xs">
                              <div className="flex items-center gap-1.5 text-indigo-900 text-[11px]">
                                <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span>
                                  <strong>{alert.alternativeStoresWithStock[0].stock} unité(s)</strong> disponible(s) à {alert.alternativeStoresWithStock[0].storeName.split(' - ')[0]}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setPendingTransferPrefill({
                                    fromStoreId: alert.alternativeStoresWithStock[0].storeId,
                                    toStoreId: alert.storeId,
                                    productId: alert.productId,
                                  });
                                  onNavigateTab?.('transfers');
                                }}
                                className="w-full py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-bold shadow-2xs transition-colors flex items-center justify-center gap-1.5"
                              >
                                <ArrowRightLeft className="w-3 h-3" />
                                <span>Transférer vers {alert.storeCode}</span>
                              </button>
                            </div>
                          ) : (
                            <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-2.5 space-y-2 text-xs">
                              <div className="flex items-center gap-1.5 text-amber-900 text-[11px]">
                                <Truck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span className="truncate">
                                  Rupture réseau · Fournisseur : <strong>{alert.supplierName || 'Distributeur'}</strong>
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setPendingReceptionPrefill({
                                    storeId: alert.storeId,
                                    productId: alert.productId,
                                  });
                                  onNavigateTab?.('inventory');
                                }}
                                className="w-full py-1.5 px-2 bg-amber-700 hover:bg-amber-800 text-white rounded-md text-xs font-bold shadow-2xs transition-colors flex items-center justify-center gap-1.5"
                              >
                                <Truck className="w-3 h-3" />
                                <span>Commander Réapprovisionnement</span>
                              </button>
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </section>
      ) : (
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">
              Stocks optimaux : Aucun article en dessous de son seuil critique dans vos boutiques.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab?.('inventory')}
            className="text-xs font-bold text-emerald-800 hover:underline"
          >
            Consulter l'Inventaire ➔
          </button>
        </div>
      )}

      {/* Main Financial KPI Strips */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Chiffre d'Affaires Total */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium text-slate-500">Chiffre d'Affaires (CA)</span>
            <DollarSign className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-extrabold text-slate-900 font-mono-numbers">
            {formatMoney(stats.totalRevenue)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {stats.totalTransactions} ticket(s) encaissé(s)
          </p>
        </div>

        {/* Coût des Marchandises Vendues */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium text-slate-500">Coût d'Achat (COGS)</span>
            <Receipt className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-extrabold text-slate-700 font-mono-numbers">
            {formatMoney(stats.totalCOGS)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Prix d'achat réel des articles vendus
          </p>
        </div>

        {/* Bénéfice Brut (Marge nette opérationnelle) */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium text-emerald-700 font-semibold">Bénéfice Brut Réalisé</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-extrabold text-emerald-600 font-mono-numbers">
            +{formatMoney(stats.totalGrossProfit)}
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">
            Marge brute globale : <span className="font-bold">{stats.overallMarginRate.toFixed(1)}%</span>
          </p>
        </div>

        {/* Panier Moyen */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium text-slate-500">Panier Moyen</span>
            <ShoppingBag className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-extrabold text-slate-900 font-mono-numbers">
            {formatMoney(stats.averageBasket)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Valeur moyenne par transaction
          </p>
        </div>

      </div>

      {/* Boutique Performance Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Rentabilité Comparative par Boutique
            </h2>
            <p className="text-xs text-slate-500">
              Contribution de chaque point de vente au chiffre d'affaires et à la marge bénéficiaire
            </p>
          </div>
          <span className="text-xs text-slate-400 font-medium">{stores.length} points de vente</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {storePerformance.map(sp => {
            const pctOfTotalRevenue = stats.totalRevenue > 0 ? (sp.revenue / stats.totalRevenue) * 100 : 0;
            return (
              <div 
                key={sp.store.id} 
                className="bg-slate-50 rounded-xl border border-slate-200/80 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-900 truncate max-w-[170px]">
                      {sp.store.name}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 font-mono-numbers">
                    {sp.store.code}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">CA Réalisé :</span>
                    <span className="font-bold text-slate-900 font-mono-numbers">{formatMoney(sp.revenue)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Bénéfice Net :</span>
                    <span className="font-bold text-emerald-700 font-mono-numbers">+{formatMoney(sp.profit)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Taux de marge :</span>
                    <span className="font-semibold text-slate-700">{sp.marginRate.toFixed(1)}%</span>
                  </div>
                </div>

                {/* Contribution bar */}
                <div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(5, pctOfTotalRevenue))}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>Part CA global : {pctOfTotalRevenue.toFixed(0)}%</span>
                    <span>{sp.count} ventes</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top 5 Profitable & Top 5 Volume Products Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Top 5 Most Profitable */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Top 5 Produits les Plus Rentables
            </h3>
            <span className="text-[11px] text-slate-400">Par gain net total</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {topProfitableProducts.map((p, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900 leading-snug">{p.name}</p>
                  <p className="text-[11px] text-slate-400 font-mono-numbers">{p.units} unités vendues</p>
                </div>
                <div className="text-right font-mono-numbers">
                  <span className="font-bold text-emerald-700 block">+{formatMoney(p.profit)}</span>
                  <span className="text-[10px] text-slate-400">CA: {formatMoney(p.revenue)}</span>
                </div>
              </div>
            ))}

            {topProfitableProducts.length === 0 && (
              <p className="py-6 text-center text-slate-400 text-xs">Aucune vente enregistrée sur cette période</p>
            )}
          </div>
        </div>

        {/* Top 5 Volume Sellers */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-indigo-600" />
              Top 5 Produits les Plus Vendus (Volume)
            </h3>
            <span className="text-[11px] text-slate-400">Par quantité écoulée</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {topVolumeProducts.map((p, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900 leading-snug">{p.name}</p>
                  <p className="text-[11px] text-slate-400 font-mono-numbers">{p.sku}</p>
                </div>
                <div className="text-right font-mono-numbers">
                  <span className="font-bold text-indigo-600 block">{p.units} vendus</span>
                  <span className="text-[10px] text-slate-400">{formatMoney(p.revenue)}</span>
                </div>
              </div>
            ))}

            {topVolumeProducts.length === 0 && (
              <p className="py-6 text-center text-slate-400 text-xs">Aucune vente enregistrée sur cette période</p>
            )}
          </div>
        </div>

      </div>

      {/* Sales Transactions Journal Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-3">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Journal des Ventes & Marges par Ticket
            </h3>
            <p className="text-xs text-slate-500">
              Historique détaillé des encaissements avec calcul du bénéfice unitaire
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('sales_history')}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors whitespace-nowrap"
              >
                Gérer & Annuler des Ventes ➔
              </button>
            )}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchSaleQuery}
                onChange={(e) => setSearchSaleQuery(e.target.value)}
                placeholder="Rechercher ticket, caissier..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">N° Ticket & Date</th>
                <th className="py-3 px-3">Boutique</th>
                <th className="py-3 px-3">Client</th>
                <th className="py-3 px-3">Règlement</th>
                <th className="py-3 px-3 text-right">Montant Vente</th>
                <th className="py-3 px-3 text-right">Coût Achat</th>
                <th className="py-3 px-3 text-right">Marge Brute</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredSales.map((sale) => {
                const storeName = stores.find(s => s.id === sale.storeId)?.name || sale.storeId;
                return (
                  <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Ticket & Date */}
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 font-mono-numbers block">
                        {sale.receiptNumber}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(sale.createdAt).toLocaleDateString('fr-FR')} {new Date(sale.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>

                    {/* Boutique */}
                    <td className="py-3 px-3 truncate max-w-[160px]">
                      <span className="font-medium text-slate-900">{storeName}</span>
                      <span className="text-[11px] text-slate-400 block">{sale.cashierName}</span>
                    </td>

                    {/* Client */}
                    <td className="py-3 px-3">
                      <span className="text-slate-800">{sale.customerName || 'Client Comptoir'}</span>
                    </td>

                    {/* Mode règlement */}
                    <td className="py-3 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        sale.paymentMethod === 'cash' 
                          ? 'bg-slate-100 text-slate-800' 
                          : sale.paymentMethod === 'mobile_money'
                            ? 'bg-amber-50 text-amber-700'
                            : sale.paymentMethod === 'credit'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-indigo-50 text-indigo-700'
                      }`}>
                        {sale.paymentMethod}
                      </span>
                    </td>

                    {/* Montant Vente */}
                    <td className="py-3 px-3 text-right font-mono-numbers font-bold text-slate-900">
                      {formatMoney(sale.total)}
                    </td>

                    {/* Coût Achat */}
                    <td className="py-3 px-3 text-right font-mono-numbers text-slate-500">
                      {formatMoney(sale.costOfGoodsSold)}
                    </td>

                    {/* Marge Brute */}
                    <td className="py-3 px-3 text-right font-mono-numbers">
                      <span className="font-bold text-emerald-700 block">
                        +{formatMoney(sale.grossProfit)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ({sale.profitMarginRate.toFixed(1)}%)
                      </span>
                    </td>

                    {/* Actions: View Receipt */}
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedSaleDetail(sale)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        Voir Ticket
                      </button>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredSales.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-xs">
            Aucune vente ne correspond à vos filtres.
          </div>
        )}
      </div>

      {/* MODAL: SALE TICKET DETAIL */}
      {selectedSaleDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-indigo-400" />
                Détail Ticket #{selectedSaleDetail.receiptNumber}
              </span>
              <button 
                onClick={() => setSelectedSaleDetail(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 bg-slate-50 max-h-[70vh] overflow-y-auto space-y-4 text-xs">
              
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Date & Heure :</span>
                  <span className="font-medium text-slate-800">
                    {new Date(selectedSaleDetail.createdAt).toLocaleDateString('fr-FR')} {new Date(selectedSaleDetail.createdAt).toLocaleTimeString('fr-FR')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Boutique :</span>
                  <span className="font-medium text-slate-800">
                    {stores.find(s => s.id === selectedSaleDetail.storeId)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Caissier :</span>
                  <span className="font-medium text-slate-800">{selectedSaleDetail.cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Client :</span>
                  <span className="font-medium text-slate-800">{selectedSaleDetail.customerName || 'Client Comptoir'}</span>
                </div>
              </div>

              {/* Items */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="font-semibold text-slate-800 mb-2">Articles Encaissés :</div>
                {selectedSaleDetail.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start text-xs border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-slate-900">{item.productName}</p>
                      <p className="text-[11px] text-slate-400 font-mono-numbers">
                        {item.quantity} x {formatMoney(item.unitPrice)}
                      </p>
                    </div>
                    <span className="font-bold text-slate-900 font-mono-numbers">
                      {formatMoney(item.total)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Profitability summary for this ticket */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-1.5 text-xs text-emerald-900">
                <div className="flex justify-between font-bold">
                  <span>Chiffre d'Affaires Ticket :</span>
                  <span className="font-mono-numbers">{formatMoney(selectedSaleDetail.total)}</span>
                </div>
                <div className="flex justify-between text-emerald-800">
                  <span>Coût d'achat marchandises :</span>
                  <span className="font-mono-numbers">{formatMoney(selectedSaleDetail.costOfGoodsSold)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-sm text-emerald-700 pt-1 border-t border-emerald-200">
                  <span>Marge Bénéficiaire Nette :</span>
                  <span className="font-mono-numbers">+{formatMoney(selectedSaleDetail.grossProfit)} ({selectedSaleDetail.profitMarginRate.toFixed(1)}%)</span>
                </div>
              </div>

            </div>

            <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSaleDetail(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: EDIT MINIMUM CRITICAL THRESHOLD */}
      {editingThresholdProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                Définir le Seuil Critique d'Alerte
              </span>
              <button 
                onClick={() => setEditingThresholdProduct(null)} 
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateProductThreshold(editingThresholdProduct.id, thresholdInputValue);
                setEditingThresholdProduct(null);
              }}
              className="p-5 space-y-4 text-xs"
            >
              <div>
                <p className="font-bold text-slate-900 text-sm">{editingThresholdProduct.name}</p>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Une notification visuelle se déclenchera dès que le stock tombera à ou sous cette quantité.
                </p>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nouveau seuil critique minimal d'alerte :
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={thresholdInputValue}
                  onChange={(e) => setThresholdInputValue(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold font-mono-numbers text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingThresholdProduct(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  Enregistrer le Seuil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
