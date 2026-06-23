import type { Product } from './types';

export interface Slide {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  description: string;
  align: 'left' | 'center' | 'right';
  ctaText: string;
  ctaLink: string;
}

export const HERO_SLIDES: Slide[] = [
  {
    id: 'slide-1',
    image: '/images/corporate_hero.png',
    title: 'Corporate Day',
    subtitle: 'Executive Style',
    description: 'Dress up in professional, formal business attire to prep for the corporate world',
    align: 'left',
    ctaText: 'Shop Now',
    ctaLink: '/products'
  },
  {
    id: 'slide-2',
    image: '/images/denim_hero.png',
    title: 'Denim Day',
    subtitle: 'Street & Denim',
    description: 'Pull out your best jeans, jackets, and overalls for a nostalgic or vintage Y2K',
    align: 'left',
    ctaText: 'Shop Now',
    ctaLink: '/products'
  },
  {
    id: 'slide-3',
    image: '/images/jersey_hero.png',
    title: 'Jersey Day',
    subtitle: 'Athletic Wear',
    description: 'Rep your favourite football or sport team',
    align: 'left',
    ctaText: 'Shop Now',
    ctaLink: '/products'
  },
  {
    id: 'slide-4',
    image: '/images/costume_hero.png',
    title: 'Costume Day',
    subtitle: 'Creative Expressions',
    description: 'Cosplay as one of your favourite characters from any movie, TV show, or game',
    align: 'left',
    ctaText: 'Shop Now',
    ctaLink: '/products'
  },
  {
    id: 'slide-5',
    image: '/images/owanbe_hero.png',
    title: 'Owanbe Day',
    subtitle: 'Cultural Heritage',
    description: 'Dress up in your traditional attire to showcase your cultural heritage',
    align: 'left',
    ctaText: 'Shop Now',
    ctaLink: '/products'
  }
];


export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Premium White Button-Down',
    price: 15000,
    description: 'A classic white button-down shirt tailored from the finest Egyptian cotton. Perfect for corporate wear or a sharp evening look. Features a modern cut and wrinkle-resistant fabric.',
    images: ['/images/premium_shirt_1781633323343.png'],
    category: 'Corporate',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['White', 'Light Blue', 'Navy'],
    is_new: true
  },
  {
    id: 'p2',
    name: 'Classic Leather Jacket',
    price: 45000,
    description: 'A premium black leather jacket featuring silver hardware and a tailored fit. An essential piece for cooler evenings and adding an edge to any outfit.',
    images: ['/images/premium_jacket_1781633353773.png'],
    category: 'Outerwear',
    sizes: ['M', 'L', 'XL'],
    colors: ['Black', 'Brown'],
    is_new: false
  },
  {
    id: 'p3',
    name: 'Tailored Dark Grey Trousers',
    price: 12000,
    description: 'Premium dark grey trousers tailored to perfection. Made from a comfortable wool blend that offers both breathability and a sharp silhouette.',
    images: ['/images/premium_pants_1781633365261.png'],
    category: 'Corporate',
    sizes: ['30', '32', '34', '36'],
    colors: ['Dark Grey', 'Black', 'Navy'],
    is_new: true
  },
  {
    id: 'p4',
    name: 'Denim Overshirt',
    price: 18000,
    description: 'A versatile, heavyweight denim overshirt that serves as a perfect layering piece. Features twin chest pockets and durable hardware.',
    images: ['/images/premium_shirt_1781633323343.png'], // Reusing image for mock purposes
    category: 'Y2k/Denim',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Vintage Wash', 'Indigo'],
    is_new: false
  }
];

export const CATEGORIES = [
  'All',
  'Corporate',
  'Y2k/Denim',
  'Jersey',
  'Costume',
  'Owanbe',
  'Footwear',
  'Accesories',
  'Sign-Out Shirt',
  'Sign-Out Jacket',
  'Sash'
];
