import { useCallback, useEffect, useState } from 'react';
import type { Order } from '@/types';
import { INITIAL_ORDERS } from '@/data/mockData';
import { loadStoredData, saveStoredData } from '@/lib/supabase';

export function useOrdersStore() {
  const [orders, setOrders] = useState<Order[]>(() =>
    loadStoredData('ORDERS', INITIAL_ORDERS)
  );

  useEffect(() => {
    saveStoredData('ORDERS', orders);
  }, [orders]);

  const addOrder = useCallback((order: Order) => {
    setOrders((current) => [order, ...current]);
  }, []);

  const updateOrder = useCallback((updatedOrder: Order) => {
    setOrders((current) =>
      current.map((order) => order.id === updatedOrder.id ? updatedOrder : order)
    );
  }, []);

  return { orders, addOrder, updateOrder };
}
