import React, { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/helpers';

interface SharedCartRow {
  id: string;
  customer_name: string | null;
  created_at: string;
  cart_items: {
    id: string;
    size: string;
    color: string;
    quantity: number;
    products: { name: string; price: number; images: string[] } | null;
  }[];
}

const AdminSharedCarts: React.FC = () => {
  const [carts, setCarts] = useState<SharedCartRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('carts')
      .select('id, customer_name, created_at, cart_items(id, size, color, quantity, products(name, price, images))')
      .eq('shared_with_admin', true)
      .order('created_at', { ascending: false });
    setCarts((data as any) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div className="p-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;
  }

  if (carts.length === 0) {
    return <p className="text-sm text-gray-500">No carts have been sent to admin yet.</p>;
  }

  return (
    <div className="space-y-5">
      {carts.map((cart) => {
        const total = cart.cart_items.reduce((t, i) => t + (i.products?.price ?? 0) * i.quantity, 0);
        return (
          <div key={cart.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="font-medium text-slate-900">{cart.customer_name || 'Unnamed shopper'}</p>
              <p className="text-xs text-gray-400">{new Date(cart.created_at).toLocaleString()}</p>
            </div>
            <div className="divide-y divide-gray-100 border-t border-gray-100">
              {cart.cart_items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-3">
                  <div className="w-10 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                    {item.products?.images?.[0] && <img src={item.products.images[0]} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{item.products?.name ?? 'Product'}</p>
                    <p className="text-xs text-gray-500">{item.size} · {item.color} · ×{item.quantity}</p>
                  </div>
                  <span className="text-sm font-semibold">{formatCurrency((item.products?.price ?? 0) * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-3 font-bold text-slate-900">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AdminSharedCarts;
