
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Category } from '@/lib/api/categories';
import * as categoryApi from '@/lib/api/categories';
import { showError, showSuccess } from '@/lib/utils/toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';

export default function AdminCategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'COURSE' | 'BLOG' | 'PRODUCT' | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, [filterType]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const params = filterType ? { type: filterType } : undefined;
      const data = await categoryApi.getAllCategories(params);
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      showError(Object(error).message || 'An error occurred' || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(category.id);
      await categoryApi.deleteCategory(category.id);
      showSuccess('Category deleted successfully!');
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      showError(Object(error).message || 'An error occurred' || 'Failed to delete category');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredCategories = categories.filter((category) => {
    const matchesSearch = category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.slug.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const typeColors: Record<string, string> = {
    COURSE: 'bg-blue-100 text-blue-800',
    BLOG: 'bg-green-100 text-green-800',
    PRODUCT: 'bg-purple-100 text-purple-800',
  };

  return (
    <div>
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Category Management</h1>
          <p className="text-[var(--muted-foreground)] mt-2">Manage course, blog, and product categories</p>
        </div>
        <Link href="/admin/categories/new">
          <Button variant="primary">Create Category</Button>
        </Link>
      </div>

      {/* Filters */}
      <Card padding="lg" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'COURSE' | 'BLOG' | 'PRODUCT' | '')}
            options={[
              { value: '', label: 'All Types' },
              { value: 'COURSE', label: 'Course' },
              { value: 'BLOG', label: 'Blog' },
              { value: 'PRODUCT', label: 'Product' },
            ]}
          />
        </div>
      </Card>

      {/* Categories List */}
      {loading ? (
        <Card padding="lg">
          <div className="text-center py-12">
            <p className="text-[var(--muted-foreground)]">Loading categories...</p>
          </div>
        </Card>
      ) : filteredCategories.length === 0 ? (
        <Card padding="lg">
          <div className="text-center py-12">
            <p className="text-[var(--muted-foreground)] mb-4">
              {searchQuery ? 'No categories found matching your search.' : 'No categories found.'}
            </p>
            <Link href="/admin/categories/new">
              <Button variant="primary">Create First Category</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((category) => (
            <Card key={category.id} padding="lg" className="hover:shadow-lg transition-shadow">
              <div className="space-y-4">
                {category.image && (
                  <Link href={`/admin/categories/${category.id}`}>
                    <div className="relative aspect-video rounded-none overflow-hidden bg-[var(--muted)] mb-4">
                      <Image
                        src={category.image}
                        alt={category.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </Link>
                )}
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <Link href={`/admin/categories/${category.id}`}>
                      <h3 className="text-lg font-bold text-[var(--foreground)] hover:text-[var(--primary)] transition-colors">
                        {category.name}
                      </h3>
                    </Link>
                    <Badge className={typeColors[category.type || 'COURSE']}>
                      {category.type || 'COURSE'}
                    </Badge>
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)] font-mono mb-2">
                    {category.slug}
                  </p>
                  {category.description && (
                    <p className="text-sm text-[var(--foreground)] line-clamp-2">
                      {category.description}
                    </p>
                  )}
                  {category.parent && (
                    <p className="text-xs text-[var(--muted-foreground)] mt-2">
                      Parent: {category.parent.name}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                  <div className="flex gap-2 text-xs text-[var(--muted-foreground)]">
                    {category._count && (
                      <>
                        <span>{category._count.courses || 0} courses</span>
                        <span>•</span>
                        <span>{category._count.blogs || 0} blogs</span>
                        <span>•</span>
                        <span>{category._count.products || 0} products</span>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/admin/categories/${category.id}/edit`}>
                      <Button variant="secondary" size="sm">Edit</Button>
                    </Link>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(category)}
                      disabled={deletingId === category.id}
                    >
                      {deletingId === category.id ? '...' : 'Delete'}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

