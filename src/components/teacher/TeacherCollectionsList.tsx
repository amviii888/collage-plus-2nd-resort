'use client';
import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { CourseCollection } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { CollectionCard } from '@/components/CollectionCard';
import { Library, Search, ArrowUpDown, Layers, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';

export default function TeacherCollectionsList({ teacherId }: { teacherId: string }) {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'coursesCount' | 'title'>('newest');

  const collectionsQuery = useMemoFirebase(() => {
    if (!firestore || !teacherId) return null;
    return query(collection(firestore, 'teachers', teacherId, 'courseCollections'));
  }, [firestore, teacherId]);

  const { data: collections, isLoading: areCollectionsLoading } = useCollection<CourseCollection>(collectionsQuery);

  const filteredAndSortedCollections = useMemo(() => {
    if (!collections) return [];

    let result = collections.filter(c => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      const titleMatch = (c.title || '').toLowerCase().includes(q);
      const descMatch = (c.description || '').toLowerCase().includes(q);
      return titleMatch || descMatch;
    });

    result.sort((a, b) => {
      if (sortBy === 'coursesCount') {
        return (b.courseIds?.length || 0) - (a.courseIds?.length || 0);
      }
      if (sortBy === 'title') {
        return (a.title || '').localeCompare(b.title || '');
      }
      // default: newest
      const aTime = a.createdAt ? (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : (a.createdAt as any).seconds * 1000) : 0;
      const bTime = b.createdAt ? (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : (b.createdAt as any).seconds * 1000) : 0;
      return bTime - aTime;
    });

    return result;
  }, [collections, searchQuery, sortBy]);

  if (areCollectionsLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <Skeleton className="h-80 w-full rounded-3xl" />
        <Skeleton className="h-80 w-full rounded-3xl" />
        <Skeleton className="h-80 w-full rounded-3xl" />
        <Skeleton className="h-80 w-full rounded-3xl" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Filtering and Sorting Bar */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في سلاسل ومجموعات الدكتور..."
            className="h-10 pl-9 rtl:pr-9 rtl:pl-3 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs"
          />
        </div>

        {/* Sorting & Counter */}
        <div className="flex items-center gap-2 flex-wrap justify-between md:justify-end">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-200 dark:border-blue-900/50">
            <Layers className="w-3.5 h-3.5" />
            <span>{filteredAndSortedCollections.length} مجموعة</span>
          </div>

          <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
            <SelectTrigger className="h-10 w-[160px] text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <ArrowUpDown className="w-3.5 h-3.5 mr-1 text-slate-400" />
              <SelectValue placeholder="الترتيب حسب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">الأحدث إضافة</SelectItem>
              <SelectItem value="coursesCount">الأكثر كورسات</SelectItem>
              <SelectItem value="title">الأبجدي (أ - ي)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid of collections */}
      {filteredAndSortedCollections.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAndSortedCollections.map(collection => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      ) : (
        <div className="col-span-full min-h-[350px] flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center">
          <Library className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">لا توجد مجموعات مطابقة</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
            {searchQuery ? 'لم يتم العثور على سلاسل تناسب البحث المحدد.' : 'لم يقم الدكتور بنشر أي مجموعات أو سلاسل محاضرات بعد.'}
          </p>
        </div>
      )}
    </div>
  );
}
