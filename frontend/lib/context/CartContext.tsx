'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Course } from '@/lib/types/course';
import * as cartApi from '@/lib/api/cart';

interface CartItem {
  id: string;
  courseId?: string;
  productId?: string;
  course?: Course;
  product?: any;
  quantity: number;
  price: number;
}

interface CartContextType {
  items: CartItem[];
  loading: boolean;
  total: number;
  itemCount: number;
  addToCart: (courseId: string, productId?: string) => Promise<void>;
  removeFromCart: (id: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    try {
      setLoading(true);
      const cartData = await cartApi.getCart();
      setItems(cartData.items || []);
    } catch (error) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addToCart = async (courseId: string, productId?: string) => {
    await cartApi.addToCart(courseId, productId);
    await refreshCart();
  };

  const removeFromCart = async (id: string) => {
    await cartApi.removeFromCart(id);
    await refreshCart();
  };

  const clearCart = async () => {
    await cartApi.clearCart();
    await refreshCart();
  };

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        loading,
        total,
        itemCount,
        addToCart,
        removeFromCart,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

