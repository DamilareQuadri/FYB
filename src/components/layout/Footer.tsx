import React from 'react';
import { Link } from 'react-router-dom';

// Inline brand SVGs — lucide-react does not include brand/social logos
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const TiktokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" />
  </svg>
);

const Footer: React.FC = () => {
  return (
    <footer className="bg-black text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand & Description */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-bold mb-4 tracking-tighter">FYB</h3>
            <p className="text-gray-400 text-sm max-w-sm mb-6 leading-relaxed">
              Premium clothing designed for the modern individual. Quality fabrics, tailored fits, and timeless designs that empower you to look and feel your best.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors"><InstagramIcon className="h-5 w-5" /></a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors"><FacebookIcon className="h-5 w-5" /></a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors"><TiktokIcon className="h-5 w-5" /></a>
            </div>
          </div>

          {/* Links Group 1 */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Pages</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link to="/products" className="hover:text-white transition-colors">Product</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Links Group 2 */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Products</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><Link to="/products" state={{ category: 'Corporate' }} className="hover:text-white transition-colors">Corporate</Link></li>
              <li><Link to="/products" state={{ category: 'Y2k/Denim' }} className="hover:text-white transition-colors">Y2k / Denim</Link></li>
              <li><Link to="/products" state={{ category: 'Jersey' }} className="hover:text-white transition-colors">Jersey</Link></li>
              <li><Link to="/products" state={{ category: 'Costume' }} className="hover:text-white transition-colors">Costume</Link></li>
              <li><Link to="/products" state={{ category: 'Owanbe' }} className="hover:text-white transition-colors">Owanbe</Link></li>
              <li><Link to="/products" state={{ category: 'Accesories' }} className="hover:text-white transition-colors">Accessories</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-800 pt-8 mt-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500">
          <p>&copy; {new Date().getFullYear()} FYB. All rights reserved.</p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms & Condition</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
