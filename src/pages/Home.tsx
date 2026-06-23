import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/product/ProductCard';
import HeroSlideshow from '../components/home/HeroSlideshow';
import { ArrowRight, Mail, MapPin, Phone, Filter, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CATEGORIES } from '../data';
import type { Product } from '../types';

const Home: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('newest');

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('products')
          .select('*')
          .limit(8);

        if (selectedCategory !== 'All') {
          query = query.eq('category', selectedCategory);
        }

        if (sortBy === 'newest') {
          query = query.order('created_at', { ascending: false });
        } else if (sortBy === 'price-low') {
          query = query.order('price', { ascending: true });
        } else if (sortBy === 'price-high') {
          query = query.order('price', { ascending: false });
        }

        const { data, error } = await query;
        if (error) throw error;
        setProducts(data || []);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [selectedCategory, sortBy]);

  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <HeroSlideshow />

      {/* Products Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Our Products</h2>
            </div>
            <Link to="/products" className="text-sm font-semibold text-slate-900 hover:text-slate-600 flex items-center gap-1">
              See all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Filters & Category Tabs */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${selectedCategory === category
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-gray-200 hover:border-slate-400 hover:bg-gray-50'
                    }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Sort by:</span>
              </div>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-white border border-gray-200 text-slate-700 text-sm rounded-lg pl-4 pr-10 py-2.5 outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
                >
                  <option value="newest">Newest Arrivals</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse flex flex-col gap-4">
                  <div className="bg-gray-200 rounded-xl aspect-[3/4] w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              ))
            ) : products.length > 0 ? (
              products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))
            ) : (
              <div className="col-span-4 text-center py-10 text-gray-500">
                <p>No products found in this category.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Info/About Section */}
      <section className="py-24 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-8">What is FYB?</h2>
            <div className="space-y-6 text-lg text-slate-600 leading-relaxed text-left" style={{ textAlign: 'justify' }}>
              <p>
                Let's be real: Final year is a lot. From chasing supervisors, to writing project chapters, and
                preparing for exams, the last thing you need is the stress of walking around market looking for Corporate
                Day suits or Denim Day jackets. That is exactly why we built FYB. We are here to take the stress out of your
                graduating week. We're going to stand as your digital fashion plug and ultimate mood board. Whether you need
                style inspiration to stand out or you want to shop for the perfect outfit with just a few clicks, we've got you covered.
                No market stress, just pure, premium vibes for your biggest week on campus. You did the hard work to graduate.
                Now, let us handle the looks!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-10">Get In Touch</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-shadow cursor-pointer">
              <Mail className="h-8 w-8 text-slate-900 mb-4" />
              <h3 className="font-semibold text-lg text-slate-900 mb-2">Email</h3>
              <a href='mailto:[EMAIL_ADDRESS]' className="text-slate-500" target="_blank">fyb@gmail.com</a>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-shadow cursor-pointer">
              <Phone className="h-8 w-8 text-slate-900 mb-4" />
              <h3 className="font-semibold text-lg text-slate-900 mb-2">Whatsapp</h3>
              <a href='https://wa.me/+2349027246597' className="text-slate-500" target="_blank">Reach out to us on Whatsapp</a>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-shadow cursor-pointer">
              <MapPin className="h-8 w-8 text-slate-900 mb-4" />
              <h3 className="font-semibold text-lg text-slate-900 mb-2">Address</h3>
              <a href='https://maps.google.com/?q=Lagos, Nigeria' className="text-slate-500" target="_blank">Lagos, Nigeria.</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
