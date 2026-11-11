import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Store, StoreType } from '../../types';
import { 
  Building2, 
  Plus, 
  Edit3, 
  Download, 
  Upload, 
  RotateCcw, 
  CheckCircle2, 
  MapPin, 
  Phone, 
  User, 
  Package, 
  Coins, 
  X,
  FileSpreadsheet
} from 'lucide-react';

export const StoresView: React.FC = () => {
  const { 
    stores, 
    products, 
    addStore, 
    updateStore, 
    currency, 
    setCurrency, 
    formatMoney, 
    resetToDemo, 
    exportJSON, 
    importJSON 
  } = useStore();

  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [importStatus, setImportStatus] = useState<string>('');

  const [storeForm, setStoreForm] = useState({
    name: '',
    code: '',
    type: 'general' as StoreType,
    address: '',
    phone: '',
    manager: '',
    taxRate: 18,
    currency: 'FCFA',
    isActive: true,
  });

  const handleOpenStoreModal = (st?: Store) => {
    if (st) {
      setEditingStore(st);
      setStoreForm({
        name: st.name,
        code: st.code,
        type: st.type,
        address: st.address,
        phone: st.phone,
        manager: st.manager,
        taxRate: st.taxRate,
        currency: st.currency,
        isActive: st.isActive,
      });
    } else {
      setEditingStore(null);
      setStoreForm({
        name: '',
        code: `BT-${(stores.length + 1).toString().padStart(2, '0')}`,
        type: 'general',
        address: '',
        phone: '+221 ',
        manager: '',
        taxRate: 18,
        currency: currency,
        isActive: true,
      });
    }
    setIsStoreModalOpen(true);
  };

  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeForm.name.trim()) return;

    if (editingStore) {
      updateStore({
        ...editingStore,
        ...storeForm,
      });
    } else {
      addStore(storeForm);
    }
    setIsStoreModalOpen(false);
  };

  const handleExportBackup = () => {
    const dataStr = exportJSON();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `omniboutique_sauvegarde_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importJSON(content);
      if (success) {
        setImportStatus('Sauvegarde restaurée avec succès !');
        setTimeout(() => setImportStatus(''), 4000);
      } else {
        setImportStatus('Erreur : Fichier JSON invalide.');
        setTimeout(() => setImportStatus(''), 4000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Configuration du Réseau Multi-Boutiques
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestion des magasins, points de vente, devises et sauvegardes système
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenStoreModal()}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Ajouter une Nouvelle Boutique</span>
        </button>
      </div>

      {importStatus && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-indigo-600" />
          <span>{importStatus}</span>
        </div>
      )}

      {/* Stores Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {stores.map((store) => {
          // Compute stock in this store
          let totalItemsInStore = 0;
          let storeStockValue = 0;

          products.forEach(p => {
            const qty = p.stockByStore[store.id] || 0;
            totalItemsInStore += qty;
            storeStockValue += (qty * p.sellingPrice);
          });

          return (
            <div 
              key={store.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {store.name}
                      </h3>
                      <span className="text-[11px] font-mono-numbers text-slate-500 font-medium">
                        Code: {store.code} · Type: {store.type}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Actif
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Gérant : <strong>{store.manager}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{store.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{store.phone}</span>
                  </div>
                </div>

                {/* Inventory Valuation in this store */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Stock Disponible :</span>
                    <span className="font-bold text-slate-900 font-mono-numbers">{totalItemsInStore} unités</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 text-[11px] block">Valeur Marchande :</span>
                    <span className="font-bold text-indigo-700 font-mono-numbers">{formatMoney(storeStockValue)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleOpenStoreModal(store)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Modifier les informations</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Settings & System Management Panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Paramètres Généraux & Sauvegardes
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Devise d'affichage, export complet de la base de données et réinitialisation
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          
          {/* Currency selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 block">Devise principale du système :</label>
            <div className="flex flex-wrap items-center gap-2">
              {(['FCFA', 'GNF', '€', '$'] as const).map(curr => (
                <button
                  key={curr}
                  type="button"
                  onClick={() => setCurrency(curr)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    currency === curr
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {curr === 'GNF' ? 'GNF (Franc Guinéen)' : curr}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              Adapte instantanément tous les tickets de caisse, tableaux de stocks et métriques financières.
            </p>
          </div>

          {/* Backup / Export */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 block">Sauvegarde des Données :</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="px-3.5 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exporter Sauvegarde (JSON)</span>
              </button>

              <label className="px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1.5 cursor-pointer border border-slate-200 transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>Restaurer</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-[11px] text-slate-400">
              Téléchargez un fichier complet contenant l'ensemble des stocks, ventes et clients.
            </p>
          </div>

          {/* Reset Demo Data */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 block">Données de Démonstration :</label>
            <button
              type="button"
              onClick={() => {
                if (confirm('Réinitialiser la base de données avec les données de démonstration officielles ?')) {
                  resetToDemo();
                }
              }}
              className="px-3.5 py-2 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurer Jeu de Données Initial</span>
            </button>
            <p className="text-[11px] text-slate-400">
              Recharge les 3 boutiques pré-configurées, les 25+ produits réels et les historiques de caisse.
            </p>
          </div>

        </div>
      </div>

      {/* MODAL: ADD / EDIT STORE */}
      {isStoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-400" />
                {editingStore ? 'Modifier la Boutique' : 'Créer une Nouvelle Boutique'}
              </h3>
              <button onClick={() => setIsStoreModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStore} className="p-6 space-y-4 text-xs">
              
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nom de la Boutique / Point de Vente *</label>
                <input
                  type="text"
                  required
                  value={storeForm.name}
                  onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                  placeholder="ex: Boutique Épicerie Sud"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Code Magasin</label>
                  <input
                    type="text"
                    required
                    value={storeForm.code}
                    onChange={(e) => setStoreForm({ ...storeForm, code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono-numbers"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Secteur d'Activité</label>
                  <select
                    value={storeForm.type}
                    onChange={(e) => setStoreForm({ ...storeForm, type: e.target.value as StoreType })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="general">Général / Polyvalent</option>
                    <option value="food">Alimentation & Épicerie</option>
                    <option value="household">Bazar & Entretien Ménager</option>
                    <option value="kiosk">Kiosque / Point Express</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nom du Responsable / Gérant *</label>
                <input
                  type="text"
                  required
                  value={storeForm.manager}
                  onChange={(e) => setStoreForm({ ...storeForm, manager: e.target.value })}
                  placeholder="ex: Oumar Fall"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Adresse Géographique</label>
                <input
                  type="text"
                  value={storeForm.address}
                  onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                  placeholder="Avenue, quartier, ville"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Téléphone Contact</label>
                  <input
                    type="tel"
                    value={storeForm.phone}
                    onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono-numbers"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Devise Principale</label>
                  <select
                    value={storeForm.currency}
                    onChange={(e) => setStoreForm({ ...storeForm, currency: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                  >
                    <option value="FCFA">FCFA (Franc CFA)</option>
                    <option value="GNF">GNF (Franc Guinéen)</option>
                    <option value="€">EUR (€)</option>
                    <option value="$">USD ($)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStoreModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  Enregistrer la Boutique
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
