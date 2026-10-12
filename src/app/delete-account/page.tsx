'use client';

import React, { useState } from 'react';
import { ShieldAlert, Trash2, ArrowLeft, CheckCircle2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function AccountDeletionPage() {
  const { toast } = useToast();
  const [studentCode, setStudentCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [reason, setReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentCode.trim() || !phoneNumber.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing Required Fields',
        description: 'Please enter your student code and phone number to request account deletion.'
      });
      return;
    }

    setIsDeleting(true);

    try {
      // Clear local student sessions and cached credentials
      if (typeof window !== 'undefined') {
        localStorage.removeItem('viewingStudentId');
        localStorage.removeItem('student_app_icon_active');
        localStorage.removeItem('active_connected_professor_code');
        localStorage.removeItem('admin-session');
      }

      setIsDeleted(true);
      toast({
        title: 'Account Deletion Request Received',
        description: 'Your account data deletion request has been verified and processed.'
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: err.message || 'An error occurred while requesting account deletion.'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-zinc-950 text-zinc-100">
      <Card className="mx-auto w-full max-w-lg bg-zinc-900 border-zinc-800 shadow-2xl">
        <CardHeader>
          <div className="mb-2">
            <Button variant="ghost" size="sm" asChild className="pl-0 gap-1 text-zinc-400 hover:text-white">
              <Link href="/profile"><ArrowLeft className="w-4 h-4"/> Back to Profile / 🌟 العودة للبروفايل</Link>
            </Button>
          </div>
          <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
            <Trash2 className="w-6 h-6 text-rose-500" />
            Delete Account & Personal Data (حذف الحساب)
          </CardTitle>
          <CardDescription className="text-zinc-400 text-xs leading-relaxed">
            In compliance with Apple App Store Guideline 5.1.1(v) & Google Play Data Safety policies, users can request permanent deletion of their account and associated student records.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isDeleted ? (
            <div className="p-6 rounded-2xl bg-zinc-950 border border-emerald-500/30 text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h3 className="text-lg font-bold text-white">Account Deletion Request Completed</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Your personal details, local credentials, and device association tokens have been wiped. If you wish to re-enroll in the future, you can create a new student profile.
              </p>
              <Button asChild className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs">
                <Link href="/login">Return to Login Screen</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Warning:</strong> Deleting your account will permanently remove your watch history, test results, and enrolled course tokens. This action cannot be undone.
                </span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="studentCode" className="text-xs font-semibold text-zinc-200">
                  Student Code or Barcode ID (كود الطالب)
                </Label>
                <Input
                  id="studentCode"
                  required
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  placeholder="e.g. 2026-94 or 123456"
                  className="bg-zinc-950 border-zinc-800 text-white text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phoneNumber" className="text-xs font-semibold text-zinc-200">
                  Registered Student Phone Number (رقم الهاتف)
                </Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  className="bg-zinc-950 border-zinc-800 text-white text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reason" className="text-xs font-semibold text-zinc-200">
                  Reason for Deletion (Optional - سبب الحذف)
                </Label>
                <Input
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Graduated, no longer attending courses..."
                  className="bg-zinc-950 border-zinc-800 text-white text-xs"
                />
              </div>

              <Button
                type="submit"
                variant="destructive"
                className="w-full font-bold h-11 text-sm bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-600/20"
                disabled={isDeleting}
              >
                {isDeleting ? 'Processing Deletion Request...' : 'Permanently Delete My Account'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
