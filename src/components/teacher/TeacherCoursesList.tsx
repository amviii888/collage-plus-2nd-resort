'use client';
import { useState, useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { Course, Teacher } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { CourseCard } from '@/components/CourseCard';
import { BookOpen, Search, ArrowUpDown, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';

export default function TeacherCoursesList({ teacher }: { teacher: Teacher }) {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [selectedAccess, setSelectedAccess] = useState<'all' | 'free' | 'locked'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'views' | 'title'>('newest');

  const coursesQuery = useMemoFirebase(() => {
    if (!firestore || !teacher.id) return null;
    return query(collection(firestore, 'teachers', teacher.id, 'courses'));
  }, [firestore, teacher.id]);
  const { data: courses, isLoading: areCoursesLoading } = useCollection<Course>(coursesQuery);

  const availableGrades = useMemo(() => {
    if (!courses) return [];
    const grades = new Set<string>();
    courses.forEach(c => {
      if (c.grade) grades.add(c.grade);
    });
    return Array.from(grades);
  }, [courses]);

  const filteredAndSortedCourses = useMemo(() => {
    if (!courses) return [];

    let result = courses.filter(c => {
      const matchesSearch = !searchQuery.trim() || 
        c.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesGrade = selectedGrade === 'all' || c.grade === selectedGrade;

      const matchesAccess = selectedAccess === 'all' || 
        (selectedAccess === 'free' && !c.locked) || 
        (selectedAccess === 'locked' && c.locked);

      return matchesSearch && matchesGrade && matchesAccess;
    });

    result.sort((a, b) => {
      if (sortBy === 'views') {
        return (b.viewsCount || 0) - (a.viewsCount || 0);
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
  }, [courses, searchQuery, selectedGrade, selectedAccess, sortBy]);

  if (areCoursesLoading) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <Skeleton className="h-96 w-full rounded-2xl" />
            <Skeleton className="h-96 w-full rounded-2xl" />
            <Skeleton className="h-96 w-full rounded-2xl" />
            <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
    )
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
            placeholder="بحث في محاضرات وكورسات الدكتور..."
            className="h-10 pl-9 rtl:pr-9 rtl:pl-3 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {availableGrades.length > 0 && (
            <Select value={selectedGrade} onValueChange={setSelectedGrade}>
              <SelectTrigger className="h-10 w-[140px] text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <Filter className="w-3.5 h-3.5 mr-1" />
                <SelectValue placeholder="الفرقة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الفرق</SelectItem>
                {availableGrades.map(g => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={selectedAccess} onValueChange={(v: any) => setSelectedAccess(v)}>
            <SelectTrigger className="h-10 w-[120px] text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="free">مفتوح مجاني</SelectItem>
              <SelectItem value="locked">محمي بكود</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="h-10 w-[130px] text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <ArrowUpDown className="w-3.5 h-3.5 mr-1" />
              <SelectValue placeholder="الترتيب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">الأحدث نشرًا</SelectItem>
              <SelectItem value="views">الأكثر مشاهدة</SelectItem>
              <SelectItem value="title">الاسم أ-ي</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid of Courses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAndSortedCourses.length > 0 ? (
              filteredAndSortedCourses.map(course => <CourseCard key={course.id} course={course} teacher={teacher} />)
          ) : (
              <div className="col-span-full min-h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-3xl p-8 text-center">
                  <BookOpen className="w-16 h-16 text-slate-300 dark:text-zinc-700 mb-3" />
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">لم يتم العثور على كورسات مطابقة</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">جرّب تغيير كلمات البحث أو خيارات الفلترة أعلاه.</p>
              </div>
          )}
      </div>
    </div>
  );
}
