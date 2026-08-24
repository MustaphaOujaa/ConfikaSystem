import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { apiSlice } from '../api/apiSlice';
import echo from './echo';

export function useRealtimeSync() {
  const dispatch = useDispatch();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!echo) return;

    const pusher = echo.connector?.pusher;
    if (pusher && pusher.connection) {
      if (pusher.connection.state === 'connected') {
        setIsConnected(true);
      }
      pusher.connection.bind('connected', () => setIsConnected(true));
      pusher.connection.bind('disconnected', () => setIsConnected(false));
      pusher.connection.bind('unavailable', () => setIsConnected(false));
      pusher.connection.bind('failed', () => setIsConnected(false));
    }

    // Subscribe to inventory channel
    const inventoryChannel = echo.channel('inventory');
    
    // Handler for any product changes
    const handleProductChange = () => {
      dispatch(apiSlice.util.invalidateTags(['Product', 'LowStock', 'DailyReport']));
    };

    inventoryChannel
      .listen('.product.created', handleProductChange)
      .listen('ProductCreated', handleProductChange)
      .listen('.product.updated', handleProductChange)
      .listen('ProductUpdated', handleProductChange)
      .listen('.product.deleted', handleProductChange)
      .listen('ProductDeleted', handleProductChange);

    // Subscribe to transactions channel
    const transactionsChannel = echo.channel('transactions');
    const handleTransactionChange = () => {
      dispatch(apiSlice.util.invalidateTags(['Transaction', 'Product', 'LowStock', 'DailyReport']));
    };

    transactionsChannel
      .listen('.transaction.created', handleTransactionChange)
      .listen('TransactionCreated', handleTransactionChange);

    return () => {
      inventoryChannel.stopListening('.product.created');
      inventoryChannel.stopListening('ProductCreated');
      inventoryChannel.stopListening('.product.updated');
      inventoryChannel.stopListening('ProductUpdated');
      inventoryChannel.stopListening('.product.deleted');
      inventoryChannel.stopListening('ProductDeleted');
      transactionsChannel.stopListening('.transaction.created');
      transactionsChannel.stopListening('TransactionCreated');
      echo.leaveChannel('inventory');
      echo.leaveChannel('transactions');
    };
  }, [dispatch]);

  return { isConnected };
}

export default useRealtimeSync;
