
'use client';
import { useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, addDoc, deleteDoc } from 'firebase/firestore';
import type { Aide, BiometricCredential } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Fingerprint, Trash2, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Helper function for WebAuthn
function bufferEncode(value: ArrayBuffer): string {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(value) as any))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
}

export function BiometricManager({ aide }: { aide: Aide }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [newCredentialName, setNewCredentialName] = useState('');

    const credsCollectionRef = useMemoFirebase(() => collection(firestore, `hubs/main-hub/aides/${aide.id}/biometricCredentials`), [firestore, aide.id]);
    const { data: credentials, isLoading } = useCollection<BiometricCredential>(credsCollectionRef);

    const handleRegister = async () => {
        if (!newCredentialName.trim()) {
            toast({ title: 'Please provide a name for this device/fingerprint.', variant: 'destructive'});
            return;
        }
        if (credentials && credentials.length >= 3) {
            toast({ title: 'Maximum number of credentials reached.', description: 'Please delete an old one before adding a new one.', variant: 'destructive'});
            return;
        }

        try {
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);

            const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
                challenge,
                rp: { name: 'Universe Academy' },
                user: {
                    id: new TextEncoder().encode(aide.id),
                    name: aide.name, // WebAuthn expects a name, email is often used here
                    displayName: aide.name,
                },
                pubKeyCredParams: [{ alg: -7, type: 'public-key' }], // ES256
                authenticatorSelection: {
                    authenticatorAttachment: 'platform', // Use platform authenticator (like Touch ID / Windows Hello)
                    userVerification: 'required',
                },
                timeout: 60000,
                attestation: 'direct',
            };

            const newCredential = await navigator.credentials.create({ publicKey: publicKeyCredentialCreationOptions });

            if (newCredential && 'rawId' in newCredential) {
                const credentialData: Omit<BiometricCredential, 'id'> = {
                    name: newCredentialName,
                    credentialId: bufferEncode(newCredential.rawId),
                    publicKey: bufferEncode((newCredential as any).response.getPublicKey()),
                };
                await addDoc(credsCollectionRef, credentialData);
                toast({ title: 'Biometric Credential Added', description: `Successfully registered '${newCredentialName}'.` });
                setNewCredentialName('');
            }
        } catch (error: any) {
            console.error("Biometric registration error:", error);
            toast({ title: 'Registration Failed', description: error.message, variant: 'destructive'});
        }
    };

    const handleDelete = async (credId: string) => {
        if (window.confirm('Are you sure you want to delete this biometric credential?')) {
            const credRef = doc(credsCollectionRef, credId);
            await deleteDoc(credRef);
            toast({ title: 'Credential Deleted', variant: 'destructive'});
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Fingerprint /> Biometric Security</CardTitle>
                <CardDescription>Manage fingerprints or other biometrics for secure admin login. A maximum of 3 can be registered.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Registered Credentials</Label>
                    {isLoading ? <p>Loading...</p> : (
                        <div className="space-y-2">
                            {credentials && credentials.length > 0 ? credentials.map(cred => (
                                <div key={cred.id} className="flex items-center justify-between p-2 border rounded-md bg-muted">
                                    <p className="font-medium">{cred.name}</p>
                                    <Button size="icon" variant="ghost" onClick={() => handleDelete(cred.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                </div>
                            )) : <p className="text-sm text-muted-foreground text-center py-4">No biometrics registered yet. Login will only require a password.</p>}
                        </div>
                    )}
                </div>
                {(!credentials || credentials.length < 3) && (
                    <div className="space-y-2 border-t pt-4">
                        <Label htmlFor="cred-name">Add New Credential</Label>
                        <div className="flex gap-2">
                            <Input id="cred-name" value={newCredentialName} onChange={e => setNewCredentialName(e.target.value)} placeholder="e.g., My Work Laptop" />
                            <Button onClick={handleRegister}><PlusCircle className="mr-2"/> Register</Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
