import React, { useState, useMemo } from 'react';
import { Note, NoteItem } from '../types';
import { translations } from '../translations';
import { 
  StickyNote, 
  Plus, 
  Trash2, 
  Check, 
  X,
  Search,
  ShoppingCart,
  User,
  Calendar,
  Pencil
} from 'lucide-react';

interface NotesListProps {
  notes: Note[];
  lang: 'fr' | 'ar';
  onAddNote: (note: Note) => void;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
}

export default function NotesList({
  notes,
  lang,
  onAddNote,
  onUpdateNote,
  onDeleteNote
}: NotesListProps) {
  const isRtl = lang === 'ar';
  const t = translations[lang];

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  
  // Form State
  const [personName, setPersonName] = useState('');
  const [items, setItems] = useState<NoteItem[]>([{ id: `item-${Date.now()}`, name: '' }]);

  const openAddModal = () => {
    setEditingNoteId(null);
    setPersonName('');
    setItems([{ id: `item-${Date.now()}`, name: '' }]);
    setIsModalOpen(true);
  };

  const openEditModal = (note: Note) => {
    setEditingNoteId(note.id);
    setPersonName(note.personName);
    setItems(note.items.map(item => ({ ...item })));
    setIsModalOpen(true);
  };

  const handleItemChange = (id: string, value: string) => {
    setItems(items.map(item => item.id === id ? { ...item, name: value } : item));
  };

  const handleAddItem = () => {
    setItems([...items, { id: `item-${Date.now()}`, name: '' }]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim()) {
      alert(isRtl ? 'الرجاء إدخال اسم المعني بالأمر' : 'Veuillez entrer le nom');
      return;
    }
    
    const validItems = items.filter(item => item.name.trim() !== '');
    if (validItems.length === 0) {
      alert(isRtl ? 'الرجاء إدخال سلعة واحدة على الأقل' : 'Veuillez entrer au moins un article');
      return;
    }

    if (editingNoteId) {
      const existingNote = notes.find(n => n.id === editingNoteId);
      if (existingNote) {
        onUpdateNote({
          ...existingNote,
          personName: personName.trim(),
          items: validItems,
        });
      }
    } else {
      const newNote: Note = {
        id: `note-${Date.now()}`,
        personName: personName.trim(),
        items: validItems,
        date: new Date().toISOString()
      };
      onAddNote(newNote);
    }
    
    setIsModalOpen(false);
  };

  const toggleItemCompletion = (noteId: string, itemId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    const updatedNote = {
      ...note,
      items: note.items.map(i => i.id === itemId ? { ...i, completed: !i.completed } : i)
    };
    onUpdateNote(updatedNote);
  };

  const filteredNotes = useMemo(() => {
    return notes.filter(n => 
      n.personName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.items.some(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [notes, searchTerm]);

  return (
    <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <StickyNote className="w-7 h-7 text-indigo-500" />
            {t.notes}
          </h1>
          <p className="text-sm text-slate-500 font-semibold mt-1">
            {isRtl 
              ? 'تسجيل السلع والأشياء لتذكرها لكل شخص بسهولة' 
              : 'Enregistrer des articles et mémos pour chaque personne facilement'}
          </p>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex-1 relative w-full md:w-96">
          <Search className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
          <input
            type="text"
            placeholder={isRtl ? 'بحث في الكتابات...' : 'Rechercher dans les notes...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full py-2.5 bg-slate-50 text-sm text-slate-800 rounded-xl border border-slate-200 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
              isRtl ? 'pl-4 pr-11' : 'pr-4 pl-11'
            }`}
          />
        </div>
        <button
          onClick={openAddModal}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{isRtl ? 'إضافة كتابة جديدة' : 'Nouvelle Note'}</span>
        </button>
      </div>

      {/* NOTES LIST */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-10">
        {filteredNotes.length === 0 ? (
          <div className="py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-100 shadow-sm mt-4">
            <StickyNote className="w-12 h-12 mx-auto text-slate-200 mb-3" />
            <p className="font-semibold text-sm">{isRtl ? 'لا توجد كتابات مسجلة' : 'Aucune note enregistrée'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {filteredNotes.map(note => (
              <div key={note.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-black text-slate-800 text-lg">{note.personName}</h3>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {new Date(note.date).toLocaleString(isRtl ? 'ar-EG' : 'fr-FR', {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit'
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => openEditModal(note)}
                      className="p-1.5 text-indigo-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(isRtl ? 'هل تريد حذف هذه الكتابة؟' : 'Supprimer cette note ?')) {
                          onDeleteNote(note.id);
                        }
                      }}
                      className="p-1.5 text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {note.items.map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => toggleItemCompletion(note.id, item.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                        item.completed 
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                          : 'bg-slate-50 border-transparent hover:border-indigo-100 text-slate-700'
                      }`}
                    >
                      <span className={`text-sm font-semibold flex-1 ${item.completed ? 'line-through opacity-70' : ''}`}>
                        {item.name}
                      </span>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                        item.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {item.completed && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-indigo-100">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                {editingNoteId ? <Pencil className="w-5 h-5 text-indigo-500" /> : <Plus className="w-5 h-5 text-indigo-500" />}
                {editingNoteId 
                  ? (isRtl ? 'تعديل الكتابة' : 'Modifier la note') 
                  : (isRtl ? 'إضافة كتابة جديدة' : 'Ajouter une note')}
              </h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {isRtl ? 'اسم المعني بالأمر' : 'Nom du concerné'}
                </label>
                <input
                  type="text"
                  placeholder={isRtl ? 'مثال: محمد، المورد...' : 'Ex: Mohamed, Fournisseur...'}
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  className="w-full py-2.5 px-4 bg-slate-50 text-sm text-slate-800 rounded-xl border border-slate-200 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                  <ShoppingCart className="w-3.5 h-3.5" />
                  {isRtl ? 'السلع أو الأشياء المراد تذكرها' : 'Articles ou objets à retenir'}
                </label>
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div key={item.id} className="flex gap-2">
                      <input
                        type="text"
                        placeholder={isRtl ? `السلعة ${index + 1}` : `Article ${index + 1}`}
                        value={item.name}
                        onChange={(e) => handleItemChange(item.id, e.target.value)}
                        className="w-full py-2.5 px-4 bg-slate-50 text-sm text-slate-800 rounded-xl border border-slate-200 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-2.5 text-rose-400 hover:bg-rose-50 rounded-xl transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="mt-3 w-full py-2 border-2 border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  {isRtl ? 'إضافة سلعة أخرى' : 'Ajouter un autre article'}
                </button>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 active:scale-[0.98] text-white rounded-xl text-sm font-black shadow-lg shadow-indigo-500/30 transition-all"
                >
                  {editingNoteId
                    ? (isRtl ? 'حفظ التعديلات' : 'Enregistrer les modifications')
                    : (isRtl ? 'حفظ الكتابة' : 'Enregistrer la note')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
