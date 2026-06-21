import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, Plus, Minus, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/helpers';
import type { Order, StoreSettings } from '../types';
import PayToCard from '../components/checkout/PayToCard';

const STATUS_LABELS: Record<Order['status'], string> = {
  pending: 'Awaiting payment',
  awaiting_confirmation: 'Confirming payment',
  paid: 'Paid',
  cancelled: 'Cancelled',
  fulfilled: 'Fulfilled',
};
const STATUS_STYLES: Record<Order['status'], string> = {
  pending: 'bg-amber-100 text-amber-800',
  awaiting_confirmation: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-700',
  fulfilled: 'bg-slate-200 text-slate-800',
};

const OrderPage: React.FC = () => {
  const { reference } = useParams<{ reference: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!reference) return;
    const [{ data: ord, error: oErr }, { data: cfg }] = await Promise.all([
      supabase.from('orders').select('*, order_items(*)').eq('reference', reference).single(),
      supabase.from('store_settings').select('bank_name, account_number, account_name, whatsapp').eq('id', 1).single(),
    ]);
    if (oErr) {
      setError(oErr.message);
    } else {
      setOrder(ord as Order);
      setSettings(cfg as StoreSettings);
    }
    setLoading(false);
  }, [reference]);

  useEffect(() => {
    load();
  }, [load]);

  const editable = order?.status === 'pending';

  const changeQty = async (itemId: string, qty: number) => {
    if (!order || qty < 1) return;
    const newItems = order.order_items!.map((i) => (i.id === itemId ? { ...i, quantity: qty } : i));
    const newSubtotal = newItems.reduce((t, i) => t + i.price * i.quantity, 0);
    setOrder({ ...order, order_items: newItems, subtotal: newSubtotal });
    await supabase.from('order_items').update({ quantity: qty }).eq('id', itemId);
    await supabase.from('orders').update({ subtotal: newSubtotal }).eq('id', order.id);
  };

  const markPaid = async () => {
    if (!order) return;
    await supabase.from('orders').update({ status: 'awaiting_confirmation' }).eq('id', order.id);
    setOrder({ ...order, status: 'awaiting_confirmation' });
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-32 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Order not found</h1>
        <p className="text-slate-500 mt-2">{error}</p>
        <Link to="/products" className="text-blue-600 mt-4 inline-block hover:underline">Back to products</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500">Order</p>
          <h1 className="text-2xl font-bold text-slate-900 font-mono">{order.reference}</h1>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${STATUS_STYLES[order.status]}`}>
          {STATUS_LABELS[order.status]}
        </span>
      </div>

      {order.status === 'paid' && (
        <div className="flex items-center gap-2 bg-green-50 text-green-800 rounded-lg p-4 mb-6">
          <CheckCircle2 className="h-5 w-5" /> Payment confirmed. Thank you!
        </div>
      )}

      {/* Items */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 space-y-4">
        {order.order_items?.map((item) => (
          <div key={item.id} className="flex gap-4 items-center">
            <div className="w-16 h-20 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
              {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900">{item.name}</p>
              <p className="text-xs text-gray-500">{item.size} · {item.color}</p>
              <p className="text-sm text-slate-700 mt-1">{formatCurrency(item.price)}</p>
            </div>
            {editable ? (
              <div className="flex items-center border border-gray-200 rounded-md">
                <button onClick={() => changeQty(item.id, item.quantity - 1)} disabled={item.quantity <= 1} className="p-1.5 text-gray-500 hover:bg-gray-50">
                  <Minus className="h-3 w-3" />
                </button>
                <span className="px-3 text-sm font-medium">{item.quantity}</span>
                <button onClick={() => changeQty(item.id, item.quantity + 1)} className="p-1.5 text-gray-500 hover:bg-gray-50">
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <span className="text-sm text-gray-500">×{item.quantity}</span>
            )}
          </div>
        ))}
        <div className="flex justify-between border-t border-gray-100 pt-4 font-bold text-slate-900">
          <span>Total</span>
          <span>{formatCurrency(order.subtotal)}</span>
        </div>
      </div>

      {/* Payment */}
      {(order.status === 'pending' || order.status === 'awaiting_confirmation') && (
        <>
          <PayToCard settings={settings} reference={order.reference} subtotal={order.subtotal} />
          {order.status === 'pending' && (
            <button
              onClick={markPaid}
              className="w-full mt-5 bg-slate-900 text-white font-semibold py-4 rounded-lg hover:bg-slate-800 transition-colors"
            >
              I’ve made the transfer
            </button>
          )}
          {order.status === 'awaiting_confirmation' && (
            <p className="text-center text-sm text-blue-700 mt-5">
              Thanks! We’re confirming your transfer — your status will update once verified.
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default OrderPage;
