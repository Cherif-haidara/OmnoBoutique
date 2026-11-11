import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Product } from '../../types';
import { 
  ArrowRightLeft, 
  Plus, 
  Store as StoreIcon, 
  Package, 
  CheckCircle2, 
  Calendar, 
  User, 
  FileText, 
  AlertCircle,
  X,
  Trash2
} from 'lucide-react';

export const TransfersView: React.FC = () => {
  const { 
    transfers, 
    stores, 
    products, 
    executeTransfer, 
    formatMoney,
    pendingTransferPrefill,
    setPendingTransferPrefill
  } = useStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [fromStoreId, setFromStoreId] = useState(stores[0]?.id || '');
  const [toStoreId, setToStoreId] = useState(stores[1]?.id || '');
  const [performedBy, setPerformedBy] = useState('Responsable Logistique');
  const [notes, setNotes] = useState('');
  const [itemsToTransfer, setItemsToTransfer] = useState<Array<{ productId: string; quantity: number }>>([
    { productId: products[0]?.id || '', quantity: 5 }
  ]);

  // Handle incoming quick transfer from alert notifications
  React.useEffect(() => {
    if (pendingTransferPrefill) {
      if (pendingTransferPrefill.fromStoreId) setFromStoreId(pendingTransferPrefill.fromStoreId);
      if (pendingTransferPrefill.toStoreId) setToStoreId(pendingTransferPrefill.toStoreId);
      if (pendingTransferPrefill.productId) {
        setItemsToTransfer([{ productId: pendingTransferPrefill.productId, quantity: 5 }]);
      }
      setIsModalOpen(true);
      setPendingTransferPrefill(null);
    }
  }, [pendingTransferPrefill, setPendingTransferPrefill]);

  const handleAddItemRow = () => {
    setItemsToTransfer([...itemsToTransfer, { productId: products[0]?.id || '', quantity: 1 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (itemsToTransfer.length <= 1) return;
    setItemsToTransfer(itemsToTransfer.filter((_, idx) => idx !== index));
  };

  const handleUpdateItemRow = (index: number, field: 'productId' | 'quantity', value: any) => {
    const updated = [...itemsToTransfer];
    updated[index] = { ...updated[index], [field]: value };
    setItemsToTransfer(updated);
  };

  const handleOpenModal = () => {
    setFromStoreId(stores[0]?.id || '');
    setToStoreId(stores[1]?.id || stores[0]?.id || '');
    setPerformedBy('Responsable Logistique');
    setNotes('');
    setItemsToTransfer([{ productId: products[0]?.id || '', quantity: 5 }]);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmitTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (fromStoreId === toStoreId) {
      setErrorMsg('La boutique source et la boutique cible doivent être différentes.');
      return;
    }

    const res = executeTransfer({
      fromStoreId,
      toStoreId,
      items: itemsToTransfer,
      performedBy,
      notes,
    });

    if (res.success) {
      setIsModalOpen(false);
    } else {
      setErrorMsg(res.error || 'Erreur lors du transfert');
    }
  };

  // Metrics
  const totalTransfers = transfers.length;
  const totalTransferredUnits = transfers.reduce((sum, tr) => {
    return sum + tr.items.reduce((s, it) => s + it.quantity, 0);
  }, 0);
  const totalTransferredValue = transfers.reduce((sum, tr) => {
    return sum + tr.items.reduce((s, it) => s + (it.quantity * it.unitCost), 0);
  }, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Transferts Inter-Boutiques
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Rééquilibrage de stock, approvisionnement entre points de vente et traçabilité
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenModal}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nouveau Transfert de Stock</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-400 block mb-1">Nombre d'opérations</span>
          <span className="text-lg font-bold text-slate-900 font-mono-numbers block">{totalTransfers} transferts</span>
          <span className="text-[11px] text-slate-500 mt-1 block">Historique validé et tracé</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-400 block mb-1">Volume déplacé</span>
          <span className="text-lg font-bold text-indigo-600 font-mono-numbers block">{totalTransferredUnits} unités</span>
          <span className="text-[11px] text-slate-500 mt-1 block">Articles redistribués</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-400 block mb-1">Valeur au coût d'achat</span>
          <span className="text-lg font-bold text-slate-900 font-mono-numbers block">{formatMoney(totalTransferredValue)}</span>
          <span className="text-[11px] text-slate-500 mt-1 block">Flux de marchandise consolidé</span>
        </div>
      </div>

      {/* Transfers List */}
      <div className="space-y-3">
        {transfers.map((tr) => {
          const fromStore = stores.find(s => s.id === tr.fromStoreId);
          const toStore = stores.find(s => s.id === tr.toStoreId);
          const transferVal = tr.items.reduce((s, it) => s + (it.quantity * it.unitCost), 0);
          const totalQty = tr.items.reduce((s, it) => s + it.quantity, 0);

          return (
            <div 
              key={tr.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <ArrowRightLeft className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 font-mono-numbers">
                      {tr.reference}
                    </span>
                    <span className="text-[11px] text-slate-400 ml-2">
                      {new Date(tr.date).toLocaleDateString('fr-FR')} {new Date(tr.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {tr.status === 'completed' ? 'Complété & Stock Mis à Jour' : 'En attente'}
                  </span>
                  <span className="text-xs font-bold text-slate-900 font-mono-numbers">
                    {formatMoney(transferVal)}
                  </span>
                </div>
              </div>

              {/* Source -> Destination Strip */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div className="flex items-center gap-1.5">
                  <StoreIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span>Origine : <strong className="text-slate-900">{fromStore?.name}</strong></span>
                </div>
                <span className="text-slate-400">➔</span>
                <div className="flex items-center gap-1.5">
                  <StoreIcon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Destination : <strong className="text-indigo-900">{toStore?.name}</strong></span>
                </div>
                <span className="text-slate-400">·</span>
                <span className="text-[11px] text-slate-500">Par {tr.performedBy}</span>
              </div>

              {/* Items List */}
              <div className="divide-y divide-slate-100 text-xs">
                {tr.items.map((it, idx) => (
                  <div key={idx} className="py-1.5 flex justify-between items-center text-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      <span>{it.productName}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono-numbers">
                      <span className="font-semibold text-slate-900">{it.quantity} unité(s)</span>
                      <span className="text-slate-400">({formatMoney(it.quantity * it.unitCost)})</span>
                    </div>
                  </div>
                ))}
              </div>

              {tr.notes && (
                <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-100">
                  Note : {tr.notes}
                </p>
              )}
            </div>
          );
        })}

        {transfers.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
            <ArrowRightLeft className="w-12 h-12 stroke-1 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">Aucun transfert pour l'instant</p>
            <p className="text-[11px] text-slate-400 mt-1">Créez votre premier transfert pour déplacer du stock entre deux boutiques.</p>
          </div>
        )}
      </div>

      {/* MODAL: CREATE TRANSFER */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
                Initier un Transfert Inter-Boutiques
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitTransfer} className="p-6 overflow-y-auto space-y-4 text-xs">
              
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Source & Destination */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Boutique Expéditrice (Source) *</label>
                  <select
                    value={fromStoreId}
                    onChange={(e) => setFromStoreId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    {stores.map(st => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Boutique Destinataire (Cible) *</label>
                  <select
                    value={toStoreId}
                    onChange={(e) => setToStoreId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    {stores.map(st => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items Rows */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Articles à expédier :</span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter une ligne</span>
                  </button>
                </div>

                {itemsToTransfer.map((row, idx) => {
                  const prod = products.find(p => p.id === row.productId);
                  const availableInSource = prod ? (prod.stockByStore[fromStoreId] || 0) : 0;

                  return (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <div className="flex-1">
                        <select
                          value={row.productId}
                          onChange={(e) => handleUpdateItemRow(idx, 'productId', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs"
                        >
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} (Dispo source: {p.stockByStore[fromStoreId] || 0})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-24">
                        <input
                          type="number"
                          min="1"
                          max={availableInSource}
                          value={row.quantity}
                          onChange={(e) => handleUpdateItemRow(idx, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-md font-mono-numbers text-center font-bold text-xs"
                        />
                      </div>

                      {itemsToTransfer.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Performed by & Notes */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Responsable Transfert</label>
                  <input
                    type="text"
                    value={performedBy}
                    onChange={(e) => setPerformedBy(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Motif / Commentaire</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="ex: Réassort d'urgence avant le weekend..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 -mx-6 -mb-6 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  Valider le Transfert
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
