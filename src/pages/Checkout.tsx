import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/helpers';

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { items, subtotal, cartId, customerName, setCustomerName } = useCart();

  const [name, setName] = useState(customerName);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (customerName) setName(customerName);
  }, [customerName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cartId) {
      setError('Your cart is still loading. Please try again in a moment.');
      return;
    }
    if (items.length === 0) {
      setError('Your cart is empty.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      if (name && name !== customerName) setCustomerName(name);
      const { data, error: rpcError } = await supabase.rpc('place_order', {
        p_cart_id: cartId,
        p_name: name,
        p_phone: phone,
        p_address: address,
      });
      if (rpcError) throw rpcError;
      navigate(`/order/${data.reference}`);
    } catch (err: any) {
      console.error('place_order failed:', err);
      setError(err.message ?? 'Could not place your order. Please try again.');
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Your cart is empty</h1>
        <Link to="/products" className="text-blue-600 mt-4 inline-block hover:underline">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link to="/products" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-slate-900 mb-8">
        <ArrowLeft className="h-4 w-4" /> Continue shopping
      </Link>
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Full name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Phone number</label>
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="e.g., 0803 000 0000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Delivery address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="Where should we deliver?"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-slate-900 text-white font-semibold py-4 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : `Place order — ${formatCurrency(subtotal)}`}
          </button>
          <p className="text-xs text-gray-500 text-center">
            You’ll get bank details + a reference to complete payment by transfer.
          </p>
        </form>

        {/* Summary */}
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 h-fit">
          <h2 className="font-semibold text-slate-900 mb-4">Order summary</h2>
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex gap-3">
                <div className="w-14 h-16 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                  {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 text-sm">
                  <p className="font-medium text-slate-900 line-clamp-1">{item.name}</p>
                  <p className="text-gray-500 text-xs">
                    {item.size} · {item.color} · ×{item.quantity}
                  </p>
                </div>
                <span className="text-sm font-semibold">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between border-t border-gray-200 mt-5 pt-4 font-bold text-slate-900">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
