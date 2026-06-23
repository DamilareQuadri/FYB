import React, { useState, useEffect } from 'react';
import { Loader2, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { StoreSettings } from '../../types';

const AdminSettings: React.FC = () => {
  const [form, setForm] = useState<StoreSettings>({
    bank_name: '',
    account_number: '',
    account_name: '',
    whatsapp: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase
      .from('store_settings')
      .select('bank_name, account_number, account_name, whatsapp')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        if (data) setForm({
          bank_name: data.bank_name ?? '',
          account_number: data.account_number ?? '',
          account_name: data.account_name ?? '',
          whatsapp: data.whatsapp ?? '',
        });
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from('store_settings')
      .update({ ...form, updated_at: new Date().toISOString() })
      .eq('id', 1);
    setSaving(false);
    if (error) {
      alert(`Failed to save: ${error.message}`);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) {
    return <div className="p-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;
  }

  const field = (key: keyof StoreSettings, label: string, placeholder: string) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input
        value={form[key] ?? ''}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-slate-900"
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 max-w-xl space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Payment details</h2>
        <p className="text-sm text-gray-500">These are shown to buyers on their order page.</p>
      </div>
      {field('bank_name', 'Bank name', 'e.g., GTBank')}
      {field('account_number', 'Account number', 'e.g., 0123456789')}
      {field('account_name', 'Account name', 'e.g., FYB Fashion Ltd')}
      {field('whatsapp', 'WhatsApp number (optional)', 'e.g., 2348030000000')}
      <button type="submit" disabled={saving} className="inline-flex items-center gap-2 bg-slate-900 text-white rounded-lg py-3 px-6 text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
        {saved ? 'Saved' : 'Save details'}
      </button>
    </form>
  );
};

export default AdminSettings;
