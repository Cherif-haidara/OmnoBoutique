import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { Customer, PaymentMethod } from '../../types';
import { 
  Users, 
  Plus, 
  Search, 
  Banknote, 
  Phone, 
  UserCheck, 
  AlertCircle, 
  CheckCircle2, 
  Edit3, 
  X,
  CreditCard,
  DollarSign
} from 'lucide-react';

export const CustomersView: React.FC = () => {
  const { 
    customers, 
    addCustomer, 
    updateCustomer, 
    recordDebtPayment, 
    formatMoney, 
    currency 
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterDebtorsOnly, setFilterDebtorsOnly] = useState(false);

  // Modals
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState<Customer | null>(null);

  // Form states
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    creditLimit: 50000,
    notes: '',
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    method: 'cash' as PaymentMethod,
    note: '',
  });

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery) ||
        (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDebt = !filterDebtorsOnly || c.creditBalance > 0;

      return matchesSearch && matchesDebt;
    });
  }, [customers, searchQuery, filterDebtorsOnly]);

  // Aggregate Metrics
  const totalDebt = customers.reduce((sum, c) => sum + c.creditBalance, 0);
  const debtorsCount = customers.filter(c => c.creditBalance > 0).length;
  const totalCustomerSpend = customers.reduce((sum, c) => sum + c.totalSpent, 0);

  const handleOpenCustomerModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setCustomerForm({
        name: customer.name,
        phone: customer.phone,
        email: customer.email || '',
        address: customer.address || '',
        creditLimit: customer.creditLimit,
        notes: customer.notes || '',
      });
    } else {
      setEditingCustomer(null);
      setCustomerForm({
        name: '',
        phone: '',
        email: '',
        address: '',
        creditLimit: 50000,
        notes: '',
      });
    }
    setIsCustomerModalOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerForm.name.trim()) return;

    if (editingCustomer) {
      updateCustomer({
        ...editingCustomer,
        ...customerForm,
      });
    } else {
      addCustomer(customerForm);
    }
    setIsCustomerModalOpen(false);
  };

  const handleOpenPayment = (customer: Customer) => {
    setSelectedCustomerForPayment(customer);
    setPaymentForm({
      amount: customer.creditBalance,
      method: 'cash',
      note: 'Règlement solde ardoise',
    });
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForPayment || paymentForm.amount <= 0) return;

    recordDebtPayment(
      selectedCustomerForPayment.id,
      paymentForm.amount,
      paymentForm.method,
      paymentForm.note
    );

    setIsPaymentModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Clients & Carnet de Dettes (Crédits)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi des créances clients, ardoises en cours, historique d'achats et règlements
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenCustomerModal()}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nouveau Client</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-400 block mb-1">Total Créances à Recouvrer</span>
          <span className="text-xl font-extrabold text-rose-600 font-mono-numbers block">
            {formatMoney(totalDebt)}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {debtorsCount} client(s) avec dette non soldée
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-400 block mb-1">Portefeuille Clients</span>
          <span className="text-xl font-extrabold text-slate-900 font-mono-numbers block">
            {customers.length} clients
          </span>
          <button
            type="button"
            onClick={() => setFilterDebtorsOnly(!filterDebtorsOnly)}
            className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium mt-1 underline block"
          >
            {filterDebtorsOnly ? 'Voir tous les clients' : 'Filtrer les clients débiteurs'}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-400 block mb-1">Chiffre d'Affaires Fidélisé</span>
          <span className="text-xl font-extrabold text-emerald-600 font-mono-numbers block">
            {formatMoney(totalCustomerSpend)}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Volume total généré par les comptes clients
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom de client, numéro de téléphone ou quartier..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        {filterDebtorsOnly && (
          <button
            type="button"
            onClick={() => setFilterDebtorsOnly(false)}
            className="px-3 py-1.5 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 rounded-lg flex items-center gap-1 shrink-0"
          >
            <span>Filtre Débiteurs Actif</span>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Client & Coordonnées</th>
                <th className="py-3 px-3">Adresse / Quartier</th>
                <th className="py-3 px-3 text-right">Dette en Cours</th>
                <th className="py-3 px-3 text-right">Plafond Crédit</th>
                <th className="py-3 px-3 text-right">Total Dépensé</th>
                <th className="py-3 px-3 text-center">Visites</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredCustomers.map((cust) => {
                const hasDebt = cust.creditBalance > 0;
                return (
                  <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Name & Phone */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {cust.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block leading-tight">
                            {cust.name}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono-numbers">
                            {cust.phone}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Address */}
                    <td className="py-3.5 px-3">
                      <span className="text-slate-700">{cust.address || '—'}</span>
                    </td>

                    {/* Current Debt */}
                    <td className="py-3.5 px-3 text-right font-mono-numbers">
                      {hasDebt ? (
                        <span className="font-extrabold text-rose-600">
                          {formatMoney(cust.creditBalance)}
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-medium">0 FCFA</span>
                      )}
                    </td>

                    {/* Credit Limit */}
                    <td className="py-3.5 px-3 text-right font-mono-numbers text-slate-500">
                      {formatMoney(cust.creditLimit)}
                    </td>

                    {/* Total Spent */}
                    <td className="py-3.5 px-3 text-right font-mono-numbers font-semibold text-slate-900">
                      {formatMoney(cust.totalSpent)}
                    </td>

                    {/* Purchases Count */}
                    <td className="py-3.5 px-3 text-center font-mono-numbers">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium text-slate-700">
                        {cust.purchasesCount}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {hasDebt && (
                          <button
                            type="button"
                            onClick={() => handleOpenPayment(cust)}
                            className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Banknote className="w-3 h-3" />
                            <span>Régler</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenCustomerModal(cust)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
                          title="Modifier le client"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-xs">
            Aucun client ne correspond aux critères de recherche.
          </div>
        )}
      </div>

      {/* MODAL 1: ADD / EDIT CUSTOMER */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                {editingCustomer ? 'Modifier la Fiche Client' : 'Nouveau Compte Client'}
              </h3>
              <button onClick={() => setIsCustomerModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-6 space-y-4 text-xs">
              
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nom Complet / Raison Sociale *</label>
                <input
                  type="text"
                  required
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  placeholder="ex: Fatou Kiné Diop ou Restaurant Le Palmier"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Téléphone *</label>
                  <input
                    type="tel"
                    required
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    placeholder="+221 77 123 45 67"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono-numbers"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Plafond Crédit Autorisé ({currency})</label>
                  <input
                    type="number"
                    min="0"
                    value={customerForm.creditLimit}
                    onChange={(e) => setCustomerForm({ ...customerForm, creditLimit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono-numbers font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Adresse / Localisation</label>
                <input
                  type="text"
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                  placeholder="Quartier, rue ou repère"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Notes / Conditions Particulières</label>
                <textarea
                  value={customerForm.notes}
                  onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Habitudes de règlement, jours de paie..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  Enregistrer
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL 2: DEBT PAYMENT */}
      {isPaymentModalOpen && selectedCustomerForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-400" />
                Règlement de Dette Client
              </h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-6 space-y-4 text-xs">
              
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-1">
                <span className="text-rose-800 font-semibold block">{selectedCustomerForPayment.name}</span>
                <div className="flex justify-between items-baseline pt-1">
                  <span className="text-rose-700">Dette totale en cours :</span>
                  <span className="text-base font-extrabold text-rose-700 font-mono-numbers">
                    {formatMoney(selectedCustomerForPayment.creditBalance)}
                  </span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  Montant Versé par le Client ({currency}) *
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedCustomerForPayment.creditBalance}
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 text-base font-bold font-mono-numbers bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Mode d'encaissement :</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="cash">Espèces</option>
                  <option value="mobile_money">Mobile Money (Wave / Orange)</option>
                  <option value="card">Carte Bancaire</option>
                </select>
              </div>

              {/* Remaining balance preview */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex justify-between items-center text-emerald-900">
                <span>Nouveau solde après règlement :</span>
                <span className="font-bold font-mono-numbers text-sm">
                  {formatMoney(Math.max(0, selectedCustomerForPayment.creditBalance - paymentForm.amount))}
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Note de reçu</label>
                <input
                  type="text"
                  value={paymentForm.note}
                  onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
                >
                  Encaisser le Règlement
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
