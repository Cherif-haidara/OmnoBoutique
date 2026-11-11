import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { ActiveTab } from '../../types';
import { 
  Store as StoreIcon, 
  ShoppingCart, 
  Package, 
  ArrowRightLeft, 
  TrendingUp, 
  ReceiptText, 
  Users, 
  Settings, 
  ChevronDown,
  Building2,
  Lock,
  Sparkles,
  Bell,
  AlertTriangle,
  X,
  Truck,
  History
} from 'lucide-react';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenQuickSale?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { 
    stores, 
    selectedStoreId, 
    setSelectedStoreId, 
    selectedStore,
    currency,
    setCurrency,
    activeSession,
    stockAlerts,
    dismissAlert,
    setPendingTransferPrefill,
    setPendingReceptionPrefill
  } = useStore();

  const [isStoreMenuOpen, setIsStoreMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const navLinks = [
    { id: 'pos' as ActiveTab, label: 'Caisse POS', icon: ShoppingCart },
    { id: 'sales_history' as ActiveTab, label: 'Historique Ventes', icon: History },
    { id: 'inventory' as ActiveTab, label: 'Gestion Stocks', icon: Package },
    { id: 'transfers' as ActiveTab, label: 'Transferts', icon: ArrowRightLeft },
    { id: 'analytics' as ActiveTab, label: 'Bénéfices & Marges', icon: TrendingUp },
    { id: 'sessions' as ActiveTab, label: 'Clôture Caisse', icon: ReceiptText },
    { id: 'customers' as ActiveTab, label: 'Clients & Crédits', icon: Users },
    { id: 'stores' as ActiveTab, label: 'Boutiques', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Zone 1: Brand title & Store Switcher */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('analytics')}>
              <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                <StoreIcon className="w-5 h-5" />
              </div>
              <div className="leading-tight">
                <span className="text-base font-bold tracking-tight text-slate-900 block">
                  OmniBoutique<span className="text-indigo-600 font-extrabold">.Pro</span>
                </span>
                <span className="text-[11px] text-slate-500 hidden sm:block">
                  Multi-Boutiques & Caisse
                </span>
              </div>
            </div>

            {/* Store Switcher Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsStoreMenuOpen(!isStoreMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200/80 transition-colors"
                title="Changer de boutique active"
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="max-w-[150px] sm:max-w-[190px] truncate">
                  {selectedStoreId === 'all' ? 'Toutes les boutiques (Siège)' : selectedStore?.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              </button>

              {isStoreMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsStoreMenuOpen(false)} 
                  />
                  <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Sélectionner le point de vente
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStoreId('all');
                        setIsStoreMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center justify-between transition-colors ${
                        selectedStoreId === 'all' 
                          ? 'bg-indigo-50 text-indigo-700 font-semibold' 
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        <div>
                          <p className="font-semibold">Vue Consolidée (Toutes boutiques)</p>
                          <p className="text-[11px] text-slate-500">Siège, stocks globaux et bénéfices cumulés</p>
                        </div>
                      </div>
                      {selectedStoreId === 'all' && <span className="text-indigo-600 text-xs">✓</span>}
                    </button>

                    <div className="h-px bg-slate-100 my-1" />

                    {stores.map(store => (
                      <button
                        key={store.id}
                        type="button"
                        onClick={() => {
                          setSelectedStoreId(store.id);
                          setIsStoreMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                          selectedStoreId === store.id 
                            ? 'bg-indigo-50 text-indigo-700 font-semibold' 
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <StoreIcon className="w-4 h-4 text-slate-500" />
                          <div>
                            <p className="font-medium text-slate-900">{store.name}</p>
                            <p className="text-[11px] text-slate-500">{store.code} · Resp: {store.manager}</p>
                          </div>
                        </div>
                        {selectedStoreId === store.id && <span className="text-indigo-600 text-xs">✓</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map(link => {
              const Icon = link.icon;
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => setActiveTab(link.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Quick Action & Status Indicator */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Currency selector toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-600">
              {(['FCFA', 'GNF', '€', '$'] as const).map(curr => (
                <button
                  key={curr}
                  type="button"
                  onClick={() => setCurrency(curr)}
                  className={`px-2 py-1 rounded-md transition-all ${
                    currency === curr 
                      ? 'bg-white text-slate-900 shadow-xs font-bold' 
                      : 'hover:text-slate-900'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>

            {/* Cash register session badge */}
            {activeSession ? (
              <div 
                onClick={() => setActiveTab('sessions')}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/80 rounded-lg cursor-pointer hover:bg-emerald-100 transition-colors"
                title="Session de caisse ouverte"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[11px]">Caisse Ouverte ({activeSession.cashierName.split(' ')[0]})</span>
              </div>
            ) : (
              <div 
                onClick={() => setActiveTab('sessions')}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200/80 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors"
                title="Aucune session de caisse en cours pour ce point de vente"
              >
                <Lock className="w-3 h-3 text-amber-600" />
                <span className="text-[11px]">Caisse Fermée</span>
              </div>
            )}

            {/* Notification Bell Button & Flyout */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={`relative p-2 rounded-lg border transition-colors ${
                  stockAlerts.length > 0
                    ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                    : 'bg-slate-100 text-slate-600 border-slate-200/80 hover:bg-slate-200'
                }`}
                title={stockAlerts.length > 0 ? `${stockAlerts.length} article(s) sous le seuil critique` : 'Aucune alerte de stock'}
              >
                <Bell className="w-4 h-4" />
                {stockAlerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center font-mono-numbers shadow-xs animate-in zoom-in-75 duration-200">
                    {stockAlerts.length}
                  </span>
                )}
              </button>

              {/* Notification Center Dropdown Flyout */}
              {isNotificationsOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsNotificationsOpen(false)} 
                  />
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-0 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    
                    {/* Header */}
                    <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <div>
                          <h4 className="text-xs font-bold">Alertes Stocks & Réapprovisionnement</h4>
                          <p className="text-[10px] text-slate-300">
                            {stockAlerts.length > 0 
                              ? `${stockAlerts.length} produit(s) sous le seuil critique d'alerte`
                              : 'Tous les niveaux de stock sont optimaux'}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setIsNotificationsOpen(false)}
                        className="text-slate-400 hover:text-white p-1 rounded-md"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Alerts List */}
                    <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 p-2">
                      {stockAlerts.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-xs">
                          <Package className="w-8 h-8 mx-auto text-slate-300 mb-2 stroke-1" />
                          <p className="font-semibold text-slate-700">Aucune alerte active</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Aucun article n'a franchi son seuil minimum de sécurité.</p>
                        </div>
                      ) : (
                        stockAlerts.map(alert => {
                          const isOutOfStock = alert.severity === 'out_of_stock';
                          return (
                            <div key={alert.id} className="p-2.5 rounded-xl hover:bg-slate-50 transition-colors space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${isOutOfStock ? 'bg-rose-600' : 'bg-amber-500'}`} />
                                    <h5 className="text-xs font-bold text-slate-900 line-clamp-1">{alert.productName}</h5>
                                  </div>
                                  <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                                    <span>{alert.storeName}</span>
                                    <span>·</span>
                                    <span>{alert.category}</span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => dismissAlert(alert.id)}
                                  className="text-[10px] text-slate-400 hover:text-slate-600 p-1"
                                  title="Masquer cette alerte"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Stock vs Threshold Gauge */}
                              <div className="bg-slate-100 rounded-lg p-2 flex items-center justify-between text-[11px]">
                                <div className="space-y-0.5">
                                  <span className="text-slate-500 block text-[10px]">Stock actuel :</span>
                                  <span className={`font-mono-numbers font-bold ${isOutOfStock ? 'text-rose-600' : 'text-amber-700'}`}>
                                    {alert.currentStock} {alert.unit}(s)
                                  </span>
                                </div>
                                <div className="text-right space-y-0.5">
                                  <span className="text-slate-500 block text-[10px]">Seuil critique défini :</span>
                                  <span className="font-mono-numbers font-semibold text-slate-800">
                                    {alert.minThreshold} {alert.unit}(s)
                                  </span>
                                </div>
                              </div>

                              {/* Network Intelligence: Transfer suggestion or Supplier Reorder */}
                              {alert.alternativeStoresWithStock.length > 0 ? (
                                <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 p-2 rounded-lg text-[10px] text-indigo-900">
                                  <div>
                                    <span className="font-semibold block">Dispo réseau :</span>
                                    <span>{alert.alternativeStoresWithStock[0].stock} dispo à {alert.alternativeStoresWithStock[0].storeName.split(' - ')[0]}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPendingTransferPrefill({
                                        fromStoreId: alert.alternativeStoresWithStock[0].storeId,
                                        toStoreId: alert.storeId,
                                        productId: alert.productId,
                                      });
                                      setIsNotificationsOpen(false);
                                      setActiveTab('transfers');
                                    }}
                                    className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold shadow-2xs transition-colors shrink-0"
                                  >
                                    Transférer
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between bg-amber-50 border border-amber-200/80 p-2 rounded-lg text-[10px] text-amber-900">
                                  <div>
                                    <span className="font-semibold block">Rupture réseau globale</span>
                                    <span>Fournisseur : {alert.supplierName || 'Distributeur'}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPendingReceptionPrefill({
                                        storeId: alert.storeId,
                                        productId: alert.productId,
                                      });
                                      setIsNotificationsOpen(false);
                                      setActiveTab('inventory');
                                    }}
                                    className="px-2 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded font-bold shadow-2xs transition-colors shrink-0"
                                  >
                                    Commander
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Footer */}
                    <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setIsNotificationsOpen(false);
                          setActiveTab('inventory');
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        Gérer les seuils d'alerte dans l'inventaire ➔
                      </button>
                    </div>

                  </div>
                </>
              )}
            </div>

            {/* Direct Open POS Button */}
            <button
              type="button"
              onClick={() => setActiveTab('pos')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 rounded-lg shadow-xs transition-all whitespace-nowrap"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Ouvrir la Caisse</span>
            </button>
          </div>

        </div>

        {/* Mobile secondary tab strip */}
        <div className="lg:hidden flex items-center gap-1 py-2 overflow-x-auto border-t border-slate-100 scrollbar-none">
          {navLinks.map(link => {
            const Icon = link.icon;
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => setActiveTab(link.id)}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg shrink-0 ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{link.label}</span>
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
};
