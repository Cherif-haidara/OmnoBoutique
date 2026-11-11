import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { Sale, PaymentMethod } from '../../types';
import { 
  Search, 
  Filter, 
  Calendar, 
  RotateCcw, 
  Printer, 
  Receipt, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Building2, 
  User, 
  DollarSign, 
  CreditCard, 
  Smartphone, 
  Coins, 
  Download,
  Info,
  Package,
  TrendingUp,
  Tag
} from 'lucide-react';

export const SalesHistoryView: React.FC = () => {
  const { 
    sales, 
    stores, 
    selectedStoreId, 
    setSelectedStoreId, 
    formatMoney, 
    cancelSale 
  } = useStore();

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStoreId, setFilterStoreId] = useState<string>(selectedStoreId === 'all' ? 'all' : selectedStoreId);
  const [periodFilter, setPeriodFilter] = useState<'today' | '7days' | '30days' | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'cancelled'>('all');

  // Modal States
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);
  const [cancellationReason, setCancellationReason] = useState('Retour marchandise');
  const [customReason, setCustomReason] = useState('');
  const [restockItems, setRestockItems] = useState(true);
  const [cancelledBy, setCancelledBy] = useState('Superviseur Caisse');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Sync filterStoreId when selectedStoreId changes externally
  React.useEffect(() => {
    if (selectedStoreId !== 'all') {
      setFilterStoreId(selectedStoreId);
    }
  }, [selectedStoreId]);

  // Quick preset dates
  const handlePeriodChange = (period: 'today' | '7days' | '30days' | 'all') => {
    setPeriodFilter(period);
    const now = new Date();
    if (period === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (period === '7days') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (period === '30days') {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  // Filtered sales list
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      // Store filter
      if (filterStoreId !== 'all' && sale.storeId !== filterStoreId) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && sale.status !== statusFilter) {
        return false;
      }

      // Payment method filter
      if (paymentFilter !== 'all' && sale.paymentMethod !== paymentFilter) {
        return false;
      }

      // Date range filter
      if (startDate) {
        const saleDateStr = sale.createdAt.split('T')[0];
        if (saleDateStr < startDate) return false;
      }
      if (endDate) {
        const saleDateStr = sale.createdAt.split('T')[0];
        if (saleDateStr > endDate) return false;
      }

      // Text search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesReceipt = sale.receiptNumber.toLowerCase().includes(query);
        const matchesCashier = sale.cashierName.toLowerCase().includes(query);
        const matchesCustomer = (sale.customerName || '').toLowerCase().includes(query);
        const matchesItem = sale.items.some(it => 
          it.productName.toLowerCase().includes(query) || 
          it.sku.toLowerCase().includes(query)
        );
        if (!matchesReceipt && !matchesCashier && !matchesCustomer && !matchesItem) {
          return false;
        }
      }

      return true;
    });
  }, [sales, filterStoreId, statusFilter, paymentFilter, startDate, endDate, searchTerm]);

  // Aggregate Key Performance Metrics
  const stats = useMemo(() => {
    let completedTotal = 0;
    let completedProfit = 0;
    let completedCount = 0;
    let cancelledTotal = 0;
    let cancelledCount = 0;

    filteredSales.forEach(s => {
      if (s.status === 'completed') {
        completedTotal += s.total;
        completedProfit += s.grossProfit;
        completedCount++;
      } else if (s.status === 'cancelled') {
        cancelledTotal += s.total;
        cancelledCount++;
      }
    });

    const averageBasket = completedCount > 0 ? completedTotal / completedCount : 0;
    const marginRate = completedTotal > 0 ? (completedProfit / completedTotal) * 100 : 0;

    return {
      completedTotal,
      completedProfit,
      completedCount,
      cancelledTotal,
      cancelledCount,
      averageBasket,
      marginRate,
    };
  }, [filteredSales]);

  // Handlers
  const handleOpenCancelModal = (sale: Sale) => {
    setSaleToCancel(sale);
    setCancellationReason('Retour marchandise');
    setCustomReason('');
    setRestockItems(true);
    setActionError(null);
  };

  const handleConfirmCancel = () => {
    if (!saleToCancel) return;

    const finalReason = cancellationReason === 'Autre' ? customReason.trim() : cancellationReason;
    if (!finalReason) {
      setActionError('Veuillez préciser le motif de l\'annulation.');
      return;
    }

    const res = cancelSale({
      saleId: saleToCancel.id,
      reason: finalReason,
      restockItems,
      cancelledBy: cancelledBy.trim() || 'Superviseur Caisse',
    });

    if (res.success) {
      setActionSuccess(`La vente #${saleToCancel.receiptNumber} a été annulée avec succès.`);
      setSaleToCancel(null);
      setTimeout(() => setActionSuccess(null), 4000);
    } else {
      setActionError(res.error || 'Erreur lors de l\'annulation de la vente.');
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (filteredSales.length === 0) return;

    const headers = [
      'N° Reçu',
      'Date & Heure',
      'Boutique',
      'Caissier',
      'Client',
      'Mode de Paiement',
      'Total Vente',
      'Coût Marchandises',
      'Bénéfice Brut',
      'Statut',
      'Motif Annulation'
    ];

    const rows = filteredSales.map(s => {
      const storeName = stores.find(st => st.id === s.storeId)?.name || s.storeId;
      return [
        s.receiptNumber,
        new Date(s.createdAt).toLocaleString('fr-FR'),
        `"${storeName}"`,
        `"${s.cashierName}"`,
        `"${s.customerName || 'Passage'}"`,
        s.paymentMethod,
        s.total,
        s.costOfGoodsSold,
        s.grossProfit,
        s.status === 'completed' ? 'Validée' : 'Annulée',
        `"${s.cancellationReason || ''}"`
      ].join(';');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `historique_ventes_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPaymentBadge = (method: PaymentMethod) => {
    switch (method) {
      case 'cash':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Coins className="w-3 h-3 text-emerald-600" />
            Espèces
          </span>
        );
      case 'card':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <CreditCard className="w-3 h-3 text-blue-600" />
            Carte
          </span>
        );
      case 'mobile_money':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Smartphone className="w-3 h-3 text-amber-600" />
            Mobile Money
          </span>
        );
      case 'credit':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <DollarSign className="w-3 h-3 text-purple-600" />
            Crédit (Dette)
          </span>
        );
    }
  };

  const getStoreName = (storeId: string) => {
    return stores.find(st => st.id === storeId)?.name || storeId;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Toast notifications */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-sm shadow-xs animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-semibold">{actionSuccess}</span>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Historique des Ventes & Transactions
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {filteredSales.length} transaction(s)
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Consultez les reçus de caisse, réimprimez les tickets thermiques et annulez des encaissements erronés avec réintégration automatique des stocks.
          </p>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredSales.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-2xs"
            title="Exporter l'historique filtré en CSV"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Exporter CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Chiffre d'Affaires Net</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold font-mono-numbers text-slate-900">
              {formatMoney(stats.completedTotal)}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-700 font-medium">
            {stats.completedCount} vente(s) validée(s)
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Marge Brute Réalisée</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold font-mono-numbers text-indigo-700">
              {formatMoney(stats.completedProfit)}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Taux de marge moyen: <span className="font-semibold text-slate-700">{stats.marginRate.toFixed(1)}%</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Panier Moyen</span>
            <Receipt className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold font-mono-numbers text-slate-900">
              {formatMoney(stats.averageBasket)}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Par encaissement validé
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Ventes Annulées</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold font-mono-numbers text-rose-600">
              {formatMoney(stats.cancelledTotal)}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-rose-700 font-medium">
            {stats.cancelledCount} transaction(s) annulée(s)
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Rechercher par N° ticket, caissier, client, produit ou SKU..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-900"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Boutique dropdown filter */}
          <div className="flex items-center gap-2 shrink-0">
            <Building2 className="w-4 h-4 text-slate-400" />
            <select
              value={filterStoreId}
              onChange={e => {
                setFilterStoreId(e.target.value);
                if (e.target.value !== 'all') {
                  setSelectedStoreId(e.target.value);
                }
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Toutes les boutiques (Siège)</option>
              {stores.map(st => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.code})
                </option>
              ))}
            </select>
          </div>

          {/* Payment filter */}
          <div className="flex items-center gap-2 shrink-0">
            <DollarSign className="w-4 h-4 text-slate-400" />
            <select
              value={paymentFilter}
              onChange={e => setPaymentFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Tous les règlements</option>
              <option value="cash">Espèces</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="card">Carte Bancaire</option>
              <option value="credit">À crédit (Dette)</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="completed">Validées uniquement</option>
              <option value="cancelled">Annulées uniquement</option>
            </select>
          </div>
        </div>

        {/* Date presets and manual range strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Période :
            </span>
            {(['today', '7days', '30days', 'all'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => handlePeriodChange(p)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  periodFilter === p
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p === 'today' && "Aujourd'hui"}
                {p === '7days' && '7 derniers jours'}
                {p === '30days' && '30 derniers jours'}
                {p === 'all' && 'Toutes les dates'}
              </button>
            ))}
          </div>

          {/* Manual date inputs */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">Du</span>
            <input
              type="date"
              value={startDate}
              onChange={e => {
                setStartDate(e.target.value);
                setPeriodFilter('all');
              }}
              className="px-2 py-1 text-xs border border-slate-200 rounded-md bg-slate-50 text-slate-700"
            />
            <span className="text-slate-400 text-[11px]">Au</span>
            <input
              type="date"
              value={endDate}
              onChange={e => {
                setEndDate(e.target.value);
                setPeriodFilter('all');
              }}
              className="px-2 py-1 text-xs border border-slate-200 rounded-md bg-slate-50 text-slate-700"
            />
            {(startDate || endDate || searchTerm || paymentFilter !== 'all' || statusFilter !== 'all' || filterStoreId !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setFilterStoreId('all');
                  setPeriodFilter('all');
                  setStartDate('');
                  setEndDate('');
                  setPaymentFilter('all');
                  setStatusFilter('all');
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold ml-2 underline"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-bold">N° Reçu & Date</th>
                <th className="py-3 px-4 font-bold">Point de Vente</th>
                <th className="py-3 px-4 font-bold">Caissier / Vendeur</th>
                <th className="py-3 px-4 font-bold">Client</th>
                <th className="py-3 px-4 font-bold">Articles</th>
                <th className="py-3 px-4 font-bold">Règlement</th>
                <th className="py-3 px-4 font-bold text-right">Total Vente</th>
                <th className="py-3 px-4 font-bold text-right">Bénéfice</th>
                <th className="py-3 px-4 font-bold text-center">Statut</th>
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-1" />
                    <p className="font-semibold text-slate-700 text-sm">Aucune vente trouvée</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Modifiez les filtres de recherche ou effectuez une nouvelle vente sur la caisse POS.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSales.map(sale => {
                  const isCancelled = sale.status === 'cancelled';
                  const dateObj = new Date(sale.createdAt);
                  const formattedDate = dateObj.toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });
                  const formattedTime = dateObj.toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const totalItemsCount = sale.items.reduce((acc, it) => acc + it.quantity, 0);

                  return (
                    <tr 
                      key={sale.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCancelled ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      {/* Ticket # & Date */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold font-mono-numbers text-slate-900">
                          <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                          <span>#{sale.receiptNumber}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {formattedDate} à {formattedTime}
                        </div>
                      </td>

                      {/* Store */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900">
                          {getStoreName(sale.storeId)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Code: {stores.find(st => st.id === sale.storeId)?.code || 'GEN'}
                        </div>
                      </td>

                      {/* Cashier */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-slate-700">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{sale.cashierName}</span>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {sale.customerName ? (
                          <div className="font-medium text-indigo-700">
                            {sale.customerName}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Client comptoir</span>
                        )}
                      </td>

                      {/* Items preview */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900">
                            {totalItemsCount} art.
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500 truncate block text-[11px]" title={sale.items.map(i => `${i.productName} (x${i.quantity})`).join(', ')}>
                            {sale.items.map(i => i.productName).join(', ')}
                          </span>
                        </div>
                      </td>

                      {/* Payment method */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getPaymentBadge(sale.paymentMethod)}
                      </td>

                      {/* Total */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className={`font-bold font-mono-numbers text-sm ${
                          isCancelled ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}>
                          {formatMoney(sale.total)}
                        </span>
                      </td>

                      {/* Gross profit */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {!isCancelled ? (
                          <div>
                            <span className="font-semibold font-mono-numbers text-emerald-700">
                              +{formatMoney(sale.grossProfit)}
                            </span>
                            <div className="text-[10px] text-slate-400 font-mono-numbers">
                              {sale.profitMarginRate.toFixed(1)}% marge
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono-numbers">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isCancelled ? (
                          <span 
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200"
                            title={`Annulée par: ${sale.cancelledBy || 'Opérateur'}\nMotif: ${sale.cancellationReason || 'Non précisé'}`}
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            Annulée
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Validée
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Reprint / View Receipt */}
                          <button
                            type="button"
                            onClick={() => setSelectedSaleForReceipt(sale)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition-colors"
                            title="Afficher et réimprimer le ticket de caisse"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Cancel Sale Button */}
                          {!isCancelled ? (
                            <button
                              type="button"
                              onClick={() => handleOpenCancelModal(sale)}
                              className="px-2 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors inline-flex items-center gap-1"
                              title="Annuler cette vente et réintégrer les stocks"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Annuler</span>
                            </button>
                          ) : (
                            <span 
                              className="text-[10px] text-slate-400 italic cursor-help"
                              title={`Motif: ${sale.cancellationReason || 'Non spécifié'}`}
                            >
                              Annulée
                            </span>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: CANCELLATION DIALOG */}
      {saleToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Annuler la Vente #{saleToCancel.receiptNumber}
                  </h3>
                  <p className="text-xs text-rose-800">
                    Cette action annulera la transaction et mettra à jour la caisse
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSaleToCancel(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              
              {actionError && (
                <div className="p-3 bg-rose-100 border border-rose-200 rounded-lg text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Transaction Recap */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Montant de la vente :</span>
                  <span className="font-bold font-mono-numbers text-slate-900 text-sm">
                    {formatMoney(saleToCancel.total)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Boutique concernée :</span>
                  <span className="font-semibold text-slate-800">{getStoreName(saleToCancel.storeId)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Mode de paiement :</span>
                  <span className="font-medium">{saleToCancel.paymentMethod}</span>
                </div>
                {saleToCancel.customerName && (
                  <div className="flex justify-between text-slate-600">
                    <span>Client :</span>
                    <span className="font-medium text-indigo-700">{saleToCancel.customerName}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Nombre d'articles :</span>
                  <span className="font-medium">{saleToCancel.items.reduce((s, i) => s + i.quantity, 0)}</span>
                </div>
              </div>

              {/* Reason Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Motif de l'annulation *
                </label>
                <select
                  value={cancellationReason}
                  onChange={e => setCancellationReason(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Retour marchandise">Retour marchandise / Client insatisfait</option>
                  <option value="Erreur de saisie caisse">Erreur de saisie / Doublon de frappe</option>
                  <option value="Paiement refusé ou annulé">Paiement rejeté / Échec Mobile Money</option>
                  <option value="Article défectueux">Article défectueux / Avarie constatée</option>
                  <option value="Autre">Autre motif personnalisé...</option>
                </select>

                {cancellationReason === 'Autre' && (
                  <input
                    type="text"
                    value={customReason}
                    onChange={e => setCustomReason(e.target.value)}
                    placeholder="Précisez la raison détaillée de l'annulation..."
                    className="w-full mt-2 text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>

              {/* Cancelled by operator */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Opérateur / Superviseur responsable
                </label>
                <input
                  type="text"
                  value={cancelledBy}
                  onChange={e => setCancelledBy(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Restock Checkbox */}
              <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restockItems}
                    onChange={e => setRestockItems(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-indigo-950 block">
                      Réintégrer automatiquement les articles en stock
                    </span>
                    <span className="text-indigo-800 text-[11px] block mt-0.5">
                      Les quantités vendues seront immédiatement recréditées dans le stock de la boutique {getStoreName(saleToCancel.storeId)}.
                    </span>
                  </div>
                </label>
              </div>

              {/* Impact Notice */}
              <div className="text-[11px] text-slate-500 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  Le chiffre d'affaires, le registre de caisse en cours et la fiche client (si vente à crédit) seront automatiquement ajustés.
                </span>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSaleToCancel(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Conserver la vente
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-98 rounded-lg shadow-xs transition-all flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>Confirmer l'annulation</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: 80MM THERMAL RECEIPT PREVIEW & REPRINT */}
      {selectedSaleForReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header toolbar */}
            <div className="p-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold">Ticket de Caisse 80mm</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="px-2.5 py-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md flex items-center gap-1 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSaleForReceipt(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Receipt Preview Body (Realistic 80mm Thermal Receipt styling) */}
            <div className="p-6 overflow-y-auto bg-slate-100 flex justify-center">
              <div 
                id="thermal-receipt"
                className="w-[320px] bg-white p-5 shadow-md border border-dashed border-slate-300 text-slate-900 font-mono text-[11px] leading-relaxed relative"
              >
                
                {/* Watermark for cancelled receipt */}
                {selectedSaleForReceipt.status === 'cancelled' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                    <div className="text-rose-600/30 text-5xl font-black rotate-[-30deg] border-4 border-rose-600/30 px-4 py-2 rounded-xl">
                      ANNULÉ
                    </div>
                  </div>
                )}

                {/* Shop Branding */}
                <div className="text-center pb-3 border-b border-dashed border-slate-300">
                  <h2 className="text-sm font-black tracking-tight uppercase">
                    {getStoreName(selectedSaleForReceipt.storeId)}
                  </h2>
                  <p className="text-[10px] text-slate-500">
                    {stores.find(st => st.id === selectedSaleForReceipt.storeId)?.address || 'Point de vente agréé'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Tél : {stores.find(st => st.id === selectedSaleForReceipt.storeId)?.phone || '+221 77 000 00 00'}
                  </p>
                </div>

                {/* Meta details */}
                <div className="py-2.5 border-b border-dashed border-slate-300 text-[10px] space-y-1">
                  <div className="flex justify-between">
                    <span>TICKET N° :</span>
                    <span className="font-bold">#{selectedSaleForReceipt.receiptNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DATE :</span>
                    <span>{new Date(selectedSaleForReceipt.createdAt).toLocaleString('fr-FR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CAISSIER :</span>
                    <span>{selectedSaleForReceipt.cashierName}</span>
                  </div>
                  {selectedSaleForReceipt.customerName && (
                    <div className="flex justify-between font-bold text-indigo-900">
                      <span>CLIENT :</span>
                      <span>{selectedSaleForReceipt.customerName}</span>
                    </div>
                  )}
                  {selectedSaleForReceipt.status === 'cancelled' && (
                    <div className="bg-rose-50 text-rose-800 p-1.5 rounded mt-1 border border-rose-200">
                      <p className="font-bold">TRANSACTION ANNULÉE</p>
                      <p>Date : {selectedSaleForReceipt.cancelledAt ? new Date(selectedSaleForReceipt.cancelledAt).toLocaleString('fr-FR') : '-'}</p>
                      <p>Motif : {selectedSaleForReceipt.cancellationReason || 'N/A'}</p>
                    </div>
                  )}
                </div>

                {/* Line Items Table */}
                <div className="py-3 border-b border-dashed border-slate-300">
                  <div className="grid grid-cols-12 font-bold text-[10px] pb-1 border-b border-slate-200 mb-1.5">
                    <span className="col-span-6">DÉSIGNATION</span>
                    <span className="col-span-2 text-center">QTÉ</span>
                    <span className="col-span-4 text-right">TOTAL</span>
                  </div>

                  <div className="space-y-1.5">
                    {selectedSaleForReceipt.items.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 text-[10px]">
                        <div className="col-span-6 pr-1">
                          <p className="font-semibold truncate">{item.productName}</p>
                          <p className="text-[9px] text-slate-500">{formatMoney(item.unitPrice)}/{item.unit}</p>
                        </div>
                        <div className="col-span-2 text-center font-bold">
                          x{item.quantity}
                        </div>
                        <div className="col-span-4 text-right font-bold">
                          {formatMoney(item.total)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals Section */}
                <div className="py-3 border-b border-dashed border-slate-300 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span>Sous-total HT :</span>
                    <span className="font-bold">{formatMoney(selectedSaleForReceipt.subtotal)}</span>
                  </div>
                  {selectedSaleForReceipt.discountTotal > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Remise accordée :</span>
                      <span>-{formatMoney(selectedSaleForReceipt.discountTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black pt-1 border-t border-slate-200">
                    <span>NET À PAYER :</span>
                    <span className="text-indigo-900">{formatMoney(selectedSaleForReceipt.total)}</span>
                  </div>
                </div>

                {/* Payment Breakdown */}
                <div className="py-2.5 border-b border-dashed border-slate-300 text-[10px] space-y-1">
                  <div className="flex justify-between">
                    <span>RÈGLEMENT :</span>
                    <span className="font-bold uppercase">{selectedSaleForReceipt.paymentMethod}</span>
                  </div>
                  {selectedSaleForReceipt.paymentMethod === 'cash' && (
                    <>
                      <div className="flex justify-between">
                        <span>MONTANT REÇU :</span>
                        <span>{formatMoney(selectedSaleForReceipt.amountPaid)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>MONNAIE RENDUE :</span>
                        <span className="font-bold">{formatMoney(selectedSaleForReceipt.changeGiven)}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Receipt Footer & Barcode mock */}
                <div className="text-center pt-4 space-y-2 text-[10px]">
                  <p className="font-medium text-slate-600">
                    Merci pour votre visite et à très bientôt !
                  </p>
                  
                  {/* Decorative Barcode */}
                  <div className="flex flex-col items-center justify-center pt-1 opacity-80">
                    <div className="h-9 w-44 bg-repeating-linear-to-r from-slate-900 via-slate-900 to-transparent flex items-center justify-center">
                      <div className="w-full h-7 bg-[repeating-linear-gradient(90deg,#000_0px,#000_2px,#fff_2px,#fff_4px,#000_4px,#000_7px,#fff_7px,#fff_9px)]" />
                    </div>
                    <span className="text-[9px] tracking-widest mt-1 font-mono">{selectedSaleForReceipt.receiptNumber}</span>
                  </div>

                  <p className="text-[8px] text-slate-400">
                    OmniBoutique.Pro · Système de caisse certifié
                  </p>
                </div>

              </div>
            </div>

            {/* Modal Bottom Close */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSaleForReceipt(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Fermer l'aperçu
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
