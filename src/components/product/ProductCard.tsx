import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import type { Product } from '../../types';
import { useCart } from '../../context/CartContext';
import { formatCurrency } from '../../utils/helpers';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useCart();
  const [isHovered, setIsHovered] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigating to detail page
    // For quick add from grid, we select the first available size and color
    addToCart({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: product.price,
      size: product.sizes[0],
      color: product.colors[0],
      quantity: 1,
      image: product.images[0]
    });
  };

  return (
    <Link 
      to={`/products/${product.id}`}
      className="group relative flex flex-col block overflow-hidden rounded-xl bg-white transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Badges */}
      {product.is_new && (
        <div className="absolute top-3 left-3 z-10 bg-black text-white text-[10px] uppercase font-bold tracking-wider py-1 px-2 rounded-sm">
          New Arrival
        </div>
      )}

      {/* Image Container */}
      <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
        <img 
          src={product.images[0]} 
          alt={product.name} 
          className={`object-cover w-full h-full transition-transform duration-700 ease-in-out ${isHovered ? 'scale-110' : 'scale-100'}`}
        />
        
        {/* Quick Add Overlay */}
        <div 
          className={`absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
        >
          <button 
            onClick={handleAddToCart}
            className="w-full bg-white text-slate-900 font-semibold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors active:scale-95"
          >
            <ShoppingCart className="h-4 w-4" />
            Quick Add
          </button>
        </div>
      </div>

      {/* Details */}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex justify-between items-start gap-2 mb-1">
          <h3 className="text-sm font-semibold text-slate-900 line-clamp-1">{product.name}</h3>
          <span className="font-bold text-sm text-slate-900 whitespace-nowrap">{formatCurrency(product.price)}</span>
        </div>
        <p className="text-xs text-gray-500 mb-4">{product.category}</p>
        
        {/* Hover Sizes indicator */}
        <div className={`mt-auto text-xs text-gray-500 flex gap-2 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          {product.sizes.map(size => (
            <span key={size} className="bg-gray-100 px-2 py-1 rounded">{size}</span>
          ))}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
