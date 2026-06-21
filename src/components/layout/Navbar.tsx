import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Search, Menu } from 'lucide-react';
import { useCart } from '../../context/CartContext';

const Navbar: React.FC = () => {
  const { openCart, items } = useCart();
  const navigate = useNavigate();
  const [term, setTerm] = useState('');

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(term.trim() ? `/products?q=${encodeURIComponent(term.trim())}` : '/products');
  };

  return (
    <nav className="sticky top-0 z-40 w-full bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="text-2xl font-bold tracking-tighter text-slate-900">
              FYB
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex space-x-8">
            <Link to="/" className="text-slate-900 font-medium hover:text-slate-600 border-b-2 border-slate-900 pb-1">Home</Link>
            <Link to="/products" className="text-slate-500 font-medium hover:text-slate-900">Product</Link>
            <Link to="/about" className="text-slate-500 font-medium hover:text-slate-900">About</Link>
            <Link to="/contact" className="text-slate-500 font-medium hover:text-slate-900">Contact</Link>
          </div>

          {/* Right Section: Search & Icons */}
          <div className="flex items-center space-x-4 md:space-x-6">
            <form onSubmit={submitSearch} className="hidden lg:flex relative">
              <input
                type="text"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search for products"
                className="bg-gray-100 border-none rounded-full py-1.5 pl-4 pr-10 text-sm focus:ring-2 focus:ring-slate-900 outline-none w-48"
              />
              <button type="submit" aria-label="Search" className="absolute right-3 top-2 text-gray-400 hover:text-slate-900">
                <Search className="h-4 w-4" />
              </button>
            </form>

            <button className="text-slate-700 hover:text-black transition-colors">
              <User className="h-6 w-6" />
            </button>

            <button 
              onClick={openCart}
              className="text-slate-700 hover:text-black transition-colors relative"
            >
              <ShoppingCart className="h-6 w-6" />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>

            <button className="md:hidden text-slate-700">
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
