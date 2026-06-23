import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Minus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/helpers';
import type { Order } from '../../types';

const STATUSES: Order['status'][] = ['pending', 'awaiting_confirmation', 'paid', 'cancelled', 'fulfilled'];

const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });
    setOrders((data as Order[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (order: Order, status: Order['status']) => {
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)));
    await supabase.from('orders').update({ status }).eq('id', order.id);
  };

  const changeQty = async (order: Order, itemId: string, qty: number) => {
    if (qty < 1) return;
    const newItems = order.order_items!.map((i) => (i.id === itemId ? { ...i, quantity: qty } : i));
    const subtotal = newItems.reduce((t, i) => t + i.price * i.quantity, 0);
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, order_items: newItems, subtotal } : o)));
    await supabase.from('order_items').update({ quantity: qty }).eq('id', itemId);
    await supabase.from('orders').update({ subtotal }).eq('id', order.id);
  };

  if (loading) {
    return <div className="p-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;
  }

  if (orders.length === 0) {
    return <p className="text-sm text-gray-500">No orders yet.</p>;
  }

  return (
    <div className="space-y-5">
      {orders.map((order) => (
        <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <p className="font-mono font-bold text-slate-900">{order.reference}</p>
              <p className="text-sm text-slate-600">{order.customer_name} · {order.customer_phone}</p>
              {order.customer_address && <p className="text-xs text-gray-500 mt-0.5">{order.customer_address}</p>}
              <p className="text-xs text-gray-400 mt-1">{new Date(order.created_at).toLocaleString()}</p>
            </div>
            <select
              value={order.status}
              onChange={(e) => setStatus(order, e.target.value as Order['status'])}
              className="border border-gray-300 rounded-lg p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-slate-900"
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="divide-y divide-gray-100 border-t border-gray-100">
            {order.order_items?.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-3">
                <div className="w-10 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                  {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.size} · {item.color} · {formatCurrency(item.price)}</p>
                </div>
                <div className="flex items-center border border-gray-200 rounded-md">
                  <button onClick={() => changeQty(order, item.id, item.quantity - 1)} disabled={item.quantity <= 1} className="p-1.5 text-gray-500 hover:bg-gray-50"><Minus className="h-3 w-3" /></button>
                  <span className="px-2 text-sm font-medium">{item.quantity}</span>
                  <button onClick={() => changeQty(order, item.id, item.quantity + 1)} className="p-1.5 text-gray-500 hover:bg-gray-50"><Plus className="h-3 w-3" /></button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-3 font-bold text-slate-900">
            <span>Total</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminOrders;
