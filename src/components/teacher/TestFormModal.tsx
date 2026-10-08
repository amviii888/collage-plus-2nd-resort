'use client';
import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore } from '@/firebase';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import type { Test, TestQuestion } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PlusCircle, Trash2, X } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

const questionSchema = z.object({
  type: z.enum(['mcq', 'true_false']).default('mcq'),
  questionText: z.string().optional().default(''),
  questionMedia: z.string().optional().default(''),
  options: z.array(z.string()).optional().default([]),
  correctAnswer: z.any().optional().default(''),
  points: z.coerce.number().min(1, "Points must be at least 1").default(1),
});

const testSchema = z.object({
  title: z.string().min(1, "Title is required"),
  rulesText: z.string().optional().default(''),
  timeLimit: z.coerce.number().optional().default(0),
  questions: z.array(questionSchema).min(1, "A test must have at least one question"),
});

type TestFormValues = z.infer<typeof testSchema>;

const QuestionField = ({ control, index, remove, register, setValue }: { control: any, index: number, remove: (index: number) => void, register: any, setValue: any }) => {
  const questionType = useWatch({
    control,
    name: `questions.${index}.type`
  });

  const { fields, append, remove: removeOption } = useFieldArray({
    control,
    name: `questions.${index}.options`
  });

  return (
    <div className="p-4 border rounded-lg space-y-4 relative bg-muted/30">
      <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => remove(index)}>
        <Trash2 className="w-4 h-4 text-destructive" />
      </Button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField control={control} name={`questions.${index}.type`} render={({ field }) => (
          <FormItem>
            <FormLabel>Question {index + 1} Type</FormLabel>
            <Select 
              onValueChange={(value) => {
                field.onChange(value);
                if (value === 'true_false') {
                  setValue(`questions.${index}.correctAnswer`, false);
                  setValue(`questions.${index}.options`, []);
                } else {
                  setValue(`questions.${index}.correctAnswer`, '');
                }
              }} 
              defaultValue={field.value}
            >
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="mcq">Multiple Choice</SelectItem>
                <SelectItem value="true_false">True/False</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={control} name={`questions.${index}.points`} render={({ field }) => (
          <FormItem><FormLabel>Points</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
      </div>
      
      <FormField control={control} name={`questions.${index}.questionText`} render={({ field }) => (
        <FormItem><FormLabel>Question Text</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      
      <FormField control={control} name={`questions.${index}.questionMedia`} render={({ field }) => (
        <FormItem><FormLabel>Question Media URL (Google Drive)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
      )} />

      {questionType === 'mcq' && (
        <div className="space-y-2">
          <FormLabel>Options & Correct Answer</FormLabel>
          <FormField control={control} name={`questions.${index}.correctAnswer`} render={({ field }) => (
            <FormItem>
              <RadioGroup 
                onValueChange={field.onChange} 
                value={field.value !== undefined && field.value !== null && field.value !== '' ? String(field.value) : '0'} 
                className="space-y-2"
              >
                {fields.map((item, optionIndex) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <FormControl>
                        <RadioGroupItem value={String(optionIndex)} id={`q${index}-o${optionIndex}`} />
                    </FormControl>
                    <Input {...register(`questions.${index}.options.${optionIndex}`)} placeholder={`Option ${optionIndex + 1}`} />
                    <Button type="button" size="icon" variant="ghost" onClick={() => removeOption(optionIndex)}><X className="w-4 h-4" /></Button>
                  </div>
                ))}
              </RadioGroup>
              <FormMessage />
            </FormItem>
          )} />
          <Button type="button" size="sm" variant="outline" onClick={() => append('')}>Add Option</Button>
        </div>
      )}

      {questionType === 'true_false' && (
        <FormField control={control} name={`questions.${index}.correctAnswer`} render={({ field }) => (
          <FormItem>
            <FormLabel>Correct Answer</FormLabel>
            <RadioGroup 
              onValueChange={(val) => field.onChange(val === 'true')} 
              value={field.value === true || field.value === 'true' ? 'true' : 'false'} 
              className="flex gap-4"
            >
              <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="true" /></FormControl><FormLabel className="font-normal">True</FormLabel></FormItem>
              <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="false" /></FormControl><FormLabel className="font-normal">False</FormLabel></FormItem>
            </RadioGroup>
            <FormMessage />
          </FormItem>
        )} />
      )}
    </div>
  );
};

interface TestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherId: string;
  testToEdit: Test | null;
}

export function TestFormModal({ isOpen, onClose, teacherId, testToEdit }: TestFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<TestFormValues>({
    resolver: zodResolver(testSchema),
  });

  const { control, register, handleSubmit, formState: { errors }, setValue } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "questions"
  });

  useEffect(() => {
    if (isOpen) {
        if (testToEdit) {
            form.reset({
                title: testToEdit.title || '',
                rulesText: testToEdit.rulesText || '',
                timeLimit: testToEdit.timeLimit || 0,
                questions: (testToEdit.questions || []).map(q => ({
                    type: q.type || 'mcq',
                    questionText: q.questionText || '',
                    questionMedia: q.questionMedia || '',
                    options: Array.isArray(q.options) && q.options.length > 0 ? q.options : ['', ''],
                    correctAnswer: q.correctAnswer ?? (q.type === 'mcq' ? '0' : false),
                    points: q.points || 1,
                })),
            });
        } else {
            form.reset({
                title: '',
                rulesText: '',
                timeLimit: 0,
                questions: [
                  { type: 'mcq', questionText: '', questionMedia: '', correctAnswer: '0', points: 1, options: ['', ''] }
                ],
            });
        }
    }
  }, [isOpen, testToEdit, form]);
  
  const generateTestCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const onSubmit = async (data: TestFormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);

    const formattedQuestions: TestQuestion[] = (data.questions || []).map((q) => {
      let finalAnswer: string | boolean;
      if (q.type === 'true_false') {
        finalAnswer = q.correctAnswer === 'true' || q.correctAnswer === true;
      } else {
        finalAnswer = q.correctAnswer !== undefined && q.correctAnswer !== null && String(q.correctAnswer).trim() !== ''
          ? String(q.correctAnswer)
          : '0';
      }

      let cleanMedia = (q.questionMedia || '').trim();
      if (cleanMedia && !cleanMedia.startsWith('http://') && !cleanMedia.startsWith('https://')) {
        cleanMedia = `https://${cleanMedia}`;
      }

      const qItem: TestQuestion = {
        type: q.type,
        questionText: (q.questionText || '').trim(),
        correctAnswer: finalAnswer,
        points: Number(q.points) > 0 ? Number(q.points) : 1,
        options: q.type === 'mcq' 
          ? (q.options || []).filter((opt): opt is string => typeof opt === 'string' && opt.trim() !== '')
          : [],
      };

      if (cleanMedia) {
        qItem.questionMedia = cleanMedia;
      }

      return qItem;
    });

    // Helper to recursively strip any undefined values from the Firestore payload
    const sanitizeForFirestore = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(sanitizeForFirestore).filter((item) => item !== undefined);
      }
      if (obj !== null && typeof obj === 'object') {
        if (typeof obj.toMillis === 'function' || typeof obj.isEqual === 'function') {
          return obj;
        }
        const clean: Record<string, any> = {};
        for (const [key, value] of Object.entries(obj)) {
          if (value !== undefined) {
            clean[key] = sanitizeForFirestore(value);
          }
        }
        return clean;
      }
      return obj;
    };

    const testData = sanitizeForFirestore({
      title: (data.title || '').trim(),
      rulesText: (data.rulesText || '').trim(),
      teacherId: teacherId || '',
      testCode: (testToEdit?.testCode || generateTestCode()).toUpperCase(),
      timeLimit: Number(data.timeLimit) || 0,
      questions: formattedQuestions,
    });

    try {
      if (testToEdit) {
        await updateDoc(doc(firestore, 'tests', testToEdit.id), { ...testData, updatedAt: serverTimestamp() });
        toast({ title: "Test updated successfully" });
      } else {
        await addDoc(collection(firestore, 'tests'), { ...testData, createdAt: serverTimestamp() });
        toast({ title: "Test created successfully" });
      }
      onClose();
    } catch(e: any) {
      toast({ title: "Error", description: e.message || 'Failed to save test.', variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{testToEdit ? 'Edit' : 'Create'} Test</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <ScrollArea className="h-[70vh] p-4">
              <div className="space-y-4">
                <FormField control={control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Test Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={control} name="rulesText" render={({ field }) => (
                  <FormItem><FormLabel>Test Rules</FormLabel><FormControl><Textarea {...field} rows={4} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={control} name="timeLimit" render={({ field }) => (
                  <FormItem><FormLabel>Time Limit (minutes, 0 for none)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <FormLabel>Questions</FormLabel>
                    <Button type="button" size="sm" variant="outline" onClick={() => append({ type: 'mcq', questionText: '', questionMedia: '', correctAnswer: '0', points: 1, options: ['', ''] })}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Question
                    </Button>
                  </div>
                   <div className="space-y-4">
                    {fields.map((field, index) => (
                      <QuestionField key={field.id} control={control} index={index} remove={remove} register={register} setValue={setValue} />
                    ))}
                  </div>
                  {errors.questions && <p className="text-destructive text-sm mt-2">{errors.questions.message}</p>}
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Test'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
