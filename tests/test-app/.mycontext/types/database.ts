import { ProductCategory, OrderStatus, ShippingOption, PaymentMethod } from "./enums";

export interface ProductDB {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  brand: string;
  images: string[];
  stock: number;
  rating: number;
  reviewCount: number;
  createdAt: Date;
  sku?: string;
}

export interface UserDB {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  createdAt: Date;
}

export interface OrderDB {
  id: string;
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  status: OrderStatus;
  shippingAddress: Address;
  paymentMethod: PaymentMethod;
  createdAt: Date;
}

export interface CartItemDB {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  addedAt: Date;
}

export interface WishlistItemDB {
  id: string;
  userId: string;
  productId: string;
  addedAt: Date;
}

export interface ReviewDB {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: Date;
}