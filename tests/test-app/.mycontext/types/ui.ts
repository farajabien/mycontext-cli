import { ProductCategory, ShippingOption, PaymentMethod } from "./enums";
import { Address } from "./utils";

export interface ProductUI {
  id: string;
  name: string;
  price: number;
  category: ProductCategory;
  image: string;
  rating: number;
  reviewCount: number;
  stock: number;
  brand?: string;
  discountedPrice?: number;
  slug: string;
}

export interface CartItemUI {
  id: string;
  product: ProductUI;
  quantity: number;
  addedAt: Date;
}

export interface CheckoutFormData {
  shippingAddress: Address;
  shippingOption: ShippingOption;
  paymentMethod: PaymentMethod;
  saveAddress: boolean;
  agreeToTerms: boolean;
}

export interface FilterState {
  priceRange: [number, number];
  categories: ProductCategory[];
  brands: string[];
  minRating: number;
  inStock: boolean;
}