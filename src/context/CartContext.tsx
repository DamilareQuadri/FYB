import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import type { CartItem } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface CartContextType {
  items: CartItem[];
  isCartOpen: boolean;
  cartId: string | null;
  shareToken: string | null;
  customerName: string;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (item: CartItem) => Promise<void>;
  removeFromCart: (id: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  setCustomerName: (name: string) => void;
  shareCart: () => string | null;
  sendCartToAdmin: () => Promise<void>;
  refresh: () => Promise<void>;
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const LS_KEY = 'fyb_cart';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userId } = useAuth();
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartId, setCartId] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [customerName, setCustomerNameState] = useState('');

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  // Ensure the signed-in (anonymous) user has an active cart
  useEffect(() => {
    if (!userId) return;
    let active = true;
    (async () => {
      let { data: cart } = await supabase
        .from('carts')
        .select('id, share_token, customer_name')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (!cart) {
        const ins = await supabase
          .from('carts')
          .insert({ user_id: userId })
          .select('id, share_token, customer_name')
          .single();
        if (ins.error) {
          // Race (unique active cart): re-fetch the one that won
          const retry = await supabase
            .from('carts')
            .select('id, share_token, customer_name')
            .eq('user_id', userId)
            .eq('status', 'active')
            .maybeSingle();
          cart = retry.data;
        } else {
          cart = ins.data;
        }
      }
      if (!active || !cart) return;
      setCartId(cart.id);
      setShareToken(cart.share_token);
      setCustomerNameState(cart.customer_name ?? '');
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  const loadItems = useCallback(async () => {
    if (!cartId) return;
    const { data } = await supabase
      .from('cart_items')
      .select('id, product_id, size, color, quantity, products(name, price, images)')
      .eq('cart_id', cartId)
      .order('created_at', { ascending: true });

    const mapped: CartItem[] = (data ?? []).map((r: any) => ({
      id: r.id,
      productId: r.product_id,
      name: r.products?.name ?? 'Product',
      price: r.products?.price ?? 0,
      size: r.size,
      color: r.color,
      quantity: r.quantity,
      image: r.products?.images?.[0] ?? '',
    }));
    setItems(mapped);
    localStorage.setItem(LS_KEY, JSON.stringify(mapped));
  }, [cartId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const updateQuantity = async (id: string, quantity: number) => {
    if (quantity < 1) return;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity } : i)));
    await supabase.from('cart_items').update({ quantity }).eq('id', id);
  };

  const removeFromCart = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await supabase.from('cart_items').delete().eq('id', id);
  };

  const addToCart = async (newItem: CartItem) => {
    if (!cartId) return;
    openCart();
    const existing = items.find(
      (i) =>
        i.productId === newItem.productId &&
        i.size === newItem.size &&
        i.color === newItem.color
    );
    if (existing) {
      await updateQuantity(existing.id, existing.quantity + newItem.quantity);
      return;
    }
    // Optimistic add, then reconcile ids from the DB
    setItems((prev) => [...prev, { ...newItem, id: `temp-${Date.now()}` }]);
    await supabase.from('cart_items').insert({
      cart_id: cartId,
      product_id: newItem.productId,
      size: newItem.size,
      color: newItem.color,
      quantity: newItem.quantity,
    });
    await loadItems();
  };

  const setCustomerName = (name: string) => {
    setCustomerNameState(name);
    if (cartId) {
      supabase.from('carts').update({ customer_name: name }).eq('id', cartId).then(() => {});
    }
  };

  const shareCart = () =>
    shareToken ? `${window.location.origin}/cart/${shareToken}` : null;

  const sendCartToAdmin = async () => {
    if (!cartId) return;
    await supabase.from('carts').update({ shared_with_admin: true }).eq('id', cartId);
  };

  const subtotal = useMemo(
    () => items.reduce((total, item) => total + item.price * item.quantity, 0),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        isCartOpen,
        cartId,
        shareToken,
        customerName,
        openCart,
        closeCart,
        addToCart,
        removeFromCart,
        updateQuantity,
        setCustomerName,
        shareCart,
        sendCartToAdmin,
        refresh: loadItems,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
