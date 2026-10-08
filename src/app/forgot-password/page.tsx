
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, limit, updateDoc, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();

    const [step, setStep] = useState<1 | 2>(1);
    const [isLoading, setIsLoading] = useState(false);

    // Step 1 states
    const [studentCode, setStudentCode] = useState('');
    const [studentPhone, setStudentPhone] = useState('');
    const [parentPhone, setParentPhone] = useState('');
    const [studentDocId, setStudentDocId] = useState<string | null>(null);

    // Step 2 states
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleValidationStep = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // First attempt server-side verification if available
            let data: any = { fallbackToClient: true };
            try {
                const res = await fetch('/api/auth/verify-reset-info', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        studentCode: studentCode.trim(),
                        phoneNumber: studentPhone.trim(),
                        parentPhoneNumber: parentPhone.trim()
                    })
                });

                const contentType = res.headers.get('content-type') || '';
                if (contentType.includes('application/json')) {
                    data = await res.json();
                }

                if (res.ok && data.verified) {
                    setStudentDocId(data.studentId || null);
                    setStep(2);
                    toast({ title: 'Identity Verified', description: 'Please set your new password.' });
                    return;
                }

                // If API explicitly rejected verification with wrong info
                if (!res.ok && data.error && !data.fallbackToClient) {
                    throw new Error(data.error);
                }
            } catch (fetchErr: any) {
                if (fetchErr.message && !fetchErr.message.includes('JSON')) {
                    throw fetchErr;
                }
            }

            // Fallback to client-side verification if server API requested fallback
            if (firestore) {
                const studentsRef = collection(firestore, 'students');
                const q = query(studentsRef, where("barcodeId", "==", studentCode.trim()), limit(1));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    throw new Error("Student code not found. Please check your information.");
                }

                const studentDoc = querySnapshot.docs[0];
                const sData = studentDoc.data();

                const recPhone = (sData.phoneNumber || '').trim();
                const recParentPhone = (sData.parentPhoneNumber || '').trim();
                const inPhone = studentPhone.trim();
                const inParentPhone = parentPhone.trim();

                const phoneMatch = (!inPhone || recPhone === inPhone) && 
                                   (!inParentPhone || recParentPhone === inParentPhone) &&
                                   ((inPhone && recPhone === inPhone) || (inParentPhone && recParentPhone === inParentPhone));

                if (!phoneMatch) {
                    throw new Error("The phone numbers entered do not match our student records.");
                }

                setStudentDocId(studentDoc.id);
                setStep(2);
                toast({ title: 'Identity Verified', description: 'Please set your new password.' });
            } else {
                throw new Error(data.error || "Verification failed. Please try again.");
            }
        } catch (error: any) {
            toast({ 
                variant: 'destructive', 
                title: 'Verification Failed', 
                description: error.message || 'Incorrect information provided.' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast({ variant: 'destructive', title: 'Error', description: 'Passwords do not match.' });
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentCode: studentCode.trim(),
                    newPassword: newPassword,
                    phoneNumber: studentPhone.trim(),
                    parentPhoneNumber: parentPhone.trim()
                })
            });

            const contentType = res.headers.get('content-type') || '';
            const data = contentType.includes('application/json') ? await res.json() : {};
            if (!res.ok) {
                // If it's our backend mock message, we'll inform the user but also update Firestore with a fallback hash so they can login.
                // In a perfect world the API alone resets standard Firebase Auth. 
                if (data.error && data.error.includes("Backend authentication service is not fully configured")) {
                    toast({ 
                        variant: 'destructive', 
                        title: 'Production Setup Required', 
                        description: data.error 
                    });
                    return; // Stop here, backend is needed.
                }
                throw new Error(data.error || 'Failed to reset password. Please check your credentials.');
            }

            toast({ title: 'Password Reset Successful!', description: 'You can now log in with your new password.' });
            router.replace('/login?role=student');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Reset Error', description: error.message || 'An unexpected error occurred.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full items-center justify-center p-4 bg-muted/30">
            <Card className="mx-auto w-full max-w-md">
                <CardHeader>
                    <div className="mb-4">
                         <Button variant="ghost" size="sm" asChild className="pl-0 gap-1">
                            <Link href="/login"><ArrowLeft className="w-4 h-4"/> Back to Login</Link>
                         </Button>
                    </div>
                    <CardTitle className="text-2xl font-bold">Password Recovery</CardTitle>
                    <CardDescription>
                        {step === 1 ? 'Verify your identity to reset your password.' : 'Create a new secure password for your account.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {step === 1 ? (
                        <form onSubmit={handleValidationStep} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="studentCode">Student Code</Label>
                                <Input id="studentCode" required value={studentCode} onChange={(e) => setStudentCode(e.target.value)} placeholder="e.g. 12345" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="studentPhone">Your Phone Number</Label>
                                <Input id="studentPhone" type="tel" required value={studentPhone} onChange={(e) => setStudentPhone(e.target.value)} placeholder="01xxxxxxxxx" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="parentPhone">Parent&apos;s Phone Number</Label>
                                <Input id="parentPhone" type="tel" required value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="01xxxxxxxxx" />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? 'Verifying...' : 'Verify Identity'}
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handlePasswordReset} className="space-y-4">
                             <div className="space-y-2">
                                <Label htmlFor="newPassword">New Password</Label>
                                <Input id="newPassword" type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <Input id="confirmPassword" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading || !newPassword}>
                                {isLoading ? 'Resetting...' : 'Save New Password'}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
