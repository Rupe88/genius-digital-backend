'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { HiPlus, HiPencil, HiTrash, HiEye, HiSearch, HiFilter } from 'react-icons/hi';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { productsApi, Product } from '@/lib/api/products';
import { ROUTES } from '@/lib/utils/constants';
import toast from 'react-hot-toast';

interface ProductWithCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  price: number;
  originalPrice?: number;
  category?: string | { name: string;[key: string]: any };
  images: string[];
  featured: boolean;
  published: boolean;
  stockQuantity: number;
  sku?: string;
  status?: string;

  // Vastu specific fields
  productType?: string;
  vastuPurpose?: string;
  energyType?: string;
  material?: string;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  tags?: string[];
  createdAt: string;
  updatedAt: string;

  // Additional fields from API
  categoryDetails?: {
    id: string;
    name: string;
  };
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [featuredFilter, setFeaturedFilter] = useState<string>('all');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productsApi.getAll();
      if (response.success) {
        setProducts(response.data || []);
      } else {
        toast.error('Failed to fetch products');
      }
    } catch (error) {
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const response = await productsApi.delete(id);
      if (response.success) {
        toast.success('Product deleted successfully');
        fetchProducts();
      } else {
        toast.error('Failed to delete product');
      }
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
    const matchesFeatured = featuredFilter === 'all' ||
      (featuredFilter === 'featured' && product.featured) ||
      (featuredFilter === 'not-featured' && !product.featured);

    return matchesSearch && matchesStatus && matchesFeatured;
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800';
      case 'OUT_OF_STOCK':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-none h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products Management</h1>
          <p className="text-gray-600">Manage your Vastu products and store items</p>
        </div>
        <Link href={`${ROUTES.ADMIN}/products/new`}>
          <Button className="bg-red-600 hover:bg-red-700">
            <HiPlus className="h-4 w-4 mr-2" />
            Add New Product
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>

          {/* Featured Filter */}
          <select
            value={featuredFilter}
            onChange={(e) => setFeaturedFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="all">All Products</option>
            <option value="featured">Featured</option>
            <option value="not-featured">Not Featured</option>
          </select>

          {/* Reset Filters */}
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setFeaturedFilter('all');
            }}
            className="flex items-center justify-center"
          >
            <HiFilter className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </Card>

      {/* Products Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Featured
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {product.images && product.images.length > 0 ? (
                          <Image
                            src={product.images[0]}
                            alt={product.name}
                            width={40}
                            height={40}
                            className="h-10 w-10 rounded-none object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-none bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-500 text-sm">No Image</span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {product.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {product.categoryDetails?.name ||
                            (typeof product.category === 'object' && product.category !== null
                              ? (product.category as any).name
                              : product.category) ||
                            'No Category'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatPrice(product.price)}
                    </div>
                    {product.originalPrice && product.originalPrice > product.price && (
                      <div className="text-sm text-gray-500 line-through">
                        {formatPrice(product.originalPrice)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{product.stockQuantity}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-none ${getStatusColor(product.status || 'ACTIVE')}`}>
                      {product.status || 'ACTIVE'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {product.featured ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-none bg-yellow-100 text-yellow-800">
                        Featured
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Link href={`${ROUTES.ADMIN}/products/${product.id}`}>
                        <Button variant="outline" size="sm">
                          <HiEye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`${ROUTES.ADMIN}/products/${product.id}/edit`}>
                        <Button variant="outline" size="sm">
                          <HiPencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteProduct(product.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <HiTrash className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500">
                {products.length === 0 ? 'No products found. Create your first product!' : 'No products match your filters.'}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
