import { useCallback, useEffect, useState } from 'react';
import type { ServiceBooking } from '@/types';
import { loadStoredData, saveStoredData } from '@/lib/supabase';

export function useBookingsStore() {
  const [bookings, setBookings] = useState<ServiceBooking[]>(() =>
    loadStoredData('BOOKINGS', [])
  );

  useEffect(() => {
    saveStoredData('BOOKINGS', bookings);
  }, [bookings]);

  const addBooking = useCallback((booking: ServiceBooking) => {
    setBookings((current) => [booking, ...current]);
  }, []);

  return { bookings, addBooking };
}
