import React from 'react';
import { 
  User, 
  Client, 
  Product, 
  Invoice, 
  StockMovement, 
  UserRole,
  SystemActivity,
  Note
} from './types';
import { api } from './api';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { 
  initialUsers, 
  initialClients, 
  initialProducts, 
  initialInvoices, 
  initialStockMovements,
  initialActivities
} from './initialData';
import { translations, arabicDashboardLabels, resolveUserName } from './translations';

// Components
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PosCaisse from './components/PosCaisse';
import ProductsList from './components/ProductsList';
import ClientsList from './components/ClientsList';
import StocksManager from './components/StocksManager';
import UsersManager from './components/UsersManager';
import Settings from './components/Settings';
import PrintInvoiceModal from './components/PrintInvoiceModal';
import Account from './components/Account';
import InvoicesList from './components/InvoicesList';
import DebtsList from './components/DebtsList';
import ActivitiesLog from './components/ActivitiesLog';
import NotesList from './components/NotesList';

import { Key, Building, Sparkles, Search, Package, Users, FileText, X, Menu, Eye, EyeOff, Bell, AlertCircle } from 'lucide-react';

interface SyncItem {
  id: string;
  entity: 'products' | 'clients' | 'invoices' | 'movements' | 'activities' | 'users';
  action: 'create' | 'update' | 'delete';
  payload: any;
  timestamp: number;
}

export default function App() {
  // Locale state: Defaulting to Arabic as requested in the prompt
  const [lang, setLang] = React.useState<'fr' | 'ar'>('ar');
  const isRtl = lang === 'ar';
  
  // Tab controller
  const [activeTab, setActiveTab ] = React.useState<string>('activities');

  // Mobile responsive sidebar drawer open status
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  
  // Collapse / hide the entire side menu
  const [isMenuHidden, setIsMenuHidden] = React.useState(false);

  // Core CRM Tables database state
  const [users, setUsers] = React.useState<User[]>([]);
  const [currentUser, setCurrentUser] = React.useState<User | null>({
    id: 'admin',
    name: 'Admin',
    username: 'admin',
    password: '',
    role: 'admin',
    active: true,
    email: 'boutique2@lambarki.com'
  });
  const [showPassword, setShowPassword] = React.useState(false);
  const [clients, setClients] = React.useState<Client[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [stockMovements, setStockMovements] = React.useState<StockMovement[]>([]);
  const [activities, setActivities] = React.useState<SystemActivity[]>([]);
  const [notes, setNotes] = React.useState<Note[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('app_notes') || '[]');
    } catch (e) {
      return [];
    }
  });

  React.useEffect(() => {
    localStorage.setItem('app_notes', JSON.stringify(notes));
  }, [notes]);

  // Simulation Login screen helper states
  const [loginUsername, setLoginUsername] = React.useState('');
  const [loginPassword, setLoginPassword] = React.useState('');
  const [loginError, setLoginError] = React.useState('');

  // Floating printable invoice selection
  const [previewedInvoice, setPreviewedInvoice] = React.useState<Invoice | null>(null);

  // Custom low stock selection state filter
  const [showLowStockOnly, setShowLowStockOnly] = React.useState(false);

  // Global search and preset routing filters matching modern template spec perfectly
  const [globalSearchQuery, setGlobalSearchQuery] = React.useState('');
  const [showGlobalResults, setShowGlobalResults] = React.useState(false);
  const [prefilledProductSearch, setPrefilledProductSearch] = React.useState('');
  const [prefilledClientSearch, setPrefilledClientSearch] = React.useState('');
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [systemAlerts, setSystemAlerts] = React.useState<{ id: string; type: string; message: string; timestamp: number }[]>([]);

  // Online status state
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  
  // Sync queue state
  const [syncQueue, setSyncQueue] = React.useState<SyncItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('sync_queue') || '[]');
    } catch (e) {
      return [];
    }
  });

  const [isSyncing, setIsSyncing] = React.useState(false);

  // Sync execution helper
  const executeSyncItem = async (item: SyncItem) => {
    const { entity, action, payload } = item;
    switch (action) {
      case 'create':
        await api[entity].create(payload);
        break;
      case 'update':
        if (payload.id && payload.data) {
          await api[entity].update(payload.id, payload.data);
        } else if (payload.id) {
          await api[entity].update(payload.id, payload);
        } else {
          throw new Error('Update payload requires an ID');
        }
        break;
      case 'delete':
        await api[entity].delete(payload);
        break;
    }
  };

  // Sync queue runner
  const processSyncQueue = async (currentQueue?: SyncItem[]) => {
    const queueToProcess = currentQueue || syncQueue;
    if (queueToProcess.length === 0 || isSyncing || !navigator.onLine) return;

    setIsSyncing(true);
    const updatedQueue = [...queueToProcess];

    try {
      while (updatedQueue.length > 0) {
        const item = updatedQueue[0];
        try {
          await executeSyncItem(item);
          // Successfully synced, remove from queue
          updatedQueue.shift();
          setSyncQueue([...updatedQueue]);
          localStorage.setItem('sync_queue', JSON.stringify(updatedQueue));
        } catch (err: any) {
          console.error(`Failed to sync item ${item.id}:`, err);
          // If it's a network error, stop processing. If it's another error, skip it to avoid blocking the queue
          const isNetworkError = !err.status || err.message?.includes('fetch') || err.message?.includes('Network');
          if (isNetworkError) {
            break;
          } else {
            if (err.message?.includes('Conflict') || err.status === 409) {
              alert(
                lang === 'ar'
                  ? '⚠️ تم تعديل هذه البيانات للتو من طرف مستخدم آخر. سيتم إعادة تحميل الصفحة وعرض التعديلات الأحدث تجنباً لضياع البيانات.'
                  : '⚠️ Ces données viennent d\'être modifiées par un autre utilisateur. La page sera actualisée pour éviter toute perte de données.'
              );
              window.location.reload();
              break;
            }
            updatedQueue.shift();
            setSyncQueue([...updatedQueue]);
            localStorage.setItem('sync_queue', JSON.stringify(updatedQueue));
          }
        }
      }
      
      // Refresh all data from API after successful sync
      if (updatedQueue.length === 0) {
        const [loadedUsers, loadedClients, loadedProducts, loadedInvoices, loadedMovements, loadedActivities] = await Promise.all([
          api.users.getAll(),
          api.clients.getAll(),
          api.products.getAll(),
          api.invoices.getAll(),
          api.movements.getAll(),
          api.activities.getAll(),
        ]);
        setUsers(loadedUsers);
        setClients(loadedClients);
        setProducts(loadedProducts);
        setInvoices(loadedInvoices);
        setStockMovements(loadedMovements);
        setActivities(loadedActivities);
        
        localStorage.setItem('cached_users', JSON.stringify(loadedUsers));
        localStorage.setItem('cached_clients', JSON.stringify(loadedClients));
        localStorage.setItem('cached_products', JSON.stringify(loadedProducts));
        localStorage.setItem('cached_invoices', JSON.stringify(loadedInvoices));
        localStorage.setItem('cached_movements', JSON.stringify(loadedMovements));
        localStorage.setItem('cached_activities', JSON.stringify(loadedActivities));
      }
    } catch (e) {
      console.error('Error during database sync:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Enqueue a sync action
  const enqueueSync = async (
    entity: 'products' | 'clients' | 'invoices' | 'movements' | 'activities' | 'users',
    action: 'create' | 'update' | 'delete',
    payload: any
  ) => {
    const newItem: SyncItem = {
      id: `sync-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      entity,
      action,
      payload,
      timestamp: Date.now()
    };

    const newQueue = [...syncQueue, newItem];
    setSyncQueue(newQueue);
    localStorage.setItem('sync_queue', JSON.stringify(newQueue));

    // Try to process immediately if online
    if (navigator.onLine && !isSyncing) {
      processSyncQueue(newQueue);
    }
  };

  // Watch network status
  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle Capacitor App exit confirmation
  React.useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const backListener = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          const confirmMessage = lang === 'ar' ? 'هل أنت متأكد أنك تريد الخروج من التطبيق؟' : 'Voulez-vous vraiment quitter l\'application ?';
          if (window.confirm(confirmMessage)) {
            CapacitorApp.exitApp();
          }
        } else {
          window.history.back();
        }
      });

      return () => {
        backListener.then(listener => listener.remove());
      };
    }
  }, [lang]);

  // Trigger sync when coming online
  React.useEffect(() => {
    if (isOnline && !isSyncing && syncQueue.length > 0) {
      processSyncQueue();
    }
    // We intentionally omit processSyncQueue from dependencies to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // Load all data with caching
  React.useEffect(() => {
    const loadAll = async () => {
      try {
        const [loadedUsers, loadedClients, loadedProducts, loadedInvoices, loadedMovements, loadedActivities] = await Promise.all([
          api.users.getAll(),
          api.clients.getAll(),
          api.products.getAll(),
          api.invoices.getAll(),
          api.movements.getAll(),
          api.activities.getAll(),
        ]);

        setUsers(loadedUsers);
        setClients(loadedClients);
        setProducts(loadedProducts);
        setInvoices(loadedInvoices);
        setStockMovements(loadedMovements);
        setActivities(loadedActivities);

        localStorage.setItem('cached_users', JSON.stringify(loadedUsers));
        localStorage.setItem('cached_clients', JSON.stringify(loadedClients));
        localStorage.setItem('cached_products', JSON.stringify(loadedProducts));
        localStorage.setItem('cached_invoices', JSON.stringify(loadedInvoices));
        localStorage.setItem('cached_movements', JSON.stringify(loadedMovements));
        localStorage.setItem('cached_activities', JSON.stringify(loadedActivities));

        const savedUser = localStorage.getItem('dolibarr_current_user');
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            const matched = loadedUsers.find((u: User) => u.id === parsedUser.id);
            const resolvedUser = matched || parsedUser;
            setCurrentUser(resolvedUser);
            setActiveTab(resolvedUser.role === 'cashier' ? 'pos' : 'dashboard');
          } catch(e) { console.error(e); }
        }
      } catch (err) {
        console.error('❌ Failed to load data from API, loading local cache:', err);
        const cachedUsers = JSON.parse(localStorage.getItem('cached_users') || '[]');
        const cachedClients = JSON.parse(localStorage.getItem('cached_clients') || '[]');
        const cachedProducts = JSON.parse(localStorage.getItem('cached_products') || '[]');
        const cachedInvoices = JSON.parse(localStorage.getItem('cached_invoices') || '[]');
        const cachedMovements = JSON.parse(localStorage.getItem('cached_movements') || '[]');
        const cachedActivities = JSON.parse(localStorage.getItem('cached_activities') || '[]');

        setUsers(cachedUsers);
        setClients(cachedClients);
        setProducts(cachedProducts);
        setInvoices(cachedInvoices);
        setStockMovements(cachedMovements);
        setActivities(cachedActivities);

        const savedUser = localStorage.getItem('dolibarr_current_user');
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            const matched = cachedUsers.find((u: User) => u.id === parsedUser.id);
            const resolvedUser = matched || parsedUser;
            setCurrentUser(resolvedUser);
            setActiveTab(resolvedUser.role === 'cashier' ? 'pos' : 'dashboard');
          } catch(e) { console.error(e); }
        }
      }
    };
    loadAll();

    if (Capacitor.isNativePlatform()) {
      CapacitorUpdater.notifyAppReady().catch(console.error);
    }
  }, []);

  const logActivity = (
    type: 'sale' | 'product_add' | 'product_edit' | 'product_delete' | 'client_add' | 'client_edit' | 'client_delete' | 'stock_edit' | 'withdraw_add' | 'withdraw_edit' | 'withdraw_delete' | 'invoice_edit' | 'invoice_delete',
    descriptionAr: string,
    descriptionFr: string,
    targetId: string
  ) => {
    const newAct: SystemActivity = {
      id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type,
      date: new Date().toISOString(),
      operator: currentUser?.name || 'النظام',
      descriptionAr,
      descriptionFr,
      targetId
    };
    enqueueSync('activities', 'create', newAct);
    setActivities(prev => [newAct, ...prev].slice(0, 50));
  };

  // Login handler
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const inputName = loginUsername.trim().toLowerCase();
    if (!inputName) return;

    // Search by username or email
    const op = users.find(u => 
      (u.username.toLowerCase() === inputName || u.email.toLowerCase() === inputName) && 
      u.active
    );

    if (op) {
      const userPassword = op.password || '';
      if (userPassword && loginPassword !== userPassword) {
        setLoginError(lang === 'ar' 
          ? '❌ كلمة المرور التي أدخلتها غير صحيحة! يرجى مراجعة الحساب والمحاولة مجدداً.' 
          : '❌ Mot de passe incorrect. Veuillez vérifier vos identifiants et réessayer.'
        );
        return;
      }
      
      setCurrentUser(op);
      localStorage.setItem('dolibarr_current_user', JSON.stringify(op));
      // Sync updated user from DB in case data changed
      api.users.getAll().then(u => setUsers(u)).catch(console.error);
      setLoginUsername('');
      setLoginPassword('');
      if (op.role === 'cashier') {
        setActiveTab('pos');
      } else {
        setActiveTab('dashboard');
      }
    } else {
      setLoginError(lang === 'ar' 
        ? '⚠️ اسم المستخدم أو البريد الإلكتروني غير مسجل في النظام!' 
        : '⚠️ Identifiant ou email inconnu.'
      );
    }
  };

  // Sign out
  const handleLogout = () => {
    const confirmMessage = lang === 'ar' ? 'هل أنت متأكد أنك تريد الخروج من التطبيق؟' : 'Êtes-vous sûr de vouloir vous déconnecter ?';
    if (window.confirm(confirmMessage)) {
      setCurrentUser(null);
      localStorage.removeItem('dolibarr_current_user');
    }
  };



  // CRM Action: New checkout processed
  const handleNewSale = (newInvoice: Invoice, updatedProds: Product[], updatedClis: Client[]) => {
    // 1. Save invoice to DB
    enqueueSync('invoices', 'create', newInvoice);
    setInvoices(prev => [...prev, newInvoice]);

    // 2. Update products stock in DB
    updatedProds.forEach(p => enqueueSync('products', 'update', p));
    setProducts(updatedProds);

    // 3. Update clients in DB
    updatedClis.forEach(c => enqueueSync('clients', 'update', c));
    setClients(updatedClis);

    // 4. Record stock movements out
    const extraMovements: StockMovement[] = newInvoice.items.map((item, idx) => ({
      id: `mov-sale-${Date.now()}-${idx}`,
      productId: item.productId,
      productName: item.name,
      type: 'out' as const,
      qty: item.qty,
      date: new Date().toISOString(),
      reason: `Vente POS (${newInvoice.invoiceNumber})`,
      operator: currentUser?.name || 'Caisse',
      batchId: `sale-${newInvoice.id || Date.now()}`
    }));
    extraMovements.forEach(m => enqueueSync('movements', 'create', m));
    setStockMovements(prev => [...prev, ...extraMovements]);

    logActivity(
      'sale',
      `إصدار فاتورة مبيعات جديدة بقيمة ${newInvoice.total.toFixed(2)} للزبون "${newInvoice.clientName}"`,
      `Création d'une nouvelle facture de ${newInvoice.total.toFixed(2)} pour le client "${newInvoice.clientName}"`,
      newInvoice.invoiceNumber
    );
  };

  // Warehouse Action: Manual stock update
  const handleUpdateStock = (productId: string, newQty: number, movement: StockMovement) => {
    setProducts(prev => {
      const updated = prev.map(p => p.id === productId ? { ...p, stock: newQty } : p);
      const changed = updated.find(p => p.id === productId);
      if (changed) enqueueSync('products', 'update', changed);
      return updated;
    });
    enqueueSync('movements', 'create', movement);
    setStockMovements(prev => [...prev, movement]);

    logActivity(
      'stock_edit',
      `تغيير مخزون المنتج "${movement.productName}" بمقدار ${movement.type === 'in' ? '+' : '-'}${movement.qty} (السبب: ${movement.reason})`,
      `Changement du stock pour "${movement.productName}" de ${movement.type === 'in' ? '+' : '-'}${movement.qty} (Raison: ${movement.reason})`,
      productId
    );
  };

  const handleUpdateStocksBulk = (updates: { productId: string; newQty: number; movement: StockMovement }[]) => {
    setProducts(prev => {
      const updatedProducts = prev.map(p => {
        const match = updates.find(u => u.productId === p.id);
        return match ? { ...p, stock: match.newQty } : p;
      });
      updates.forEach(u => {
        const changed = updatedProducts.find(p => p.id === u.productId);
        if (changed) enqueueSync('products', 'update', changed);
      });
      return updatedProducts;
    });
    updates.forEach(u => enqueueSync('movements', 'create', u.movement));
    setStockMovements(prev => [...prev, ...updates.map(u => u.movement)]);

    logActivity(
      'stock_edit',
      `تعديل جماعي للمخزون لعدد ${updates.length} منتجات`,
      `Ajustement de stock groupé pour ${updates.length} produits`,
      'bulk'
    );
  };

  // Delete a stock movement and update local state + enqueue sync
  const handleDeleteMovement = (id: string) => {
    try {
      const targetMov = stockMovements.find(m => m.id === id);
      enqueueSync('movements', 'delete', id);
      
      // Update local movements list
      setStockMovements(prev => prev.filter(m => m.id !== id));
      
      // Adjust local product stock immediately
      if (targetMov) {
        const diff = targetMov.type === 'in' ? -targetMov.qty : targetMov.qty;
        setProducts(prev => prev.map(p => p.id === targetMov.productId ? { ...p, stock: p.stock + diff } : p));
        
        logActivity(
          'product_delete',
          `حذف حركة مخزون للمنتج "${targetMov.productName}" بقيمة ${targetMov.qty} (تاريخ الحركة: ${new Date(targetMov.date).toLocaleDateString()})`,
          `Suppression d'un mouvement de stock pour "${targetMov.productName}" de ${targetMov.qty} (Date: ${new Date(targetMov.date).toLocaleDateString()})`,
          targetMov.productId
        );
      }
    } catch (err) {
      console.error('Failed to delete movement:', err);
    }
  };

  // Edit a stock movement and update local state + enqueue sync
  const handleEditMovement = (id: string, qty: number, reason: string) => {
    try {
      const targetMov = stockMovements.find(m => m.id === id);
      enqueueSync('movements', 'update', { id, data: { qty, reason } });
      
      if (targetMov) {
        const oldQty = targetMov.qty;
        const newQty = qty;
        let diff = 0;
        if (targetMov.type === 'in') {
          diff = newQty - oldQty;
        } else {
          diff = oldQty - newQty;
        }
        setProducts(prev => prev.map(p => p.id === targetMov.productId ? { ...p, stock: p.stock + diff } : p));
        setStockMovements(prev => prev.map(m => m.id === id ? { ...m, qty, reason } : m));

        logActivity(
          'product_edit',
          `تعديل كمية حركة مخزون للمنتج "${targetMov.productName}" من ${targetMov.qty} إلى ${qty}`,
          `Modification de la quantité du mouvement pour "${targetMov.productName}" de ${targetMov.qty} à ${qty}`,
          targetMov.productId
        );
      }
    } catch (err) {
      console.error('Failed to edit movement:', err);
    }
  };

  // Delete an activity log
  const handleDeleteActivity = (id: string) => {
    enqueueSync('activities', 'delete', id);
    setActivities(prev => prev.filter(a => a.id !== id));
  };

  // Edit an activity log
  const handleEditActivity = (id: string, descriptionAr: string, descriptionFr: string) => {
    enqueueSync('activities', 'update', { id, data: { descriptionAr, descriptionFr } });
    setActivities(prev => prev.map(a => a.id === id ? { ...a, descriptionAr, descriptionFr } : a));
  };

  // Products CRUD actions
  const handleAddProduct = (p: Product) => {
    enqueueSync('products', 'create', p);
    setProducts(prev => [...prev, p]);
    logActivity(
      'product_add',
      `إضافة منتج جديد: "${p.name}" في صنف ${p.category} بسعر بيع ${p.sellPrice} `,
      `Ajout d'un nouveau produit: "${p.name}" dans la catégorie ${p.category} au prix de ${p.sellPrice} `,
      p.id
    );
  };

  const handleEditProduct = (p: Product) => {
    const oldProd = products.find(item => item.id === p.id);
    if (oldProd && (oldProd.sellPrice !== p.sellPrice || oldProd.buyPrice !== p.buyPrice)) {
      const msg = lang === 'ar' 
        ? `تم تعديل ثمن المنتج "${p.name}"`
        : `Prix modifié pour "${p.name}"`;

      setSystemAlerts(prev => [...prev, { id: `price-${Date.now()}`, type: 'price', message: msg, timestamp: Date.now() }]);

      if ("Notification" in window) {
        if (Notification.permission === 'granted') {
          new Notification(lang === 'ar' ? 'تنبيه: تعديل ثمن' : 'Alerte: Modif prix', { body: msg });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification(lang === 'ar' ? 'تنبيه: تعديل ثمن' : 'Alerte: Modif prix', { body: msg });
            }
          });
        }
      }
    }

    enqueueSync('products', 'update', p);
    setProducts(prev => prev.map(item => item.id === p.id ? p : item));
    logActivity(
      'product_edit',
      `تعديل معلومات المنتج: "${p.name}" (الرمز: ${p.sku})`,
      `Modification des informations du produit: "${p.name}" (SKU: ${p.sku})`,
      p.id
    );
  };

  const handleDeleteProduct = (id: string) => {
    const deletedProd = products.find(p => p.id === id);
    enqueueSync('products', 'delete', id);
    setProducts(prev => prev.filter(p => p.id !== id));
    logActivity(
      'product_delete',
      `حذف المنتج: "${deletedProd ? deletedProd.name : id}"`,
      `Suppression du produit: "${deletedProd ? deletedProd.name : id}"`,
      id
    );
  };

  const handleRenameCategory = (oldName: string, newName: string) => {
    const updated = products.map(item => item.category === oldName ? { ...item, category: newName } : item);
    updated.filter(p => p.category === newName).forEach(p => enqueueSync('products', 'update', p));
    setProducts(updated);
  };

  const handleDeleteCategory = (categoryName: string) => {
    const defaultCat = lang === 'ar' ? 'عام' : 'Général';
    const updated = products.map(item => item.category === categoryName ? { ...item, category: defaultCat } : item);
    updated.filter(p => p.category === defaultCat).forEach(p => enqueueSync('products', 'update', p));
    setProducts(updated);
  };

  // Clients CRUD actions
  const handleAddClient = (c: Client) => {
    enqueueSync('clients', 'create', c);
    setClients(prev => [...prev, c]);
    logActivity(
      'client_add',
      `إضافة زبون جديد: "${c.name}" (${c.phone})`,
      `Ajout d'un nouveau client: "${c.name}" (${c.phone})`,
      c.id
    );
  };

  const handleEditClient = (c: Client) => {
    enqueueSync('clients', 'update', c);
    setClients(prev => prev.map(item => item.id === c.id ? c : item));
    logActivity(
      'client_edit',
      `تعديل معلومات الزبون: "${c.name}"`,
      `Modification des informations du client: "${c.name}"`,
      c.id
    );
  };

  const handleDeleteClient = (id: string) => {
    const deletedCli = clients.find(c => c.id === id);
    enqueueSync('clients', 'delete', id);
    setClients(prev => prev.filter(c => c.id !== id));
    logActivity(
      'client_delete',
      `حذف الزبون: "${deletedCli ? deletedCli.name : id}"`,
      `Suppression du client: "${deletedCli ? deletedCli.name : id}"`,
      id
    );
  };

  // Invoices & Sales modifications (Edit and Delete)
  const handleDeleteInvoice = (id: string, restoreStock: boolean = true) => {
    const deletedInv = invoices.find(inv => inv.id === id);
    if (!deletedInv) return;

    enqueueSync('invoices', 'delete', id);
    setInvoices(prev => prev.filter(inv => inv.id !== id));

    if (restoreStock && deletedInv.items && deletedInv.items.length > 0) {
      const updatedProducts = products.map(p => {
        const itemInSale = deletedInv.items.find(item => item.productId === p.id);
        return itemInSale ? { ...p, stock: p.stock + itemInSale.qty } : p;
      });
      updatedProducts.forEach(p => enqueueSync('products', 'update', p));
      setProducts(updatedProducts);

      const newMovements: StockMovement[] = deletedInv.items.map((item, idx) => ({
        id: `mov-refund-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
        productId: item.productId,
        productName: item.name,
        type: 'in' as const,
        qty: item.qty,
        date: new Date().toISOString(),
        reason: `Annulation Vente (${deletedInv.invoiceNumber})`,
        operator: currentUser?.name || 'Admin',
        batchId: `refund-${deletedInv.id}`
      }));
      newMovements.forEach(m => enqueueSync('movements', 'create', m));
      setStockMovements(prev => [...prev, ...newMovements]);
    }

    logActivity(
      'invoice_delete',
      `إلغاء وحذف الفاتورة رقم ${deletedInv.invoiceNumber} للزبون "${deletedInv.clientName}"`,
      `Annulation et suppression de la facture n° ${deletedInv.invoiceNumber} pour le client "${deletedInv.clientName}"`,
      id
    );
  };

  const handleEditInvoice = (updatedInvoice: Invoice, previousInvoice: Invoice, shouldAdjustStock: boolean = true) => {
    enqueueSync('invoices', 'update', updatedInvoice);
    setInvoices(prev => prev.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));

    if (shouldAdjustStock) {
      const stockAdjustments: { [prodId: string]: { previous: number, current: number, name: string } } = {};
      previousInvoice.items.forEach(item => {
        if (!stockAdjustments[item.productId]) stockAdjustments[item.productId] = { previous: 0, current: 0, name: item.name };
        stockAdjustments[item.productId].previous += item.qty;
      });
      updatedInvoice.items.forEach(item => {
        if (!stockAdjustments[item.productId]) stockAdjustments[item.productId] = { previous: 0, current: 0, name: item.name };
        stockAdjustments[item.productId].current += item.qty;
      });

      const newMovements: StockMovement[] = [];
      const updatedProducts = products.map(p => {
        const adj = stockAdjustments[p.id];
        if (adj) {
          const diff = adj.previous - adj.current;
          if (diff !== 0) {
            newMovements.push({
              id: `mov-edit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              productId: p.id, productName: p.name,
              type: diff > 0 ? 'in' : 'out',
              qty: Math.abs(diff),
              date: new Date().toISOString(),
              reason: `Correction Qte Facture (${updatedInvoice.invoiceNumber})`,
              operator: currentUser?.name || 'Admin',
              batchId: `edit-${updatedInvoice.id}`
            });
            return { ...p, stock: p.stock + diff };
          }
        }
        return p;
      });
      if (newMovements.length > 0) {
        updatedProducts.forEach(p => enqueueSync('products', 'update', p));
        newMovements.forEach(m => enqueueSync('movements', 'create', m));
        setProducts(updatedProducts);
        setStockMovements(prev => [...prev, ...newMovements]);
      }
    }

    if (updatedInvoice.clientId) {
      setClients(prevClients => {
        const updated = prevClients.map(c => {
          if (c.id === updatedInvoice.clientId) {
            const totalSpentDiff = updatedInvoice.total - previousInvoice.total;
            const debtDiff = (updatedInvoice.amountDue || 0) - (previousInvoice.amountDue || 0);
            const updatedPurchases = c.purchases.map(p =>
              p.invoiceId === updatedInvoice.invoiceNumber ? { ...p, total: updatedInvoice.total } : p
            );
            const updatedClient = {
              ...c,
              totalSpent: Math.max(0, c.totalSpent + totalSpentDiff),
              outstandingDebt: Math.max(0, (c.outstandingDebt || 0) + debtDiff),
              purchases: updatedPurchases
            };
            enqueueSync('clients', 'update', updatedClient);
            return updatedClient;
          }
          return c;
        });
        return updated;
      });
    }

    logActivity(
      'invoice_edit',
      `تعديل الفاتورة رقم ${updatedInvoice.invoiceNumber} للزبون "${updatedInvoice.clientName}" - المجموع الحالي: ${updatedInvoice.total.toFixed(2)} `,
      `Modification de la facture n° ${updatedInvoice.invoiceNumber} pour le client "${updatedInvoice.clientName}" - Nouveau Total: ${updatedInvoice.total.toFixed(2)} `,
      updatedInvoice.id
    );
  };

  // Users CRM actions
  const handleAddUser = (u: User) => {
    enqueueSync('users', 'create', u);
    setUsers(prev => [...prev, u]);
  };

  const handleSwitchUser = (u: User) => {
    setCurrentUser(u);
    localStorage.setItem('dolibarr_current_user', JSON.stringify(u));
  };

  const handleDeleteUser = (id: string) => {
    enqueueSync('users', 'delete', id);
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const updateLocalStorage = (key: string, value: any) => {
    localStorage.setItem(key, JSON.stringify(value));
  };

  // Backup: Exports full catalog to JSON download file
  const handleBackupExport = () => {
    const payload = {
      dbVersion: "1.0",
      exportTime: new Date().toISOString(),
      products,
      clients,
      invoices,
      stockMovements,
      users
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `dolibarr_backup_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchorElem.click();
  };

  // Backup: Overwrites app state with uploaded JSON parsed structure
  const handleBackupImport = (jsonData: string): boolean => {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed.products && parsed.clients && parsed.invoices) {
        setProducts(parsed.products);
        updateLocalStorage('dolibarr_products', parsed.products);

        setClients(parsed.clients);
        updateLocalStorage('dolibarr_clients', parsed.clients);

        setInvoices(parsed.invoices);
        updateLocalStorage('dolibarr_invoices', parsed.invoices);

        if (parsed.stockMovements) {
          setStockMovements(parsed.stockMovements);
          updateLocalStorage('dolibarr_movements', parsed.stockMovements);
        }

        if (parsed.users) {
          setUsers(parsed.users);
          updateLocalStorage('dolibarr_users', parsed.users);
        }
        return true;
      }
      return false;
    } catch(e) {
      console.error(e);
      return false;
    }
  };

  // Backup: Reset fully back to initial start state
  const handleResetDatabase = () => {
    localStorage.clear();
    setProducts(initialProducts);
    setClients(initialClients);
    setInvoices(initialInvoices);
    setStockMovements(initialStockMovements);
    setUsers(initialUsers);
    setCurrentUser(initialUsers[0]);
    localStorage.setItem('dolibarr_users', JSON.stringify(initialUsers));
    localStorage.setItem('dolibarr_current_user', JSON.stringify(initialUsers[0]));
    localStorage.setItem('dolibarr_clients', JSON.stringify(initialClients));
    localStorage.setItem('dolibarr_products', JSON.stringify(initialProducts));
    localStorage.setItem('dolibarr_invoices', JSON.stringify(initialInvoices));
    localStorage.setItem('dolibarr_movements', JSON.stringify(initialStockMovements));
    setActiveTab('dashboard');
  };

  // Reset cash drawer ledger completely (tassfir al-sunduq)
  const handleResetCashDrawer = () => {
    localStorage.setItem('dolibarr_withdrawals', JSON.stringify([]));
    localStorage.setItem('dolibarr_adj_cash_income', '0');
    localStorage.setItem('dolibarr_adj_withdrawals', '0');
    localStorage.setItem('dolibarr_adj_drawer_balance', '0');

    logActivity(
      'withdraw_delete',
      'تصفير حساب الصندوق: تم تصفير جميع أرصدة الصندوق وسجل السحوبات والتسويات بالكامل',
      'Réinitialisation de la caisse : Tous les soldes de caisse, retraits et ajustements ont été réinitialisés',
      'cash-drawer-reset'
    );

    alert(lang === 'ar'
      ? 'تم تصفير حسابات الصندوق والعمليات النقدية بنجاح! لم تتأثر السلع أو العملاء أو الفواتير.'
      : 'Les comptes de caisse et les opérations en espèces ont été réinitialisés avec succès ! Les produits, clients et factures n\'ont pas été affectés.'
    );
    
    setActiveTab('dashboard');
  };

  // Rendering screen routing based on actual Operator Privileges
  const renderTabContent = () => {
    if (!currentUser) return null;

    switch(activeTab) {
      case 'products':
        return (
          <ProductsList
            products={products}
            lang={lang}
            onAddProduct={handleAddProduct}
            onEditProduct={handleEditProduct}
            onDeleteProduct={handleDeleteProduct}
            showLowStockOnly={showLowStockOnly}
            setShowLowStockOnly={setShowLowStockOnly}
            prefilledSearch={prefilledProductSearch}
            onRenameCategory={handleRenameCategory}
            onDeleteCategory={handleDeleteCategory}
            currentUser={currentUser}
          />
        );
      case 'clients':
        return (
          <ClientsList
            clients={clients}
            lang={lang}
            onAddClient={handleAddClient}
            onEditClient={handleEditClient}
            onDeleteClient={handleDeleteClient}
            prefilledSearch={prefilledClientSearch}
            currentUser={currentUser}
          />
        );
      case 'debts':
        return (
          <DebtsList
            clients={clients}
            lang={lang}
            onAddClient={handleAddClient}
            onEditClient={handleEditClient}
            onDeleteClient={handleDeleteClient}
            currentUser={currentUser}
          />
        );
      case 'notes':
        return (
          <NotesList
            notes={notes}
            lang={lang}
            onAddNote={(note) => setNotes([...notes, note])}
            onUpdateNote={(note) => setNotes(notes.map(n => n.id === note.id ? note : n))}
            onDeleteNote={(id) => setNotes(notes.filter(n => n.id !== id))}
          />
        );
      case 'settings':
        return (
          <Settings
            lang={lang}
            onBackupExport={handleBackupExport}
            onBackupImport={handleBackupImport}
            onResetDatabase={handleResetDatabase}
            onResetCashDrawer={handleResetCashDrawer}
          />
        );
      case 'activities':
        return (
          <ActivitiesLog
            activities={activities}
            clients={clients}
            products={products}
            lang={lang}
            currentUser={currentUser}
          />
        );
      default:
        return null;
    }
  };

  // SECURITY PROTOCOL: Authenticate view if logged out completely
  if (!currentUser) {
    const tLabelLogin = arabicDashboardLabels[lang];
    return (
      <div 
        className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Decorative Floating Blobs */}
        <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-12 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 transform -translate-x-12 translate-y-12 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top Right Language Switcher */}
        <div className="absolute top-6 right-6 z-25">
          <button
            type="button"
            onClick={() => setLang(lang === 'ar' ? 'fr' : 'ar')}
            className="bg-slate-900/80 backdrop-blur border border-slate-800 text-slate-300 hover:text-white px-3.5 py-1.5 rounded-xl text-xxs font-extrabold cursor-pointer transition flex items-center gap-1.5 shadow-sm"
          >
            <span>🌐</span>
            <span>{lang === 'ar' ? 'Français' : 'العربية'}</span>
          </button>
        </div>

        <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-[0_0_50px_-12px_rgba(59,130,246,0.12)] space-y-8 z-10">
          
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20">
              <Building className="w-8 h-8 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">{tLabelLogin.loginTitle}</h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{tLabelLogin.loginSubtitle}</p>
            </div>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                {isRtl ? 'اسم الولوج أو البريد الإلكتروني الخاص بالموظف *' : "Nom d'utilisateur ou Email Professionnel *"}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                  <Users className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => {
                    setLoginUsername(e.target.value);
                    setLoginError('');
                  }}
                  placeholder={isRtl ? 'أدخل اسم الحساب أو البريد الإلكتروني' : 'Identifiant ou Email'}
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl pl-10 pr-4 py-3 text-xs font-mono text-white outline-none transition-all placeholder-slate-650 font-bold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                {isRtl ? 'كلمة السر الخاصة بالحساب *' : 'Mot de passe sécurisé *'}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                  <Key className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    setLoginError('');
                  }}
                  placeholder={isRtl ? 'أدخل كلمة مرور الحساب' : 'Saisir le mot de passe'}
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl pl-10 pr-10 py-3 text-xs font-mono text-white outline-none transition-all placeholder-slate-650"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <p className="text-xxs text-rose-400 font-semibold bg-rose-950/20 p-3 rounded-xl border border-rose-950/40 leading-normal">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all duration-200 shadow-lg shadow-blue-500/15 flex items-center justify-center gap-2 transform active:scale-[0.98] cursor-pointer"
            >
              <span>{isRtl ? 'تحقق وولوج للوحة المراقبة' : 'Entrée Sécurisée'}</span>
            </button>

          </form>
        </div>
      </div>
    );
  }



  // STANDARD LOGGED VIEW IN THE MAIN WORKSPACE
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getRoleLabel = (role: UserRole) => {
    const roles = {
      admin: { fr: 'Administrateur', ar: 'المدير العام' },
      cashier: { fr: 'Caisse / POS', ar: 'مسؤول الصندوق' },
      stock_manager: { fr: 'Gestionnaire Stock', ar: 'أمين المستودع' }
    };
    return roles[role]?.[lang] || role;
  };

  // 1-day urgency alert generator for debts and checks
  const alerts = React.useMemo(() => {
    const list: { id: string; type: 'check' | 'debt'; message: string; daysLeft: number; clientName: string }[] = [];
    const today = new Date();
    today.setHours(0,0,0,0);

    clients.forEach(c => {
      // 1. Debt alert
      if (c.outstandingDebt && c.outstandingDebt > 0 && c.debtDueDate) {
        const dueDate = new Date(c.debtDueDate);
        dueDate.setHours(0,0,0,0);
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 1) {
          list.push({
            id: `debt-${c.id}`,
            type: 'debt',
            clientName: c.name,
            daysLeft: diffDays,
            message: lang === 'ar' 
              ? `دين مستحق على الزبون ${c.name} بقيمة ${c.outstandingDebt} (${diffDays < 0 ? 'متأخر' : diffDays === 0 ? 'اليوم' : 'غداً'})`
              : `Dette due pour ${c.name} de ${c.outstandingDebt} (${diffDays < 0 ? 'En retard' : diffDays === 0 ? 'Aujourd\'hui' : 'Demain'})`
          });
        }
      }

      // 2. Postal check alert
      if (c.postalChecks && c.postalChecks.length > 0) {
        c.postalChecks.forEach(ch => {
          if (ch.expiryDate) {
            const expiryDate = new Date(ch.expiryDate);
            expiryDate.setHours(0,0,0,0);
            const diffTime = expiryDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays <= 1) {
              list.push({
                id: `check-${ch.id}`,
                type: 'check',
                clientName: c.name,
                daysLeft: diffDays,
                message: lang === 'ar'
                  ? `شيك بريدي للزبون ${c.name} بقيمة ${ch.amount} DH يستحق (${diffDays < 0 ? 'متأخر' : diffDays === 0 ? 'اليوم' : 'غداً'})`
                  : `Chèque pour ${c.name} de ${ch.amount} DH expire (${diffDays < 0 ? 'En retard' : diffDays === 0 ? 'Aujourd\'hui' : 'Demain'})`
              });
            }
          }
        });
      }
    });

    systemAlerts.forEach(sa => {
      list.push({
        id: sa.id,
        type: sa.type as any,
        clientName: '',
        daysLeft: 0,
        message: sa.message
      });
    });

    return list;
  }, [clients, lang, systemAlerts]);

  // Synchronized search filters for the header bar
  const filteredProducts = globalSearchQuery.trim() ? products.filter(p => 
    p.name.toLowerCase().includes(globalSearchQuery.toLowerCase()) || 
    p.sku.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(globalSearchQuery.toLowerCase())
  ).slice(0, 5) : [];

  const filteredClients = globalSearchQuery.trim() ? clients.filter(c => 
    c.name.toLowerCase().includes(globalSearchQuery.toLowerCase()) || 
    c.phone.includes(globalSearchQuery) || 
    (c.email && c.email.toLowerCase().includes(globalSearchQuery.toLowerCase()))
  ).slice(0, 5) : [];

  const filteredInvoices = globalSearchQuery.trim() ? invoices.filter(i => 
    i.invoiceNumber.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
    i.clientName.toLowerCase().includes(globalSearchQuery.toLowerCase())
  ).slice(0, 5) : [];

  const hasGlobalResults = filteredProducts.length > 0 || filteredClients.length > 0 || filteredInvoices.length > 0;

  const handleSidebarTabSelect = (tab: string) => {
    setPrefilledProductSearch('');
    setPrefilledClientSearch('');
    setActiveTab(tab);
  };

  const handleGlobalSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!globalSearchQuery.trim()) return;

    if (filteredProducts.length > 0) {
      setPrefilledProductSearch(filteredProducts[0].name);
      setActiveTab('products');
      setShowGlobalResults(false);
    } else if (filteredClients.length > 0) {
      setPrefilledClientSearch(filteredClients[0].name);
      setActiveTab('clients');
      setShowGlobalResults(false);
    } else if (filteredInvoices.length > 0) {
      setPreviewedInvoice(filteredInvoices[0]);
      setShowGlobalResults(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-[#f3f6f9] flex h-screen overflow-hidden selection:bg-blue-100 selection:text-blue-900"
      style={{ fontFamily: isRtl ? '"Cairo", sans-serif' : '"Inter", sans-serif' }}
    >
      {/* 1. Sidebar Panel (Handles RTL orientation flow dynamically with responsive Drawer state) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleSidebarTabSelect}
        lang={lang}
        setLang={setLang}
        currentUser={currentUser}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isHidden={isMenuHidden}
        alertCount={alerts.length}
      />

      {/* Mobile Bottom Nav Overlay backdrop (when sidebar opens) */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 transition-opacity duration-300 no-print"
        />
      )}

      {/* Main Content Pane wrapper */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Header matching Professional Polish theme precisely and optimized for Mobile */}
        <header className="h-16 bg-white/70 backdrop-blur-md border-b border-white/40 shadow-[0_4px_30px_rgb(0,0,0,0.02)] flex items-center justify-between px-4 sm:px-8 no-print shrink-0 z-30" dir={isRtl ? 'rtl' : 'ltr'}>
          {/* Universal Sidebar Toggle Button — Desktop only */}
          <button
            type="button"
            onClick={() => {
              setIsMenuHidden(prev => !prev);
              setIsSidebarOpen(prev => !prev);
            }}
            className="hidden lg:flex p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 rounded-xl transition-all duration-150 shrink-0 cursor-pointer items-center justify-center gap-1.5 active:scale-95 bg-white font-black"
            title={isRtl ? "إخفاء/إظهار القائمة" : "Afficher/Cacher le menu"}
          >
            <Menu className="w-5 h-5 text-emerald-600" />
            <span className="hidden md:inline text-[11px] font-extrabold uppercase tracking-wide">
              {isRtl 
                ? (isMenuHidden ? "إظهار القائمة" : "إخفاء القائمة")
                : (isMenuHidden ? "Afficher Menu" : "Masquer Menu")
              }
            </span>
          </button>

          {/* App brand name centered / horizontal */}
          <div className="flex-1 flex justify-center items-center">
            <span className="text-xl sm:text-2xl font-bold text-emerald-700 tracking-wider" style={{ fontFamily: 'Amiri, serif' }}>محل المباركي 2</span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6 relative">
            {/* Urgency Alert Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-650 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-xl transition-all duration-150 relative shrink-0 cursor-pointer flex items-center justify-center bg-white shadow-sm"
                title={isRtl ? "التنبيهات العاجلة" : "Alertes Urgentes"}
              >
                <Bell className="w-5 h-5 text-slate-500 hover:text-rose-600" />
                {alerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white rounded-full text-[10px] font-black flex items-center justify-center animate-bounce shadow-sm">
                    {alerts.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div 
                  className={`absolute ${isRtl ? 'left-0' : 'right-0'} mt-2 w-80 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 p-4 font-semibold text-xs text-slate-700 space-y-3 animate-fade-in max-h-96 overflow-y-auto`}
                >
                  <h4 className="font-black text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
                    <span>{isRtl ? 'التنبيهات العاجلة (1 يوم أو أقل)' : 'Alertes urgentes (1j ou moins)'}</span>
                    <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-black">
                      {alerts.length}
                    </span>
                  </h4>
                  {alerts.length === 0 ? (
                    <p className="text-slate-400 text-center py-4">{isRtl ? 'لا توجد تنبيهات عاجلة حالياً' : 'Aucune alerte urgente'}</p>
                  ) : (
                    <div className="space-y-2">
                      {alerts.map(a => (
                        <div 
                          key={a.id}
                          className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                            a.type === 'check' 
                              ? 'bg-amber-50/50 border-amber-100 text-amber-900' 
                              : 'bg-rose-50/50 border-rose-100 text-rose-900'
                          }`}
                        >
                          <AlertCircle className={`w-4.5 h-4.5 shrink-0 mt-0.5 ${
                            a.type === 'check' ? 'text-amber-600' : 'text-rose-600'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="leading-normal font-extrabold text-[11px] text-slate-800 break-words">{a.message}</p>
                            <span className="inline-block mt-1 text-[9px] opacity-75 font-mono font-bold bg-slate-100/60 px-1.5 py-0.5 rounded">
                              {a.daysLeft < 0 
                                ? (isRtl ? 'تجاوز الأجل' : 'Dépassé') 
                                : a.daysLeft === 0 
                                ? (isRtl ? 'اليوم' : 'Aujourd\'hui') 
                                : (isRtl ? 'غداً' : 'Demain')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Network Sync status badge */}
            <div className="flex items-center">
              {isSyncing ? (
                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-full py-1 px-2.5 font-bold shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                  <span>{isRtl ? 'جاري المزامنة...' : 'Synchronisation...'}</span>
                </div>
              ) : !isOnline ? (
                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs bg-red-50 text-red-800 border border-red-200 rounded-full py-1 px-2.5 font-bold shadow-sm animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                  <span>{isRtl ? `غير متصل (${syncQueue.length} معلق)` : `Hors ligne (${syncQueue.length} en attente)`}</span>
                </div>
              ) : syncQueue.length > 0 ? (
                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-full py-1 px-2.5 font-bold shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                  <span>{isRtl ? `معلق (${syncQueue.length})` : `En attente (${syncQueue.length})`}</span>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-1.5 text-[10px] sm:text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full py-1 px-2.5 font-bold shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                  <span>{isRtl ? 'متصل' : 'En ligne'}</span>
                </div>
              )}
            </div>

            {/* Profile Detail */}
            <div className="flex items-center gap-3">
              <div className={`hidden sm:block ${isRtl ? 'text-left' : 'text-right'}`}>
                <div className="text-xs font-bold text-slate-900">{currentUser ? resolveUserName(currentUser.name, lang) : ''}</div>
                <div className="text-[10px] text-slate-500 font-semibold">{currentUser ? getRoleLabel(currentUser.role) : ''}</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-900 text-slate-100 flex items-center justify-center font-black text-xs ring-2 ring-blue-500 ring-offset-2">
                {currentUser ? getInitials(resolveUserName(currentUser.name, lang)) : ''}
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Main Content Router */}
        <main 
          className="flex-1 p-3 sm:p-8 overflow-y-auto max-w-full bg-slate-50 pb-24 lg:pb-8"
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          {renderTabContent()}
        </main>

        {/* ── Mobile Bottom Navigation Bar ── */}
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-50 no-print"
          dir={isRtl ? 'rtl' : 'ltr'}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {/* Glassmorphism pill container */}
          <div className="mx-3 mb-3 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-[0_-4px_30px_rgba(0,0,0,0.10)] px-2 py-1.5">
            <div className="flex items-center justify-around">
              {/* Products */}
              <button
                type="button"
                onClick={() => { handleSidebarTabSelect('products'); }}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 min-w-[56px] ${
                  activeTab === 'products'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105'
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span className="text-[9px] font-black tracking-wide">{isRtl ? 'السلع' : 'Produits'}</span>
              </button>

              {/* Clients */}
              <button
                type="button"
                onClick={() => { handleSidebarTabSelect('clients'); }}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 min-w-[56px] ${
                  activeTab === 'clients'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105'
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-[9px] font-black tracking-wide">{isRtl ? 'الزبائن' : 'Clients'}</span>
              </button>

              {/* Activities center big button */}
              <button
                type="button"
                onClick={() => { handleSidebarTabSelect('activities'); }}
                className={`flex flex-col items-center gap-0.5 -mt-4 px-4 py-3 rounded-2xl shadow-lg transition-all duration-200 min-w-[64px] ${
                  activeTab === 'activities'
                    ? 'bg-violet-600 text-white shadow-violet-500/40 scale-110'
                    : 'bg-gradient-to-br from-violet-500 to-indigo-700 text-white shadow-violet-500/30'
                }`}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-[9px] font-black tracking-wide">{isRtl ? 'المستجدات' : 'Activités'}</span>
              </button>

              {/* Debts */}
              <button
                type="button"
                onClick={() => { handleSidebarTabSelect('debts'); }}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 min-w-[56px] relative ${
                  activeTab === 'debts'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105'
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                {alerts.length > 0 && (
                  <span className="absolute top-1 right-2 w-4 h-4 bg-rose-600 text-white rounded-full text-[8px] font-black flex items-center justify-center">
                    {alerts.length}
                  </span>
                )}
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[9px] font-black tracking-wide">{isRtl ? 'الديون' : 'Dettes'}</span>
              </button>

              {/* Settings / More */}
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 min-w-[56px] text-slate-400 hover:text-slate-700 hover:bg-slate-100`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span className="text-[9px] font-black tracking-wide">{isRtl ? 'المزيد' : 'Plus'}</span>
              </button>
            </div>
          </div>
        </nav>
        
      </div>

      {/* 3. Global absolute Floating Printable Invoice Previewer */}
      {previewedInvoice && (
        <PrintInvoiceModal
          invoice={previewedInvoice}
          lang={lang}
          onClose={() => setPreviewedInvoice(null)}
        />
      )}
    </div>
  );
}
