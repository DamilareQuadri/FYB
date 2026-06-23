import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Pencil, Loader2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/helpers';
import type { Product } from '../../types';
import { CATEGORIES } from '../../data';

const CATEGORY_OPTIONS = CATEGORIES.filter(c => c !== 'All');
const ALL_SIZES = ['S', 'M', 'L', 'XL'];

interface FormState {
  id?: string;
  name: string;
  price: string;
  description: string;
  category: string;
  imageUrl: string;
  sizes: string[];
  colors: string;
}

const emptyForm: FormState = {
  name: '',
  price: '',
  description: '',
  category: 'Corporate',
  imageUrl: '',
  sizes: ['S', 'M', 'L', 'XL'],
  colors: 'Black, White',
};

const AdminProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    setProducts((data as Product[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setForm(emptyForm);
    setImageFile(null);
    setEditing(false);
  };

  const startEdit = (p: Product) => {
    setEditing(true);
    setForm({
      id: p.id,
      name: p.name,
      price: String(p.price),
      description: p.description ?? '',
      category: p.category,
      imageUrl: p.images?.[0] ?? '',
      sizes: p.sizes ?? [],
      colors: (p.colors ?? []).join(', '),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    let uploadedImageUrl = form.imageUrl;
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, imageFile);

      if (uploadError) {
        alert(`Image upload failed: ${uploadError.message}`);
        setSaving(false);
        return;
      }

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);
        
      uploadedImageUrl = data.publicUrl;
    }

    const payload = {
      name: form.name,
      price: Number(form.price),
      description: form.description,
      category: form.category,
      images: uploadedImageUrl ? [uploadedImageUrl] : ['/images/premium_shirt_1781633323343.png'],
      sizes: form.sizes,
      colors: form.colors.split(',').map((c) => c.trim()).filter(Boolean),
    };
    let error;
    if (editing && form.id) {
      ({ error } = await supabase.from('products').update(payload).eq('id', form.id));
    } else {
      ({ error } = await supabase.from('products').insert({ ...payload, is_new: true }));
    }
    setSaving(false);
    if (error) {
      alert(`Failed to save product: ${error.message}`);
      return;
    }
    resetForm();
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) alert(error.message);
    else load();
  };

  const toggleSize = (s: string) =>
    setForm((f) => ({
      ...f,
      sizes: f.sizes.includes(s) ? f.sizes.filter((x) => x !== s) : [...f.sizes, s],
    }));

  return (
    <div className="space-y-8">
      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900">{editing ? 'Edit product' : 'Add new product'}</h2>
          {editing && (
            <button type="button" onClick={resetForm} className="text-sm text-gray-500 hover:text-slate-900 flex items-center gap-1">
              <X className="h-4 w-4" /> Cancel edit
            </button>
          )}
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input required placeholder="Product title" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-slate-900" />
            <input required type="number" min="0" placeholder="Price (NGN)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-slate-900" />
          </div>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-slate-900 bg-white">
            {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <textarea required rows={3} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-slate-900" />
          <div className="flex gap-4">
            {ALL_SIZES.map((s) => (
              <label key={s} className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={form.sizes.includes(s)} onChange={() => toggleSize(s)} className="w-4 h-4 rounded" />
                {s}
              </label>
            ))}
          </div>
          <input required placeholder="Colors (comma separated)" value={form.colors} onChange={(e) => setForm({ ...form, colors: e.target.value })} className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-slate-900" />
          <div className="space-y-1">
            <input type="file" accept="image/*" onChange={(e) => { if (e.target.files && e.target.files[0]) setImageFile(e.target.files[0]); }} className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-slate-900 bg-white" />
            <p className="text-xs text-gray-500 px-1">Upload a new image, or leave blank to keep the current one.</p>
          </div>
        </div>
        <button type="submit" disabled={saving} className="mt-5 inline-flex items-center gap-2 bg-slate-900 text-white rounded-lg py-3 px-6 text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {editing ? 'Save changes' : 'Add product'}
        </button>
      </form>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <h2 className="text-lg font-bold text-slate-900 p-6 pb-3">Products ({products.length})</h2>
        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
        ) : products.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No products yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {products.map((p) => (
              <div key={p.id} className="flex items-center gap-4 p-4">
                <div className="w-12 h-14 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                  {p.images?.[0] && <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.category} · {formatCurrency(p.price)}</p>
                </div>
                <button onClick={() => startEdit(p)} className="p-2 text-gray-400 hover:text-slate-900"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(p.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminProducts;
