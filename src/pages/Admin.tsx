import React, { useState } from 'react';
import { Package, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CATEGORIES } from '../data';

const Admin: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    category: 'Corporate',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [sizes, setSizes] = useState({ S: true, M: true, L: true, XL: true });
  const [colors, setColors] = useState('Black, White');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const selectedSizes = Object.entries(sizes).filter(([_, isSelected]) => isSelected).map(([size]) => size);
      const colorArray = colors.split(',').map(c => c.trim()).filter(Boolean);
      
      let uploadedImageUrl = '';
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, imageFile);

        if (uploadError) {
          throw new Error(`Image upload failed: ${uploadError.message}`);
        }

        const { data } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);
          
        uploadedImageUrl = data.publicUrl;
      }

      const imagesArray = uploadedImageUrl ? [uploadedImageUrl] : ['/images/premium_shirt_1781633323343.png'];

      const { error } = await supabase.from('products').insert([
        {
          name: formData.name,
          price: Number(formData.price),
          description: formData.description,
          category: formData.category,
          images: imagesArray,
          sizes: selectedSizes,
          colors: colorArray,
          isNew: true
        }
      ]);

      if (error) throw error;
      
      alert('Product added successfully!');
      // Reset form
      setFormData({ name: '', price: '', description: '', category: 'Corporate' });
      setImageFile(null);
      
    } catch (error: any) {
      console.error('Error adding product:', error);
      alert(`Failed to add product: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className="w-64 bg-slate-900 text-white flex flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold tracking-tight">FYB Admin</h2>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <div className="flex items-center gap-3 bg-slate-800 text-white px-4 py-3 rounded-lg font-medium">
            <Package className="h-5 w-5" />
            Products
          </div>
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Add New Product</h1>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Product Title</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} type="text" className="w-full border-gray-300 rounded-lg shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm p-3 border outline-none" placeholder="e.g., Premium Denim Jacket" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Price (NGN)</label>
                  <input required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} type="number" min="0" className="w-full border-gray-300 rounded-lg shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm p-3 border outline-none" placeholder="0.00" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full border-gray-300 rounded-lg shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm p-3 border outline-none bg-white">
                  {CATEGORIES.filter(cat => cat !== 'All').map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={4} className="w-full border-gray-300 rounded-lg shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm p-3 border outline-none" placeholder="Detailed product description..." />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Available Sizes</label>
                <div className="flex gap-4">
                  {['S', 'M', 'L', 'XL'].map(size => (
                    <label key={size} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={sizes[size as keyof typeof sizes]} 
                        onChange={e => setSizes({...sizes, [size]: e.target.checked})}
                        className="w-4 h-4 text-slate-900 border-gray-300 rounded focus:ring-slate-900" 
                      />
                      <span className="text-sm font-medium text-slate-700">{size}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Colors (Comma separated)</label>
                <input required value={colors} onChange={e => setColors(e.target.value)} type="text" className="w-full border-gray-300 rounded-lg shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm p-3 border outline-none" placeholder="e.g., Black, Navy Blue, Ash" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Product Image</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setImageFile(e.target.files[0]);
                    }
                  }} 
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:border-slate-900 focus:ring-slate-900 sm:text-sm p-3 border outline-none bg-white" 
                />
                <p className="text-xs text-gray-500 mt-2">Upload a product image. Leave blank to use a placeholder.</p>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 bg-slate-900 border border-transparent rounded-lg shadow-sm py-3 px-6 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Saving...' : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add Product
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Admin;
