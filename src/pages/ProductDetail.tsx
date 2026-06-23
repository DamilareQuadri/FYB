import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShoppingCart, ChevronRight, Loader2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatCurrency, cn } from '../utils/helpers';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setProduct(data);
      } catch (err: any) {
        console.error('Error fetching product:', err);
        setFetchError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-32 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (fetchError || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-slate-900">Product not found</h2>
        <p className="text-slate-500 mt-2">{fetchError}</p>
        <Link to="/products" className="text-blue-600 mt-4 inline-block hover:underline">Back to products</Link>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (!selectedSize || !selectedColor) {
      setError('Please select a size and color.');
      return;
    }
    setError('');
    addToCart({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: product.price,
      size: selectedSize,
      color: selectedColor,
      quantity: 1,
      image: product.images[0]
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link to="/" className="hover:text-slate-900">Home</Link>
        <ChevronRight className="h-4 w-4" />
        <Link to="/products" className="hover:text-slate-900">Products</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-slate-900 font-medium">{product.category}</span>
      </nav>

      <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
        {/* Left: Image Gallery */}
        <div className="w-full lg:w-1/2">
          <div className="bg-gray-100 rounded-2xl overflow-hidden aspect-[4/5] relative">
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover object-center"
            />
          </div>
          <div className="flex gap-4 mt-4">
            <div className="w-24 h-24 rounded-lg bg-gray-100 border-2 border-slate-900 overflow-hidden cursor-pointer">
              <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>

        {/* Right: Product Info */}
        <div className="w-full lg:w-1/2 flex flex-col">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-2">{product.name}</h1>
          <p className="text-2xl text-slate-700 font-medium mb-6">{formatCurrency(product.price)}</p>

          <p className="text-slate-600 leading-relaxed mb-8">
            {product.description}
          </p>

          <div className="w-full h-px bg-gray-200 mb-8"></div>

          {/* Color Selection */}
          {product.colors && product.colors.length > 0 && (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-slate-900">Color</span>
                <span className="text-sm text-slate-500">{selectedColor || 'Select a color'}</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {product.colors.map((color: string) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={cn(
                      "px-4 py-2 border rounded-md text-sm font-medium transition-all",
                      selectedColor === color
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-gray-200 text-slate-700 hover:border-slate-400 bg-white"
                    )}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size Selection */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-slate-900">Size</span>
                <button className="text-sm text-gray-500 underline hover:text-slate-900">Size Guide</button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {product.sizes.map((size: string) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={cn(
                      "py-3 border rounded-md text-sm font-medium transition-all text-center",
                      selectedSize === size
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-gray-200 text-slate-700 hover:border-slate-400 bg-white"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <button
            onClick={handleAddToCart}
            className="w-full bg-black text-white rounded-xl py-4 font-semibold text-lg hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-3 mb-8"
          >
            <ShoppingCart className="h-5 w-5" />
            Add to Cart
          </button>

          <div className="border-t border-gray-200 divide-y divide-gray-200">
            <details className="group py-4 cursor-pointer" open>
              <summary className="flex justify-between items-center font-medium list-none text-slate-900">
                <span>Fabric & Care</span>
                <span className="transition group-open:rotate-180">
                  <svg fill="none" height="24" shape-rendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                </span>
              </summary>
              <p className="text-slate-500 mt-3 text-sm leading-relaxed">
                Machine wash cold with like colors. Tumble dry low. Do not bleach. Cool iron if needed.
              </p>
            </details>
            <details className="group py-4 cursor-pointer">
              <summary className="flex justify-between items-center font-medium list-none text-slate-900">
                <span>Shipping & Returns</span>
                <span className="transition group-open:rotate-180">
                  <svg fill="none" height="24" shape-rendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                </span>
              </summary>
              <p className="text-slate-500 mt-3 text-sm leading-relaxed">
                Free standard shipping on orders over ₦50,000. Return within 30 days of purchase for a full refund.
              </p>
            </details>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
