'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export function PercentageCalculator() {
  const { t } = useTranslation();
  const [number, setNumber] = useState('');
  const [percent, setPercent] = useState('');
  const [result, setResult] = useState('');

  const calculate = (num: string, perc: string) => {
    const numValue = parseFloat(num);
    const percValue = parseFloat(perc);
    if (!isNaN(numValue) && !isNaN(percValue)) {
      const calculatedResult = (numValue * percValue) / 100;
      setResult(calculatedResult.toFixed(2));
    } else {
        setResult('');
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNumber = e.target.value;
    setNumber(newNumber);
    calculate(newNumber, percent);
  };

  const handlePercentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPercent = e.target.value;
    setPercent(newPercent);
    calculate(number, newPercent);
  };
  
  const handleQuickPercent = (quickPerc: number) => {
    const newPercent = String(quickPerc);
    setPercent(newPercent);
    calculate(number, newPercent);
  }

  const quickPercentages = [90, 60, 50, 40, 20, 10];

  return (
    <Card>
        <CardHeader>
            <CardTitle>{t('Percentage Calculator')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="number-input">{t('Number')}</Label>
                <Input
                    id="number-input"
                    type="number"
                    value={number}
                    onChange={handleNumberChange}
                    placeholder={t('Enter a number')}
                    className="text-lg"
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="percent-input">{t('Percentage (%)')}</Label>
                <Input
                    id="percent-input"
                    type="number"
                    value={percent}
                    onChange={handlePercentChange}
                    placeholder={t('Enter percentage')}
                    className="text-lg"
                />
            </div>
            <div className="space-y-2">
                <Label>{t('Quick Percentages')}</Label>
                <div className="grid grid-cols-3 gap-2">
                    {quickPercentages.map(p => (
                        <Button key={p} variant="outline" onClick={() => handleQuickPercent(p)}>{p}%</Button>
                    ))}
                </div>
            </div>
             <div className="space-y-2 pt-4">
                <Label>{t('Result')}</Label>
                <Input
                    type="text"
                    value={result ? `£${result}`: ''}
                    readOnly
                    className="text-2xl font-bold h-14 bg-muted"
                    placeholder={t('Result')}
                />
            </div>
        </CardContent>
    </Card>
  );
}
