
'use client';
import { useState, useMemo, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import type { Course, CourseCollection, Teacher, CollectionCustomItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  PlusCircle, 
  Edit, 
  Trash2, 
  Library, 
  BookOpen, 
  Layers, 
  Film, 
  FileText, 
  Plus, 
  Check, 
  X,
  Sparkles,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const collectionSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    thumbnailUrl: z.string().url('Must be a valid URL'),
});

type CollectionFormValues = z.infer<typeof collectionSchema>;

function CollectionFormModal({ 
    isOpen, 
    onClose, 
    onSave, 
    collectionToEdit, 
    courses, 
    teacherId 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    onSave: (data: CourseCollection) => void; 
    collectionToEdit: CourseCollection | null; 
    courses: Course[]; 
    teacherId: string; 
}) {
    const { t } = useTranslation();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
    const [customItems, setCustomItems] = useState<CollectionCustomItem[]>([]);
    
    // Custom PDF adding state
    const [pdfTitle, setPdfTitle] = useState('');
    const [pdfUrl, setPdfUrl] = useState('');
    const [showPdfInput, setShowPdfInput] = useState(false);

    const form = useForm<CollectionFormValues>({
        resolver: zodResolver(collectionSchema),
        defaultValues: {
            title: collectionToEdit?.title || '',
            description: collectionToEdit?.description || '',
            thumbnailUrl: collectionToEdit?.thumbnailUrl || '',
        },
    });
    
    useEffect(() => {
        if (isOpen) {
             form.reset({
                title: collectionToEdit?.title || '',
                description: collectionToEdit?.description || '',
                thumbnailUrl: collectionToEdit?.thumbnailUrl || '',
            });
            setSelectedCourseIds(collectionToEdit?.courseIds || []);
            setCustomItems(collectionToEdit?.customItems || []);
            setPdfTitle('');
            setPdfUrl('');
            setShowPdfInput(false);
        }
    }, [isOpen, collectionToEdit, form]);

    const handleAddLessonItem = (course: Course, unit: any, video: any) => {
        const itemId = `${course.id}_${unit.id}_${video.id}`;
        if (customItems.some(i => i.id === itemId)) {
            setCustomItems(customItems.filter(i => i.id !== itemId));
        } else {
            const newItem: CollectionCustomItem = {
                id: itemId,
                type: 'lesson',
                courseId: course.id,
                courseTitle: course.title,
                unitId: unit.id,
                unitTitle: unit.title,
                videoId: video.id,
                videoTitle: video.title,
                videoUrl: video.url,
            };
            setCustomItems([...customItems, newItem]);
            if (!selectedCourseIds.includes(course.id)) {
                setSelectedCourseIds([...selectedCourseIds, course.id]);
            }
        }
    };

    const handleAddUnitItem = (course: Course, unit: any) => {
        const itemId = `${course.id}_${unit.id}`;
        if (customItems.some(i => i.id === itemId)) {
            setCustomItems(customItems.filter(i => i.id !== itemId));
        } else {
            const newItem: CollectionCustomItem = {
                id: itemId,
                type: 'unit',
                courseId: course.id,
                courseTitle: course.title,
                unitId: unit.id,
                unitTitle: unit.title,
            };
            setCustomItems([...customItems, newItem]);
            if (!selectedCourseIds.includes(course.id)) {
                setSelectedCourseIds([...selectedCourseIds, course.id]);
            }
        }
    };

    const handleAddPdf = () => {
        if (!pdfTitle.trim() || !pdfUrl.trim()) return;
        const newItem: CollectionCustomItem = {
            id: uuidv4(),
            type: 'file',
            fileTitle: pdfTitle.trim(),
            fileUrl: pdfUrl.trim(),
        };
        setCustomItems([...customItems, newItem]);
        setPdfTitle('');
        setPdfUrl('');
        setShowPdfInput(false);
    };

    const handleRemoveCustomItem = (id: string) => {
        setCustomItems(customItems.filter(i => i.id !== id));
    };

    const onSubmit = (data: CollectionFormValues) => {
        setIsSubmitting(true);
        // Calculate all referenced course IDs
        const derivedCourseIds = Array.from(new Set([
            ...selectedCourseIds,
            ...customItems.map(i => i.courseId).filter(Boolean) as string[]
        ]));

        const collectionData: CourseCollection = {
            id: collectionToEdit?.id || uuidv4(),
            teacherId: teacherId,
            title: data.title,
            description: data.description || '',
            thumbnailUrl: data.thumbnailUrl,
            courseIds: derivedCourseIds.length > 0 ? derivedCourseIds : (courses[0] ? [courses[0].id] : []),
            customItems: customItems,
            locked: true,
        };
        onSave(collectionData);
        setIsSubmitting(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-950 border border-zinc-800 text-white rounded-3xl p-6">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
                        <Library className="w-5 h-5 text-emerald-400" />
                        {collectionToEdit ? 'Edit' : 'Create'} Custom Collection
                    </DialogTitle>
                    <DialogDescription className="text-xs text-zinc-400">
                        Bundle full courses, specific units, hand-picked lessons, and PDF files into a single curated collection.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="title" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs text-zinc-300">Collection Title</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Ultimate Calculus & Physics Bundle" {...field} className="bg-zinc-900 border-zinc-800 text-white rounded-xl text-xs h-9" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="thumbnailUrl" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs text-zinc-300">Cover Thumbnail URL</FormLabel>
                                    <FormControl>
                                        <Input placeholder="https://..." {...field} className="bg-zinc-900 border-zinc-800 text-white rounded-xl text-xs h-9" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                        <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs text-zinc-300">Description</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Overview of what students get inside this package..." {...field} className="bg-zinc-900 border-zinc-800 text-white rounded-xl text-xs min-h-[60px]" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        {/* Selected Items Summary Bar */}
                        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold text-white flex items-center gap-1.5">
                                    <Sparkles className="w-4 h-4 text-emerald-400" />
                                    Items In This Collection ({selectedCourseIds.length + customItems.length})
                                </Label>
                                <Button 
                                    type="button" 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => setShowPdfInput(!showPdfInput)}
                                    className="h-7 text-xs border-zinc-700 hover:bg-zinc-800 rounded-lg text-emerald-400"
                                >
                                    <Plus className="w-3 h-3 mr-1" /> Add PDF File
                                </Button>
                            </div>

                            {/* Add PDF Input drawer */}
                            {showPdfInput && (
                                <div className="p-3 rounded-xl bg-zinc-950 border border-emerald-500/30 space-y-2 animate-in fade-in-50">
                                    <p className="text-xs font-semibold text-emerald-400">Add Resource PDF / Document</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <Input 
                                            placeholder="Document Title (e.g. Formula Sheet)" 
                                            value={pdfTitle} 
                                            onChange={(e) => setPdfTitle(e.target.value)}
                                            className="bg-zinc-900 border-zinc-800 text-xs h-8 rounded-lg"
                                        />
                                        <Input 
                                            placeholder="File URL (Drive, Cloudinary, etc.)" 
                                            value={pdfUrl} 
                                            onChange={(e) => setPdfUrl(e.target.value)}
                                            className="bg-zinc-900 border-zinc-800 text-xs h-8 rounded-lg"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-1">
                                        <Button type="button" size="sm" variant="ghost" onClick={() => setShowPdfInput(false)} className="h-7 text-xs">Cancel</Button>
                                        <Button type="button" size="sm" onClick={handleAddPdf} className="h-7 text-xs bg-emerald-500 hover:bg-emerald-600 text-black font-bold">Add to Collection</Button>
                                    </div>
                                </div>
                            )}

                            {/* Custom Items list */}
                            {customItems.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {customItems.map((item) => (
                                        <Badge 
                                            key={item.id} 
                                            variant="outline" 
                                            className="bg-zinc-950 border-zinc-700 text-zinc-200 text-xs py-1 px-2.5 flex items-center gap-1.5 rounded-lg"
                                        >
                                            {item.type === 'lesson' && <Film className="w-3 h-3 text-emerald-400 shrink-0" />}
                                            {item.type === 'unit' && <Layers className="w-3 h-3 text-blue-400 shrink-0" />}
                                            {item.type === 'file' && <FileText className="w-3 h-3 text-amber-400 shrink-0" />}
                                            <span className="truncate max-w-[200px]">
                                                {item.type === 'lesson' ? `${item.videoTitle} (${item.courseTitle})` :
                                                 item.type === 'unit' ? `${item.unitTitle} (${item.courseTitle})` :
                                                 item.fileTitle}
                                            </span>
                                            <button 
                                                type="button" 
                                                onClick={() => handleRemoveCustomItem(item.id)}
                                                className="text-zinc-500 hover:text-rose-400 ml-1"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Interactive Course & Unit & Lesson Picker */}
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-zinc-300">
                                Select Full Courses, Specific Units, or Individual Lessons
                            </Label>
                            
                            <ScrollArea className="h-64 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3">
                                <div className="space-y-3">
                                    {courses.map((course) => {
                                        const isWholeCourseSelected = selectedCourseIds.includes(course.id);
                                        const units = course.units || (course.videos ? [{ id: 'u1', title: 'Main Unit', videos: course.videos }] : []);

                                        return (
                                            <div key={course.id} className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={`course-${course.id}`}
                                                            checked={isWholeCourseSelected}
                                                            onCheckedChange={(checked) => {
                                                                if (checked) {
                                                                    setSelectedCourseIds([...selectedCourseIds, course.id]);
                                                                } else {
                                                                    setSelectedCourseIds(selectedCourseIds.filter(id => id !== course.id));
                                                                }
                                                            }}
                                                        />
                                                        <Label htmlFor={`course-${course.id}`} className="font-bold text-xs text-white cursor-pointer">
                                                            {course.title}
                                                        </Label>
                                                    </div>
                                                    <Badge variant="outline" className="text-[10px] text-zinc-400 border-zinc-800">
                                                        {units.length} Units
                                                    </Badge>
                                                </div>

                                                {/* Units and Lessons Sub-tree */}
                                                <div className="pl-6 pt-1 space-y-2 border-l border-zinc-800">
                                                    {units.map((unit) => {
                                                        const isUnitSelected = customItems.some(i => i.id === `${course.id}_${unit.id}`);
                                                        return (
                                                            <div key={unit.id} className="space-y-1.5">
                                                                <div className="flex items-center justify-between text-xs">
                                                                    <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
                                                                        <Layers className="w-3 h-3 text-blue-400" />
                                                                        <span>{unit.title}</span>
                                                                    </div>
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        variant={isUnitSelected ? "secondary" : "ghost"}
                                                                        onClick={() => handleAddUnitItem(course, unit)}
                                                                        className="h-6 text-[10px] px-2 rounded"
                                                                    >
                                                                        {isUnitSelected ? "✓ Unit Added" : "+ Add Unit"}
                                                                    </Button>
                                                                </div>

                                                                {/* Individual lessons in unit */}
                                                                <div className="pl-4 space-y-1">
                                                                    {unit.videos?.map((vid: any) => {
                                                                        const isLessonSelected = customItems.some(i => i.id === `${course.id}_${unit.id}_${vid.id}`);
                                                                        return (
                                                                            <div key={vid.id} className="flex items-center justify-between text-[11px] text-zinc-400 hover:text-zinc-200">
                                                                                <div className="flex items-center gap-1.5 truncate pr-2">
                                                                                    <Film className="w-2.5 h-2.5 text-zinc-500 shrink-0" />
                                                                                    <span className="truncate">{vid.title}</span>
                                                                                </div>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleAddLessonItem(course, unit, vid)}
                                                                                    className={cn(
                                                                                        "text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors",
                                                                                        isLessonSelected ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-500 hover:text-emerald-400"
                                                                                    )}
                                                                                >
                                                                                    {isLessonSelected ? "✓ Lesson Added" : "+ Lesson"}
                                                                                </button>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="ghost" onClick={onClose} className="text-zinc-400 hover:text-white text-xs">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs rounded-xl px-5">
                                {isSubmitting ? 'Saving...' : 'Save Collection'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export function ManageCollections({ teacherId }: { teacherId: string }) {
    const { t } = useTranslation();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [collectionToEdit, setCollectionToEdit] = useState<CourseCollection | null>(null);

    const collectionsQuery = useMemoFirebase(() => collection(firestore, `teachers/${teacherId}/courseCollections`), [firestore, teacherId]);
    const { data: collections, isLoading: collectionsLoading } = useCollection<CourseCollection>(collectionsQuery);

    const coursesQuery = useMemoFirebase(() => collection(firestore, `teachers/${teacherId}/courses`), [firestore, teacherId]);
    const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

    const handleSaveCollection = async (data: CourseCollection) => {
        const collectionRef = doc(firestore, `teachers/${teacherId}/courseCollections`, data.id);
        try {
            await setDoc(collectionRef, data, { merge: true });
            toast({ title: collectionToEdit ? 'Collection Updated' : 'Collection Created' });
            setIsModalOpen(false);
            setCollectionToEdit(null);
        } catch(e: any) {
            toast({ title: 'Error', description: e.message, variant: 'destructive' });
        }
    };
    
    const handleDeleteCollection = async (collectionId: string) => {
        if (window.confirm('Are you sure you want to delete this collection?')) {
            const collectionRef = doc(firestore, `teachers/${teacherId}/courseCollections`, collectionId);
            await deleteDoc(collectionRef);
            toast({ title: 'Collection Deleted', variant: 'destructive' });
        }
    };
    
    const openCreateModal = () => {
        setCollectionToEdit(null);
        setIsModalOpen(true);
    };

    const openEditModal = (collection: CourseCollection) => {
        setCollectionToEdit(collection);
        setIsModalOpen(true);
    };
    
    const isLoading = collectionsLoading || coursesLoading;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <Library className="w-6 h-6 text-emerald-400" /> My Course Collections
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                        Build tailored collections containing chosen courses, specific units, lessons, and PDF files.
                    </p>
                </div>
                <Button onClick={openCreateModal} size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-xl">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Collection
                </Button>
            </div>
            
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-3xl bg-zinc-900 border border-zinc-800" />)}
                </div>
            ) : collections && collections.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {collections.map(collection => {
                        const totalCustom = collection.customItems?.length || 0;
                        return (
                            <Card key={collection.id} className="flex flex-col rounded-3xl bg-zinc-950 border border-zinc-800 overflow-hidden shadow-xl hover:border-zinc-700 transition-all">
                                <CardHeader className="p-0">
                                    <div className="aspect-video w-full overflow-hidden relative bg-zinc-900">
                                        <Image src={collection.thumbnailUrl} alt={collection.title} fill className="object-cover"/>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-grow p-5 space-y-2">
                                    <h3 className="font-bold text-base text-white line-clamp-2">{collection.title}</h3>
                                    <p className="text-xs text-zinc-400 line-clamp-2">{collection.description}</p>
                                    <div className="flex flex-wrap items-center gap-2 mt-2 pt-1 text-xs text-zinc-400">
                                        <Badge variant="outline" className="text-[11px] bg-zinc-900 border-zinc-800 text-zinc-300 flex items-center gap-1">
                                            <BookOpen className="w-3 h-3 text-emerald-400" />
                                            <span>{collection.courseIds?.length || 0} Courses</span>
                                        </Badge>
                                        {totalCustom > 0 && (
                                            <Badge variant="outline" className="text-[11px] bg-zinc-900 border-zinc-800 text-zinc-300 flex items-center gap-1">
                                                <Layers className="w-3 h-3 text-blue-400" />
                                                <span>{totalCustom} Tailored Items</span>
                                            </Badge>
                                        )}
                                    </div>
                                </CardContent>
                                <CardFooter className="flex justify-end gap-2 p-4 pt-0 border-t border-zinc-900">
                                    <Button variant="ghost" size="sm" onClick={() => openEditModal(collection)} className="text-xs text-zinc-300 hover:text-white rounded-xl">
                                        <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl" onClick={() => handleDeleteCollection(collection.id)}>
                                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                 <div className="col-span-full text-center py-16 text-zinc-500 space-y-4 border-2 border-dashed border-zinc-800 rounded-3xl">
                    <Library className="mx-auto h-12 w-12 text-zinc-600" />
                    <p className="text-sm">No course collections created yet.</p>
                    <Button onClick={openCreateModal} className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-xl text-xs">
                        Create your first collection
                    </Button>
                </div>
            )}
            
            <CollectionFormModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveCollection}
                collectionToEdit={collectionToEdit}
                courses={courses || []}
                teacherId={teacherId}
            />
        </div>
    );
}

export default ManageCollections;

