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

    // Handler for any brand changes
    const handleBrandChange = () => {
      dispatch(apiSlice.util.invalidateTags(['Brand', 'Product']));
    };

    // Handler for any category changes
    const handleCategoryChange = () => {
      dispatch(apiSlice.util.invalidateTags(['Category', 'Product']));
    };

    inventoryChannel
      .listen('.product.created', handleProductChange)
      .listen('ProductCreated', handleProductChange)
      .listen('.product.updated', handleProductChange)
      .listen('ProductUpdated', handleProductChange)
      .listen('.product.deleted', handleProductChange)
      .listen('ProductDeleted', handleProductChange)
      .listen('.brand.created', handleBrandChange)
      .listen('BrandCreated', handleBrandChange)
      .listen('.brand.updated', handleBrandChange)
      .listen('BrandUpdated', handleBrandChange)
      .listen('.brand.deleted', handleBrandChange)
      .listen('BrandDeleted', handleBrandChange)
      .listen('.category.created', handleCategoryChange)
      .listen('CategoryCreated', handleCategoryChange)
      .listen('.category.updated', handleCategoryChange)
      .listen('CategoryUpdated', handleCategoryChange)
      .listen('.category.deleted', handleCategoryChange)
      .listen('CategoryDeleted', handleCategoryChange);

    // Handler for any reparation changes
    const handleReparationChange = (data) => {
      console.log('[RealtimeSync] Reparation event received:', data);
      dispatch(apiSlice.util.invalidateTags(['Reparation', 'ReparationInventoryPart', 'Product', 'LowStock', 'DailyReport']));
    };

    // Handler for workshop reparation spare parts changes
    const handleReparationInventoryChange = (data) => {
      console.log('[RealtimeSync] Reparation inventory part event received:', data);
      dispatch(apiSlice.util.invalidateTags(['ReparationInventoryPart', 'Reparation']));
    };

    // Listen to reparation and inventory events on the core inventory channel too
    inventoryChannel
      .listen('.reparation.created', handleReparationChange)
      .listen('ReparationCreated', handleReparationChange)
      .listen('.reparation.updated', handleReparationChange)
      .listen('ReparationUpdated', handleReparationChange)
      .listen('.reparation.deleted', handleReparationChange)
      .listen('ReparationDeleted', handleReparationChange)
      .listen('.inventory.part.changed', handleReparationInventoryChange)
      .listen('ReparationInventoryPartChanged', handleReparationInventoryChange);

    // Subscribe to transactions channel
    const transactionsChannel = echo.channel('transactions');
    const handleTransactionChange = () => {
      dispatch(apiSlice.util.invalidateTags(['Transaction', 'Product', 'LowStock', 'DailyReport']));
    };

    transactionsChannel
      .listen('.transaction.created', handleTransactionChange)
      .listen('TransactionCreated', handleTransactionChange);

    // Subscribe to reparations channel
    const reparationsChannel = echo.channel('reparations');
    reparationsChannel
      .listen('.reparation.created', handleReparationChange)
      .listen('ReparationCreated', handleReparationChange)
      .listen('.reparation.updated', handleReparationChange)
      .listen('ReparationUpdated', handleReparationChange)
      .listen('.reparation.deleted', handleReparationChange)
      .listen('ReparationDeleted', handleReparationChange)
      .listen('.inventory.part.changed', handleReparationInventoryChange)
      .listen('ReparationInventoryPartChanged', handleReparationInventoryChange);

    // Subscribe to workshop reparation inventory channel
    const reparationInventoryChannel = echo.channel('reparation-inventory');
    reparationInventoryChannel
      .listen('.inventory.part.changed', handleReparationInventoryChange)
      .listen('ReparationInventoryPartChanged', handleReparationInventoryChange)
      .listen('.reparation.created', handleReparationChange)
      .listen('ReparationCreated', handleReparationChange)
      .listen('.reparation.updated', handleReparationChange)
      .listen('ReparationUpdated', handleReparationChange);

    return () => {
      inventoryChannel.stopListening('.product.created');
      inventoryChannel.stopListening('ProductCreated');
      inventoryChannel.stopListening('.product.updated');
      inventoryChannel.stopListening('ProductUpdated');
      inventoryChannel.stopListening('.product.deleted');
      inventoryChannel.stopListening('ProductDeleted');
      inventoryChannel.stopListening('.brand.created');
      inventoryChannel.stopListening('BrandCreated');
      inventoryChannel.stopListening('.brand.updated');
      inventoryChannel.stopListening('BrandUpdated');
      inventoryChannel.stopListening('.brand.deleted');
      inventoryChannel.stopListening('BrandDeleted');
      inventoryChannel.stopListening('.category.created');
      inventoryChannel.stopListening('CategoryCreated');
      inventoryChannel.stopListening('.category.updated');
      inventoryChannel.stopListening('CategoryUpdated');
      inventoryChannel.stopListening('.category.deleted');
      inventoryChannel.stopListening('CategoryDeleted');
      inventoryChannel.stopListening('.reparation.created');
      inventoryChannel.stopListening('ReparationCreated');
      inventoryChannel.stopListening('.reparation.updated');
      inventoryChannel.stopListening('ReparationUpdated');
      inventoryChannel.stopListening('.reparation.deleted');
      inventoryChannel.stopListening('ReparationDeleted');
      inventoryChannel.stopListening('.inventory.part.changed');
      inventoryChannel.stopListening('ReparationInventoryPartChanged');

      transactionsChannel.stopListening('.transaction.created');
      transactionsChannel.stopListening('TransactionCreated');

      reparationsChannel.stopListening('.reparation.created');
      reparationsChannel.stopListening('ReparationCreated');
      reparationsChannel.stopListening('.reparation.updated');
      reparationsChannel.stopListening('ReparationUpdated');
      reparationsChannel.stopListening('.reparation.deleted');
      reparationsChannel.stopListening('ReparationDeleted');
      reparationsChannel.stopListening('.inventory.part.changed');
      reparationsChannel.stopListening('ReparationInventoryPartChanged');

      reparationInventoryChannel.stopListening('.inventory.part.changed');
      reparationInventoryChannel.stopListening('ReparationInventoryPartChanged');
      reparationInventoryChannel.stopListening('.reparation.created');
      reparationInventoryChannel.stopListening('ReparationCreated');
      reparationInventoryChannel.stopListening('.reparation.updated');
      reparationInventoryChannel.stopListening('ReparationUpdated');

      echo.leaveChannel('inventory');
      echo.leaveChannel('transactions');
      echo.leaveChannel('reparations');
      echo.leaveChannel('reparation-inventory');
    };
  }, [dispatch]);

  return { isConnected };
}

export default useRealtimeSync;
