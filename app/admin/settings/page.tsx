
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, PlusCircle, Trash, RefreshCw, KeyRound, Save, UserPlus, Clipboard, ClipboardCheck, Users, Vote } from 'lucide-react';
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { houses, schoolClasses as defaultClasses } from '@/lib/data';
import { useState, ChangeEvent, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Candidate, SchoolClass, Student } from '@/lib/types';
import { BackButton } from '@/components/back-button';
import Image from 'next/image';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { getDb } from '@/lib/firebase';
import { collection, getDocs, writeBatch, doc, setDoc, addDoc, getDoc, deleteDoc } from "firebase/firestore";


const candidateSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters." }),
  position: z.enum(['HR', 'CR'] as const, {
    errorMap: () => ({ message: "Position is required." }),
  }),
  houseId: z.string({ required_error: "House is required." }),
  classId: z.string().optional(),
  photoUrl: z.string().optional(),
  symbolUrl: z.string().optional(),
}).refine(data => {
    if (data.position === 'CR') {
        return !!data.classId;
    }
    return true;
}, {
    message: "Class is required for CR candidates.",
    path: ["classId"],
});

const studentSchema = z.object({
    classId: z.string({ required_error: "Class is required." }),
    quantity: z.coerce.number().min(1, "Quantity must be at least 1.").max(100, "Cannot generate more than 100 IDs at once."),
});

const classManagementSchema = z.object({
    classes: z.array(z.object({
        id: z.string(),
        name: z.string().min(1, "Class name cannot be empty."),
    }))
});

const passwordChangeSchema = z.object({
    oldPassword: z.string().min(1, "Old password is required."),
    newPassword: z.string().min(6, "New password must be at least 6 characters."),
    confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "New passwords don't match.",
    path: ["confirmPassword"],
});


export default function AdminSettingsPage() {
  const [isCandidateLoading, setIsCandidateLoading] = useState(false);
  const [isStudentLoading, setIsStudentLoading] = useState(false);
  const [isClassLoading, setIsClassLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [isResetVotesLoading, setIsResetVotesLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [symbolPreview, setSymbolPreview] = useState<string | null>(null);
  const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]);
  const [generatedVoterIds, setGeneratedVoterIds] = useState<string[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  const candidateForm = useForm<z.infer<typeof candidateSchema>>({
    resolver: zodResolver(candidateSchema),
    defaultValues: {
      name: "",
      position: undefined,
      houseId: undefined,
      classId: undefined,
      photoUrl: "",
      symbolUrl: "",
    },
  });

  const studentForm = useForm<z.infer<typeof studentSchema>>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
        quantity: 1,
    },
  });
  
  const classForm = useForm<z.infer<typeof classManagementSchema>>({
    resolver: zodResolver(classManagementSchema),
    defaultValues: {
        classes: [],
    }
  });

  const passwordForm = useForm<z.infer<typeof passwordChangeSchema>>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: classForm.control,
    name: "classes",
  });

  const fetchClasses = useCallback(async () => {
    try {
        const db = await getDb();
        const classesCollection = collection(db, 'classes');
        const snapshot = await getDocs(classesCollection);
        const classesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
        const sortedClasses = classesData.sort((a,b) => a.name.localeCompare(b.name));
        
        const finalClasses = sortedClasses.length > 0 ? sortedClasses : defaultClasses;
        setSchoolClasses(finalClasses);
        replace(finalClasses);
    } catch(error) {
        console.error("Failed to fetch classes:", error);
        setSchoolClasses(defaultClasses);
        replace(defaultClasses);
    }
  }, [replace]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const position = candidateForm.watch('position');

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>, fieldName: 'photo' | 'symbol') => {
    const file = e.target.files?.[0];
    if (file) {
      const MAX_FILE_SIZE = 1024 * 1024; // 1MB
      if (file.size > MAX_FILE_SIZE) {
        toast({
          variant: 'destructive',
          title: 'File Too Large',
          description: `The selected file is too large. Please choose a file smaller than 1MB.`,
        });
        e.target.value = ''; // Clear the file input
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (fieldName === 'photo') {
          setPhotoPreview(result);
          candidateForm.setValue('photoUrl', result);
        } else {
          setSymbolPreview(result);
          candidateForm.setValue('symbolUrl', result);
        }
      };
      reader.readAsDataURL(file);
    }
  }, [candidateForm, toast]);

  const onCandidateSubmit = useCallback(async (values: z.infer<typeof candidateSchema>) => {
    setIsCandidateLoading(true);
    try {
        const db = await getDb();
        const newCandidate: Omit<Candidate, 'id'> = {
            name: values.name,
            position: values.position,
            houseId: values.houseId,
            photoUrl: values.photoUrl || '',
            symbolUrl: values.symbolUrl || '',
        };

        if (values.position === 'CR' && values.classId) {
            newCandidate.classId = values.classId;
        }

        await addDoc(collection(db, "candidates"), newCandidate);
        
        toast({
            title: "Candidate Added!",
            description: `${values.name} has been added successfully.`,
        });

        candidateForm.reset();
        setPhotoPreview(null);
        setSymbolPreview(null);

    } catch (error) {
        console.error("Error adding candidate:", error);
        toast({
            variant: 'destructive',
            title: "Something went wrong",
            description: "Could not add the candidate. Please try again.",
        });
    } finally {
        setIsCandidateLoading(false);
    }
  }, [toast, candidateForm]);
  
  const onStudentSubmit = useCallback(async (values: z.infer<typeof studentSchema>) => {
    setIsStudentLoading(true);
    setGeneratedVoterIds([]);
    setIsCopied(false);
    try {
        const db = await getDb();
        const studentsCollection = collection(db, "students");
        const studentDocs = await getDocs(studentsCollection);
        const existingStudentIds = new Set(studentDocs.docs.map(doc => doc.id));

        const newVoterIds: string[] = [];
        const batch = writeBatch(db);

        for(let i = 0; i < values.quantity; i++) {
             let newVoterId = '';
            let isUnique = false;
            let attempts = 0;
            while(!isUnique && attempts < 10) {
                newVoterId = `AKHSS-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
                if (!existingStudentIds.has(newVoterId)) {
                    isUnique = true;
                }
                attempts++;
            }
            if(!isUnique) throw new Error("Could not generate a unique Voter ID.");

            newVoterIds.push(newVoterId);
            existingStudentIds.add(newVoterId);
            const newStudentRef = doc(db, "students", newVoterId);
            batch.set(newStudentRef, { id: newVoterId, classId: values.classId });
        }
        
        await batch.commit();

        setGeneratedVoterIds(newVoterIds);
        toast({
            title: "Voters Created!",
            description: `${values.quantity} new voter ID(s) have been generated.`,
        });

        studentForm.reset();

    } catch (error) {
         console.error("Error adding student:", error);
        toast({
            variant: 'destructive',
            title: "Something went wrong",
            description: "Could not create the voter(s). Please try again.",
        });
    } finally {
        setIsStudentLoading(false);
    }
  }, [studentForm, toast]);

  const onClassSubmit = useCallback(async (values: z.infer<typeof classManagementSchema>) => {
    setIsClassLoading(true);
    try {
        const db = await getDb();
        const batch = writeBatch(db);
        const newClassIds = new Set(values.classes.map(c => c.id));
        
        schoolClasses.forEach(oldClass => {
            if (!newClassIds.has(oldClass.id)) {
                const docRef = doc(db, 'classes', oldClass.id);
                batch.delete(docRef);
            }
        });

        values.classes.forEach(c => {
            const docRef = doc(db, 'classes', c.id);
            batch.set(docRef, { name: c.name, id: c.id });
        });

        await batch.commit();
        toast({
            title: "Classes Updated",
            description: "The list of school classes has been saved.",
        });
        await fetchClasses();
    } catch (error) {
        console.error("Error saving classes:", error);
         toast({
            variant: 'destructive',
            title: "Something went wrong",
            description: "Could not save classes. Please try again.",
        });
    } finally {
        setIsClassLoading(false);
    }
  }, [toast, fetchClasses, schoolClasses]);

  const onPasswordSubmit = useCallback(async (values: z.infer<typeof passwordChangeSchema>) => {
    setIsPasswordLoading(true);
    try {
        const db = await getDb();
        const adminRef = doc(db, "credentials", "admin");
        const adminDoc = await getDoc(adminRef);
        let currentPassword = "password123";
        if (adminDoc.exists()) {
            currentPassword = adminDoc.data().password;
        }
        
        if(values.oldPassword !== currentPassword) {
            passwordForm.setError("oldPassword", { type: "manual", message: "The old password you entered is incorrect." });
            setIsPasswordLoading(false);
            return;
        }
        
        await setDoc(adminRef, { username: 'admin', password: values.newPassword }, { merge: true });
        toast({
            title: "Password Updated",
            description: "Your password has been changed successfully.",
        });
        passwordForm.reset();
    } catch (error) {
        console.error("Error changing password:", error);
         toast({
            variant: 'destructive',
            title: "Something went wrong",
            description: "Could not change the password. Please try again.",
        });
    } finally {
        setIsPasswordLoading(false);
    }
  }, [passwordForm, toast]);

  const handleResetElection = useCallback(async () => {
    setIsResetLoading(true);
    try {
      const db = await getDb();
      const collectionsToDelete = ['candidates', 'votes', 'students', 'classes'];
      for (const collectionName of collectionsToDelete) {
          const querySnapshot = await getDocs(collection(db, collectionName));
          const deleteBatch = writeBatch(db);
          querySnapshot.forEach((doc) => {
              if(collectionName === 'students' && doc.id === 'A001') return;
              deleteBatch.delete(doc.ref);
          });
          await deleteBatch.commit();
      }

      const initBatch = writeBatch(db);
      defaultClasses.forEach(c => {
          const docRef = doc(db, 'classes', c.id);
          initBatch.set(docRef, c);
      });
      
      const adminCredRef = doc(db, "credentials", "admin");
      initBatch.set(adminCredRef, { username: 'admin', password: 'password123' });

      await initBatch.commit();
      
      toast({
        title: "Election Reset Successful",
        description: "All election data has been cleared and reset to defaults.",
      });
      await fetchClasses();
    } catch (error) {
        console.error("Error resetting election:", error);
         toast({
            variant: 'destructive',
            title: "Reset Failed",
            description: "Could not reset the election data. Please try again.",
        });
    } finally {
        setIsResetLoading(false);
    }
  }, [toast, fetchClasses]);

  const handleResetVotesAndVoters = useCallback(async () => {
    setIsResetVotesLoading(true);
    try {
      const db = await getDb();
      
      const votesSnapshot = await getDocs(collection(db, 'votes'));
      const votesBatch = writeBatch(db);
      votesSnapshot.forEach((doc) => {
          votesBatch.delete(doc.ref);
      });
      await votesBatch.commit();

      const studentsSnapshot = await getDocs(collection(db, 'students'));
      const studentsBatch = writeBatch(db);
      studentsSnapshot.forEach((doc) => {
          if (doc.id !== 'A001') {
            studentsBatch.delete(doc.ref);
          }
      });
      await studentsBatch.commit();
      
      toast({
        title: "Votes and Voters Reset Successful",
        description: "All recorded votes and registered Voter IDs have been cleared. Candidates and classes remain intact.",
      });
    } catch (error) {
        console.error("Error resetting votes and voters:", error);
         toast({
            variant: 'destructive',
            title: "Reset Failed",
            description: "Could not reset the data. Please try again.",
        });
    } finally {
        setIsResetVotesLoading(false);
    }
  }, [toast]);
  
  const copyToClipboard = useCallback(() => {
    if (generatedVoterIds.length > 0) {
      navigator.clipboard.writeText(generatedVoterIds.join('\n'));
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  }, [generatedVoterIds]);

  return (
    <div className="p-4 sm:p-8 space-y-8">
      <div className="flex items-center">
        <BackButton fallback='/admin/dashboard' />
        <h1 className="text-3xl font-bold ml-4">Admin Settings</h1>
      </div>
      
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-1">
            <Card>
                <CardHeader>
                    <CardTitle>Manage Classes</CardTitle>
                    <CardDescription>Add or remove school classes.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...classForm}>
                        <form onSubmit={classForm.handleSubmit(onClassSubmit)} className="space-y-4">
                            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="flex items-center gap-2">
                                        <FormField
                                            control={classForm.control}
                                            name={`classes.${index}.name`}
                                            render={({ field }) => (
                                                <FormItem className="flex-1">
                                                    <FormControl>
                                                        <Input {...field} placeholder="e.g., Class 11-A" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                            <Trash className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            <Button type="button" variant="outline" className="w-full" onClick={() => append({ id: `c_${Date.now()}`, name: "" })}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Class
                            </Button>
                            <Button type="submit" className="w-full" disabled={isClassLoading}>
                                {isClassLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                                {isClassLoading ? 'Saving...' : 'Save Classes'}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Security</CardTitle>
                    <CardDescription>Change the admin password.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...passwordForm}>
                        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                            <FormField
                                control={passwordForm.control}
                                name="oldPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Old Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={passwordForm.control}
                                name="newPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>New Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={passwordForm.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Confirm New Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full" disabled={isPasswordLoading}>
                                {isPasswordLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <KeyRound className="mr-2 h-4 w-4" />}
                                {isPasswordLoading ? 'Updating...' : 'Change Password'}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>

        <div className="space-y-8 lg:col-span-2">
            <Card>
                <CardHeader>
                <CardTitle>Manage Voters</CardTitle>
                <CardDescription>Generate unique Voter IDs for students in a specific class.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...studentForm}>
                        <form onSubmit={studentForm.handleSubmit(onStudentSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <FormField
                                    control={studentForm.control}
                                    name="classId"
                                    render={({ field }) => (
                                        <FormItem className='sm:col-span-2'>
                                        <FormLabel>Class</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} defaultValue="">
                                                <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a class" />
                                                </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {schoolClasses.map(c => (
                                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={studentForm.control}
                                    name="quantity"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Quantity</FormLabel>
                                            <FormControl>
                                                <Input type="number" min="1" max="100" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                             <Button type="submit" className="w-full font-bold" disabled={isStudentLoading}>
                                {isStudentLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Users className="mr-2 h-4 w-4" />
                                        Generate Voter IDs
                                    </>
                                )}
                            </Button>
                        </form>
                    </Form>
                    {generatedVoterIds.length > 0 && (
                        <div className="mt-6 p-4 bg-muted rounded-lg relative">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-sm text-muted-foreground">Generated Voter IDs ({generatedVoterIds.length}):</p>
                                <Button variant="ghost" size="icon" onClick={copyToClipboard} className="absolute top-2 right-2">
                                    {isCopied ? <ClipboardCheck className="text-primary" /> : <Clipboard />}
                                </Button>
                            </div>
                            <Textarea
                                readOnly
                                value={generatedVoterIds.join('\n')}
                                className="font-mono text-sm h-32"
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                <CardTitle>Manage Candidates</CardTitle>
                <CardDescription>Add a new candidate to the election.</CardDescription>
                </CardHeader>
                <CardContent>
                <Form {...candidateForm}>
                    <form onSubmit={candidateForm.handleSubmit(onCandidateSubmit)} className="space-y-6">
                        <FormField
                        control={candidateForm.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Candidate Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Jane Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={candidateForm.control}
                            name="position"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Position</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} defaultValue="">
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a position" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="HR">House Representative</SelectItem>
                                            <SelectItem value="CR">Class Representative (CR)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                            />

                            <FormField
                            control={candidateForm.control}
                            name="houseId"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>House</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} defaultValue="">
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a house" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {houses.map(house => (
                                                <SelectItem key={house.id} value={house.id}>{house.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        </div>

                        {position === 'CR' && (
                            <FormField
                            control={candidateForm.control}
                            name="classId"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Class</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} defaultValue="">
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a class" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {schoolClasses.map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        )}

                        <Card>
                            <CardHeader>
                                <CardTitle className='text-lg'>Candidate Images</CardTitle>
                                <CardDescription>
                                    Upload a photo and a symbol for the candidate. Max file size: 1MB each.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormItem>
                                        <FormLabel>Candidate Photo</FormLabel>
                                        <FormControl>
                                            <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'photo')} />
                                        </FormControl>
                                    </FormItem>
                                    <FormItem>
                                        <FormLabel>Candidate Symbol</FormLabel>
                                        <FormControl>
                                            <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'symbol')} />
                                        </FormControl>
                                    </FormItem>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 items-start justify-items-center">
                                    <div className='flex flex-col items-center gap-2'>
                                        <FormLabel>Photo Preview</FormLabel>
                                        <div className="mt-2 w-40 h-40 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                                            {photoPreview ? <Image src={photoPreview} alt="Photo preview" width={160} height={160} className="object-cover w-full h-full" /> : <span className="text-sm text-muted-foreground">Preview</span>}
                                        </div>
                                    </div>
                                    <div className='flex flex-col items-center gap-2'>
                                        <FormLabel>Symbol Preview</FormLabel>
                                        <div className="mt-2 w-40 h-40 bg-muted flex items-center justify-center rounded-md overflow-hidden p-2">
                                            {symbolPreview ? <Image src={symbolPreview} alt="Symbol preview" width={144} height={144} className="object-contain w-full h-full" /> : <span className="text-sm text-muted-foreground">Preview</span>}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>


                        <Button type="submit" className="w-full font-bold" disabled={isCandidateLoading}>
                        {isCandidateLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Adding...
                            </>
                        ) : (
                            <>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Candidate
                            </>
                        )}
                        </Button>
                    </form>
                </Form>
                </CardContent>
            </Card>
        </div>

        <div className="space-y-8 lg:col-span-3">
           <Card>
              <CardHeader>
                  <CardTitle>Election Controls</CardTitle>
                  <CardDescription>Reset election data as needed.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h3 className="font-semibold mb-2">Reset Votes & Voter IDs</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        This will delete all recorded votes and all registered Voter IDs. Candidates and classes will remain intact. Ideal for clearing data after testing.
                    </p>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" className="w-full text-destructive border-destructive hover:bg-destructive/10" disabled={isResetVotesLoading}>
                                {isResetVotesLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Vote className="mr-2 h-4 w-4" />}
                                {isResetVotesLoading ? 'Resetting Data...' : 'Reset Votes & Voter IDs'}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Clear Votes and Voters?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action will permanently delete all votes and all registered Voter IDs. Candidates and Classes will NOT be deleted. Are you sure?
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleResetVotesAndVoters} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Yes, Clear Votes & Voters
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Reset Entire Election</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        This will permanently delete all candidates, voters, and voting data. This action cannot be undone.
                    </p>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="w-full" disabled={isResetLoading}>
                                {isResetLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                {isResetLoading ? 'Resetting Everything...' : 'Reset Entire Election'}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently reset the election, deleting all added candidates, all created voters, and any recorded votes. Are you sure?
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleResetElection} disabled={isResetLoading}>
                                    Yes, Reset Everything
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </div>
              </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
