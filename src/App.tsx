import React, { useState } from 'react';
import { StoreProvider } from './context/StoreContext';
import { ActiveTab } from './types';
import { Navbar } from './components/layout/Navbar';
import { POSView } from './components/pos/POSView';
import { SalesHistoryView } from './components/sales/SalesHistoryView';
import { InventoryView } from './components/inventory/InventoryView';
import { TransfersView } from './components/transfers/TransfersView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { SessionsView } from './components/sessions/SessionsView';
import { CustomersView } from './components/customers/CustomersView';
import { StoresView } from './components/stores/StoresView';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');

  return (
    <StoreProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-indigo-600 selection:text-white">
        
        {/* Navigation Bar conforming to Top Bar Contract */}
        <Navbar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
        />

        {/* Dynamic Main Content Viewport */}
        <main className="flex-1 pb-16">
          {activeTab === 'pos' && <POSView onNavigateTab={setActiveTab} />}
          {activeTab === 'sales_history' && <SalesHistoryView />}
          {activeTab === 'inventory' && <InventoryView />}
          {activeTab === 'transfers' && <TransfersView />}
          {activeTab === 'analytics' && <AnalyticsView onNavigateTab={setActiveTab} />}
          {activeTab === 'sessions' && <SessionsView />}
          {activeTab === 'customers' && <CustomersView />}
          {activeTab === 'stores' && <StoresView />}
        </main>

        {/* Quiet, clean footer without mechanical clutter */}
        <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">OmniBoutique Pro</span>
              <span>·</span>
              <span>Système de Gestion Commerciale Multi-Boutiques & Caisse POS</span>
            </div>

            <div className="flex items-center gap-4 text-[11px]">
              <button 
                type="button"
                onClick={() => setActiveTab('pos')} 
                className="hover:text-slate-900 transition-colors"
              >
                Caisse Tactile
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab('sales_history')} 
                className="hover:text-slate-900 transition-colors"
              >
                Historique Ventes
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab('inventory')} 
                className="hover:text-slate-900 transition-colors"
              >
                Inventaire
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab('analytics')} 
                className="hover:text-slate-900 transition-colors"
              >
                Rentabilité
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab('stores')} 
                className="hover:text-slate-900 transition-colors"
              >
                Paramètres
              </button>
            </div>
          </div>
        </footer>

      </div>
    </StoreProvider>
  );
}
