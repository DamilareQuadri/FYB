import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Trash2, Plus, Minus, Share2, Send, Check } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { formatCurrency } from '../../utils/helpers';

const CartDrawer: React.FC = () => {
  const navigate = useNavigate();
  const {
    isCartOpen,
    closeCart,
    items,
    updateQuantity,
    removeFromCart,
    subtotal,
    customerName,
    setCustomerName,
    shareCart,
    sendCartToAdmin,
  } = useCart();

  const [shared, setShared] = useState(false);
  const [sentToAdmin, setSentToAdmin] = useState(false);

  const handleShare = async () => {
    const url = shareCart();
    if (!url) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'My FYB cart', url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        /* noop */
      }
    }
    setShared(true);
    setTimeout(() => setShared(false), 1800);
  };

  const handleSendToAdmin = async () => {
    await sendCartToAdmin();
    setSentToAdmin(true);
    setTimeout(() => setSentToAdmin(false), 1800);
  };

  const goCheckout = () => {
    closeCart();
    navigate('/checkout');
  };

  return (
    <>
      {isCartOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity"
          onClick={closeCart}
        />
      )}

      <div
        className={`fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isCartOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-slate-900">Your Cart ({items.length})</h2>
          <button onClick={closeCart} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-slate-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {items.length === 0 ? (
            <div className="text-center text-slate-500 mt-10">
              <p>Your cart is currently empty.</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex gap-4 border-b border-gray-50 pb-6 last:border-0">
                <div className="w-20 h-24 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                  {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="text-sm font-medium text-slate-900 line-clamp-2">{item.name}</h3>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Size: {item.size} | Color: {item.color}</p>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border border-gray-200 rounded-md">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-1 px-2 text-gray-500 hover:bg-gray-50"
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm px-2 font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-1 px-2 text-gray-500 hover:bg-gray-50"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="font-semibold text-sm text-slate-900">{formatCurrency(item.price)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-gray-100 p-6 bg-gray-50 space-y-4">
            {/* Name on cart */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Your name (optional)</label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Add your name to this cart"
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Share + send to admin */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleShare}
                className="flex items-center justify-center gap-2 border border-slate-300 bg-white rounded-lg py-2.5 text-sm font-medium text-slate-700 hover:bg-gray-50"
              >
                {shared ? <><Check className="h-4 w-4 text-green-600" /> Copied</> : <><Share2 className="h-4 w-4" /> Share cart</>}
              </button>
              <button
                onClick={handleSendToAdmin}
                className="flex items-center justify-center gap-2 border border-slate-300 bg-white rounded-lg py-2.5 text-sm font-medium text-slate-700 hover:bg-gray-50"
              >
                {sentToAdmin ? <><Check className="h-4 w-4 text-green-600" /> Sent</> : <><Send className="h-4 w-4" /> Send to admin</>}
              </button>
            </div>

            <div className="flex justify-between items-center text-slate-900">
              <span className="font-medium">Subtotal</span>
              <span className="font-bold text-lg">{formatCurrency(subtotal)}</span>
            </div>
            <button
              onClick={goCheckout}
              className="w-full bg-slate-900 text-white font-semibold py-4 rounded-lg hover:bg-slate-800 transition-colors shadow-lg active:scale-[0.98]"
            >
              Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
