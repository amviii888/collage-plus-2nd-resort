'use client';
import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { doc, writeBatch, serverTimestamp, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import type { Course, Teacher, CourseCollection, CourseCollectionAccess } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { signInAnonymously } from 'firebase/auth';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CourseCard } from '@/components/CourseCard';
import { ArrowLeft, BookOpen, Library, Lock, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

function UnlockCollectionDialog({ isOpen, setIsOpen, collection, teacher }: { isOpen: boolean, setIsOpen: (val: boolean) => void, collection: CourseCollection, teacher: Teacher }) {
    const { toast } = useToast();
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [code, setCode] = useState('');
    const firestore = useFirestore();
    const { user } = useUser();
    const auth = useAuth();
    
    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setIsSubmitting(true);
        setError(null);
        if (!firestore || !auth) { return; }

        try {
            let currentUser = user;
            if (!currentUser) {
                const userCredential = await signInAnonymously(auth);
                currentUser = userCredential.user;
            }

            const shareCodesRef = collection(firestore, 'teachers', teacher.id, 'share_codes');
            const q = query(shareCodesRef, where("code", "==", code.toUpperCase()), where("collectionId", "==", collection.id), where("used", "==", false), limit(1));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setError("Invalid or already used share code for this collection.");
                setIsSubmitting(false);
                return;
            }

            const batch = writeBatch(firestore);
            const shareCodeDoc = querySnapshot.docs[0];
            batch.update(shareCodeDoc.ref, { used: true, usedBy: currentUser.uid, usedAt: serverTimestamp() });

            // Grant access to individual courses
            for (const courseId of collection.courseIds) {
                const courseRef = doc(firestore, `teachers/${teacher.id}/courses/${courseId}`);
                const courseSnap = await getDoc(courseRef);
                if (courseSnap.exists()) {
                    const courseData = courseSnap.data() as Course;
                    const accessRef = doc(firestore, `students/${currentUser.uid}/courseAccess`, courseId);
                    batch.set(accessRef, { 
                        courseId: courseId, 
                        teacherId: teacher.id, 
                        unlockedAt: serverTimestamp(),
                        viewCount: 0,
                        viewLimit: courseData.viewLimit ?? 3,
                    });
                }
            }

            await batch.commit();
            toast({ title: 'Collection Unlocked!', description: 'You now have access to all courses in this collection.' });
            window.location.reload();
        } catch (e: any) {
            setError("An error occurred while unlocking the collection.");
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Unlock Course Collection</DialogTitle>
                    <DialogDescription>Enter the share code provided by your teacher to unlock all courses in this collection.</DialogDescription>
                </DialogHeader>
                 <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="code">Share Code</Label>
                        <Input
                            id="code" name="code" value={code} onChange={(e) => setCode(e.target.value)}
                            placeholder="e.g., ABC123" required autoComplete="off" className="font-mono tracking-widest"
                        />
                    </div>
                    {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                    <DialogFooter className="sm:justify-between items-center pt-4">
                         {teacher.phoneNumber ? (
                             <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <Phone className="w-4 h-4"/>
                                <span>or contact the teacher at {teacher.phoneNumber}</span>
                            </div>
                        ) : <div/>}
                        <div className="flex gap-2">
                            <Button variant="outline" type="button" onClick={() => setIsOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Verifying...' : 'Unlock Collection'}</Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default function CollectionClient({ teacherId, collectionId }: { teacherId: string, collectionId: string }) {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const { toast } = useToast();
    const [isUnlockOpen, setUnlockOpen] = useState(false);
    const [courses, setCourses] = useState<Course[]>([]);
    const [areCoursesLoading, setAreCoursesLoading] = useState(true);

    const { data: collection, isLoading: isCollectionLoading } = useDoc<CourseCollection>(useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, `teachers/${teacherId}/courseCollections/${collectionId}`);
    }, [firestore, teacherId, collectionId]));

    const { data: teacher, isLoading: isTeacherLoading } = useDoc<Teacher>(useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, `teachers`, teacherId);
    }, [firestore, teacherId]));

    useEffect(() => {
        if (collection && firestore) {
            setAreCoursesLoading(true);
            const fetchCourses = async () => {
                const coursePromises = collection.courseIds.map(courseId => getDoc(doc(firestore, 'teachers', teacherId, 'courses', courseId)));
                const courseDocs = await Promise.all(coursePromises);
                const fetchedCourses = courseDocs
                    .filter(doc => doc.exists())
                    .map(doc => ({ id: doc.id, ...doc.data() }) as Course);
                setCourses(fetchedCourses);
                setAreCoursesLoading(false);
            };
            fetchCourses();
        }
    }, [collection, firestore, teacherId]);

    const collectionAccessQuery = useMemoFirebase(() => {
        if (!user?.uid || !firestore || !collection) return null;
        // Check access for the first course in the collection as a proxy for the whole collection
        const firstCourseId = collection.courseIds[0];
        if (!firstCourseId) return null;
        return doc(firestore, `students/${user.uid}/courseAccess/${firstCourseId}`);
    }, [user, firestore, collection]);
    
    const { data: firstCourseAccess, isLoading: isAccessLoading } = useDoc(collectionAccessQuery);
    
    const hasAccess = !!firstCourseAccess;
    const isLoading = isUserLoading || isAccessLoading || isCollectionLoading || isTeacherLoading || areCoursesLoading;

    if (isLoading || !collection || !teacher) {
        return (
            <div className="p-4 space-y-4">
                <Skeleton className="h-64 w-full" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-80 w-full" />)}
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-4 space-y-8">
            <Button asChild variant="ghost" className="mb-4 -ml-4">
                <Link href={`/teacher?id=${teacher.id}`}><ArrowLeft className="mr-2"/> Back to Teacher Profile</Link>
            </Button>
            <Card className="overflow-hidden">
                <CardHeader className="p-0 relative h-64 flex items-end p-6 text-white">
                    <Image src={collection.thumbnailUrl} alt={collection.title} fill className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"/>
                    <div className="relative z-10 space-y-2">
                         <div className="flex items-center gap-2 text-sm">
                            <Library className="w-5 h-5"/>
                            <span>Course Collection</span>
                        </div>
                        <CardTitle className="text-4xl font-bold">{collection.title}</CardTitle>
                        <CardDescription className="text-neutral-300 max-w-2xl">{collection.description}</CardDescription>
                        <div className="flex items-center gap-4 pt-2">
                             <Link href={`/teacher?id=${teacher.id}`} className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={teacher.profilePictureUrl}/>
                                    <AvatarFallback>{teacher.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-semibold hover:underline">{teacher.name}</span>
                            </Link>
                             <div className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4"/>
                                <span className="text-sm">{courses.length} Courses</span>
                            </div>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <div className="space-y-4">
                 <h2 className="text-2xl font-bold">Courses in this Collection</h2>
                 {hasAccess ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map(course => (
                            <CourseCard key={course.id} course={course} teacher={teacher} />
                        ))}
                    </div>
                 ) : (
                     <div className="text-center py-16 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-4">
                        <Lock className="w-12 h-12 text-primary" />
                        <h3 className="text-xl font-bold">This Collection is Locked</h3>
                        <p className="text-muted-foreground max-w-md">You need a share code from your teacher to unlock all the courses in this collection at once.</p>
                        <Button onClick={() => setUnlockOpen(true)} size="lg">Unlock Collection</Button>
                    </div>
                 )}
            </div>
            
            <UnlockCollectionDialog 
                isOpen={isUnlockOpen}
                setIsOpen={setUnlockOpen}
                collection={collection}
                teacher={teacher}
            />
        </div>
    );
}
