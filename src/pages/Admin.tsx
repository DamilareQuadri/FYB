import React, { useState } from 'react';
import { Package, ShoppingBag, Share2, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import RequireAdmin from '../components/admin/RequireAdmin';
import AdminProducts from '../components/admin/AdminProducts';
import AdminOrders from '../components/admin/AdminOrders';
import AdminSettings from '../components/admin/AdminSettings';
import AdminSharedCarts from '../components/admin/AdminSharedCarts';

type Tab = 'products' | 'orders' | 'shared' | 'settings';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'products', label: 'Products', icon: <Package className="h-5 w-5" /> },
  { key: 'orders', label: 'Orders', icon: <ShoppingBag className="h-5 w-5" /> },
  { key: 'shared', label: 'Shared Carts', icon: <Share2 className="h-5 w-5" /> },
  { key: 'settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
];

const AdminInner: React.FC = () => {
  const { signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('products');

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 bg-slate-900 text-white flex-col hidden md:flex fixed inset-y-0">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold tracking-tight">FYB Admin</h2>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                tab === t.key ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button onClick={signOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800/50">
            <LogOut className="h-5 w-5" /> Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 overflow-y-auto p-4 md:p-8">
        {/* Mobile tab bar */}
        <div className="md:hidden flex gap-2 overflow-x-auto mb-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                tab === t.key ? 'bg-slate-900 text-white' : 'bg-white border border-gray-200 text-slate-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-slate-900">{TABS.find((t) => t.key === tab)?.label}</h1>
            <button onClick={signOut} className="md:hidden text-sm text-gray-500 flex items-center gap-1">
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </div>

          {tab === 'products' && <AdminProducts />}
          {tab === 'orders' && <AdminOrders />}
          {tab === 'shared' && <AdminSharedCarts />}
          {tab === 'settings' && <AdminSettings />}
        </div>
      </main>
    </div>
  );
};

const Admin: React.FC = () => (
  <RequireAdmin>
    <AdminInner />
  </RequireAdmin>
);

export default Admin;
