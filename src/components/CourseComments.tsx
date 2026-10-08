'use client';
import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useUser, useStudent, useDoc, useMemoFirebase } from '@/firebase';
import {
  collection,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  deleteDoc,
  doc,
  Timestamp,
  limit,
  getDocs,
  startAfter,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import type { Comment, Teacher } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Trash2, MessageCircle, Lock, KeyRound } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from './ui/card';
import { ScrollArea } from './ui/scroll-area';

interface CourseCommentsProps {
    courseId: string;
    teacherId: string;
    isLocked?: boolean;
    onUnlockRequest?: () => void;
}

export function CourseComments({ courseId, teacherId, isLocked = false, onUnlockRequest }: CourseCommentsProps) {
    const { user, isUserLoading: isAuthLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';

    const [storedStudentName, setStoredStudentName] = useState<string>('');
    const [storedStudentId, setStoredStudentId] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        const vid = localStorage.getItem('viewingStudentId');
        if (vid) setStoredStudentId(vid);

        // Try extracting cached student name from various local caches
        try {
            const cachedProfile = localStorage.getItem('cached-student-profile') || localStorage.getItem('student_profile') || localStorage.getItem('student-info');
            if (cachedProfile) {
                const parsed = JSON.parse(cachedProfile);
                if (parsed?.name) {
                    setStoredStudentName(parsed.name);
                }
            }
        } catch (e) {
            // Ignore parse errors
        }
    }, []);

    const targetStudentId = user?.uid || storedStudentId;
    const { student, isLoading: isStudentLoading } = useStudent(targetStudentId);

    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data: teacher, isLoading: isTeacherLoading } = useDoc<Teacher>(
      useMemoFirebase(() => {
          if (!firestore || !user || user.isAnonymous) return null;
          return doc(firestore, 'teachers', user.uid);
      }, [firestore, user])
    );
    
    // State for manual pagination
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null);
    const [hasMore, setHasMore] = useState(true);
    
    const COMMENT_LIMIT = 30;
    const INITIAL_LOAD_SIZE = 10;
    const MORE_LOAD_SIZE = 8;

    // Initial comment fetch effect
    useEffect(() => {
      if (!firestore || !teacherId || !courseId) return;

      const fetchInitialComments = async () => {
          setIsLoading(true);
          setHasMore(true); 

          try {
              const commentsCollection = collection(firestore, `teachers/${teacherId}/courses/${courseId}/comments`);
              const q = query(commentsCollection, orderBy('createdAt', 'desc'), limit(INITIAL_LOAD_SIZE));
              const documentSnapshots = await getDocs(q);
              
              const fetchedComments = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
              setComments(fetchedComments);
              
              const lastDoc = documentSnapshots.docs[documentSnapshots.docs.length - 1];
              setLastVisible(lastDoc || null);

              if (fetchedComments.length < INITIAL_LOAD_SIZE || fetchedComments.length >= COMMENT_LIMIT) {
                  setHasMore(false);
              }
          } catch (error) {
              console.error("Error fetching comments:", error);
          } finally {
              setIsLoading(false);
          }
      };

      fetchInitialComments();
    }, [firestore, teacherId, courseId]);

    const handleLoadMore = async () => {
        if (!firestore || !lastVisible || !hasMore || isLoadingMore) return;

        setIsLoadingMore(true);

        const remainingLimit = COMMENT_LIMIT - comments.length;
        if (remainingLimit <= 0) {
            setHasMore(false);
            setIsLoadingMore(false);
            return;
        }
        
        const nextLimit = Math.min(MORE_LOAD_SIZE, remainingLimit);

        try {
            const commentsCollection = collection(firestore, `teachers/${teacherId}/courses/${courseId}/comments`);
            const q = query(commentsCollection, orderBy('createdAt', 'desc'), startAfter(lastVisible), limit(nextLimit));
            const documentSnapshots = await getDocs(q);

            const newComments = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
            setComments(prevComments => [...prevComments, ...newComments]);
            
            const lastDoc = documentSnapshots.docs[documentSnapshots.docs.length - 1];
            setLastVisible(lastDoc || null);

            if (newComments.length < nextLimit || (comments.length + newComments.length) >= COMMENT_LIMIT) {
                setHasMore(false);
            }
        } catch (error) {
            console.error("Error fetching more comments:", error);
            toast({ title: isArabic ? "خطأ" : "Error", description: isArabic ? "تعذر تحميل المزيد من التعليقات." : "Could not load more comments.", variant: "destructive" });
        } finally {
            setIsLoadingMore(false);
        }
    };
    
    const isComponentLoading = isAuthLoading;

    // Robust name resolver that never fails for an authenticated student/teacher
    const resolvedName = useMemo(() => {
        if (teacher?.name) return teacher.name;
        if (student?.name) return student.name;
        if (storedStudentName) return storedStudentName;
        if (user?.displayName) return user.displayName;
        if (user?.email) {
            if (user.email.endsWith('@universe.student')) {
                const code = user.email.split('@')[0];
                return isArabic ? `طالب (${code})` : `Student (${code})`;
            }
            return user.email.split('@')[0];
        }
        if (user?.uid) {
            return isArabic ? `طالب (${user.uid.slice(0, 5)})` : `Student (${user.uid.slice(0, 5)})`;
        }
        return '';
    }, [teacher, student, storedStudentName, user, isArabic]);

    const handlePostComment = async () => {
        if (!user || !newComment.trim()) {
             toast({
                title: isArabic ? "تعذر نشر التعليق" : "Cannot Post Comment",
                description: isArabic ? "يجب تسجيل الدخول وكتابة نص التعليق." : "You must be logged in and enter a comment.",
                variant: "destructive"
            });
            return;
        }

        if (isLocked) {
            toast({
                title: isArabic ? "الكورس مقفل" : "Course Locked",
                description: isArabic ? "لا يمكن نشر تعليق في كورس مقفل قبل فتحه بكود المشاركة." : "You cannot post comments on a locked course without unlocking it first.",
                variant: "destructive"
            });
            return;
        }

        const finalCommenterName = resolvedName || (isArabic ? 'طالب' : 'Student');
        
        setIsSubmitting(true);
        const commentData = {
            studentId: user.uid,
            studentName: finalCommenterName,
            text: newComment.trim(),
            createdAt: serverTimestamp(),
        };

        try {
            const commentsCollection = collection(firestore, `teachers/${teacherId}/courses/${courseId}/comments`);
            const newDocRef = await addDoc(commentsCollection, commentData);
            const tempNewComment: Comment = {
                id: newDocRef.id,
                studentId: user.uid,
                studentName: finalCommenterName,
                text: newComment.trim(),
                createdAt: Timestamp.now()
            };
            setComments(prev => [tempNewComment, ...prev]);
            setNewComment('');
            toast({
                title: isArabic ? "تم نشر التعليق" : "Comment Posted",
                description: isArabic ? "تمت إضافة تعليقك بنجاح." : "Your comment has been added successfully."
            });
        } catch (error: any) {
            console.error("Error posting comment: ", error);
            toast({ 
                title: isArabic ? "خطأ" : "Error", 
                description: isArabic ? "فشل نشر التعليق. يرجى المحاولة مرة أخرى." : "Failed to post comment. Please try again.", 
                variant: "destructive" 
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteComment = async (commentId: string) => {
        if (!firestore) return;
        if (!window.confirm(isArabic ? "هل أنت متأكد من رغبتك في حذف هذا التعليق؟" : "Are you sure you want to delete this comment?")) return;

        const commentRef = doc(firestore, `teachers/${teacherId}/courses/${courseId}/comments`, commentId);
        try {
            await deleteDoc(commentRef);
            setComments(prev => prev.filter(c => c.id !== commentId));
            toast({
                title: isArabic ? "تم حذف التعليق" : "Comment Deleted",
                description: isArabic ? "تم إزالة التعليق بنجاح." : "The comment has been removed.",
            });
        } catch (error: any) {
             toast({
                variant: "destructive",
                title: isArabic ? "خطأ" : "Error",
                description: `${isArabic ? 'تعذر حذف التعليق:' : 'Could not delete comment:'} ${error.message}`,
            });
        }
    };

    const formatCommentDate = (createdAt: Timestamp | Date | null | undefined): string => {
        if (!createdAt) return '';
        const date = (createdAt as Timestamp)?.toDate ? (createdAt as Timestamp).toDate() : (createdAt as Date);
        return formatDistanceToNow(date, { addSuffix: true });
    };
    
    const isCourseOwner = user && !user.isAnonymous && user.uid === teacherId;

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground text-lg flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-primary"/>
                    {isArabic ? 'التعليقات والمناقشات' : 'Comments & Discussion'}
                </h3>
                {comments.length > 0 && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground font-mono">
                        {comments.length}
                    </span>
                )}
            </div>

            {/* Locked Course Warning for Comments */}
            {isLocked && !isCourseOwner ? (
                <div className="p-5 rounded-xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-start">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400">
                            <Lock className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-sm text-amber-200">
                                {isArabic ? 'التعليقات مقفلة لهذا الكورس الخاص' : 'Comments are locked for this private course'}
                            </h4>
                            <p className="text-xs text-amber-300/80 mt-0.5">
                                {isArabic ? 'قم بفتح الكورس باستخدام كود المشاركة لتتمكن من قراءة ونشر التعليقات.' : 'Unlock this course using a share code from your teacher to view and join the discussion.'}
                            </p>
                        </div>
                    </div>
                    {onUnlockRequest && (
                        <Button onClick={onUnlockRequest} size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-bold whitespace-nowrap shadow-md">
                            <KeyRound className="w-4 h-4 mr-1.5" />
                            {isArabic ? 'فتح الكورس الآن' : 'Unlock Course'}
                        </Button>
                    )}
                </div>
            ) : (
                <>
                    <ScrollArea className="flex-grow pr-4 -mr-4 max-h-[500px]">
                        <div className="space-y-3">
                            {isLoading && (
                                <div className="space-y-3">
                                    <Skeleton className="h-16 w-full bg-muted/50 rounded-xl"/>
                                    <Skeleton className="h-16 w-full bg-muted/50 rounded-xl"/>
                                </div>
                            )}
                            {comments?.map((comment) => (
                                <Card key={comment.id} className="group bg-card/60 border-border hover:border-white/20 transition-all rounded-xl">
                                    <CardHeader className="flex flex-row items-start gap-3 p-3.5">
                                        <Avatar className="h-8 w-8 border border-white/10 shrink-0">
                                            <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                                                {comment.studentName ? comment.studentName.charAt(0).toUpperCase() : 'S'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline gap-2 flex-wrap">
                                                <p className="font-semibold text-xs text-foreground truncate">{comment.studentName}</p>
                                                <p className="text-[11px] text-muted-foreground font-mono">
                                                    {formatCommentDate(comment.createdAt)}
                                                </p>
                                            </div>
                                            <p className="text-xs text-zinc-300 whitespace-pre-wrap mt-1 leading-relaxed break-words">{comment.text}</p>
                                        </div>
                                        {(isCourseOwner || (user && user.uid === comment.studentId)) && (
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => handleDeleteComment(comment.id)}
                                                title={isArabic ? "حذف التعليق" : "Delete comment"}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </CardHeader>
                                </Card>
                            ))}
                            {!isLoading && comments?.length === 0 && (
                                <div className="text-center py-8 px-4 rounded-xl border border-dashed border-border/50">
                                    <MessageCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                                    <p className="text-xs text-muted-foreground">
                                        {isArabic ? 'لا توجد تعليقات بعد. كن أول من يشارك في المناقشة!' : 'No comments yet. Be the first to start the conversation!'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    
                    {hasMore && !isLoading && (
                        <div className="text-center pt-2">
                            <Button onClick={handleLoadMore} variant="outline" size="sm" disabled={isLoadingMore}>
                                {isLoadingMore ? (isArabic ? 'جاري التحميل...' : 'Loading...') : (isArabic ? 'تحميل المزيد من التعليقات' : 'Load More Comments')}
                            </Button>
                        </div>
                    )}

                    {user ? (
                        <div className="pt-3 border-t border-border">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                                    <span>{isArabic ? 'التعليق باسم:' : 'Posting as:'} <strong className="text-primary font-medium">{resolvedName || (isArabic ? 'طالب' : 'Student')}</strong></span>
                                </div>
                                <Textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder={isArabic ? "اكتب تعليقك أو سؤالك حول هذا الدرس..." : "Add a public comment or question about this lesson..."}
                                    disabled={isSubmitting || isComponentLoading}
                                    maxLength={500}
                                    rows={2}
                                    className="bg-card/70 border-border focus:ring-1 focus:ring-primary focus:border-primary text-xs rounded-xl"
                                />
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] text-muted-foreground font-mono">{newComment.length}/500</span>
                                    <Button onClick={handlePostComment} disabled={isSubmitting || isComponentLoading || !newComment.trim()} size="sm" className="h-8 text-xs font-semibold px-4">
                                       <Send className="mr-1.5 h-3.5 w-3.5" /> {isSubmitting ? (isArabic ? 'جاري النشر...' : 'Posting...') : (isArabic ? 'نشر التعليق' : 'Post')}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-3 rounded-xl bg-card/40 border border-border text-center text-xs text-muted-foreground">
                            {isArabic ? 'يرجى تسجيل الدخول لتتمكن من كتابة تعليق.' : 'Please sign in to post a comment.'}
                        </div>
                    )}
                </>
            )}
            
            {isAuthLoading && (
                <div className="flex items-start gap-4 mt-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="w-full space-y-2">
                        <Skeleton className="h-16 w-full rounded-xl" />
                    </div>
                </div>
            )}
        </div>
    );
}

