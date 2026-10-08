

'use client';

import { useForm, FormProvider, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore, useUser, updateDocumentNonBlocking } from '@/firebase';
import { AppCache } from '@/lib/cache';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Teacher, Grade } from '@/lib/types';
import { useState } from 'react';
import { subjects } from '@/lib/subjects';
import { grades } from '@/lib/data';
import { Checkbox } from './ui/checkbox';
import { CldUploadButton } from 'next-cloudinary';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { UploadCloud } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const profileFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  phoneNumber: z.string().optional(),
  bio: z.string().max(300, { message: 'Bio cannot be longer than 300 characters.' }).optional(),
  profilePictureUrl: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
  heroImageUrl: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
  subjects: z.array(z.string()).min(1, 'Please select at least one subject.'),
  gradesTaught: z.array(z.string()).min(1, 'Please select at least one grade.'),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface TeacherProfileFormProps {
  teacher: Teacher;
}

export function TeacherProfileForm({ teacher }: TeacherProfileFormProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: teacher.name || '',
      phoneNumber: teacher.phoneNumber || '',
      bio: teacher.bio || '',
      profilePictureUrl: teacher.profilePictureUrl || '',
      heroImageUrl: teacher.heroImageUrl || '',
      subjects: teacher.subjects || [],
      gradesTaught: teacher.gradesTaught || [],
    },
    mode: 'onChange',
  });

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Not Authenticated',
        description: 'You must be logged in to update your profile.',
      });
      return;
    }

    setIsSubmitting(true);
    const teacherRef = doc(firestore, 'teachers', user.uid);
    
    const defaultPfp = PlaceHolderImages.find(p => p.id === 'teacher-profile')?.imageUrl || '';
    const defaultHero = PlaceHolderImages.find(p => p.id === 'teacher-hero')?.imageUrl || '';

    const payload = {
        ...data,
        profilePictureUrl: data.profilePictureUrl || defaultPfp,
        heroImageUrl: data.heroImageUrl || defaultHero,
    };

    try {
      updateDocumentNonBlocking(teacherRef, payload);
      // Evict memory cache to reflect changes immediately
      AppCache.clear(`doc_teachers/${user.uid}`);
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully saved.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'Could not update your profile.',
      });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handlePfpUpload = (result: any) => {
    form.setValue('profilePictureUrl', result.info.secure_url, { shouldValidate: true, shouldDirty: true });
  }

  const handleHeroUpload = (result: any) => {
    form.setValue('heroImageUrl', result.info.secure_url, { shouldValidate: true, shouldDirty: true });
  }

  const pfpUrl = form.watch('profilePictureUrl');

  return (
    <Card className="profile-content-card">
      <CardHeader>
        <CardTitle>Edit Your Profile</CardTitle>
        <CardDescription>
            Update your public teacher profile information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" {...form.register('name')} placeholder="e.g. Dr. Evelyn Reed" />
                    {form.formState.errors.name && (
                        <p className="text-sm font-medium text-destructive">{form.formState.errors.name.message}</p>
                    )}
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
                    <Input id="phoneNumber" {...form.register('phoneNumber')} placeholder="e.g. 01234567890" />
                    {form.formState.errors.phoneNumber && (
                        <p className="text-sm font-medium text-destructive">{form.formState.errors.phoneNumber.message}</p>
                    )}
                </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                {...form.register('bio')}
                className="min-h-[100px]"
                placeholder="Tell us a little about yourself and your teaching philosophy."
              />
              {form.formState.errors.bio && (
                <p className="text-sm font-medium text-destructive">{form.formState.errors.bio.message}</p>
              )}
            </div>

            {teacher.approved && (
              <>
                <div className='flex items-center gap-4'>
                    <Avatar className="h-20 w-20">
                        <AvatarImage src={pfpUrl} />
                        <AvatarFallback>{teacher.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-2 w-full">
                        <Label>Profile Picture (Optional)</Label>
                        <CldUploadButton
                            uploadPreset="unsigned_pfp_upload"
                            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md text-sm font-medium h-9 px-3 w-full flex items-center justify-center gap-2"
                            onSuccess={handlePfpUpload}
                        >
                          <UploadCloud /> Upload an Image
                        </CldUploadButton>
                        {form.formState.errors.profilePictureUrl && (
                            <p className="text-sm font-medium text-destructive">{form.formState.errors.profilePictureUrl.message}</p>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Hero Banner Image (Optional)</Label>
                    {form.watch('heroImageUrl') && <img src={form.watch('heroImageUrl')} alt="Hero preview" className="rounded-md mt-2 object-cover aspect-[3/1]" />}
                    <CldUploadButton
                        uploadPreset="unsigned_pfp_upload"
                        className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md text-sm font-medium h-9 px-3 w-full flex items-center justify-center gap-2"
                        onSuccess={handleHeroUpload}
                    >
                        <UploadCloud /> Upload a Banner
                    </CldUploadButton>
                    <p className="text-xs text-muted-foreground">Recommended size: 1200x400px.</p>
                    {form.formState.errors.heroImageUrl && (
                        <p className="text-sm font-medium text-destructive">{form.formState.errors.heroImageUrl.message}</p>
                     )}
                </div>
              </>
            )}
            
            <div className="space-y-2">
                <Label>Subjects You Teach</Label>
                <Controller
                    name="subjects"
                    control={form.control}
                    render={({ field }) => (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 rounded-lg border p-2 mt-1 max-h-60 overflow-y-auto">
                            {subjects.map(subject => (
                                <div key={subject} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={`subject-${subject}`}
                                        checked={field.value?.includes(subject)}
                                        onCheckedChange={(checked) => {
                                            return checked
                                                ? field.onChange([...field.value, subject])
                                                : field.onChange(field.value?.filter(s => s !== subject))
                                        }}
                                    />
                                    <Label htmlFor={`subject-${subject}`} className="font-normal">{subject}</Label>
                                </div>
                            ))}
                        </div>
                    )}
                />
                 {form.formState.errors.subjects && (
                    <p className="text-sm font-medium text-destructive">{form.formState.errors.subjects.message}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label>Grades You Teach</Label>
                <Controller
                    name="gradesTaught"
                    control={form.control}
                    render={({ field }) => (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 rounded-lg border p-2 mt-1">
                            {grades.map(grade => (
                                <div key={grade} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={`grade-${grade}`}
                                        checked={field.value?.includes(grade)}
                                        onCheckedChange={(checked) => {
                                            return checked
                                                ? field.onChange([...field.value, grade])
                                                : field.onChange(field.value?.filter(g => g !== grade))
                                        }}
                                    />
                                    <Label htmlFor={`grade-${grade}`} className="font-normal">{grade}</Label>
                                </div>
                            ))}
                        </div>
                    )}
                />
                 {form.formState.errors.gradesTaught && (
                    <p className="text-sm font-medium text-destructive">{form.formState.errors.gradesTaught.message}</p>
                )}
            </div>

            <Button type="submit" disabled={isSubmitting || !form.formState.isDirty}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}
