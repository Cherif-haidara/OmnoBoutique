import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { CashRegisterSession } from '../../types';
import { 
  ReceiptText, 
  Lock, 
  Unlock, 
  Banknote, 
  CreditCard, 
  Smartphone, 
  UserCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  Calendar, 
  Building2, 
  X,
  FileCheck2,
  DollarSign
} from 'lucide-react';

export const SessionsView: React.FC = () => {
  const { 
    sessions, 
    stores, 
    selectedStoreId, 
    formatMoney, 
    currency,
    openCashSession, 
    closeCashSession 
  } = useStore();

  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [selectedSessionToClose, setSelectedSessionToClose] = useState<CashRegisterSession | null>(null);

  // Close session state
  const [actualCashCounted, setActualCashCounted] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [printedZReport, setPrintedZReport] = useState<CashRegisterSession | null>(null);

  // Open session state
  const [openStoreId, setOpenStoreId] = useState<string>(stores[0]?.id || '');
  const [cashierName, setCashierName] = useState<string>(stores[0]?.manager || 'Caissier Principal');
  const [openingBalance, setOpeningBalance] = useState<string>('50000');

  // Filter sessions
  const filteredSessions = selectedStoreId === 'all'
    ? sessions
    : sessions.filter(s => s.storeId === selectedStoreId);

  const activeSessions = filteredSessions.filter(s => s.status === 'open');
  const closedSessions = filteredSessions.filter(s => s.status === 'closed');

  const handleOpenCloseModal = (session: CashRegisterSession) => {
    setSelectedSessionToClose(session);
    setActualCashCounted(session.expectedCash.toString());
    setClosingNotes('');
    setIsCloseModalOpen(true);
  };

  const handleConfirmClose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionToClose) return;

    const actual = parseFloat(actualCashCounted) || 0;
    const closed = closeCashSession(selectedSessionToClose.id, actual, closingNotes);

    if (closed) {
      setPrintedZReport(closed);
    }
    setIsCloseModalOpen(false);
  };

  const handleConfirmOpen = (e: React.FormEvent) => {
    e.preventDefault();
    const balance = parseFloat(openingBalance) || 0;
    openCashSession(openStoreId, cashierName, balance);
    setIsOpenModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Contrôle de Caisse & Clôture Journalière (Rapport Z)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi des fonds de caisse, réconciliation des encaissements et détection des écarts
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsOpenModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors self-start sm:self-auto"
        >
          <Unlock className="w-3.5 h-3.5" />
          <span>Ouvrir une Caisse (Nouveau Shift)</span>
        </button>
      </div>

      {/* Active Cash Register Sessions */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Sessions de Caisse Actives ({activeSessions.length})
        </h2>

        {activeSessions.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
            <Lock className="w-10 h-10 stroke-1 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">Aucune caisse ouverte pour le moment</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Ouvrez une session de caisse pour commencer à enregistrer des encaissements.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeSessions.map((session) => {
              const store = stores.find(s => s.id === session.storeId);
              return (
                <div 
                  key={session.id} 
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div>
                        <span className="text-xs font-bold text-slate-900 block truncate max-w-[190px]">
                          {store?.name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Ouvert à {new Date(session.openedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        En Service
                      </span>
                    </div>

                    <div className="text-xs text-slate-600">
                      Caissier responsable : <strong className="text-slate-900">{session.cashierName}</strong>
                    </div>

                    {/* Breakdown table */}
                    <div className="bg-slate-50 rounded-lg p-3 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-500">
                        <span>Fond de caisse initial :</span>
                        <span className="font-mono-numbers font-medium text-slate-800">{formatMoney(session.openingBalance)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Ventes Espèces :</span>
                        <span className="font-mono-numbers font-medium text-slate-800">{formatMoney(session.cashSales)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Ventes Mobile Money :</span>
                        <span className="font-mono-numbers font-medium text-slate-800">{formatMoney(session.mobileSales)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Ventes CB :</span>
                        <span className="font-mono-numbers font-medium text-slate-800">{formatMoney(session.cardSales)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Ventes à Crédit :</span>
                        <span className="font-mono-numbers font-medium text-slate-800">{formatMoney(session.creditSales)}</span>
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                        <span>Espèces Attendues en Tiroir :</span>
                        <span className="font-mono-numbers text-indigo-700">{formatMoney(session.expectedCash)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenCloseModal(session)}
                    className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Clôturer la Caisse (Rapport Z)</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Closed Sessions History */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-3">
        <div className="p-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">
            Historique des Clôtures & Réconciliations Comptables
          </h3>
          <p className="text-xs text-slate-500">
            Audit des écarts de caisse (surplus ou déficits constatés lors du comptage)
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Boutique & Date</th>
                <th className="py-3 px-3">Caissier</th>
                <th className="py-3 px-3 text-right">Fond Initial</th>
                <th className="py-3 px-3 text-right">Total Encaissé</th>
                <th className="py-3 px-3 text-right">Espèces Attendues</th>
                <th className="py-3 px-3 text-right">Espèces Comptées</th>
                <th className="py-3 px-3 text-right">Écart Constaté</th>
                <th className="py-3 px-4 text-center">Statut Audit</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {closedSessions.map((s) => {
                const store = stores.find(st => st.id === s.storeId);
                const diff = s.cashDifference || 0;
                const isZeroDiff = Math.abs(diff) < 0.01;
                const isPositive = diff > 0;

                return (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{store?.name}</span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(s.openedAt).toLocaleDateString('fr-FR')} {s.closedAt ? `· Clôturé à ${new Date(s.closedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-medium text-slate-800">{s.cashierName}</span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono-numbers text-slate-500">
                      {formatMoney(s.openingBalance)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono-numbers font-semibold text-slate-900">
                      {formatMoney(s.totalSales)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono-numbers text-slate-600">
                      {formatMoney(s.expectedCash)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono-numbers font-bold text-slate-900">
                      {formatMoney(s.actualCash || s.expectedCash)}
                    </td>

                    {/* Écart de caisse */}
                    <td className="py-3 px-3 text-right font-mono-numbers">
                      {isZeroDiff ? (
                        <span className="text-emerald-700 font-bold">0 (Conforme)</span>
                      ) : isPositive ? (
                        <span className="text-indigo-600 font-bold">+{formatMoney(diff)} (Excédent)</span>
                      ) : (
                        <span className="text-rose-600 font-bold">{formatMoney(diff)} (Déficit)</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        isZeroDiff 
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {isZeroDiff ? 'Équilibrée' : 'Écart Noté'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {closedSessions.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-xs">
            Aucune session clôturée pour l'instant.
          </div>
        )}
      </div>

      {/* MODAL 1: CLOSE REGISTER (RAPPORT Z) */}
      {isCloseModalOpen && selectedSessionToClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-emerald-400" />
                  Clôture Journalière de Caisse (Rapport Z)
                </h3>
                <p className="text-xs text-slate-300">
                  {stores.find(s => s.id === selectedSessionToClose.storeId)?.name}
                </p>
              </div>
              <button onClick={() => setIsCloseModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmClose} className="p-6 space-y-4 text-xs">
              
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Fond de caisse d'ouverture :</span>
                  <span className="font-mono-numbers font-bold">{formatMoney(selectedSessionToClose.openingBalance)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Encaissements Espèces du jour :</span>
                  <span className="font-mono-numbers font-bold">{formatMoney(selectedSessionToClose.cashSales)}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-extrabold pt-2 border-t border-slate-200">
                  <span>TOTAL ESPÈCES THÉORIQUE ATTENDU :</span>
                  <span className="font-mono-numbers text-indigo-700 text-sm">
                    {formatMoney(selectedSessionToClose.expectedCash)}
                  </span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  Montant Réel Compté Physiquement dans le Tiroir-Caisse ({currency}) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={actualCashCounted}
                  onChange={(e) => setActualCashCounted(e.target.value)}
                  className="w-full px-4 py-2.5 text-base font-bold font-mono-numbers bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              {/* Écart preview */}
              {actualCashCounted !== '' && (
                <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                  parseFloat(actualCashCounted) === selectedSessionToClose.expectedCash
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                    : parseFloat(actualCashCounted) > selectedSessionToClose.expectedCash
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-800 font-semibold'
                      : 'bg-rose-50 border-rose-200 text-rose-800 font-semibold'
                }`}>
                  <span>Écart de caisse calculé :</span>
                  <span className="font-bold font-mono-numbers text-sm">
                    {formatMoney(parseFloat(actualCashCounted) - selectedSessionToClose.expectedCash)}
                  </span>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Observations / Remarques :</label>
                <textarea
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  rows={2}
                  placeholder="Justification en cas d'écart, billets déposés au coffre..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 -mx-6 -mb-6 mt-4">
                <button
                  type="button"
                  onClick={() => setIsCloseModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs flex items-center gap-1.5"
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>Confirmer la Clôture Z</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL 2: OPEN NEW SESSION */}
      {isOpenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Unlock className="w-4 h-4 text-emerald-400" />
                Ouverture d'une Nouvelle Caisse
              </h3>
              <button onClick={() => setIsOpenModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmOpen} className="p-6 space-y-4 text-xs">
              
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Boutique / Point de Vente *</label>
                <select
                  value={openStoreId}
                  onChange={(e) => {
                    setOpenStoreId(e.target.value);
                    const st = stores.find(s => s.id === e.target.value);
                    if (st) setCashierName(st.manager);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  {stores.map(st => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nom du Caissier Responsable *</label>
                <input
                  type="text"
                  required
                  value={cashierName}
                  onChange={(e) => setCashierName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Fond de Caisse Initial ({currency}) *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder="50000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono-numbers font-bold"
                />
                <span className="text-[11px] text-slate-400 block mt-1">
                  Monnaie mise à disposition dans le tiroir avant la première vente.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpenModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  Ouvrir la Caisse
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* PRINTABLE Z REPORT MODAL */}
      {printedZReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Rapport Z de Clôture Généré !
              </span>
              <button onClick={() => setPrintedZReport(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 bg-slate-100 max-h-[70vh] overflow-y-auto">
              <div className="bg-white p-6 shadow-sm border border-slate-200 font-mono text-[11px] leading-relaxed">
                <div className="text-center pb-3 border-b border-dashed border-slate-300">
                  <h3 className="font-bold text-sm uppercase">RAPPORT Z DE CLÔTURE</h3>
                  <p className="text-[10px] text-slate-500">{stores.find(s => s.id === printedZReport.storeId)?.name}</p>
                  <p className="text-[10px] text-slate-500">Date : {new Date(printedZReport.closedAt || '').toLocaleDateString('fr-FR')} {new Date(printedZReport.closedAt || '').toLocaleTimeString('fr-FR')}</p>
                  <p className="text-[10px] text-slate-500">Caissier : {printedZReport.cashierName}</p>
                </div>

                <div className="py-3 border-b border-dashed border-slate-300 space-y-1">
                  <div className="flex justify-between">
                    <span>Nombre de Ventes :</span>
                    <span>{printedZReport.salesCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fond Initial :</span>
                    <span>{formatMoney(printedZReport.openingBalance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ventes Espèces :</span>
                    <span>{formatMoney(printedZReport.cashSales)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ventes Mobile Money :</span>
                    <span>{formatMoney(printedZReport.mobileSales)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ventes Carte Bancaire :</span>
                    <span>{formatMoney(printedZReport.cardSales)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ventes à Crédit :</span>
                    <span>{formatMoney(printedZReport.creditSales)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-200">
                    <span>CHIFFRE D'AFFAIRES TOTAL :</span>
                    <span>{formatMoney(printedZReport.totalSales)}</span>
                  </div>
                </div>

                <div className="py-3 border-b border-dashed border-slate-300 space-y-1 font-bold">
                  <div className="flex justify-between">
                    <span>Espèces Théoriques :</span>
                    <span>{formatMoney(printedZReport.expectedCash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Espèces Réelles Comptées :</span>
                    <span>{formatMoney(printedZReport.actualCash || 0)}</span>
                  </div>
                  <div className="flex justify-between text-indigo-700">
                    <span>ÉCART DE CAISSE :</span>
                    <span>{formatMoney(printedZReport.cashDifference || 0)}</span>
                  </div>
                </div>

                {printedZReport.notes && (
                  <div className="py-2 text-[10px] text-slate-500 italic">
                    Note : {printedZReport.notes}
                  </div>
                )}

                <div className="pt-3 text-center text-[10px] text-slate-400">
                  Document officiel à conserver pour l'expert-comptable.
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintedZReport(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
              >
                Terminé
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
