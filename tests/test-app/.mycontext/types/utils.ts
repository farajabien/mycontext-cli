import { OrderStatus, ShippingOption, PaymentMethod } from "./enums";

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface FormValidationResult<T> {
  isValid: boolean;
  errors: Partial<Record<keyof T, string>>;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface OrderSummary {
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  shippingOption: ShippingOption;
  paymentMethod: PaymentMethod;
  estimatedDelivery?: Date;
}