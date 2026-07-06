import React from 'react';
import { SystemActivity } from '../types';
import {
  Activity,
  Search,
  Filter,
  ShoppingCart,
  Package,
  Users,
  Boxes,
  Trash2,
  Edit,
  Plus,
  ArrowDown,
  ArrowUp,
  FileText,
  AlertTriangle,
  Calendar,
  User,
  RefreshCw,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface ActivitiesLogProps {
  activities: SystemActivity[];
  clients: any[];
  products: any[];
  lang: 'fr' | 'ar';
  currentUser: { name: string; role: string };
}

type ActivityType =
  | 'sale'
  | 'product_add'
  | 'product_edit'
  | 'product_delete'
  | 'client_add'
  | 'client_edit'
  | 'client_delete'
  | 'stock_edit'
  | 'withdraw_add'
  | 'withdraw_edit'
  | 'withdraw_delete'
  | 'invoice_edit'
  | 'invoice_delete';

const TYPE_META: Record<ActivityType, { icon: React.ElementType; colorClass: string; bgClass: string; labelAr: string; labelFr: string }> = {
  sale:            { icon: ShoppingCart, colorClass: 'text-emerald-600', bgClass: 'bg-emerald-50 border-emerald-200', labelAr: 'بيع جديد', labelFr: 'Vente' },
  product_add:     { icon: Plus,         colorClass: 'text-blue-600',    bgClass: 'bg-blue-50 border-blue-200',       labelAr: 'إضافة منتج', labelFr: 'Produit Ajouté' },
  product_edit:    { icon: Edit,         colorClass: 'text-amber-600',   bgClass: 'bg-amber-50 border-amber-200',     labelAr: 'تعديل منتج', labelFr: 'Produit Modifié' },
  product_delete:  { icon: Trash2,       colorClass: 'text-rose-600',    bgClass: 'bg-rose-50 border-rose-200',       labelAr: 'حذف منتج', labelFr: 'Produit Supprimé' },
  client_add:      { icon: Users,        colorClass: 'text-indigo-600',  bgClass: 'bg-indigo-50 border-indigo-200',   labelAr: 'إضافة زبون', labelFr: 'Client Ajouté' },
  client_edit:     { icon: Edit,         colorClass: 'text-amber-600',   bgClass: 'bg-amber-50 border-amber-200',     labelAr: 'تعديل زبون', labelFr: 'Client Modifié' },
  client_delete:   { icon: Trash2,       colorClass: 'text-rose-600',    bgClass: 'bg-rose-50 border-rose-200',       labelAr: 'حذف زبون', labelFr: 'Client Supprimé' },
  stock_edit:      { icon: Boxes,        colorClass: 'text-violet-600',  bgClass: 'bg-violet-50 border-violet-200',   labelAr: 'تعديل مخزون', labelFr: 'Stock Modifié' },
  withdraw_add:    { icon: ArrowDown,    colorClass: 'text-rose-600',    bgClass: 'bg-rose-50 border-rose-200',       labelAr: 'سحب نقدي', labelFr: 'Retrait Caisse' },
  withdraw_edit:   { icon: Edit,         colorClass: 'text-amber-600',   bgClass: 'bg-amber-50 border-amber-200',     labelAr: 'تعديل سحب', labelFr: 'Retrait Modifié' },
  withdraw_delete: { icon: Trash2,       colorClass: 'text-rose-600',    bgClass: 'bg-rose-50 border-rose-200',       labelAr: 'حذف سحب', labelFr: 'Retrait Supprimé' },
  invoice_edit:    { icon: FileText,     colorClass: 'text-amber-600',   bgClass: 'bg-amber-50 border-amber-200',     labelAr: 'تعديل فاتورة', labelFr: 'Facture Modifiée' },
  invoice_delete:  { icon: Trash2,       colorClass: 'text-rose-600',    bgClass: 'bg-rose-50 border-rose-200',       labelAr: 'حذف فاتورة', labelFr: 'Facture Supprimée' },
};

const FALLBACK_META = { icon: Activity, colorClass: 'text-slate-500', bgClass: 'bg-slate-50 border-slate-200', labelAr: 'نشاط', labelFr: 'Activité' };

function getMeta(type: string) {
  return TYPE_META[type as ActivityType] || FALLBACK_META;
}

function formatRelativeDate(dateStr: string, lang: 'fr' | 'ar'): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (lang === 'ar') {
    if (diffMin < 1)   return 'الآن';
    if (diffMin < 60)  return `منذ ${diffMin} دقيقة`;
    if (diffHr < 24)   return `منذ ${diffHr} ساعة`;
    if (diffDay < 2)   return 'أمس';
    if (diffDay < 30)  return `منذ ${diffDay} يوماً`;
    return date.toLocaleDateString('ar-MA');
  } else {
    if (diffMin < 1)   return "À l'instant";
    if (diffMin < 60)  return `Il y a ${diffMin} min`;
    if (diffHr < 24)   return `Il y a ${diffHr}h`;
    if (diffDay < 2)   return 'Hier';
    if (diffDay < 30)  return `Il y a ${diffDay} jours`;
    return date.toLocaleDateString('fr-FR');
  }
}

function groupByDay(activities: SystemActivity[]): Record<string, SystemActivity[]> {
  const groups: Record<string, SystemActivity[]> = {};
  activities.forEach(a => {
    const day = new Date(a.date).toISOString().split('T')[0];
    if (!groups[day]) groups[day] = [];
    groups[day].push(a);
  });
  return groups;
}

function formatDayLabel(dayKey: string, lang: 'fr' | 'ar'): string {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (dayKey === today) return lang === 'ar' ? 'اليوم' : "Aujourd'hui";
  if (dayKey === yesterday) return lang === 'ar' ? 'أمس' : 'Hier';
  const d = new Date(dayKey);
  return lang === 'ar'
    ? d.toLocaleDateString('ar-MA', { weekday: 'long', day: 'numeric', month: 'long' })
    : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function ActivitiesLog({ activities, clients, products, lang, currentUser }: ActivitiesLogProps) {
  const isRtl = lang === 'ar';

  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<string>('all');
  const [collapsedDays, setCollapsedDays] = React.useState<Set<string>>(new Set());

  // Only keep last 30 days
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const filtered = React.useMemo(() => {
    return activities
      .filter(a => new Date(a.date) >= oneMonthAgo)
      .filter(a => {
        const desc = (lang === 'ar' ? a.descriptionAr : a.descriptionFr) || '';
        const matchSearch = desc.toLowerCase().includes(search.toLowerCase())
          || (a.operator || '').toLowerCase().includes(search.toLowerCase());
        const matchType = typeFilter === 'all' || a.type === typeFilter;
        return matchSearch && matchType;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activities, search, typeFilter, lang, oneMonthAgo]);

  const grouped = React.useMemo(() => groupByDay(filtered), [filtered]);
  const dayKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const toggleDay = (day: string) => {
    setCollapsedDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  // Summary counters for this month
  const summary = React.useMemo(() => {
    return {
      totalProducts: products.length,
      totalClients: clients.length,
      totalDebts: clients.reduce((sum, c) => sum + (c.outstandingDebt || 0), 0),
      totalChecks: clients.reduce((sum, c) => sum + (c.postalChecks?.reduce((s: number, chk: any) => s + chk.amount, 0) || 0), 0),
    };
  }, [clients, products]);

  const typeOptions: { value: string; labelAr: string; labelFr: string }[] = [
    { value: 'all', labelAr: 'جميع الأنشطة', labelFr: 'Tous les Événements' },
    { value: 'sale', labelAr: 'المبيعات فقط', labelFr: 'Ventes' },
    { value: 'product_add', labelAr: 'إضافة منتج', labelFr: 'Produits Ajoutés' },
    { value: 'product_edit', labelAr: 'تعديل منتج', labelFr: 'Produits Modifiés' },
    { value: 'product_delete', labelAr: 'حذف منتج', labelFr: 'Produits Supprimés' },
    { value: 'client_add', labelAr: 'إضافة زبون', labelFr: 'Clients Ajoutés' },
    { value: 'client_edit', labelAr: 'تعديل زبون', labelFr: 'Clients Modifiés' },
    { value: 'client_delete', labelAr: 'حذف زبون', labelFr: 'Clients Supprimés' },
    { value: 'stock_edit', labelAr: 'تعديل مخزون', labelFr: 'Mouvements Stock' },
    { value: 'invoice_edit', labelAr: 'تعديل فاتورة', labelFr: 'Factures Modifiées' },
    { value: 'invoice_delete', labelAr: 'حذف فاتورة', labelFr: 'Factures Supprimées' },
  ];

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2.5">
            <span className="p-2 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl shadow-md shadow-indigo-500/20">
              <Activity className="w-5 h-5 text-white" />
            </span>
            {isRtl ? 'الأنشطة والمستجدات' : 'Journal d\'Activités'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            {isRtl ? 'سجل تفصيلي لجميع التغييرات خلال آخر 30 يوماً' : 'Historique détaillé de toutes les modifications des 30 derniers jours'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm font-semibold">
          <Calendar className="w-3.5 h-3.5" />
          {isRtl ? 'آخر 30 يوماً' : '30 derniers jours'}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: isRtl ? 'عدد الزبائن الإجمالي' : 'Total Clients', value: summary.totalClients, icon: Users, color: 'from-blue-500 to-cyan-500' },
          { label: isRtl ? 'عدد المنتجات الإجمالي' : 'Total Produits', value: summary.totalProducts, icon: Package, color: 'from-amber-500 to-orange-500' },
          { label: isRtl ? 'قيمة ديون قريبة المدى' : 'Dettes à Court Terme', value: `${summary.totalDebts.toFixed(2)} DH`, icon: Activity, color: 'from-emerald-500 to-teal-500' },
          { label: isRtl ? 'قيمة كل الشيكات' : 'Valeur des Chèques', value: `${summary.totalChecks.toFixed(2)} DH`, icon: FileText, color: 'from-indigo-500 to-violet-600' },
        ].map((card, i) => (
          <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-xl bg-gradient-to-br ${card.color} shadow-sm`}>
                <card.icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-800">{card.value}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={isRtl ? 'البحث في الأنشطة أو اسم المشغل...' : 'Rechercher dans les activités ou par opérateur...'}
            className="w-full py-2.5 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-700 outline-none border-none cursor-pointer focus:ring-0"
          >
            {typeOptions.map(o => (
              <option key={o.value} value={o.value}>{isRtl ? o.labelAr : o.labelFr}</option>
            ))}
          </select>
        </div>

        {/* Count */}
        <span className="text-xs font-bold text-slate-400 shrink-0">
          {filtered.length} {isRtl ? 'نشاط' : 'activité(s)'}
        </span>
      </div>

      {/* Timeline */}
      {dayKeys.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-16 text-center shadow-sm">
          <Activity className="w-12 h-12 mx-auto text-slate-200 mb-3 stroke-1" />
          <p className="text-slate-400 font-semibold text-sm">
            {isRtl ? 'لا توجد أنشطة مسجلة في هذه الفترة.' : 'Aucune activité enregistrée sur cette période.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {dayKeys.map(day => {
            const isCollapsed = collapsedDays.has(day);
            const dayActivities = grouped[day];
            return (
              <div key={day} className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                {/* Day Header */}
                <button
                  type="button"
                  onClick={() => toggleDay(day)}
                  className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50/80 hover:bg-slate-100/60 transition text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm font-extrabold text-slate-700">{formatDayLabel(day, lang)}</span>
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-full">
                      {dayActivities.length} {isRtl ? 'نشاط' : 'événements'}
                    </span>
                  </div>
                  {isCollapsed
                    ? <ChevronRight className="w-4 h-4 text-slate-400" />
                    : <ChevronDown className="w-4 h-4 text-slate-400" />
                  }
                </button>

                {/* Activities for this day */}
                {!isCollapsed && (
                  <div className="divide-y divide-slate-50">
                    {dayActivities.map((act, idx) => {
                      const meta = getMeta(act.type);
                      const Icon = meta.icon;
                      const desc = lang === 'ar' ? act.descriptionAr : act.descriptionFr;
                      const timeStr = new Date(act.date).toLocaleTimeString(lang === 'ar' ? 'ar-MA' : 'fr-FR', {
                        hour: '2-digit', minute: '2-digit'
                      });

                      return (
                        <div
                          key={act.id || idx}
                          className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors group"
                        >
                          {/* Icon Badge */}
                          <div className={`shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center mt-0.5 ${meta.bgClass}`}>
                            <Icon className={`w-4 h-4 ${meta.colorClass}`} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <div>
                                {/* Type badge */}
                                <span className={`inline-block px-2 py-0.5 text-[9px] font-black uppercase rounded-md border ${meta.bgClass} ${meta.colorClass} mb-1`}>
                                  {isRtl ? meta.labelAr : meta.labelFr}
                                </span>
                                {/* Description */}
                                <p className="text-xs font-semibold text-slate-700 leading-relaxed">{desc}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-[10px] font-mono font-bold text-slate-400">{timeStr}</span>
                                <p className="text-[9px] text-slate-300 font-medium mt-0.5">
                                  {formatRelativeDate(act.date, lang)}
                                </p>
                              </div>
                            </div>

                            {/* Operator */}
                            {act.operator && (
                              <div className="flex items-center gap-1.5 mt-2">
                                <User className="w-3 h-3 text-slate-300" />
                                <span className="text-[10px] text-slate-400 font-bold">{act.operator}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
