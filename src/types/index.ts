export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  images: string[];
  category: string;
  sizes: string[];
  colors: string[];
  is_new?: boolean;
  created_at?: string;
}

export interface CartItem {
  id: string;          // cart_item row id (or temp id before first DB sync)
  productId: string;
  name: string;
  price: number;
  size: string;
  color: string;
  quantity: number;
  image: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  image: string | null;
  size: string;
  color: string;
  quantity: number;
}

export interface Order {
  id: string;
  reference: string;
  status: 'pending' | 'awaiting_confirmation' | 'paid' | 'cancelled' | 'fulfilled';
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  subtotal: number;
  created_at: string;
  order_items?: OrderItem[];
}

export interface StoreSettings {
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  whatsapp: string | null;
}
