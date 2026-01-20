'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { HiArrowLeft, HiPencil, HiTrash, HiStar, HiShoppingCart } from 'react-icons/hi';
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
  category?: string;
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
  averageRating?: number;
  totalReviews?: number;
}

export default function ViewProductPage() {
  const router = useParams();
  const productId = router.id as string;
  const navigate = useRouter();
  const [product, setProduct] = useState<ProductWithCategory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await productsApi.getById(productId);
      if (response.success && response.data) {
        setProduct(response.data);
      } else {
        toast.error('Failed to fetch product');
        navigate.push(`${ROUTES.ADMIN}/products`);
      }
    } catch (error) {
      toast.error('Failed to fetch product');
      navigate.push(`${ROUTES.ADMIN}/products`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) return;

    try {
      const response = await productsApi.delete(productId);
      if (response.success) {
        toast.success('Product deleted successfully');
        navigate.push(`${ROUTES.ADMIN}/products`);
      } else {
        toast.error('Failed to delete product');
      }
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

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

  const getEnergyTypeColor = (energyType?: string) => {
    switch (energyType) {
      case 'POSITIVE':
        return 'bg-green-100 text-green-800';
      case 'NEGATIVE':
        return 'bg-red-100 text-red-800';
      case 'NEUTRAL':
        return 'bg-gray-100 text-gray-800';
      case 'BALANCED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEnergyTypeLabel = (energyType?: string) => {
    switch (energyType) {
      case 'POSITIVE':
        return 'Positive Energy';
      case 'NEGATIVE':
        return 'Correction Energy';
      case 'NEUTRAL':
        return 'Neutral Energy';
      case 'BALANCED':
        return 'Balanced Energy';
      default:
        return 'General';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-none h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Product not found</p>
        <Link href={`${ROUTES.ADMIN}/products`}>
          <Button className="mt-4">Back to Products</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`${ROUTES.ADMIN}/products`}>
            <Button variant="outline" size="sm">
              <HiArrowLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            <p className="text-gray-600">Product Details & Management</p>
          </div>
        </div>

        <div className="flex space-x-2">
          <Link href={`${ROUTES.ADMIN}/products/${product.id}/edit`}>
            <Button variant="outline">
              <HiPencil className="h-4 w-4 mr-2" />
              Edit Product
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={handleDeleteProduct}
            className="text-red-600 hover:text-red-700"
          >
            <HiTrash className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Images */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Product Images</h3>
            {product.images && product.images.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {product.images.map((image, index) => (
                  <div key={index} className="aspect-square relative rounded-none overflow-hidden">
                    <Image
                      src={image}
                      alt={`${product.name} - Image ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <HiShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No images uploaded</p>
              </div>
            )}
          </Card>

          {/* Product Details */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Product Information</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <div className="mt-1 prose max-w-none">
                  <p className="text-gray-900 whitespace-pre-wrap">{product.description}</p>
                </div>
              </div>

              {product.shortDescription && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Short Description</label>
                  <p className="mt-1 text-gray-600">{product.shortDescription}</p>
                </div>
              )}

              {product.productType === 'VASTU_ITEM' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {product.vastuPurpose && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Vastu Purpose</label>
                      <p className="mt-1 text-gray-600">{product.vastuPurpose}</p>
                    </div>
                  )}

                  {product.energyType && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Energy Type</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-none mt-1 ${getEnergyTypeColor(product.energyType)}`}>
                        {getEnergyTypeLabel(product.energyType)}
                      </span>
                    </div>
                  )}

                  {product.material && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Material</label>
                      <p className="mt-1 text-gray-600">{product.material}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Product Stats */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Product Statistics</h3>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-none ${getStatusColor(product.status || 'ACTIVE')}`}>
                  {product.status || 'ACTIVE'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Featured</span>
                <span className={product.featured ? 'text-green-600' : 'text-gray-400'}>
                  {product.featured ? 'Yes' : 'No'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Stock</span>
                <span className="text-sm font-medium">{product.stockQuantity}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Price</span>
                <span className="text-sm font-medium">{formatPrice(product.price)}</span>
              </div>

              {product.originalPrice && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Original Price</span>
                  <span className="text-sm text-gray-500 line-through">{formatPrice(product.originalPrice)}</span>
                </div>
              )}

              {product.averageRating && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Average Rating</span>
                  <div className="flex items-center">
                    <HiStar className="h-4 w-4 text-yellow-400 mr-1" />
                    <span className="text-sm font-medium">{(product.averageRating || 0).toFixed(1)}</span>
                    <span className="text-xs text-gray-500 ml-1">({product.totalReviews})</span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Dimensions (if applicable) */}
          {product.dimensions && (
            <Card className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Dimensions</h3>

              <div className="grid grid-cols-3 gap-4 text-center">
                {product.dimensions.length && (
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{product.dimensions.length}</div>
                    <div className="text-sm text-gray-600">Length (cm)</div>
                  </div>
                )}

                {product.dimensions.width && (
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{product.dimensions.width}</div>
                    <div className="text-sm text-gray-600">Width (cm)</div>
                  </div>
                )}

                {product.dimensions.height && (
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{product.dimensions.height}</div>
                    <div className="text-sm text-gray-600">Height (cm)</div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Quick Actions */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>

            <div className="space-y-2">
              <Link href={`${ROUTES.ADMIN}/products/${product.id}/edit`}>
                <Button className="w-full justify-start" variant="outline">
                  <HiPencil className="h-4 w-4 mr-2" />
                  Edit Product
                </Button>
              </Link>

              <Link href={`${ROUTES.VASTU_PRODUCT}/${product.slug}`} target="_blank">
                <Button className="w-full justify-start" variant="outline">
                  <HiShoppingCart className="h-4 w-4 mr-2" />
                  View on Store
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
