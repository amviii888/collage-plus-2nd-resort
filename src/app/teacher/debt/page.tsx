'use client';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocalData } from '@/context/LocalDataContext';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';

export default function DebtStudentsPage() {
    const { t } = useTranslation();
    const { localStudents } = useLocalData();
    const [planFilter, setPlanFilter] = useState('');
    const debouncedPlanFilter = useDebounce(planFilter, 300);

    const debtStudents = useMemo(() => {
        const studentsInDebt = localStudents.filter(s => s.isInDebt);
        if (!debouncedPlanFilter) {
            return studentsInDebt;
        }
        return studentsInDebt.filter(s => 
            s.planName.toLowerCase().includes(debouncedPlanFilter.toLowerCase())
        );
    }, [localStudents, debouncedPlanFilter]);

    const totalDebt = useMemo(() => {
        return debtStudents.reduce((sum, s) => sum + (s.price - s.paid), 0);
    }, [debtStudents]);

    return (
        <Card className="liquid-glass border-zinc-800">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="text-destructive"/>
                    الطلاب الذين عليهم ديون مستحقة (Debt Tracking)
                </CardTitle>
                <CardDescription>
                    قائمة بجميع طلابك الذين لديهم رصيد مستحق ولم يسددوا بالكامل.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                    <div className="relative flex-grow w-full sm:w-auto">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="تصفية حسب اسم الخطة..."
                            value={planFilter}
                            onChange={(e) => setPlanFilter(e.target.value)}
                            className="pr-10"
                        />
                    </div>
                    <div className="text-lg font-bold">إجمالي الديون: <span className="text-destructive font-mono">{totalDebt.toFixed(2)} EGP</span></div>
                 </div>
                <div className="rounded-md border border-zinc-800 bg-zinc-950/20 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-right">الاسم</TableHead>
                                <TableHead className="text-right">الخطة / الباقة</TableHead>
                                <TableHead className="text-right">الهاتف</TableHead>
                                <TableHead className="text-left">المبلغ المستحق</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {debtStudents.length > 0 ? (
                                debtStudents.map(student => (
                                    <TableRow key={student.id}>
                                        <TableCell className="font-medium">{student.name}</TableCell>
                                        <TableCell>{student.planName}</TableCell>
                                        <TableCell className="font-mono">{student.phone}</TableCell>
                                        <TableCell className="text-left">
                                            <Badge variant="destructive" className="font-mono">{(student.price - student.paid).toFixed(2)} EGP</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                        لا يوجد طلاب عليهم ديون{debouncedPlanFilter ? ' لهذه الخطة' : ''}.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
