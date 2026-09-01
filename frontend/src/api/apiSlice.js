import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.token || localStorage.getItem('auth_token');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      headers.set('Accept', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Product', 'Category', 'Brand', 'Transaction', 'LowStock', 'DailyReport'],
  endpoints: (builder) => ({
    // Auth
    login: builder.mutation({
      query: (credentials) => ({
        url: '/login',
        method: 'POST',
        body: credentials,
      }),
    }),

    // Daily Report
    getDailyReport: builder.query({
      query: (date) => `/reports/daily${date ? `?date=${date}` : ''}`,
      providesTags: ['DailyReport'],
    }),

    // Products
    getProducts: builder.query({
      query: (params = {}) => {
        const queryParams = new URLSearchParams(params).toString();
        return `/products${queryParams ? `?${queryParams}` : ''}`;
      },
      providesTags: (result) =>
        result && result.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'Product', id })),
              { type: 'Product', id: 'LIST' },
            ]
          : [{ type: 'Product', id: 'LIST' }],
    }),
    getProductById: builder.query({
      query: (id) => `/products/${id}`,
      providesTags: (result, error, id) => [{ type: 'Product', id }],
    }),
    getLowStockAlerts: builder.query({
      query: () => '/products/low-stock',
      providesTags: ['LowStock'],
    }),
    createProduct: builder.mutation({
      query: (formData) => ({
        url: '/products',
        method: 'POST',
        body: formData, // Can be FormData or object
      }),
      invalidatesTags: [{ type: 'Product', id: 'LIST' }, 'LowStock', 'Category', 'DailyReport'],
    }),
    updateProduct: builder.mutation({
      query: ({ id, formData }) => ({
        url: `/products/${id}`,
        method: 'POST', // Use POST with _method=PUT for multipart/form-data in Laravel if image file included
        body: formData,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Product', id },
        { type: 'Product', id: 'LIST' },
        'LowStock',
        'DailyReport',
      ],
    }),
    deleteProduct: builder.mutation({
      query: (id) => ({
        url: `/products/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Product', id: 'LIST' }, 'LowStock', 'DailyReport'],
    }),

    // Categories
    getCategories: builder.query({
      query: (params = {}) => {
        const queryParams = new URLSearchParams(params).toString();
        return `/categories${queryParams ? `?${queryParams}` : ''}`;
      },
      providesTags: ['Category'],
    }),
    createCategory: builder.mutation({
      query: (categoryData) => ({
        url: '/categories',
        method: 'POST',
        body: categoryData,
      }),
      invalidatesTags: ['Category'],
    }),
    updateCategory: builder.mutation({
      query: ({ id, ...categoryData }) => ({
        url: `/categories/${id}`,
        method: 'PUT',
        body: categoryData,
      }),
      invalidatesTags: ['Category'],
    }),
    deleteCategory: builder.mutation({
      query: (id) => ({
        url: `/categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Category'],
    }),

    // Brands
    getBrands: builder.query({
      query: () => '/brands',
      providesTags: ['Brand'],
    }),
    createBrand: builder.mutation({
      query: (brandData) => ({
        url: '/brands',
        method: 'POST',
        body: brandData,
      }),
      invalidatesTags: ['Brand', { type: 'Product', id: 'LIST' }],
    }),
    updateBrand: builder.mutation({
      query: ({ id, ...brandData }) => ({
        url: `/brands/${id}`,
        method: 'PUT',
        body: brandData,
      }),
      invalidatesTags: ['Brand', { type: 'Product', id: 'LIST' }],
    }),
    deleteBrand: builder.mutation({
      query: (id) => ({
        url: `/brands/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Brand', { type: 'Product', id: 'LIST' }],
    }),

    // Images
    addProductImage: builder.mutation({
      query: ({ productId, ...imageData }) => ({
        url: `/products/${productId}/images`,
        method: 'POST',
        body: imageData,
      }),
      invalidatesTags: (result, error, { productId }) => [{ type: 'Product', id: productId }],
    }),
    deleteProductImage: builder.mutation({
      query: ({ imageId }) => ({
        url: `/images/${imageId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Product', id: 'LIST' }],
    }),

    // Transactions
    getTransactions: builder.query({
      query: (params = {}) => {
        const queryParams = new URLSearchParams(params).toString();
        return `/transactions${queryParams ? `?${queryParams}` : ''}`;
      },
      providesTags: ['Transaction'],
    }),
    createTransaction: builder.mutation({
      query: (transactionData) => ({
        url: '/transactions',
        method: 'POST',
        body: transactionData,
      }),
      invalidatesTags: ['Transaction', { type: 'Product', id: 'LIST' }, 'LowStock', 'DailyReport'],
    }),

    // Scanner / POS
    getScannerProduct: builder.query({
      query: (barcode) => `/scanner/products/${barcode}`,
    }),
    processScannerSale: builder.mutation({
      query: (saleData) => ({
        url: '/scanner/sales',
        method: 'POST',
        body: saleData,
      }),
      invalidatesTags: ['Transaction', { type: 'Product', id: 'LIST' }, 'LowStock', 'DailyReport'],
    }),
  }),
});

export const {
  useLoginMutation,
  useGetDailyReportQuery,
  useGetProductsQuery,
  useGetProductByIdQuery,
  useGetLowStockAlertsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useGetBrandsQuery,
  useCreateBrandMutation,
  useUpdateBrandMutation,
  useDeleteBrandMutation,
  useAddProductImageMutation,
  useDeleteProductImageMutation,
  useGetTransactionsQuery,
  useCreateTransactionMutation,
  useLazyGetScannerProductQuery,
  useProcessScannerSaleMutation,
} = apiSlice;
