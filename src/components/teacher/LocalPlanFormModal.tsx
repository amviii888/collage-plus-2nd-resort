
'use client';
import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useTranslation } from 'react-i18next';
import type { LocalPlan, DayOfWeek } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';

const daysOfWeek: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const localPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  durationMonths: z.coerce.number().min(1, 'Duration must be at least 1 month'),
  price: z.coerce.number().min(0, 'Price must be a positive number.'),
  sessionDays: z.array(z.string()).optional(),
});

type PlanFormValues = z.infer<typeof localPlanSchema>;

interface LocalPlanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (plan: Omit<LocalPlan, 'id' | 'createdAt' | 'totalProfit'>, planId?: string) => void;
  planToEdit: LocalPlan | null;
}

export function LocalPlanFormModal({ isOpen, onClose, onSave, planToEdit }: LocalPlanFormModalProps) {
  const { t } = useTranslation();

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(localPlanSchema),
    defaultValues: {
      name: '',
      durationMonths: 1,
      price: 0,
      sessionDays: [],
    }
  });

  useEffect(() => {
    if (isOpen) {
      if (planToEdit) {
        form.reset({
          name: planToEdit.name,
          durationMonths: planToEdit.durationMonths,
          price: planToEdit.price || 0,
          sessionDays: planToEdit.sessionDays || [],
        });
      } else {
        form.reset({
          name: '',
          durationMonths: 1,
          price: 0,
          sessionDays: [],
        });
      }
    }
  }, [planToEdit, isOpen, form]);

  const onSubmit = (data: PlanFormValues) => {
    onSave({
      ...data,
      sessionDays: data.sessionDays as DayOfWeek[] | undefined,
    }, planToEdit?.id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{planToEdit ? t('Edit Personal Plan') : t('Create Personal Plan')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Plan Name')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('e.g., Weekly Math Session')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="durationMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Duration (Months)')}</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Price (£)')}</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g. 150" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="sessionDays"
              render={() => (
                  <FormItem>
                      <FormLabel>{t('Session Days (Optional)')}</FormLabel>
                      <div className="grid grid-cols-3 gap-2 rounded-lg border p-2">
                      {daysOfWeek.map((day) => (
                          <FormField
                              key={day}
                              control={form.control}
                              name="sessionDays"
                              render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                                      <FormControl>
                                          <Checkbox
                                              checked={field.value?.includes(day)}
                                              onCheckedChange={(checked) => {
                                                  const currentValue = field.value || [];
                                                  return checked
                                                      ? field.onChange([...currentValue, day])
                                                      : field.onChange(currentValue.filter(value => value !== day))
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>{t('Cancel')}</Button>
              <Button type="submit">{t('Save Plan')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
