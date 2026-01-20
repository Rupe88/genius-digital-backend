
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { Category } from '@/lib/api/categories';
import * as categoryApi from '@/lib/api/categories';
import { showError, showSuccess } from '@/lib/utils/toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

export default function CategoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchCategory = async () => {
      try {
        setLoading(true);
        const data = await categoryApi.getCategoryById(id);
        setCategory(data);
      } catch (error) {
        console.error('Error fetching category:', error);
        showError(Object(error).message || 'An error occurred' || 'Failed to load category');
        router.push('/admin/categories');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCategory();
    }
  }, [id, router]);

  const handleDelete = async () => {
    if (!category) return;
    
    if (!confirm(`Are you sure you want to delete "${category.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(true);
      await categoryApi.deleteCategory(category.id);
      showSuccess('Category deleted successfully!');
      router.push('/admin/categories');
    } catch (error) {
      console.error('Error deleting category:', error);
      showError(Object(error).message || 'An error occurred' || 'Failed to delete category');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Card padding="lg">
        <div className="text-center py-12">
          <p className="text-[var(--muted-foreground)]">Loading category...</p>
        </div>
      </Card>
    );
  }

  if (!category) {
    return (
      <Card padding="lg">
        <div className="text-center py-12">
          <p className="text-[var(--muted-foreground)] mb-4">Category not found</p>
          <Button onClick={() => router.push('/admin/categories')}>
            Back to Categories
          </Button>
        </div>
      </Card>
    );
  }

  const typeColors: Record<string, string> = {
    COURSE: 'bg-blue-100 text-blue-800',
    BLOG: 'bg-green-100 text-green-800',
    PRODUCT: 'bg-purple-100 text-purple-800',
  };

  return (
    <div>
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">{category.name}</h1>
          <p className="text-[var(--muted-foreground)] mt-2">Category Details</p>
        </div>
        <div className="flex gap-3">
          <Link href={`/admin/categories/${category.id}/edit`}>
            <Button variant="secondary">Edit</Button>
          </Link>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card padding="lg">
            <h2 className="text-xl font-bold mb-4 text-[var(--foreground)]">Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[var(--muted-foreground)]">Name</label>
                <p className="text-[var(--foreground)] mt-1">{category.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--muted-foreground)]">Slug</label>
                <p className="text-[var(--foreground)] mt-1 font-mono text-sm">{category.slug}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--muted-foreground)]">Type</label>
                <div className="mt-1">
                  <Badge className={typeColors[category.type || 'COURSE']}>
                    {category.type || 'COURSE'}
                  </Badge>
                </div>
              </div>
              {category.parent && (
                <div>
                  <label className="text-sm font-medium text-[var(--muted-foreground)]">Parent Category</label>
                  <p className="text-[var(--foreground)] mt-1">{category.parent.name}</p>
                </div>
              )}
              {category.description && (
                <div>
                  <label className="text-sm font-medium text-[var(--muted-foreground)]">Description</label>
                  <p className="text-[var(--foreground)] mt-1 whitespace-pre-wrap">{category.description}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Statistics */}
          {category._count && (
            <Card padding="lg">
              <h2 className="text-xl font-bold mb-4 text-[var(--foreground)]">Statistics</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-[var(--muted)] rounded-none">
                  <div className="text-2xl font-bold text-[var(--foreground)]">
                    {category._count.courses || 0}
                  </div>
                  <div className="text-sm text-[var(--muted-foreground)] mt-1">Courses</div>
                </div>
                <div className="text-center p-4 bg-[var(--muted)] rounded-none">
                  <div className="text-2xl font-bold text-[var(--foreground)]">
                    {category._count.blogs || 0}
                  </div>
                  <div className="text-sm text-[var(--muted-foreground)] mt-1">Blogs</div>
                </div>
                <div className="text-center p-4 bg-[var(--muted)] rounded-none">
                  <div className="text-2xl font-bold text-[var(--foreground)]">
                    {category._count.products || 0}
                  </div>
                  <div className="text-sm text-[var(--muted-foreground)] mt-1">Products</div>
                </div>
              </div>
            </Card>
          )}

          {/* Children Categories */}
          {category.children && category.children.length > 0 && (
            <Card padding="lg">
              <h2 className="text-xl font-bold mb-4 text-[var(--foreground)]">Subcategories</h2>
              <div className="space-y-2">
                {category.children.map((child) => (
                  <Link
                    key={child.id}
                    href={`/admin/categories/${child.id}`}
                    className="block p-3 bg-[var(--muted)] hover:bg-[var(--accent)] rounded-none transition-colors"
                  >
                    <div className="font-medium text-[var(--foreground)]">{child.name}</div>
                    <div className="text-sm text-[var(--muted-foreground)] mt-1">{child.slug}</div>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {category.image && (
            <Card padding="lg">
              <h2 className="text-xl font-bold mb-4 text-[var(--foreground)]">Image</h2>
              <div className="relative aspect-video rounded-none overflow-hidden bg-[var(--muted)]">
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  className="object-cover"
                />
              </div>
            </Card>
          )}

          <Card padding="lg">
            <h2 className="text-xl font-bold mb-4 text-[var(--foreground)]">Metadata</h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-[var(--muted-foreground)]">Created:</span>
                <span className="text-[var(--foreground)] ml-2">
                  {new Date(category.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-[var(--muted-foreground)]">Updated:</span>
                <span className="text-[var(--foreground)] ml-2">
                  {new Date(category.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

