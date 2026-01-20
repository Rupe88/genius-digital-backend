'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { HiSearch, HiFilter, HiShoppingCart, HiStar, HiEye } from 'react-icons/hi';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { productsApi, Product } from '@/lib/api/products';
import { ROUTES } from '@/lib/utils/constants';

interface VastuProduct extends Product {
  productType?: string;
  vastuPurpose?: string;
  energyType?: string;
  material?: string;
}

export default function VastuProductPage() {
  const [products, setProducts] = useState<VastuProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [energyTypeFilter, setEnergyTypeFilter] = useState<string>('all');
  const [materialFilter, setMaterialFilter] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<string>('all');

  useEffect(() => {
    fetchVastuProducts();
  }, []);

  const fetchVastuProducts = async () => {
    try {
      setLoading(true);
      const response = await productsApi.getAll();
      if (response.success) {
        // Filter for Vastu products only
        const vastuProducts = response.data?.filter(product =>
          product.productType === 'VASTU_ITEM' ||
          product.category?.toLowerCase().includes('vastu')
        ) || [];
        setProducts(vastuProducts);
      }
    } catch (error) {
      console.error('Failed to fetch Vastu products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.vastuPurpose?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesEnergyType = energyTypeFilter === 'all' || product.energyType === energyTypeFilter;
    const matchesMaterial = materialFilter === 'all' || product.material === materialFilter;

    let matchesPriceRange = true;
    if (priceRange !== 'all') {
      const price = product.price;
      switch (priceRange) {
        case 'under-50':
          matchesPriceRange = price < 50;
          break;
        case '50-100':
          matchesPriceRange = price >= 50 && price <= 100;
          break;
        case '100-200':
          matchesPriceRange = price >= 100 && price <= 200;
          break;
        case 'over-200':
          matchesPriceRange = price > 200;
          break;
      }
    }

    return matchesSearch && matchesEnergyType && matchesMaterial && matchesPriceRange;
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
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
      <div className="min-h-screen bg-gradient-to-b from-white via-[#fff5f6] to-[#fde8ea]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-none h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading Vastu products...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#fff5f6] to-[#fde8ea]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
            Vastu Products
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
            Discover our collection of authentic Vastu products designed to bring positive energy,
            harmony, and prosperity to your space. Each item is carefully selected and energized
            according to ancient Vastu principles.
          </p>
        </div>

        {/* Filters */}
        <Card className="p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search Vastu products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-lg"
              />
            </div>

            {/* Energy Type Filter */}
            <Select
              value={energyTypeFilter}
              onChange={(e) => setEnergyTypeFilter(e.target.value)}
              className="py-3"
              options={[
                { value: 'all', label: 'All Energy Types' },
                { value: 'POSITIVE', label: 'Positive Energy' },
                { value: 'NEGATIVE', label: 'Correction Energy' },
                { value: 'NEUTRAL', label: 'Neutral Energy' },
                { value: 'BALANCED', label: 'Balanced Energy' },
              ]}
            />

            {/* Material Filter */}
            <Select
              value={materialFilter}
              onChange={(e) => setMaterialFilter(e.target.value)}
              className="py-3"
              options={[
                { value: 'all', label: 'All Materials' },
                { value: 'Crystal', label: 'Crystal' },
                { value: 'Wood', label: 'Wood' },
                { value: 'Metal', label: 'Metal' },
                { value: 'Natural Stone', label: 'Natural Stone' },
                { value: 'Copper', label: 'Copper' },
                { value: 'Brass', label: 'Brass' },
              ]}
            />

            {/* Price Range Filter */}
            <Select
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              className="py-3"
              options={[
                { value: 'all', label: 'All Prices' },
                { value: 'under-50', label: 'Under $50' },
                { value: '50-100', label: '$50 - $100' },
                { value: '100-200', label: '$100 - $200' },
                { value: 'over-200', label: 'Over $200' },
              ]}
            />
          </div>
        </Card>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-500 text-lg">
              {products.length === 0
                ? 'No Vastu products available at the moment. Please check back later.'
                : 'No products match your current filters. Try adjusting your search criteria.'
              }
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="group overflow-hidden hover:shadow-xl transition-shadow duration-300">
                {/* Product Image */}
                <div className="relative h-64 bg-gray-100">
                  {product.images && product.images.length > 0 ? (
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <span className="text-gray-400 text-sm">No Image Available</span>
                    </div>
                  )}

                  {/* Featured Badge */}
                  {product.featured && (
                    <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-none text-xs font-medium">
                      Featured
                    </div>
                  )}

                  {/* Energy Type Badge */}
                  {product.energyType && (
                    <div className={`absolute top-4 right-4 px-3 py-1 rounded-none text-xs font-medium ${getEnergyTypeColor(product.energyType)}`}>
                      {getEnergyTypeLabel(product.energyType)}
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {product.name}
                  </h3>

                  {product.vastuPurpose && (
                    <p className="text-sm text-red-600 font-medium mb-2">
                      {product.vastuPurpose}
                    </p>
                  )}

                  {product.material && (
                    <p className="text-sm text-gray-600 mb-3">
                      Material: {product.material}
                    </p>
                  )}

                  {product.shortDescription && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {product.shortDescription}
                    </p>
                  )}

                  {/* Price */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl font-bold text-gray-900">
                        {formatPrice(product.price)}
                      </span>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="text-lg text-gray-500 line-through">
                          {formatPrice(product.originalPrice)}
                        </span>
                      )}
                    </div>

                    {/* Stock Status */}
                    <span className={`text-sm font-medium ${
                      product.stockQuantity > 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {product.stockQuantity > 0 ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <Link href={`/vastu-product/${product.slug}`} className="flex-1">
                      <Button variant="outline" className="w-full flex items-center justify-center">
                        <HiEye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </Link>
                    <Button
                      className="flex-1 bg-red-600 hover:bg-red-700 flex items-center justify-center"
                      disabled={product.stockQuantity <= 0}
                    >
                      <HiShoppingCart className="h-4 w-4 mr-2" />
                      {product.stockQuantity > 0 ? 'Add to Cart' : 'Out of Stock'}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Vastu Information Section */}
        <div className="mt-16 bg-white rounded-none shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Understanding Vastu Products
            </h2>
            <p className="text-gray-600 max-w-3xl mx-auto">
              Vastu Shastra is an ancient Indian science of architecture and design that promotes harmony
              between living spaces and cosmic energies. Our Vastu products are carefully selected and
              energized to help create positive energy flow in your environment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-red-100 rounded-none w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🕉️</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Energy Correction</h3>
              <p className="text-sm text-gray-600">
                Products designed to correct negative energy and promote positive vibrations.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 rounded-none w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💎</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Natural Materials</h3>
              <p className="text-sm text-gray-600">
                Made from authentic crystals, metals, and natural stones with healing properties.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 rounded-none w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🏠</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Home Harmony</h3>
              <p className="text-sm text-gray-600">
                Specifically designed to create balance and harmony in living and working spaces.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-yellow-100 rounded-none w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⭐</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Expert Guidance</h3>
              <p className="text-sm text-gray-600">
                Each product comes with usage instructions and Vastu placement guidance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
