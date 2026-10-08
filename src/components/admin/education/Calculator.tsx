
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';

export function Calculator() {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');

  const handleButtonClick = (value: string) => {
    if (value === 'C') {
      setInput('');
      setResult('');
    } else if (value === '=') {
      try {
        // Using a safe eval alternative is recommended in production.
        // For this context, a simple eval is used.
        const evalResult = eval(input.replace('x', '*').replace('÷', '/'));
        setResult(String(evalResult));
      } catch (error) {
        setResult(t('Error'));
      }
    } else {
      setInput(input + value);
    }
  };

  const buttons = [
    '7', '8', '9', '÷',
    '4', '5', '6', 'x',
    '1', '2', '3', '-',
    '0', '.', '=', '+',
  ];

  return (
    <div className="w-full max-w-xs mx-auto p-4 space-y-4 bg-background rounded-lg border">
      <div className="p-2 rounded-md bg-muted">
        <Input
          type="text"
          value={input}
          readOnly
          className="text-right text-lg font-mono bg-transparent border-0"
          placeholder="0"
        />
        <Input
          type="text"
          value={result}
          readOnly
          className="text-right text-2xl font-bold font-mono bg-transparent border-0 h-auto"
          placeholder={t('Result')}
        />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {buttons.map((btn) => (
          <Button
            key={btn}
            onClick={() => handleButtonClick(btn)}
            variant={['+', '-', 'x', '÷', '='].includes(btn) ? 'secondary' : 'outline'}
            className="text-xl h-14"
          >
            {btn}
          </Button>
        ))}
        <Button onClick={() => handleButtonClick('C')} variant="destructive" className="col-span-4 text-xl h-14">{t('Clear')}</Button>
      </div>
    </div>
  );
}

    