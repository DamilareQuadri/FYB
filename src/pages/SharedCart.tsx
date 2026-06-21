import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const SharedCart: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { refresh, openCart } = useCart();
  const { userId } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    if (!token || !userId || done.current) return;
    done.current = true;
    (async () => {
      const { error: rpcError } = await supabase.rpc('clone_shared_cart', { p_token: token });
      if (rpcError) {
        setError(rpcError.message);
        return;
      }
      await refresh();
      openCart();
      navigate('/checkout');
    })();
  }, [token, userId, refresh, openCart, navigate]);

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-slate-900">This shared cart link is invalid</h1>
        <p className="text-slate-500 mt-2">{error}</p>
        <Link to="/products" className="text-blue-600 mt-4 inline-block hover:underline">Browse products instead</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-32 flex flex-col items-center text-center">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      <p className="text-slate-500 mt-4">Loading the shared cart…</p>
    </div>
  );
};

export default SharedCart;
