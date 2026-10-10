'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, query, where } from 'firebase/firestore';
import type { QuestionBankItem, Grade } from '@/lib/types';
import { grades } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  PlusCircle, 
  Edit, 
  Trash2, 
  HelpCircle, 
  ExternalLink, 
  Copy, 
  Search, 
  FolderOpen,
  Calendar,
  CloudUpload,
  Link as LinkIcon
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const questionBankSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().default(''),
  grade: z.string().min(1, 'Please select a grade'),
  fileUrl: z.string().min(1, 'File link is required'),
});

type QuestionBankFormValues = z.infer<typeof questionBankSchema>;

interface QuestionBankFormProps {
  teacherId: string;
  itemToEdit: QuestionBankItem | null;
  onFinished: () => void;
}

function QuestionBankFormModal({ teacherId, itemToEdit, onFinished }: QuestionBankFormProps) {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<QuestionBankFormValues>({
    resolver: zodResolver(questionBankSchema),
    defaultValues: itemToEdit
      ? {
          title: itemToEdit.title || '',
          description: itemToEdit.description || '',
          grade: itemToEdit.grade || '',
          fileUrl: itemToEdit.fileUrl || '',
        }
      : {
          title: '',
          description: '',
          grade: '',
          fileUrl: '',
        },
  });

  const onSubmit = async (data: QuestionBankFormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);

    let cleanUrl = data.fileUrl.trim();
    if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    try {
      let response;
      if (itemToEdit) {
        response = await fetch('/api/questions-bank', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: itemToEdit.id,
            title: data.title.trim(),
            description: (data.description || '').trim(),
            grade: data.grade,
            fileUrl: cleanUrl,
            teacherId,
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to update question bank');
        }

        toast({ 
          title: t('Questions Bank Updated'), 
          description: t('The question bank has been successfully updated.') 
        });
      } else {
        response = await fetch('/api/questions-bank', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: data.title.trim(),
            description: (data.description || '').trim(),
            grade: data.grade,
            fileUrl: cleanUrl,
            teacherId,
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to publish question bank');
        }

        toast({ 
          title: t('Questions Bank Published'), 
          description: t('Your questions file has been published for students.') 
        });
      }
      onFinished();
    } catch (e: any) {
      toast({ 
        title: t('Error saving'), 
        description: e.message || 'An unexpected error occurred.', 
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenGoogleDrive = () => {
    window.open('https://drive.google.com', '_blank', 'noopener,noreferrer');
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* 1. Title */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold text-foreground">
                {t('Title')} <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={t('e.g. Unit 3 Final Review & Practice Questions')}
                  className="bg-background border-border/80"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 2. Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold text-foreground">
                {t('Description')} <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={3}
                  placeholder={t('Instructions or notes for students answering these questions...')}
                  className="bg-background border-border/80"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 3. Grade */}
        <FormField
          control={form.control}
          name="grade"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold text-foreground">
                {t('Grade')} <span className="text-destructive">*</span>
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-background border-border/80">
                    <SelectValue placeholder={t('Select target grade')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="max-h-64">
                  {grades.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {t(grade)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 4. Google Drive & File Link Section */}
        <div className="space-y-2 pt-2 border-t border-border/60">
          <div className="flex items-center justify-between">
            <FormLabel className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <LinkIcon className="w-4 h-4 text-primary" />
              {t('Google Drive / Resource Link')} <span className="text-destructive">*</span>
            </FormLabel>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleOpenGoogleDrive}
              className="text-xs h-7 border-emerald-600/40 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 font-medium"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              {t('Open Google Drive')}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('Upload your PDF or files to Google Drive, then paste the link here.')}
          </p>

          <FormField
            control={form.control}
            name="fileUrl"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                    className="bg-background border-border/80 font-mono text-xs"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <DialogFooter className="pt-4 border-t border-border/50 gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={onFinished}>
            {t('Cancel')}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            {isSubmitting
              ? t('Saving...')
              : itemToEdit
              ? t('Update Question Bank')
              : t('Publish Question Bank')}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

export function ManageQuestionsBank({ teacherId }: { teacherId: string }) {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<QuestionBankItem | null>(null);

  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQuestions = async () => {
    if (!teacherId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/questions-bank?teacherId=${teacherId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch question banks');
      }
      const json = await response.json();
      
      const items = (json.data || []).map((item: any) => {
        const mapped = { ...item };
        if (mapped.createdAt && typeof mapped.createdAt.seconds === 'number') {
          mapped.createdAt = {
            seconds: mapped.createdAt.seconds,
            nanoseconds: mapped.createdAt.nanoseconds || 0,
            toDate: () => new Date(mapped.createdAt.seconds * 1000),
          };
        }
        if (mapped.updatedAt && typeof mapped.updatedAt.seconds === 'number') {
          mapped.updatedAt = {
            seconds: mapped.updatedAt.seconds,
            nanoseconds: mapped.updatedAt.nanoseconds || 0,
            toDate: () => new Date(mapped.updatedAt.seconds * 1000),
          };
        }
        return mapped;
      });

      setQuestions(items);
    } catch (e: any) {
      console.error(e);
      toast({
        title: t('Error loading data'),
        description: e.message || 'Could not fetch question banks.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [teacherId]);

  const filteredQuestions = useMemo(() => {
    if (!questions) return [];
    return questions
      .filter((item) => {
        const matchesGrade = selectedGradeFilter === 'all' || item.grade === selectedGradeFilter;
        const matchesSearch =
          !searchQuery.trim() ||
          item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesGrade && matchesSearch;
      })
      .sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return timeB - timeA;
      });
  }, [questions, selectedGradeFilter, searchQuery]);

  const handleOpenCreate = () => {
    setItemToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: QuestionBankItem) => {
    setItemToEdit(item);
    setIsModalOpen(true);
  };

  const handleFinishedModal = () => {
    setIsModalOpen(false);
    setItemToEdit(null);
    fetchQuestions();
  };

  const handleDelete = async (item: QuestionBankItem) => {
    if (!firestore) return;
    if (window.confirm(t('Are you sure you want to delete this question bank?'))) {
      try {
        const response = await fetch(`/api/questions-bank?id=${item.id}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to delete question bank');
        }
        toast({
          title: t('Question Bank Deleted'),
          description: t('Item removed successfully.'),
          variant: 'destructive',
        });
        fetchQuestions();
      } catch (e: any) {
        toast({
          title: t('Error deleting'),
          description: e.message,
          variant: 'destructive',
        });
      }
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: t('Link Copied'),
      description: t('Direct file link copied to clipboard.'),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-card/60 backdrop-blur-xl p-5 md:p-6 rounded-2xl border border-border/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {t('Questions Bank')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('Manage question banks & files for your grades')}
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 shrink-0"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('Create Question Bank')}
        </Button>
      </div>

      {/* Filters and search bar */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('Search questions by title or description...')}
            className="pl-9 bg-card/60 border-border/80"
          />
        </div>

        <div className="w-full md:w-64">
          <Select value={selectedGradeFilter} onValueChange={setSelectedGradeFilter}>
            <SelectTrigger className="bg-card/60 border-border/80">
              <SelectValue placeholder={t('Filter by Grade')} />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              <SelectItem value="all">{t('All Grades')}</SelectItem>
              {grades.map((grade) => (
                <SelectItem key={grade} value={grade}>
                  {t(grade)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Questions list */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-44 w-full rounded-xl" />
        </div>
      ) : filteredQuestions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredQuestions.map((item) => (
            <Card
              key={item.id}
              className="bg-card/75 backdrop-blur-xl border border-border/80 hover:border-violet-500/40 transition-all rounded-xl flex flex-col justify-between"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="bg-violet-500/15 text-violet-300 border border-violet-500/30 text-xs font-semibold"
                      >
                        {t(item.grade)}
                      </Badge>
                      {item.createdAt?.toDate && (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDistanceToNow(item.createdAt.toDate(), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-lg font-bold text-foreground line-clamp-1 pt-1">
                      {item.title}
                    </CardTitle>
                  </div>
                </div>
                <CardDescription className="text-sm text-muted-foreground/90 whitespace-pre-wrap line-clamp-2 pt-1">
                  {item.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="pb-3 pt-0">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-background/50 border border-border/60 text-xs">
                  <span className="truncate max-w-[200px] text-muted-foreground font-mono">
                    {item.fileName || item.fileUrl}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => handleCopyLink(item.fileUrl)}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      {t('Copy')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 text-xs text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                      onClick={() => window.open(item.fileUrl, '_blank', 'noopener,noreferrer')}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      {t('Open File')}
                    </Button>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-2 pb-4 border-t border-border/40 flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => handleOpenEdit(item)}
                >
                  <Edit className="w-3.5 h-3.5 mr-1" />
                  {t('Edit')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(item)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  {t('Delete')}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed border-border/60 rounded-2xl flex flex-col items-center justify-center gap-4 min-h-[280px] bg-card/30">
          <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center text-muted-foreground">
            <FolderOpen className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="text-lg font-bold text-foreground">
              {t('No Questions Found')}
            </h3>
            <p className="text-muted-foreground text-sm">
              {selectedGradeFilter === 'all'
                ? t('You have not published any questions yet. Click "Create Question Bank" to add your first one.')
                : t('There are no question banks published for the selected grade yet.')}
            </p>
          </div>
          <Button
            onClick={handleOpenCreate}
            variant="outline"
            className="border-primary/40 text-primary hover:bg-primary/10"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            {t('Create Question Bank')}
          </Button>
        </div>
      )}

      {/* Pop-out Add / Edit Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border/90">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-violet-400" />
              {itemToEdit ? t('Edit Question Bank') : t('Create Question Bank')}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {t('Publish questions and study resources with Google Drive links for your students.')}
            </DialogDescription>
          </DialogHeader>

          <QuestionBankFormModal
            teacherId={teacherId}
            itemToEdit={itemToEdit}
            onFinished={handleFinishedModal}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
