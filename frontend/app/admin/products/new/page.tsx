'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { HiArrowLeft, HiCloudUpload, HiX } from 'react-icons/hi';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { productsApi } from '@/lib/api/products';
import { ROUTES } from '@/lib/utils/constants';
import toast from 'react-hot-toast';

// Vastu product schema
const vastuProductSchema = z.object({
  // Basic product info
  name: z.string().min(1, 'Product name is required'),
  slug: z.string().min(1, 'Product slug is required'),
  description: z.string().min(1, 'Description is required'),
  shortDescription: z.string().optional(),

  // Pricing
  price: z.number().min(0, 'Price must be positive'),
  originalPrice: z.number().min(0, 'Original price must be positive').optional(),

  // Inventory
  stockQuantity: z.number().min(0, 'Stock must be non-negative'),

  // Product type (Vastu specific)
  productType: z.enum(['VASTU_ITEM', 'CONSULTATION_PACKAGE', 'DIGITAL_PRODUCT', 'PHYSICAL_PRODUCT']),

  // Vastu specific fields
  vastuPurpose: z.string().optional(),
  energyType: z.enum(['POSITIVE', 'NEGATIVE', 'NEUTRAL', 'BALANCED']).optional(),
  material: z.string().optional(),
  dimensions: z.object({
    length: z.number().min(0).optional(),
    width: z.number().min(0).optional(),
    height: z.number().min(0).optional(),
  }).optional(),

  // Category
  category: z.string().optional(),

  // Images
  images: z.array(z.string()).optional(),

  // Additional settings
  featured: z.boolean().optional(),
  published: z.boolean().optional(),
});

type VastuProductFormData = z.infer<typeof vastuProductSchema>;

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<VastuProductFormData>({
    resolver: zodResolver(vastuProductSchema),
    defaultValues: {
      productType: 'VASTU_ITEM',
      energyType: 'POSITIVE',
      featured: false,
      published: true,
      stockQuantity: 0,
    },
  });

  const productType = watch('productType');

  const onSubmit = async (data: VastuProductFormData) => {
    try {
      setLoading(true);

      // Prepare the data for API
      const productData = {
        ...data,
        images: uploadedImages,
        price: Number(data.price),
        originalPrice: data.originalPrice ? Number(data.originalPrice) : undefined,
        stockQuantity: Number(data.stockQuantity),
        category: data.category || 'Vastu Products',
      };

      const response = await productsApi.create(productData);

      if (response.success) {
        toast.success('Vastu product created successfully!');
        router.push(`${ROUTES.ADMIN}/products`);
      } else {
        toast.error(response.message || 'Failed to create product');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    // In a real app, you would upload to cloud storage here
    // For now, we'll just create object URLs for preview
    const newImages = Array.from(files).map(file => URL.createObjectURL(file));
    setUploadedImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const slug = generateSlug(name);
    setValue('slug', slug);
  };

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
            <h1 className="text-2xl font-bold text-gray-900">Create New Vastu Product</h1>
            <p className="text-gray-600">Add a new Vastu product to your store</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>

            <div className="space-y-4">
              <Input
                label="Product Name"
                {...register('name')}
                error={errors.name?.message}
                onChange={handleNameChange}
                placeholder="e.g., Crystal Pyramid for Positive Energy"
              />

              <Input
                label="Product Slug"
                {...register('slug')}
                error={errors.slug?.message}
                placeholder="crystal-pyramid-positive-energy"
              />

              <Textarea
                label="Short Description"
                {...register('shortDescription')}
                error={errors.shortDescription?.message}
                placeholder="Brief description for product cards"
                rows={3}
              />

              <Textarea
                label="Full Description"
                {...register('description')}
                error={errors.description?.message}
                placeholder="Detailed product description"
                rows={5}
              />
            </div>
          </Card>

          {/* Product Type & Vastu Details */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Product Type & Vastu Details</h3>

            <div className="space-y-4">
              <Select
                label="Product Type"
                {...register('productType')}
                error={errors.productType?.message}
                options={[
                  { value: 'VASTU_ITEM', label: 'Vastu Item' },
                  { value: 'CONSULTATION_PACKAGE', label: 'Consultation Package' },
                  { value: 'DIGITAL_PRODUCT', label: 'Digital Product' },
                  { value: 'PHYSICAL_PRODUCT', label: 'Physical Product' },
                ]}
              />

              {productType === 'VASTU_ITEM' && (
                <>
                  <Input
                    label="Vastu Purpose"
                    {...register('vastuPurpose')}
                    error={errors.vastuPurpose?.message}
                    placeholder="e.g., Remove negative energy, Enhance wealth corner"
                  />

                  <Select
                    label="Energy Type"
                    {...register('energyType')}
                    error={errors.energyType?.message}
                    options={[
                      { value: 'POSITIVE', label: 'Positive Energy' },
                      { value: 'NEGATIVE', label: 'Negative Energy (for correction)' },
                      { value: 'NEUTRAL', label: 'Neutral Energy' },
                      { value: 'BALANCED', label: 'Balanced Energy' },
                    ]}
                  />

                  <Input
                    label="Material"
                    {...register('material')}
                    error={errors.material?.message}
                    placeholder="e.g., Crystal, Wood, Metal, Natural Stone"
                  />
                </>
              )}
            </div>
          </Card>

          {/* Pricing */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Pricing</h3>

            <div className="space-y-4">
              <Input
                label="Price (USD)"
                type="number"
                step="0.01"
                {...register('price', { valueAsNumber: true })}
                error={errors.price?.message}
                placeholder="0.00"
              />

              <Input
                label="Original Price (Optional)"
                type="number"
                step="0.01"
                {...register('originalPrice', { valueAsNumber: true })}
                error={errors.originalPrice?.message}
                placeholder="0.00"
              />
            </div>
          </Card>

          {/* Inventory & Dimensions */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Inventory & Dimensions</h3>

            <div className="space-y-4">
              <Input
                label="Stock Quantity"
                type="number"
                {...register('stockQuantity', { valueAsNumber: true })}
                error={errors.stockQuantity?.message}
                placeholder="0"
              />

              {productType === 'PHYSICAL_PRODUCT' && (
                <div className="grid grid-cols-3 gap-4">
                  <Input
                    label="Length (cm)"
                    type="number"
                    step="0.1"
                    {...register('dimensions.length', { valueAsNumber: true })}
                    placeholder="0.0"
                  />
                  <Input
                    label="Width (cm)"
                    type="number"
                    step="0.1"
                    {...register('dimensions.width', { valueAsNumber: true })}
                    placeholder="0.0"
                  />
                  <Input
                    label="Height (cm)"
                    type="number"
                    step="0.1"
                    {...register('dimensions.height', { valueAsNumber: true })}
                    placeholder="0.0"
                  />
                </div>
              )}
            </div>
          </Card>

          {/* Images */}
          <Card className="p-6 lg:col-span-2">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Product Images</h3>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <HiCloudUpload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Upload product images
                      </span>
                      <span className="mt-1 block text-sm text-gray-500">
                        PNG, JPG, GIF up to 10MB each
                      </span>
                    </label>
                    <input
                      id="image-upload"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {uploadedImages.map((image, index) => (
                    <div key={index} className="relative">
                      <Image
                        src={image}
                        alt={`Product image ${index + 1}`}
                        width={200}
                        height={200}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <HiX className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Settings */}
          <Card className="p-6 lg:col-span-2">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Product Settings</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('featured')}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Featured Product</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('published')}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Published</span>
                </label>
              </div>

              <div className="space-y-4">
                <Input
                  label="Category"
                  {...register('category')}
                  error={errors.category?.message}
                  placeholder="e.g., Vastu Products, Crystals, Yantras"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4">
          <Link href={`${ROUTES.ADMIN}/products`}>
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            className="bg-red-600 hover:bg-red-700"
            isLoading={loading}
          >
            Create Vastu Product
          </Button>
        </div>
      </form>
    </div>
  );
}
