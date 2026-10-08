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
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="text-destructive"/>
                    Students in Debt
                </CardTitle>
                <CardDescription>
                    A list of all your personal students with an outstanding balance.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                    <div className="relative flex-grow w-full sm:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Filter by plan name..."
                            value={planFilter}
                            onChange={(e) => setPlanFilter(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <div className="text-lg font-bold">Total Debt: <span className="text-destructive">£{totalDebt.toFixed(2)}</span></div>
                 </div>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead className="text-right">Amount Owed</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {debtStudents.length > 0 ? (
                                debtStudents.map(student => (
                                    <TableRow key={student.id}>
                                        <TableCell className="font-medium">{student.name}</TableCell>
                                        <TableCell>{student.planName}</TableCell>
                                        <TableCell>{student.phone}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant="destructive">£{(student.price - student.paid).toFixed(2)}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        You have no students in debt{debouncedPlanFilter ? ' for this plan' : ''}.
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
