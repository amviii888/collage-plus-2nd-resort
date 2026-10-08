'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { QuestionBankItem, Grade } from '@/lib/types';
import { grades } from '@/lib/data';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CircleHelp, 
  Download, 
  ExternalLink, 
  FileText, 
  GraduationCap, 
  Calendar, 
  CheckCircle2, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function StudentQuestionsBankView({ teacherId }: { teacherId: string }) {
  const { t } = useTranslation();
  const firestore = useFirestore();

  const [selectedGrade, setSelectedGrade] = useState<string>('all');

  const [allQuestions, setAllQuestions] = useState<QuestionBankItem[]>([]);
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

      setAllQuestions(items);
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [teacherId]);

  // Determine which grades actually have content for helpful filtering
  const availableGradesWithContent = useMemo(() => {
    if (!allQuestions) return new Set<string>();
    const set = new Set<string>();
    allQuestions.forEach((q) => {
      if (q.grade) set.add(q.grade);
    });
    return set;
  }, [allQuestions]);

  const filteredQuestions = useMemo(() => {
    if (!allQuestions) return [];
    return allQuestions
      .filter((q) => {
        if (selectedGrade === 'all') return true;
        return q.grade === selectedGrade;
      })
      .sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return timeB - timeA;
      });
  }, [allQuestions, selectedGrade]);

  const handleDownload = (fileUrl: string) => {
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      {/* Grade Selector Hero Card */}
      <Card className="profile-content-card border-violet-500/20 bg-gradient-to-br from-card/90 via-card/75 to-violet-950/20">
        <CardContent className="p-5 md:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-violet-500/20 text-violet-400">
                  <GraduationCap className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-bold text-foreground">
                  {t('Select Your Grade')}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground max-w-xl">
                {t('Choose your grade to explore and download the question banks and study materials prepared for you.')}
              </p>
            </div>

            <div className="w-full sm:w-60 shrink-0">
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger className="bg-background/80 border-border/80">
                  <SelectValue placeholder={t('Select Grade')} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="all">
                    {t('All Grades')} {allQuestions ? `(${allQuestions.length})` : ''}
                  </SelectItem>
                  {grades.map((grade) => {
                    const count = allQuestions?.filter((q) => q.grade === grade).length || 0;
                    return (
                      <SelectItem key={grade} value={grade}>
                        {t(grade)} {count > 0 ? `(${count})` : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick grade pill chips */}
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/40">
            <Button
              size="sm"
              variant={selectedGrade === 'all' ? 'default' : 'outline'}
              className={
                selectedGrade === 'all'
                  ? 'h-7 text-xs bg-violet-600 hover:bg-violet-700 text-white'
                  : 'h-7 text-xs bg-background/50 border-border/60 hover:bg-background'
              }
              onClick={() => setSelectedGrade('all')}
            >
              {t('All Grades')}
            </Button>
            {grades.map((g) => {
              const hasItems = availableGradesWithContent.has(g);
              const isSelected = selectedGrade === g;
              return (
                <Button
                  key={g}
                  size="sm"
                  variant={isSelected ? 'default' : 'outline'}
                  className={`h-7 text-xs transition-colors ${
                    isSelected
                      ? 'bg-violet-600 hover:bg-violet-700 text-white'
                      : hasItems
                      ? 'bg-violet-500/10 border-violet-500/30 text-violet-300 hover:bg-violet-500/20'
                      : 'bg-background/40 border-border/50 text-muted-foreground hover:bg-background/80'
                  }`}
                  onClick={() => setSelectedGrade(g)}
                >
                  {t(g)}
                  {hasItems && <span className="ml-1 text-[10px] opacity-75 font-semibold">•</span>}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Questions list */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : filteredQuestions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredQuestions.map((item) => (
            <Card
              key={item.id}
              className="profile-content-card border-border/80 hover:border-violet-500/40 bg-card/85 flex flex-col justify-between transition-all"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="bg-violet-500/15 text-violet-300 border border-violet-500/30 font-semibold text-xs"
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
                    <CardTitle className="text-lg font-bold text-foreground line-clamp-1">
                      {item.title}
                    </CardTitle>
                  </div>
                </div>
                <CardDescription className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3 pt-1">
                  {item.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="pb-3 pt-0">
                {item.fileName && (
                  <div className="text-xs text-muted-foreground/80 font-mono truncate bg-background/50 p-2 rounded border border-border/50 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate">{item.fileName}</span>
                  </div>
                )}
              </CardContent>

              <CardFooter className="pt-3 pb-4 border-t border-border/40 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t('Available for download')}</span>
                </div>
                <Button
                  onClick={() => handleDownload(item.fileUrl)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md shadow-primary/20 h-9 px-4 text-xs"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  {t('Open File / Download')}
                  <ExternalLink className="w-3 h-3 ml-1.5 opacity-70" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed border-border/60 rounded-2xl flex flex-col items-center justify-center gap-4 min-h-[300px] bg-card/20">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <CircleHelp className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-md px-4">
            <h3 className="text-lg font-bold text-foreground">
              {t('No Questions Found')}
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {selectedGrade === 'all'
                ? t('This teacher has not published any questions bank files yet.')
                : t('There are no question banks published for the selected grade yet.')}
            </p>
          </div>
          {selectedGrade !== 'all' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedGrade('all')}
              className="border-violet-500/30 text-violet-300 hover:bg-violet-500/10 text-xs"
            >
              {t('View All Grades')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
