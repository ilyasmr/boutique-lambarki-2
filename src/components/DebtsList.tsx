import React, { useState, useMemo } from 'react';
import { Client, User } from '../types';
import { translations } from '../translations';
import { 
  AlertCircle, 
  Search, 
  Plus, 
  CreditCard,
  User as UserIcon,
  X,
  History,
  Trash2,
  Edit
} from 'lucide-react';
import { DebtHistoryEntry } from '../types';

interface DebtsListProps {
  clients: Client[];
  lang: 'fr' | 'ar';
  onAddClient: (client: Client) => void;
  onEditClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
  currentUser?: User;
}

export default function DebtsList({
  clients,
  lang,
  onAddClient,
  onEditClient,
  onDeleteClient,
  currentUser
}: DebtsListProps) {
  const isRtl = lang === 'ar';
  const t = translations[lang];

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'regular' | 'passing'>('all');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('NEW_PASSING');
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addAmount, setAddAmount] = useState('');
  const [addDebtDate, setAddDebtDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [addDueDate, setAddDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [addDebtNote, setAddDebtNote] = useState('');

  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settlingClient, setSettlingClient] = useState<Client | null>(null);
  const [settleAmount, setSettleAmount] = useState<number | string>('');
  const [settleNote, setSettleNote] = useState('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDebtDate, setEditDebtDate] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editDebtNote, setEditDebtNote] = useState('');

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyClient, setHistoryClient] = useState<Client | null>(null);

  // Debts filtered list
  const debtors = useMemo(() => {
    return clients.filter(c => c.outstandingDebt && c.outstandingDebt > 0);
  }, [clients]);

  const filteredDebtors = useMemo(() => {
    return debtors.filter(c => {
      const matchSearch = (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (c.phone || '').includes(searchTerm);
      let matchType = true;
      if (filterType === 'regular') matchType = !c.isPassingClient;
      if (filterType === 'passing') matchType = !!c.isPassingClient;
      
      return matchSearch && matchType;
    }).sort((a, b) => {
      // Sort by due date (soonest first). If no due date, put at the end.
      const dateA = a.debtDueDate || '9999-12-31';
      const dateB = b.debtDueDate || '9999-12-31';
      return dateA.localeCompare(dateB);
    });
  }, [debtors, searchTerm, filterType]);

  const totalDebts = useMemo(() => {
    return filteredDebtors.reduce((sum, c) => sum + (c.outstandingDebt || 0), 0);
  }, [filteredDebtors]);

  const handleAddDebtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(addAmount as string);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert(isRtl ? 'مبلغ الدين غير صحيح' : 'Montant de dette invalide');
      return;
    }

    if (selectedClientId === 'NEW_PASSING') {
      const newHistoryEntry: DebtHistoryEntry = {
        id: `dh-${Date.now()}`,
        date: new Date().toISOString(),
        type: 'set',
        changeAmount: amountNum,
        newBalance: amountNum,
        notes: addDebtNote.trim() || (isRtl ? 'إنشاء دين أولى لزبون عابر' : 'Initialisation de dette passager'),
        operator: currentUser?.name || 'Système'
      };
      const newPassingClient: Client = {
        id: `cli-pass-${Date.now()}`,
        name: addName.trim(),
        phone: addPhone.trim(),
        email: '',
        address: isRtl ? 'زبون عابر' : 'Client de passage',
        joinDate: addDebtDate,
        totalSpent: 0,
        purchases: [],
        outstandingDebt: amountNum,
        debtDate: addDebtDate,
        debtDueDate: addDueDate,
        debtNote: addDebtNote.trim(),
        isPassingClient: true,
        debtPayments: [],
        debtHistory: [newHistoryEntry]
      };
      onAddClient(newPassingClient);
    } else {
      const existingClient = clients.find(c => c.id === selectedClientId);
      if (existingClient) {
        const newHistoryEntry: DebtHistoryEntry = {
          id: `dh-${Date.now()}`,
          date: new Date().toISOString(),
          type: 'increase',
          changeAmount: amountNum,
          newBalance: (existingClient.outstandingDebt || 0) + amountNum,
          notes: addDebtNote.trim() || (isRtl ? 'زيادة الدين' : 'Augmentation de dette'),
          operator: currentUser?.name || 'Système'
        };
        const updatedClient: Client = {
          ...existingClient,
          outstandingDebt: (existingClient.outstandingDebt || 0) + amountNum,
          debtDate: addDebtDate,
          debtDueDate: addDueDate,
          debtNote: addDebtNote.trim(),
          debtHistory: [...(existingClient.debtHistory || []), newHistoryEntry]
        };
        onEditClient(updatedClient);
      }
    }

    setIsAddModalOpen(false);
    setAddName('');
    setAddPhone('');
    setAddAmount('');
    setSelectedClientId('NEW_PASSING');
    setAddDueDate(() => new Date().toISOString().split('T')[0]);
    setAddDebtDate(() => new Date().toISOString().split('T')[0]);
    setAddDebtNote('');
  };

  const handleEditDebtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    const amt = parseFloat(editAmount);
    if (isNaN(amt) || amt < 0) {
      alert(isRtl ? 'المبلغ غير صحيح' : 'Montant invalide');
      return;
    }

    const prevDebt = editingClient.outstandingDebt || 0;
    const diff = amt - prevDebt;

    let historyEntry: DebtHistoryEntry | null = null;
    if (diff !== 0) {
      historyEntry = {
        id: `dh-${Date.now()}`,
        date: new Date().toISOString(),
        type: diff > 0 ? 'increase' : 'decrease',
        changeAmount: Math.abs(diff),
        newBalance: amt,
        notes: isRtl ? 'تعديل مباشر لقيمة الدين' : 'Ajustement direct de la dette',
        operator: currentUser?.name || 'Système'
      };
    }

    const updatedClient: Client = {
      ...editingClient,
      outstandingDebt: amt,
      debtDate: editDebtDate,
      debtDueDate: editDueDate,
      debtNote: editDebtNote.trim(),
      debtHistory: historyEntry 
        ? [...(editingClient.debtHistory || []), historyEntry]
        : (editingClient.debtHistory || [])
    };

    onEditClient(updatedClient);
    setIsEditModalOpen(false);
    setEditingClient(null);
  };

  const handleSettleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingClient) return;

    const amt = parseFloat(settleAmount as string);
    if (isNaN(amt) || amt <= 0) {
      alert(isRtl ? 'مبلغ التسديد غير صحيح' : 'Montant de règlement invalide');
      return;
    }

    if (amt > (settlingClient.outstandingDebt || 0)) {
      alert(isRtl ? 'مبلغ التسديد أكبر من الدين المتبقي!' : 'Le montant dépasse la dette actuelle!');
      return;
    }

    const newPayment = {
      id: `dp-${Date.now()}`,
      date: new Date().toISOString(),
      amount: amt,
      paymentMethod: 'cash' as any,
      notes: settleNote || (isRtl ? 'تسديد ديون قصيرة المدى' : 'Règlement dette CT'),
      operator: currentUser?.name || 'Système'
    };

    const finalDebt = (settlingClient.outstandingDebt || 0) - amt;
    const newHistoryEntry: DebtHistoryEntry = {
      id: `dh-${Date.now()}`,
      date: new Date().toISOString(),
      type: 'decrease',
      changeAmount: amt,
      newBalance: finalDebt,
      notes: settleNote || (isRtl ? 'تسديد دفعة من الدين' : 'Règlement de dette'),
      operator: currentUser?.name || 'Système'
    };
    const updatedClient: Client = {
      ...settlingClient,
      outstandingDebt: finalDebt,
      debtDate: finalDebt > 0 ? settlingClient.debtDate : undefined,
      debtDueDate: finalDebt > 0 ? settlingClient.debtDueDate : undefined,
      debtPayments: [...(settlingClient.debtPayments || []), newPayment],
      debtHistory: [...(settlingClient.debtHistory || []), newHistoryEntry]
    };

    onEditClient(updatedClient);
    setIsSettleModalOpen(false);
    setSettlingClient(null);
    setSettleAmount('');
    setSettleNote('');
  };

  const getDaysUntilDue = (dueDate?: string) => {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0,0,0,0);
    const exp = new Date(dueDate);
    exp.setHours(0,0,0,0);
    const diff = exp.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <AlertCircle className="w-7 h-7 text-rose-500" />
            {isRtl ? 'ديون قريبة المدى' : 'Dettes à Court Terme'}
          </h1>
          <p className="text-sm text-slate-500 font-semibold mt-1">
            {isRtl 
              ? 'تتبع واستخلاص الديون للزبائن الدائمين والعابرين' 
              : 'Suivi et recouvrement des dettes pour tous types de clients'}
          </p>
        </div>
        
        <div className="bg-white px-5 py-3 rounded-2xl border border-rose-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <p className="text-xs text-rose-400 font-bold uppercase mb-1">{isRtl ? 'إجمالي الديون المعلقة' : 'Total des dettes'}</p>
          <p className="text-xl font-black text-rose-600 font-mono">{totalDebts.toFixed(2)} DH</p>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
          <div className="relative w-full sm:w-80">
            <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
            <input
              type="text"
              placeholder={isRtl ? 'بحث باسم الزبون أو الهاتف...' : 'Recherche par nom ou téléphone...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full py-2.5 bg-slate-50 text-sm text-slate-800 rounded-xl border border-slate-200 outline-none focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all ${
                isRtl ? 'pl-4 pr-10' : 'pr-4 pl-10'
              }`}
            />
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setFilterType('all')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'all' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {isRtl ? 'الكل' : 'Tous'}
            </button>
            <button
              onClick={() => setFilterType('regular')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'regular' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {isRtl ? 'دائمون' : 'Réguliers'}
            </button>
            <button
              onClick={() => setFilterType('passing')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'passing' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {isRtl ? 'عابرون' : 'Passagers'}
            </button>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{isRtl ? 'إضافة دين جديد' : 'Nouvelle Dette'}</span>
        </button>
      </div>

      {/* DEBTS TABLE */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-100/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold uppercase text-slate-500">
                <th className="py-4 px-6">{isRtl ? 'الزبون' : 'Client'}</th>
                <th className="py-4 px-6">{isRtl ? 'النوع' : 'Type'}</th>
                <th className="py-4 px-6">{isRtl ? 'وصف السلعة' : 'Description'}</th>
                <th className="py-4 px-6">{isRtl ? 'تاريخ الدين' : 'Date de Dette'}</th>
                <th className="py-4 px-6">{isRtl ? 'تاريخ الاستحقاق' : 'Date d\'échéance'}</th>
                <th className="py-4 px-6 text-right">{isRtl ? 'المبلغ المتبقي' : 'Montant Dû'}</th>
                <th className="py-4 px-6 text-center">{isRtl ? 'إجراء' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredDebtors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <History className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                    <p className="font-semibold text-sm">{isRtl ? 'لا توجد ديون قريبة المدى مطابقة' : 'Aucune dette correspondante trouvée'}</p>
                  </td>
                </tr>
              ) : (
                filteredDebtors.map(c => {
                  const daysLeft = getDaysUntilDue(c.debtDueDate);
                  const isUrgent = daysLeft !== null && daysLeft <= 3;
                  const isOverdue = daysLeft !== null && daysLeft < 0;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-all duration-300 hover:shadow-sm hover:z-10 relative">
                      <td className="py-4 px-6">
                        <p className="font-bold text-slate-900 text-sm">{c.name}</p>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{c.phone || (isRtl ? 'بدون رقم' : 'Pas de num')}</p>
                      </td>
                      <td className="py-4 px-6">
                        {c.isPassingClient ? (
                          <span className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-md text-[10px] font-black uppercase">
                            {isRtl ? 'عابر' : 'Passager'}
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200/60 rounded-md text-[10px] font-black uppercase">
                            {isRtl ? 'دائم' : 'Régulier'}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-500 font-semibold max-w-[150px] truncate" title={c.debtNote}>
                        {c.debtNote || '—'}
                      </td>
                      <td className="py-4 px-6 text-xs font-semibold text-slate-600 font-mono">
                        {c.debtDate || '—'}
                      </td>
                      <td className="py-4 px-6">
                        {c.debtDueDate ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-slate-800 font-mono">{c.debtDueDate}</span>
                            {isOverdue ? (
                              <span className="text-[9px] text-rose-600 font-black uppercase">{isRtl ? 'متأخر الدفع' : 'En retard'}</span>
                            ) : isUrgent ? (
                              <span className="text-[9px] text-amber-600 font-black uppercase">{isRtl ? 'قريب جداً' : 'Très proche'}</span>
                            ) : (
                              <span className="text-[9px] text-emerald-600 font-black uppercase">{isRtl ? 'ساري' : 'Valide'}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs font-semibold">{'—'}</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="font-black text-rose-600 text-base font-mono bg-rose-50 px-2 py-1 rounded-lg">
                          {(c.outstandingDebt || 0).toFixed(2)} DH
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSettlingClient(c);
                              setIsSettleModalOpen(true);
                            }}
                            className="p-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-bold text-xs transition-colors border border-emerald-200 flex items-center gap-1.5"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            {isRtl ? 'تسديد' : 'Régler'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingClient(c);
                              setEditAmount(String(c.outstandingDebt || 0));
                              setEditDebtDate(c.debtDate || new Date().toISOString().split('T')[0]);
                              setEditDueDate(c.debtDueDate || new Date().toISOString().split('T')[0]);
                              setEditDebtNote(c.debtNote || '');
                              setIsEditModalOpen(true);
                            }}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                            title={isRtl ? 'تعديل الدين' : 'Modifier la dette'}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setHistoryClient(c);
                              setIsHistoryModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                            title={isRtl ? 'سجل التغييرات' : 'Historique'}
                          >
                            <History className="w-4 h-4" />
                          </button>
                          {c.isPassingClient && currentUser?.role === 'admin' && (
                             <button
                               onClick={() => {
                                 if (window.confirm(isRtl ? 'هل أنت متأكد من حذف دين الزبون العابر؟' : 'Confirmer la suppression ?')) {
                                    onDeleteClient(c.id);
                                 }
                               }}
                               className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                             >
                               <Trash2 className="w-4 h-4" />
                             </button>
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

      {/* ADD PASSING DEBT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">{isRtl ? 'إضافة دين جديد' : 'Ajouter une dette'}</h3>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="p-1 text-slate-400 hover:bg-slate-200 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddDebtSubmit} className="p-5 space-y-4 text-sm font-semibold">
              <div>
                <label className="block text-xs text-slate-500 mb-1">{isRtl ? 'الزبون *' : 'Client *'}</label>
                <select 
                  value={selectedClientId} 
                  onChange={e => {
                    setSelectedClientId(e.target.value);
                    if (e.target.value !== 'NEW_PASSING') {
                       const cl = clients.find(c => c.id === e.target.value);
                       if (cl) setAddPhone(cl.phone);
                    } else {
                       setAddPhone('');
                    }
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none bg-white"
                >
                  <option value="NEW_PASSING">{isRtl ? '-- زبون عابر جديد --' : '-- Nouveau Passager --'}</option>
                  {clients.filter(c => !c.isPassingClient).map(c => (
                    <option key={c.id} value={c.id}>{c.name || 'Sans Nom'} {c.phone ? `(${c.phone})` : ''}</option>
                  ))}
                </select>
              </div>
              
              {selectedClientId === 'NEW_PASSING' && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">{isRtl ? 'الاسم *' : 'Nom *'}</label>
                  <input required type="text" value={addName} onChange={e => setAddName(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none" />
                </div>
              )}
              <div>
                <label className="block text-xs text-slate-500 mb-1">{isRtl ? 'رقم الهاتف' : 'Téléphone'}</label>
                <input type="text" value={addPhone} onChange={e => setAddPhone(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">{isRtl ? 'تاريخ الدين *' : 'Date de Dette *'}</label>
                  <input required type="date" value={addDebtDate} onChange={e => {
                    setAddDebtDate(e.target.value);
                    setAddDueDate(e.target.value);
                  }} className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none font-mono" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">{isRtl ? 'تاريخ الاستحقاق *' : 'Date d\'échéance *'}</label>
                  <input required type="date" value={addDueDate} onChange={e => setAddDueDate(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">{isRtl ? 'وصف السلعة المشتراة' : 'Description de l\'article'}</label>
                <input type="text" value={addDebtNote} onChange={e => setAddDebtNote(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">{isRtl ? 'المبلغ (درهم) *' : 'Montant (DH) *'}</label>
                <input required type="number" step="0.01" min="0" value={addAmount} onChange={e => setAddAmount(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none font-mono text-rose-600 font-bold bg-rose-50/30" />
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl active:scale-95 transition-all">
                  {isRtl ? 'حفظ الدين' : 'Enregistrer la dette'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SETTLE DEBT MODAL */}
      {isSettleModalOpen && settlingClient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">{isRtl ? 'تسديد الدين' : 'Règlement de dette'}</h3>
              <button onClick={() => setIsSettleModalOpen(false)} className="p-1 text-slate-400 hover:bg-slate-200 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSettleSubmit} className="p-5 space-y-4 text-sm font-semibold">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                <span className="text-slate-500 text-xs">{isRtl ? 'إجمالي الدين:' : 'Dette totale:'}</span>
                <span className="font-black font-mono text-rose-600">{(settlingClient.outstandingDebt || 0).toFixed(2)} DH</span>
              </div>
              
              <div>
                <label className="block text-xs text-slate-500 mb-1">{isRtl ? 'المبلغ المسدد (درهم) *' : 'Montant réglé (DH) *'}</label>
                <input required type="number" step="0.01" min="0" max={settlingClient.outstandingDebt} value={settleAmount} onChange={e => setSettleAmount(e.target.value)} className="w-full p-3 rounded-xl border border-emerald-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono text-emerald-700 font-black bg-emerald-50/50 text-lg" autoFocus placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">{isRtl ? 'ملاحظة (اختياري)' : 'Note (Optionnel)'}</label>
                <input type="text" value={settleNote} onChange={e => setSettleNote(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" />
              </div>
              
              <div className="pt-2">
                <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl active:scale-95 transition-all shadow-md shadow-emerald-500/20">
                  {isRtl ? 'تأكيد الدفع' : 'Confirmer le paiement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT DEBT MODAL */}
      {isEditModalOpen && editingClient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">{isRtl ? 'تعديل الدين' : 'Modifier la dette'}</h3>
              <button type="button" onClick={() => { setIsEditModalOpen(false); setEditingClient(null); }} className="p-1 text-slate-400 hover:bg-slate-200 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditDebtSubmit} className="p-5 space-y-4 text-sm font-semibold">
              <div>
                <label className="block text-xs text-slate-500 mb-1">{isRtl ? 'الزبون' : 'Client'}</label>
                <input type="text" value={editingClient.name} disabled className="w-full p-2.5 rounded-xl border border-slate-100 bg-slate-50 text-slate-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">{isRtl ? 'تاريخ الدين *' : 'Date de Dette *'}</label>
                  <input required type="date" value={editDebtDate} onChange={e => {
                    setEditDebtDate(e.target.value);
                  }} className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none font-mono" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">{isRtl ? 'تاريخ الاستحقاق *' : 'Date d\'échéance *'}</label>
                  <input required type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">{isRtl ? 'وصف السلعة المشتراة' : 'Description de l\'article'}</label>
                <input type="text" value={editDebtNote} onChange={e => setEditDebtNote(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">{isRtl ? 'المبلغ المتبقي الحالي (درهم) *' : 'Montant actuel (DH) *'}</label>
                <input required type="number" step="0.01" min="0" value={editAmount} onChange={e => setEditAmount(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none font-mono text-rose-600 font-bold bg-rose-50/30" />
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl active:scale-95 transition-all">
                  {isRtl ? 'حفظ التعديلات' : 'Sauvegarder les modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEBT HISTORY MODAL */}
      {isHistoryModalOpen && historyClient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <History className="w-5 h-5 text-rose-500" />
                <span>{isRtl ? `سجل ديون: ${historyClient.name}` : `Historique des dettes: ${historyClient.name}`}</span>
              </h3>
              <button type="button" onClick={() => { setIsHistoryModalOpen(false); setHistoryClient(null); }} className="p-1 text-slate-400 hover:bg-slate-200 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
              {(!historyClient.debtHistory || historyClient.debtHistory.length === 0) ? (
                <p className="text-slate-400 text-center py-8">{isRtl ? 'لا يوجد سجل حركات لهذا الدين بعد.' : 'Aucun historique pour cette dette.'}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-semibold text-slate-650">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold">
                        <th className="py-2.5 px-3">{isRtl ? 'التاريخ' : 'Date'}</th>
                        <th className="py-2.5 px-3">{isRtl ? 'العملية' : 'Action'}</th>
                        <th className="py-2.5 px-3 text-right">{isRtl ? 'القيمة' : 'Montant'}</th>
                        <th className="py-2.5 px-3 text-right">{isRtl ? 'الرصيد الجديد' : 'Nouv. Solde'}</th>
                        <th className="py-2.5 px-3">{isRtl ? 'ملاحظات / السلعة' : 'Notes'}</th>
                        <th className="py-2.5 px-3">{isRtl ? 'المستخدم' : 'Opérateur'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-medium">
                      {historyClient.debtHistory.map(entry => (
                        <tr key={entry.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3 font-mono text-[10px] text-slate-500">
                            {new Date(entry.date).toLocaleString(lang === 'ar' ? 'ar-EG' : 'fr-FR')}
                          </td>
                          <td className="py-3 px-3">
                            {entry.type === 'increase' ? (
                              <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 rounded text-[9px] font-bold">
                                {isRtl ? 'زيادة' : 'Augmentation'}
                              </span>
                            ) : entry.type === 'decrease' ? (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[9px] font-bold">
                                {isRtl ? 'تسديد' : 'Règlement'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[9px] font-bold">
                                {isRtl ? 'تعيين أولى' : 'Initialisation'}
                              </span>
                            )}
                          </td>
                          <td className={`py-3 px-3 text-right font-black font-mono ${entry.type === 'increase' ? 'text-rose-600' : entry.type === 'decrease' ? 'text-emerald-600' : 'text-blue-600'}`}>
                            {entry.type === 'increase' ? '+' : entry.type === 'decrease' ? '-' : ''}{entry.changeAmount.toFixed(2)} DH
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono">
                            {entry.newBalance.toFixed(2)} DH
                          </td>
                          <td className="py-3 px-3 text-slate-500 max-w-[150px] truncate" title={entry.notes}>
                            {entry.notes || '—'}
                          </td>
                          <td className="py-3 px-3 text-slate-400 font-mono text-[10px]">
                            {entry.operator}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
