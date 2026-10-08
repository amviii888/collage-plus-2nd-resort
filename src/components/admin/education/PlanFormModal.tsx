
'use client';
import { useEffect } from 'react';
import { useForm, Controller, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { EnrollmentPlan, DayOfWeek, TeacherSchedule } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { grades } from '@/lib/data';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const daysOfWeek: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const teacherScheduleSchema = z.object({
    name: z.string().min(1, "Teacher name is required"),
    sessionDays: z.array(z.string()).min(1, 'At least one session day must be selected'),
    schedule: z.string().min(1, "Schedule is required"),
});

const planSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  price: z.coerce.number().min(0, 'Price must be a positive number'),
  durationValue: z.coerce.number().min(1, 'Duration value must be at least 1'),
  durationUnit: z.enum(['days', 'months']),
  grades: z.array(z.string()).min(1, 'At least one grade must be selected'),
  description: z.string().min(1, 'Description is required'),
  type: z.enum(['Private', 'Package'], { required_error: 'You must select a plan type.' }),
  
  // Conditional fields
  tutor: z.string().optional(),
  schedule: z.string().optional(),
  sessionDays: z.array(z.string()).optional(),
  teacherSchedules: z.array(teacherScheduleSchema).optional(),
  priceDivisor: z.coerce.number().optional(),
}).refine(data => {
    if (data.type === 'Private') {
        return !!data.tutor && !!data.schedule && data.sessionDays && data.sessionDays.length > 0;
    }
    if (data.type === 'Package') {
        return data.teacherSchedules && data.teacherSchedules.length > 0;
    }
    return false;
}, {
    message: "Please fill in all required fields for the selected plan type.",
    path: ["type"],
});


type PlanFormValues = z.infer<typeof planSchema>;

type PlanFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (plan: EnrollmentPlan) => void;
  plan: EnrollmentPlan | null;
};

export function PlanFormModal({ isOpen, onClose, onSave, plan }: PlanFormModalProps) {
  const { t } = useTranslation();
  
  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: '',
      price: 0,
      durationValue: 1,
      durationUnit: 'months',
      grades: [],
      description: '',
      type: 'Private',
      tutor: '',
      schedule: '',
      sessionDays: [],
      teacherSchedules: [],
      priceDivisor: undefined,
    },
  });

  const { fields: teacherScheduleFields, append: appendTeacher, remove: removeTeacher } = useFieldArray({
    control: form.control,
    name: "teacherSchedules"
  });

  const planType = useWatch({ control: form.control, name: 'type' });

  useEffect(() => {
    if (isOpen) {
        if (plan) {
            form.reset({ 
                ...plan, 
                grades: plan.grades || [],
                type: plan.type || 'Private',
                sessionDays: plan.sessionDays || [],
                teacherSchedules: plan.teacherSchedules?.map(ts => ({ ...ts, sessionDays: ts.sessionDays || [] })) || [],
                priceDivisor: plan.priceDivisor || undefined,
            });
        } else {
            form.reset({
                name: '', price: 0, durationValue: 1, durationUnit: 'months', grades: [], description: '', type: 'Private',
                tutor: '', schedule: '', sessionDays: [], teacherSchedules: [], priceDivisor: undefined,
            });
        }
    }
  }, [plan, form, isOpen]);


  const onSubmit = (data: PlanFormValues) => {
    const finalData: Partial<PlanFormValues> = { ...data };

    // Sanitize priceDivisor to prevent Firestore error with 'undefined'
    if (finalData.priceDivisor === undefined || isNaN(finalData.priceDivisor)) {
      delete finalData.priceDivisor;
    }

    onSave({
      id: plan?.id || '', 
      ...finalData,
      sessionDays: finalData.sessionDays as DayOfWeek[] | undefined,
      teacherSchedules: finalData.teacherSchedules?.map(ts => ({...ts, sessionDays: ts.sessionDays as DayOfWeek[]})),
    } as EnrollmentPlan);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plan ? t('Edit Plan') : t('Add New Plan')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
             <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                    <FormItem className="space-y-3">
                        <FormLabel>{t('Plan Type')}</FormLabel>
                        <FormControl>
                            <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex space-x-4"
                            >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="Private" />
                                </FormControl>
                                <FormLabel className="font-normal">{t('Private Plan')}</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="Package" />
                                </FormControl>
                                <FormLabel className="font-normal">{t('Package Plan')}</FormLabel>
                            </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
                />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Plan Title')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('e.g., Gold Plan - 1 Year')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-4">
                <FormField
                control={form.control}
                name="durationValue"
                render={({ field }) => (
                    <FormItem className="col-span-2">
                        <FormLabel>{t('Duration')}</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder={t('e.g., 3')} {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="durationUnit"
                render={({ field }) => (
                    <FormItem className="self-end">
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={t('Unit')} />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="days">{t('Days')}</SelectItem>
                                <SelectItem value="months">{t('Months')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>{t('Total Price (£)')}</FormLabel>
                  <FormControl>
                      <Input type="number" placeholder={t('e.g., 400')} {...field} />
                  </FormControl>
                  <FormMessage />
                  </FormItem>
              )}
            />

            {planType === 'Private' && (
                <div className="space-y-4 p-4 border rounded-md">
                     <FormField
                        control={form.control}
                        name="tutor"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>{t('Tutor Name')}</FormLabel>
                            <FormControl>
                                <Input placeholder={t('e.g., Mr. Ahmed')} {...field} value={field.value || ''}/>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    <FormField
                    control={form.control}
                    name="schedule"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>{t('Schedule Time')}</FormLabel>
                        <FormControl>
                            <Input placeholder={t('e.g., 6PM to 8PM')} {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                        control={form.control}
                        name="sessionDays"
                        render={() => (
                            <FormItem>
                                <FormLabel>{t('Session Days of the Week')}</FormLabel>
                                <div className="grid grid-cols-3 gap-2 rounded-lg border p-2">
                                {daysOfWeek.map(day => (
                                    <FormField
                                        key={day}
                                        control={form.control}
                                        name="sessionDays"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value?.includes(day)}
                                                        onCheckedChange={checked => {
                                                            return checked
                                                                ? field.onChange([...(field.value || []), day])
                                                                : field.onChange(field.value?.filter(value => value !== day))
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal">{t(day)}</FormLabel>
                                            </FormItem>
                                        )}
                                    />
                                ))}
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            )}
            
            {planType === 'Package' && (
                <div className="space-y-4 p-4 border rounded-md">
                    <FormField
                      control={form.control}
                      name="priceDivisor"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>{t('Price Divisor for Analytics')}</FormLabel>
                          <FormControl>
                              <Input type="number" placeholder={t('e.g., 5 (for 5 subjects)')} {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                          </FormItem>
                      )}
                    />
                    <div className="flex justify-between items-center">
                        <FormLabel>{t('Teacher Schedules')}</FormLabel>
                        <Button type="button" size="sm" variant="outline" onClick={() => appendTeacher({name: '', sessionDays: [], schedule: ''})}>
                            <Plus className="mr-2 h-4 w-4"/> Add Teacher
                        </Button>
                    </div>
                     {teacherScheduleFields.map((field, index) => (
                        <div key={field.id} className="p-3 border rounded-md space-y-4 relative bg-muted/50">
                             <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => removeTeacher(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                            <FormField
                                control={form.control}
                                name={`teacherSchedules.${index}.name`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('Teacher Name')}</FormLabel>
                                        <FormControl><Input {...field} placeholder={t("e.g. Mrs. Fatima")}/></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name={`teacherSchedules.${index}.schedule`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('Schedule Time')}</FormLabel>
                                        <FormControl><Input {...field} placeholder={t("e.g. 5PM - 7PM")}/></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={`teacherSchedules.${index}.sessionDays`}
                                render={() => (
                                    <FormItem>
                                        <FormLabel>{t('Session Days')}</FormLabel>
                                        <div className="grid grid-cols-3 gap-2 p-2 border rounded-md bg-background">
                                            {daysOfWeek.map(day => (
                                                <FormField
                                                    key={day}
                                                    control={form.control}
                                                    name={`teacherSchedules.${index}.sessionDays`}
                                                    render={({ field: dayField }) => (
                                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                                            <FormControl>
                                                                <Checkbox
                                                                    checked={dayField.value?.includes(day)}
                                                                    onCheckedChange={(checked) => {
                                                                        const currentDays = dayField.value || [];
                                                                        return checked
                                                                            ? dayField.onChange([...currentDays, day])
                                                                            : dayField.onChange(currentDays.filter(d => d !== day));
                                                                    }}
                                                                />
                                                            </FormControl>
                                                            <FormLabel className="font-normal">{t(day)}</FormLabel>
                                                        </FormItem>
                                                    )}
                                                />
                                            ))}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                     ))}
                     {form.formState.errors.teacherSchedules && <p className="text-sm font-medium text-destructive">{form.formState.errors.teacherSchedules.message}</p>}
                </div>
            )}
             <FormField
                control={form.control}
                name="grades"
                render={() => (
                    <FormItem>
                        <FormLabel>{t('Grades')}</FormLabel>
                        <div className="grid grid-cols-3 gap-2 rounded-lg border p-2">
                        {grades.map((grade) => (
                            <FormField
                            key={grade}
                            control={form.control}
                            name="grades"
                            render={({ field }) => {
                                return (
                                <FormItem
                                    key={grade}
                                    className="flex flex-row items-start space-x-2 space-y-0"
                                >
                                    <FormControl>
                                    <Checkbox
                                        checked={field.value?.includes(grade)}
                                        onCheckedChange={(checked) => {
                                        return checked
                                            ? field.onChange([...field.value, grade])
                                            : field.onChange(
                                                field.value?.filter(
                                                (value) => value !== grade
                                                )
                                            )
                                        }}
                                    />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                        {t(grade)}
                                    </FormLabel>
                                </FormItem>
                                )
                            }}
                            />
                        ))}
                        </div>
                        <FormMessage />
                    </FormItem>
                )}
                />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Description')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('Describe the plan...')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>{t('Cancel')}</Button>
              <Button type="submit">{t('Save')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
