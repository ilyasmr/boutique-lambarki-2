import React from 'react';
import { Client, User, PostalCheck } from '../types';
import { translations, arabicDashboardLabels } from '../translations';
import { 
  Plus, 
  Search, 
  UserPlus, 
  Trash2, 
  Edit2,
  Edit3, 
  Mail, 
  Phone, 
  MapPin, 
  History, 
  X,
  Sparkles,
  ShoppingBag,
  ShieldAlert
} from 'lucide-react';

interface ClientsListProps {
  clients: Client[];
  lang: 'fr' | 'ar';
  onAddClient: (client: Client) => void;
  onEditClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
  prefilledSearch?: string;
  currentUser?: User;
}

export default function ClientsList({ 
  clients, 
  lang, 
  onAddClient, 
  onEditClient, 
  onDeleteClient,
  prefilledSearch = '',
  currentUser
}: ClientsListProps) {

  const isRtl = lang === 'ar';
  const t = translations[lang];
  const tLabel = arabicDashboardLabels[lang];

  // States
  const [searchTerm, setSearchTerm] = React.useState(prefilledSearch);
  const [selectedClient, setSelectedClient] = React.useState<Client | null>(null);
  const [sortBy, setSortBy] = React.useState<'default' | 'page_asc' | 'debt_desc' | 'debt_asc' | 'debt_date_desc' | 'debt_date_asc' | 'debt_duedate_asc' | 'spent_desc' | 'check_expiry' | 'check_amount_desc'>('default');

  const [notebooks, setNotebooks] = React.useState<{id: string, name: string}[]>(() => {
    const stored = localStorage.getItem('app_notebooks');
    return stored ? JSON.parse(stored) : [{ id: 'default', name: isRtl ? 'الدفتر الرئيسي' : 'Cahier Principal' }];
  });
  
  const [activeNotebookId, setActiveNotebookId] = React.useState<string>(() => {
    return localStorage.getItem('app_active_notebook') || 'default';
  });

  const getClientPage = React.useCallback((c: Client) => {
    return (c.notebookPages && c.notebookPages[activeNotebookId]) || c.pageNumber || 1;
  }, [activeNotebookId]);

  // Helper to obtain a unique chronological index for each customer
  const getSequentialNumber = React.useCallback((client: Client) => {
    const sorted = [...clients].sort((a, b) => {
      if (a.joinDate !== b.joinDate) {
        return a.joinDate.localeCompare(b.joinDate);
      }
      return a.id.localeCompare(b.id);
    });
    const index = sorted.findIndex(c => c.id === client.id);
    return index !== -1 ? index + 1 : 1;
  }, [clients]);

  React.useEffect(() => {
    if (prefilledSearch !== undefined) {
      setSearchTerm(prefilledSearch);
    }
  }, [prefilledSearch]);

  // Date helper for YYYY-MM-DD
  const getTodayDateString = () => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  };
  const todayStr = getTodayDateString();

  const getCheckStatus = (expiryDate: string) => {
    if (!expiryDate) return { label: '', className: '' };
    const today = new Date();
    today.setHours(0,0,0,0);
    const exp = new Date(expiryDate);
    exp.setHours(0,0,0,0);
    const diff = exp.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) {
      return { 
        label: isRtl ? `منتهي` : `Expiré`, 
        className: 'bg-rose-50 text-rose-700 border-rose-200' 
      };
    } else if (days <= 5) {
      return { 
        label: isRtl ? `قريب` : `Proche`, 
        className: 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' 
      };
    } else {
      return { 
        label: isRtl ? `ساري` : `Valide`, 
        className: 'bg-indigo-50 text-indigo-700 border-indigo-150' 
      };
    }
  };

  // Form states (Modal)
  const [isOpenModal, setIsOpenModal] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const [formName, setFormName] = React.useState('');
  const [formPhone, setFormPhone] = React.useState('');
  const [formEmail, setFormEmail] = React.useState('');
  const [formAddress, setFormAddress] = React.useState('');
  const [formOutstandingDebt, setFormOutstandingDebt] = React.useState<number>(0);
  const [formDebtDate, setFormDebtDate] = React.useState<string>(todayStr);
  const [formDebtDueDate, setFormDebtDueDate] = React.useState<string>('');
  const [formPageNumber, setFormPageNumber] = React.useState<number | string>('');
  
  // Postal Check Form States
  const [formHasPostalCheck, setFormHasPostalCheck] = React.useState<boolean>(false);
  const [formPostalChecks, setFormPostalChecks] = React.useState<PostalCheck[]>([]);
  // Temp inputs for adding a new check inside modal
  const [tempAmount, setTempAmount] = React.useState<string>('');
  const [tempEntryDate, setTempEntryDate] = React.useState<string>(todayStr);
  const [tempExpiryDate, setTempExpiryDate] = React.useState<string>(todayStr);

  // Period filters for purchase calculation
  const [purchaseDateFrom, setPurchaseDateFrom] = React.useState('');
  const [purchaseDateTo, setPurchaseDateTo] = React.useState('');

  // Confirmation modal state for client deletion
  const [clientToDelete, setClientToDelete] = React.useState<Client | null>(null);

  // Debt settlement states
  const [isOpenSettleModal, setIsOpenSettleModal] = React.useState(false);
  const [settlementAmount, setSettlementAmount] = React.useState(0);
  const [settlementNote, setSettlementNote] = React.useState('');
  const [settlementMethod, setSettlementMethod] = React.useState<'cash' | 'card' | 'transfer' | 'check'>('cash');

  const handleSettleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    const currentDebt = selectedClient.outstandingDebt || 0;
    if (settlementAmount <= 0) {
      alert(isRtl ? 'المبلغ يجب أن يكون أكبر من 0.' : 'Le montant doit être supérieur à 0.');
      return;
    }
    if (settlementAmount > currentDebt) {
      alert(isRtl 
        ? 'خطأ: مبلغ التسديد أكبر من الدين المترتب على الزبون !' 
        : 'Erreur: Le montant dépasse la dette restante !'
      );
      return;
    }

    const newPayment = {
      id: `dp-${Date.now()}`,
      date: new Date().toISOString(),
      amount: settlementAmount,
      paymentMethod: settlementMethod,
      notes: settlementNote || (isRtl ? 'تسديد دفعة من الحساب' : 'Repaiement partiel/Intégral de dette'),
      operator: 'Caisse POS'
    };

    const finalDebt = Math.max(0, currentDebt - settlementAmount);
    const updatedClient: Client = {
      ...selectedClient,
      outstandingDebt: finalDebt,
      debtDate: finalDebt > 0 ? selectedClient.debtDate : undefined,
      debtDueDate: finalDebt > 0 ? selectedClient.debtDueDate : undefined,
      debtPayments: [...(selectedClient.debtPayments || []), newPayment]
    };

    onEditClient(updatedClient);
    setSelectedClient(updatedClient);
    setIsOpenSettleModal(false);
    setSettlementAmount(0);
    setSettlementNote('');
  };

  const handleAddCheck = () => {
    const amt = parseFloat(tempAmount);
    if (isNaN(amt) || amt <= 0) {
      alert(isRtl ? '⚠️ يرجى إدخال مبلغ صحيح للشيك!' : '⚠️ Veuillez entrer un montant de chèque valide !');
      return;
    }
    if (!tempExpiryDate) {
      alert(isRtl ? '⚠️ تاريخ نهاية الصلاحية ضروري!' : "⚠️ L'échéance est obligatoire !");
      return;
    }

    const newCheck: PostalCheck = {
      id: `chk-${Date.now()}`,
      amount: amt,
      entryDate: tempEntryDate || todayStr,
      expiryDate: tempExpiryDate
    };

    setFormPostalChecks(prev => [...prev, newCheck]);
    setTempAmount('');
  };

  const handleRemoveCheck = (id: string) => {
    setFormPostalChecks(prev => prev.filter(chk => chk.id !== id));
  };

  const handleEditClick = (c: Client, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent opening details
    setEditingId(c.id);
    setFormName(c.name);
    setFormPhone(c.phone);
    setFormEmail(c.email || '');
    setFormAddress(c.address);
    setFormOutstandingDebt(c.outstandingDebt || 0);
    setFormDebtDate(c.debtDate || todayStr);
    setFormDebtDueDate(c.debtDueDate || '');
    setFormHasPostalCheck(c.hasPostalCheck || (c.postalChecks && c.postalChecks.length > 0) || false);
    setFormPostalChecks(c.postalChecks || []);
    setFormPageNumber(getClientPage(c));
    setTempAmount('');
    setTempEntryDate(todayStr);
    setTempExpiryDate(todayStr);
    setIsOpenModal(true);
  };

  const handleEditHistory = (client: Client, historyIndex: number, currentHistPage: number | string) => {
    const newPageStr = window.prompt(isRtl ? "أدخل رقم الصفحة الجديد:" : "Entrez le nouveau numéro de page:", String(currentHistPage));
    if (newPageStr !== null && newPageStr.trim() !== '') {
      const newPage = parseInt(newPageStr, 10);
      if (!isNaN(newPage) && newPage > 0) {
        // Prevent duplicate page
        const isTaken = clients.find(c => Number(getClientPage(c)) === newPage && c.id !== client.id);
        if (isTaken) {
          alert(isRtl 
            ? `⚠️ لا يمكن تعديل السجل! رقم الصفحة (${newPage}) مستعمل حالياً من طرف الزبون "${isTaken.name}".`
            : `⚠️ Le numéro de page ${newPage} est déjà utilisé par: ${isTaken.name}.`);
          return;
        }

        const updatedHistory = [...(client.pageHistory || [])];
        updatedHistory[historyIndex] = { ...updatedHistory[historyIndex], page: newPage };
        const updatedClient = { ...client, pageHistory: updatedHistory };
        onEditClient(updatedClient);
        setSelectedClient(updatedClient);
      }
    }
  };

  const handleDeleteHistory = (client: Client, historyIndex: number) => {
    if (window.confirm(isRtl ? "هل أنت متأكد من حذف هذا السجل بشكل نهائي؟" : "Êtes-vous sûr de vouloir supprimer cet historique ?")) {
      const updatedHistory = [...(client.pageHistory || [])];
      updatedHistory.splice(historyIndex, 1);
      const updatedClient = { ...client, pageHistory: updatedHistory };
      onEditClient(updatedClient);
      setSelectedClient(updatedClient);
    }
  };

  const handleCreateNewClick = () => {
    setEditingId(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormOutstandingDebt(0);
    setFormDebtDate(todayStr);
    setFormDebtDueDate('');
    setFormHasPostalCheck(false);
    setFormPostalChecks([]);
    
    const maxPage = clients.reduce((max, c) => Math.max(max, Number(getClientPage(c)) || 0), 0);
    setFormPageNumber(maxPage + 1);

    setTempAmount('');
    setTempEntryDate(todayStr);
    setTempExpiryDate(todayStr);
    setIsOpenModal(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim()) {
      alert(isRtl ? 'اسم الزبون حقل ضروري.' : 'Le nom complet est obligatoire.');
      return;
    }

    const isNameTaken = clients.find(c => c.name.trim().toLowerCase() === formName.trim().toLowerCase() && c.id !== editingId);
    if (isNameTaken) {
      alert(isRtl ? 'هذا الاسم موجود بالفعل، الرجاء اختيار اسم آخر لتفادي التكرار.' : 'Ce nom existe déjà, veuillez en choisir un autre.');
      return;
    }

    const matchedClient = clients.find(c => c.id === editingId);

    let updatedPageHistory = matchedClient?.pageHistory || [];
    const newPage = parseInt(formPageNumber as any) || 0;
    
    if (newPage > 0) {
      const pageTakenBy = clients.find(c => Number(getClientPage(c)) === newPage && c.id !== editingId);
      if (pageTakenBy) {
        alert(isRtl 
          ? `⚠️ لا يمكن الحفظ! رقم الصفحة (${newPage}) مستعمل مسبقاً من طرف الزبون "${pageTakenBy.name}". المرجو تغيير رقم الصفحة.`
          : `⚠️ Le numéro de page ${newPage} est déjà utilisé par: ${pageTakenBy.name}. Veuillez le changer.`);
        return;
      }
    }

    const oldPage = matchedClient ? Number(getClientPage(matchedClient)) : 0;
    if (editingId && oldPage > 0 && newPage !== oldPage) {
      updatedPageHistory = [
        ...updatedPageHistory,
        { page: oldPage, assignedAt: new Date().toISOString() }
      ];
    }

    const payload: Client = {
      id: editingId || `cli-${Date.now()}`,
      name: formName,
      email: formEmail.trim(),
      phone: formPhone,
      address: formAddress || (isRtl ? 'العنوان غير محدد' : 'Adresse non spécifiée'),
      joinDate: matchedClient?.joinDate || new Date().toISOString().split('T')[0],
      totalSpent: matchedClient?.totalSpent || 0,
      purchases: matchedClient?.purchases || [],
      outstandingDebt: formOutstandingDebt,
      debtDate: formOutstandingDebt > 0 ? formDebtDate : undefined,
      debtDueDate: formOutstandingDebt > 0 ? formDebtDueDate : undefined,
      debtPayments: matchedClient?.debtPayments || [],
      hasPostalCheck: formHasPostalCheck && formPostalChecks.length > 0,
      postalChecks: formHasPostalCheck ? formPostalChecks : [],
      pageNumber: newPage,
      pageHistory: updatedPageHistory
    };

    if (editingId) {
      onEditClient(payload);
      if (selectedClient && selectedClient.id === editingId) {
        setSelectedClient(payload);
      }
    } else {
      onAddClient(payload);
    }
    setIsOpenModal(false);
  };

  // Search Filter & Sort
  const filteredClients = React.useMemo(() => {
    const list = clients.filter(c => {
      if (c.isPassingClient) return false;
      const nameMatch = (c.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const phoneMatch = (c.phone || '').includes(searchTerm);
      const addressMatch = (c.address || '').toLowerCase().includes(searchTerm.toLowerCase());
      const pageMatch = c.pageNumber && String(c.pageNumber) === searchTerm.trim();
      return nameMatch || phoneMatch || addressMatch || pageMatch;
    });

    if (sortBy === 'page_asc') {
      return [...list].sort((a, b) => (a.pageNumber || 999999) - (b.pageNumber || 999999));
    }
    if (sortBy === 'debt_desc') {
      return [...list].sort((a, b) => (b.outstandingDebt || 0) - (a.outstandingDebt || 0));
    }
    if (sortBy === 'debt_asc') {
      return [...list].sort((a, b) => (a.outstandingDebt || 0) - (b.outstandingDebt || 0));
    }
    if (sortBy === 'debt_date_desc') {
      return [...list].sort((a, b) => {
        const da = a.outstandingDebt && a.outstandingDebt > 0 ? (a.debtDate || a.joinDate || '') : '';
        const db = b.outstandingDebt && b.outstandingDebt > 0 ? (b.debtDate || b.joinDate || '') : '';
        return db.localeCompare(da);
      });
    }
    if (sortBy === 'debt_date_asc') {
      return [...list].sort((a, b) => {
        const da = a.outstandingDebt && a.outstandingDebt > 0 ? (a.debtDate || a.joinDate || '') : '9999-12-31';
        const db = b.outstandingDebt && b.outstandingDebt > 0 ? (b.debtDate || b.joinDate || '') : '9999-12-31';
        return da.localeCompare(db);
      });
    }
    if (sortBy === 'debt_duedate_asc') {
      return [...list].sort((a, b) => {
        const aHas = (a.outstandingDebt && a.outstandingDebt > 0 && a.debtDueDate) ? 1 : 0;
        const bHas = (b.outstandingDebt && b.outstandingDebt > 0 && b.debtDueDate) ? 1 : 0;
        if (bHas !== aHas) return bHas - aHas;
        if (aHas && bHas) {
          return (a.debtDueDate || '').localeCompare(b.debtDueDate || '');
        }
        return 0;
      });
    }
    if (sortBy === 'spent_desc') {
      return [...list].sort((a, b) => b.totalSpent - a.totalSpent);
    }
    if (sortBy === 'check_expiry') {
      return [...list].sort((a, b) => {
        const aHas = (a.postalChecks && a.postalChecks.length > 0) ? 1 : 0;
        const bHas = (b.postalChecks && b.postalChecks.length > 0) ? 1 : 0;
        if (bHas !== aHas) {
          return bHas - aHas;
        }
        if (aHas && bHas) {
          const getEarliestExpiry = (client: Client) => {
            if (!client.postalChecks || client.postalChecks.length === 0) return '9999-12-31';
            const dates = client.postalChecks.map(ch => ch.expiryDate).filter(Boolean);
            if (dates.length === 0) return '9999-12-31';
            return dates.reduce((earliest, cur) => cur < earliest ? cur : earliest, '9999-12-31');
          };
          const dateA = getEarliestExpiry(a);
          const dateB = getEarliestExpiry(b);
          return dateA.localeCompare(dateB);
        }
        return 0;
      });
    }
    if (sortBy === 'check_amount_desc') {
      return [...list].sort((a, b) => {
        const aHas = (a.postalChecks && a.postalChecks.length > 0) ? 1 : 0;
        const bHas = (b.postalChecks && b.postalChecks.length > 0) ? 1 : 0;
        if (bHas !== aHas) {
          return bHas - aHas;
        }
        const aSum = a.postalChecks?.reduce((s, x) => s + (x.amount || 0), 0) || 0;
        const bSum = b.postalChecks?.reduce((s, x) => s + (x.amount || 0), 0) || 0;
        return bSum - aSum;
      });
    }
    return list;
  }, [clients, searchTerm, sortBy]);

  // Calculation of total spent and list of purchases inside a selected period for a single customer
  const clientPurchasesInPeriod = React.useMemo(() => {
    if (!selectedClient) return [];
    return (selectedClient.purchases || []).filter((p) => {
      const pDate = p.date.split('T')[0]; 
      if (purchaseDateFrom && pDate < purchaseDateFrom) return false;
      if (purchaseDateTo && pDate > purchaseDateTo) return false;
      return true;
    });
  }, [selectedClient, purchaseDateFrom, purchaseDateTo]);

  const clientTotalSpentInPeriod = React.useMemo(() => {
    return clientPurchasesInPeriod.reduce((sum, p) => sum + p.total, 0);
  }, [clientPurchasesInPeriod]);

  // Check alerts computation for Client list (within 2 days or past)
  const checkAlerts = React.useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const alerts: Array<{
      client: Client;
      check: PostalCheck;
      daysLeft: number;
      isExpired: boolean;
      isExpiringSoon: boolean;
    }> = [];

    clients.forEach(c => {
      if (c.postalChecks && c.postalChecks.length > 0) {
        c.postalChecks.forEach(check => {
          if (check.expiryDate) {
            const expDate = new Date(check.expiryDate);
            expDate.setHours(0,0,0,0);
            
            const diffTime = expDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            const isExpired = diffDays <= 0;
            const isExpiringSoon = diffDays > 0 && diffDays <= 2; // Warn exactly 2 days prior
            
            if (isExpired || isExpiringSoon) {
              alerts.push({
                client: c,
                check,
                daysLeft: diffDays,
                isExpired,
                isExpiringSoon
              });
            }
          }
        });
      }
    });

    return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [clients]);

  // Debt Due Date alerts computation for Client list (within 2 days or past)
  const debtAlerts = React.useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const alerts: Array<{
      client: Client;
      daysLeft: number;
      isExpired: boolean;
      isExpiringSoon: boolean;
    }> = [];

    clients.forEach(c => {
      if (c.outstandingDebt && c.outstandingDebt > 0 && c.debtDueDate) {
        const dueDate = new Date(c.debtDueDate);
        dueDate.setHours(0,0,0,0);
        
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        const isExpired = diffDays <= 0;
        const isExpiringSoon = diffDays > 0 && diffDays <= 2; // Warn 2 days prior
        
        if (isExpired || isExpiringSoon) {
          alerts.push({
            client: c,
            daysLeft: diffDays,
            isExpired,
            isExpiringSoon
          });
        }
      }
    });

    return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [clients]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
      


      {/* LEFT COLUMN: Search & Database listing (7 or 8 cols in desktop) */}
      <div className={`${selectedClient ? 'hidden lg:block lg:col-span-7' : 'lg:col-span-12'} space-y-6 transition-all duration-350`}>
        
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder={isRtl ? 'ابحث عن زبون بالاسم أو الهاتف...' : 'Rechercher par nom, téléphone, email...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full py-2.5 pl-10 pr-10 bg-slate-50 text-xs text-slate-800 font-bold rounded-xl border border-slate-200/80 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all ${
                  isRtl ? 'text-right' : 'text-left'
                }`}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-650 transition-all"
                  title={isRtl ? 'مسح البحث' : 'Effacer la recherche'}
                >
                  <span className="text-[10px] font-black bg-slate-200/60 text-slate-500 hover:text-slate-700 w-4.5 h-4.5 rounded-full flex items-center justify-center">✕</span>
                </button>
              )}
            </div>

            {/* Dynamic Sort Selector */}
            <div className="relative w-full sm:w-56">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className={`w-full py-2.5 bg-slate-50 text-xs text-slate-850 font-black rounded-xl border border-slate-200/80 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer ${
                  isRtl ? 'text-right pr-3 pl-8' : 'text-left pl-3 pr-8'
                }`}
              >
                <option value="default">{isRtl ? '🔍 الترتيب التلقائي' : 'Tri automatique'}</option>
                <option value="page_asc">{isRtl ? '📖 الترتيب برقم صفحة الدفتر' : 'Tri par Page de Cahier'}</option>
                <option value="debt_desc">{isRtl ? '📈 الديون: من الأعلى للأقل' : 'Dettes : Plus de dettes'}</option>
                <option value="debt_asc">{isRtl ? '📉 الديون: من الأقل للأعلى' : 'Dettes : Moins de dettes'}</option>
                <option value="debt_date_desc">{isRtl ? '📅 تاريخ الدين: الأحدث أولاً' : 'Date de dette : Récente d\'abord'}</option>
                <option value="debt_date_asc">{isRtl ? '📅 تاريخ الدين: الأقدم أولاً' : 'Date de dette : Ancienne d\'abord'}</option>
                <option value="debt_duedate_asc">{isRtl ? '⏰ تاريخ التحصيل: الأقرب أولاً' : 'Échéance recouvrement : Proche d\'abord'}</option>
                <option value="spent_desc">{isRtl ? '💎 مجموع المشتريات (الأعلى)' : 'Fidélité : Plus dépensé'}</option>
                <option value="check_expiry">{isRtl ? '📅 الشيكات: تاريخ الاستحقاق الأقرب' : 'Chèques : Échéance proche'}</option>
                <option value="check_amount_desc">{isRtl ? '💰 الشيكات: القيمة الأعلى أولاً' : 'Chèques : Montant élevé first'}</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleCreateNewClick}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 w-full md:w-auto shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isRtl ? 'فتح حساب زبون جديد' : 'Nouveau Client'}</span>
          </button>

        </div>

        {/* Database records list */}
        <div className="bg-white rounded-2xl border border-slate-100/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-100 text-xs font-bold uppercase text-gray-400">
                  <th className="py-3 px-4">{tLabel.newClient}</th>
                  <th className="py-3 px-4">{tLabel.phoneNumber}</th>
                  <th className="py-3 px-4 hidden md:table-cell">{isRtl ? 'العنوان' : 'Adresse'}</th>
                  {currentUser?.role !== 'cashier' && <th className="py-3 px-4 text-center">{t.actions}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-semibold text-slate-800">
                {filteredClients.map((c) => (
                  <tr 
                    key={c.id} 
                    onClick={() => setSelectedClient(c)}
                    className={`text-xs hover:bg-slate-50/80 cursor-pointer transition-all duration-300 hover:shadow-sm hover:z-10 relative ${
                      selectedClient && selectedClient.id === c.id ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-bold text-gray-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 font-black flex items-center justify-center shrink-0 border border-blue-100 text-sm shadow-sm">
                          {getClientPage(c)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{c.name.split(' ').slice(0, 2).join(' ')}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {/* Page number badge removed from here as requested */}
                            {c.postalChecks && c.postalChecks.length > 0 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[10px] font-bold border border-indigo-100 shadow-sm">
                                <span className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse"></span>
                                {c.postalChecks.length} {isRtl ? 'شيكات' : 'Chèques'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-700 font-mono text-xs">
                      {c.phone ? (
                        <a href={`tel:${c.phone}`} onClick={(e) => e.stopPropagation()} className="text-blue-600 hover:text-blue-800 hover:underline">
                          {c.phone}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 font-medium truncate max-w-[150px] hidden md:table-cell text-xs" title={c.address}>{c.address || '—'}</td>

                    {currentUser?.role !== 'cashier' && (
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={(e) => handleEditClick(c, e)}
                            className="p-1 px-2 hover:bg-gray-100 text-gray-600 rounded-lg border border-gray-150 transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setClientToDelete(c)}
                            className="p-1 hover:bg-rose-50 text-rose-600 rounded-lg border border-rose-100 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={currentUser?.role === 'cashier' ? 3 : 4} className="py-12 text-center text-gray-400 text-xs font-semibold">
                      {isRtl ? 'لا يوجد زبناء بهذا الاسم.' : 'Aucun client dans la base de données.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Profile details inspections panel (5 cols) */}
      {selectedClient && (
        <div className="col-span-1 lg:col-span-5 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between h-[85vh] lg:sticky lg:top-6 animate-fade-in z-50">
          
          {/* Header */}
          <div className="px-5 py-4.5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              <span>{isRtl ? 'ملف وفواتير الزبون' : 'Historique & Fiches Client'}</span>
            </h3>
            <button 
              onClick={() => setSelectedClient(null)} 
              className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Profile particulars */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
            
            <div className="text-center pb-5 border-b border-gray-50">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 font-black text-white flex flex-col items-center justify-center mx-auto shadow-xl shadow-blue-500/30 shrink-0">
                <span className="text-[10px] text-blue-100 uppercase tracking-widest">{isRtl ? 'رقم الصفحة' : 'PAGE NO'}</span>
                <span className="text-3xl font-extrabold mt-0">{selectedClient.pageNumber || '—'}</span>
              </div>
              <h2 className="text-md font-extrabold text-gray-900 mt-3">{selectedClient.name}</h2>
              <div className="flex items-center justify-center gap-2 mt-1">
                <p className="text-xxs text-gray-400 font-mono">{isRtl ? 'انضم للمحل بتاريخ:' : 'Inscrit le :'} {selectedClient.joinDate}</p>
                {selectedClient.postalChecks && selectedClient.postalChecks.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[9px] font-black border border-indigo-200">
                    {selectedClient.postalChecks.length} {isRtl ? 'شيكات' : 'Chèques'}
                  </span>
                )}
              </div>
            </div>

            {/* Direct contact info */}
            <div className="space-y-3 font-semibold text-gray-700">
              <div className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-xl border border-gray-55/60">
                <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <Phone className="w-4 h-4" />
                </span>
                <span className="font-mono">{selectedClient.phone}</span>
              </div>
              <div className="flex items-start gap-3 bg-gray-50 p-2.5 rounded-xl border border-gray-55/60">
                <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg mt-0.5">
                  <MapPin className="w-4 h-4" />
                </span>
                <span className="leading-relaxed text-xxs block">{selectedClient.address}</span>
              </div>
            </div>

            {/* Page Number History Log block */}
            {selectedClient.pageHistory && selectedClient.pageHistory.length > 0 && (
              <div className="p-2 rounded-xl border border-blue-100 bg-blue-50/30 flex flex-wrap items-center gap-1.5">
                <span className="text-[9px] font-black uppercase tracking-wide text-blue-800 mr-1">
                  {isRtl ? 'سجل الصفحات:' : 'Historique:'}
                </span>
                {selectedClient.pageHistory.slice().reverse().map((hist, idx) => (
                  <div key={idx} 
                       title={new Date(hist.assignedAt).toLocaleString(lang === 'ar' ? 'ar-EG' : 'fr-FR')}
                       className="group flex items-center bg-white px-1.5 py-0.5 border border-blue-100 rounded-md shadow-sm text-[9px] font-mono hover:border-blue-300 transition-all">
                    <span className="font-bold text-blue-900">{hist.page}</span>
                    <div className="flex items-center gap-0.5 ml-1.5 w-0 opacity-0 overflow-hidden group-hover:w-auto group-hover:opacity-100 transition-all duration-200">
                      <button onClick={(e) => { e.stopPropagation(); handleEditHistory(selectedClient, selectedClient.pageHistory!.length - 1 - idx, hist.page); }} className="text-blue-500 hover:text-blue-700">
                        <Edit2 className="w-[10px] h-[10px]" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteHistory(selectedClient, selectedClient.pageHistory!.length - 1 - idx); }} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-[10px] h-[10px]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Postal Checks Display block */}
            {selectedClient.postalChecks && selectedClient.postalChecks.length > 0 && (
              <div className="p-4.5 rounded-2xl border border-indigo-100 bg-indigo-50/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase tracking-wide text-indigo-800">
                    {isRtl ? 'الشيكات الخاصة بالزبون' : 'Chèques du Client'}
                  </h4>
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-indigo-100 text-indigo-800">
                    {selectedClient.postalChecks.length}
                  </span>
                </div>
                <div className="space-y-1.5 pt-2 border-t border-indigo-100/40">
                  {selectedClient.postalChecks.map(chk => {
                    const status = getCheckStatus(chk.expiryDate);
                    return (
                      <div key={chk.id} className="bg-white p-2.5 border border-indigo-50 rounded-lg flex flex-col gap-1.5 shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-indigo-900 font-mono text-[11px]">{chk.amount.toFixed(2)} </span>
                          <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase border ${status.className}`}>
                            {status.label}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-gray-400 font-mono mt-1">
                          <span>{isRtl ? `ت. الإصدار:` : `Émis:`} {chk.entryDate}</span>
                          <span className="font-bold text-gray-500">{isRtl ? `ت. الاستحقاق:` : `Échéance:`} {chk.expiryDate}</span>
                        </div>
                        <div className="flex justify-end gap-2 pt-1.5 border-t border-indigo-50 mt-1">
                          <button 
                            onClick={() => {
                              const newAmount = window.prompt(isRtl ? 'أدخل المبلغ الجديد:' : 'Nouveau montant:', String(chk.amount));
                              if (newAmount && !isNaN(Number(newAmount))) {
                                const updatedChecks = selectedClient.postalChecks!.map(c => c.id === chk.id ? { ...c, amount: Number(newAmount) } : c);
                                const updatedClient = { ...selectedClient, postalChecks: updatedChecks };
                                onEditClient(updatedClient);
                                setSelectedClient(updatedClient);
                              }
                            }}
                            className="p-1 hover:bg-blue-50 text-blue-500 rounded"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => {
                              if (window.confirm(isRtl ? 'تأكيد حذف هذا الشيك؟' : 'Confirmer la suppression du chèque ?')) {
                                const updatedChecks = selectedClient.postalChecks!.filter(c => c.id !== chk.id);
                                const updatedClient = { ...selectedClient, postalChecks: updatedChecks };
                                onEditClient(updatedClient);
                                setSelectedClient(updatedClient);
                              }
                            }}
                            className="p-1 hover:bg-rose-50 text-rose-500 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Direct Add Check Form */}
            <div className="p-4 rounded-xl border border-indigo-100 bg-white space-y-3 shadow-sm mt-3">
              <h4 className="text-[10px] font-black uppercase tracking-wide text-indigo-800">
                {isRtl ? 'إضافة شيك جديد للزبون' : 'Ajouter un Chèque Directement'}
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xxs font-bold text-slate-700">
                <div className="col-span-2">
                  <label className="block text-[9px] text-slate-400 mb-0.5">{isRtl ? 'المبلغ *' : 'Montant *'}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={tempAmount}
                    onChange={(e) => setTempAmount(e.target.value)}
                    className="w-full p-2 bg-indigo-50/30 border border-indigo-100 rounded-lg text-indigo-900 font-mono text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-400 mb-0.5">{isRtl ? 'تاريخ الإصدار' : 'Émis le'}</label>
                  <input
                    type="date"
                    value={tempEntryDate}
                    onChange={(e) => setTempEntryDate(e.target.value)}
                    className="w-full p-2 bg-indigo-50/30 border border-indigo-100 rounded-lg text-indigo-900 font-mono text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-400 mb-0.5">{isRtl ? 'تاريخ الاستحقاق *' : 'Échéance *'}</label>
                  <input
                    type="date"
                    value={tempExpiryDate}
                    onChange={(e) => setTempExpiryDate(e.target.value)}
                    className="w-full p-2 bg-indigo-50/30 border border-indigo-100 rounded-lg text-indigo-900 font-mono text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const amt = parseFloat(tempAmount);
                  if (isNaN(amt) || amt <= 0) {
                    alert(isRtl ? '⚠️ يرجى إدخال مبلغ صحيح للشيك!' : '⚠️ Veuillez entrer un montant de chèque valide !');
                    return;
                  }
                  if (!tempExpiryDate) {
                    alert(isRtl ? '⚠️ تاريخ نهاية الصلاحية ضروري!' : "⚠️ L'échéance est obligatoire !");
                    return;
                  }
                  const newCheck: PostalCheck = {
                    id: `chk-${Date.now()}`,
                    amount: amt,
                    entryDate: tempEntryDate || todayStr,
                    expiryDate: tempExpiryDate
                  };
                  const updatedChecks = [...(selectedClient.postalChecks || []), newCheck];
                  const updatedClient = {
                    ...selectedClient,
                    postalChecks: updatedChecks,
                    hasPostalCheck: true
                  };
                  onEditClient(updatedClient);
                  setSelectedClient(updatedClient);
                  setTempAmount('');
                }}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                {isRtl ? 'إضافة الشيك' : 'Ajouter Chèque'}
              </button>
            </div>

          </div>

          <div className="p-4.5 border-t border-gray-100 text-center bg-gray-50/50">
            <span className="text-[10px] text-gray-400 block font-semibold">
              LAMBARKI CRM Customer Ledger Security protocol
            </span>
          </div>

        </div>
      )}

      {/* COMPONENT MODAL: CREATE / EDIT CRM CARD */}
      {isOpenModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 rounded-t-2xl shrink-0">
              <h3 className="text-sm font-bold text-gray-900">
                {editingId ? (isRtl ? 'تعديل بيانات الزبون' : 'Mise à Jour Tiers Client') : (isRtl ? 'تسجيل زبون دائم جديد' : 'Enregistrer un Nouveau Client')}
              </h3>
              <button onClick={() => setIsOpenModal(false)} className="p-1 hover:bg-gray-200 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs font-semibold overflow-y-auto flex-1">
              
              {/* Name */}
              <div className="space-y-1">
                <label className="text-xxs text-slate-400 uppercase tracking-wide">{isRtl ? 'الاسم الكامل للزبون *' : 'Nom Complet *'}</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                />
              </div>

              {/* Notebook Page Number */}
              <div className="space-y-1">
                <label className="text-xxs text-blue-800 uppercase tracking-wide block">
                  {isRtl ? 'رقم الصفحة في الدفتر' : 'Numéro de page dans le cahier'}
                </label>
                <input
                  type="number"
                  min="1"
                  value={formPageNumber || ''}
                  onChange={(e) => setFormPageNumber(parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-blue-50/20 border border-blue-150 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg text-blue-900"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="text-xxs text-slate-400 uppercase tracking-wide">{isRtl ? 'رقم الهاتف المحمول' : 'Numéro de Téléphone'}</label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              {/* Address */}
              <div className="space-y-1">
                <label className="text-xxs text-slate-400 uppercase tracking-wide">{tLabel.physicalAddress}</label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                />
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-gray-100 flex gap-3 text-sm">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold font-sans shadow-md"
                >
                  {t.save}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="px-5 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold"
                >
                  {t.cancel}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* COMPONENT MODAL: SETTLE DEBT */}
      {isOpenSettleModal && selectedClient && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 rounded-t-2xl shrink-0">
              <h3 className="text-sm font-bold text-gray-900">
                {isRtl ? 'تسجيل دفعة استخلاص الدين' : 'Enregistrer un remboursement de dette'}
              </h3>
              <button onClick={() => setIsOpenSettleModal(false)} className="p-1 hover:bg-gray-200 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSettleSubmit} className="p-6 space-y-4 text-xs font-semibold overflow-y-auto flex-1">
              
              <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100 text-center">
                <p className="text-xxs text-rose-800 uppercase tracking-wide">{isRtl ? 'إجمالي الدين الحالي للتسوية :' : 'Total dette restante à solder :'}</p>
                <p className="text-lg font-black text-rose-700 font-mono mt-0.5">
                  {(selectedClient.outstandingDebt || 0).toFixed(2)} 
                </p>
              </div>

              {/* Repay Amount */}
              <div className="space-y-1">
                <label className="text-xxs text-slate-400 uppercase tracking-wide">{isRtl ? 'المبلغ المستخلص بال *' : 'Montant à rembourser *'}</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedClient.outstandingDebt || 0}
                  value={settlementAmount || ''}
                  onChange={(e) => setSettlementAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-sm"
                />
              </div>

              {/* Repay Method */}
              <div className="space-y-1.5">
                <label className="text-xxs text-slate-400 uppercase tracking-wider">{isRtl ? 'طريقة الاستلام :' : 'Mode de règlement :'}</label>
                <select
                  value={settlementMethod}
                  onChange={(e: any) => setSettlementMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                >
                  <option value="cash">{isRtl ? 'نقداً (رأس مال)' : 'Espèces'}</option>
                  <option value="card">{isRtl ? 'بطاقة بنكية' : 'Carte Bancaire'}</option>
                  <option value="transfer">{isRtl ? 'حوالة / تحويل بنكي' : 'Virement Bancaire'}</option>
                  <option value="check">{isRtl ? 'شيك بنكي موثق' : 'Chèque'}</option>
                </select>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-xxs text-slate-400 uppercase tracking-wide">{isRtl ? 'ملاحظات / تفاصيل المعاملة :' : 'Notes / Motif :'}</label>
                <input
                  type="text"
                  value={settlementNote}
                  onChange={(e) => setSettlementNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-gray-100 flex gap-3 text-sm">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold font-sans shadow-md"
                >
                  {isRtl ? 'تأكيد وقيد الاستلام' : 'Solder & Confirmer'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpenSettleModal(false)}
                  className="px-5 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold"
                >
                  {t.cancel}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* COMPONENT MODAL: CONFIRM CLIENT DELETION */}
      {clientToDelete && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="p-3 bg-rose-50 rounded-full text-rose-600">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-md font-black text-gray-900">
                {isRtl ? 'هل أنت متأكد من حذف هذا الزبون؟' : 'Confirmer la suppression ?'}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                {isRtl 
                  ? `سيتم حذف ملف الزبون "${clientToDelete.name}" نهائياً من قاعدة البيانات مع كافة سجلات المعاملات الخاصة به.` 
                  : `Le profil du client "${clientToDelete.name}" sera définitivement supprimé, y compris l'historique complet de ses transactions.`}
              </p>
            </div>

            <div className="flex gap-3 text-sm">
              <button
                type="button"
                onClick={() => {
                  onDeleteClient(clientToDelete.id);
                  if (selectedClient && selectedClient.id === clientToDelete.id) {
                    setSelectedClient(null);
                  }
                  setClientToDelete(null);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold font-sans transition-all"
              >
                {isRtl ? 'حذف الزبون' : 'Supprimer'}
              </button>
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-205 text-gray-800 rounded-xl font-bold transition-all"
              >
                {isRtl ? 'إلغاء' : 'Annuler'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
