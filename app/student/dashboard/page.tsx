
'use client'

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Vote, Loader2, CheckCircle2, LogOut } from "lucide-react";
import Link from "next/link";
import { houses, schoolClasses as defaultClasses } from "@/lib/data";
import { useEffect, useState, useMemo, useCallback } from "react";
import type { Candidate, SchoolClass, Student } from "@/lib/types";
import { getDb } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function StudentDashboardPage() {
    const router = useRouter();
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]);
    const [currentUser, setCurrentUser] = useState<Student | null>(null);
    const [votedPositions, setVotedPositions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('akhss-evoting-user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            setCurrentUser(user);
        } else {
            setIsLoading(false);
        }
    }, []);

    const fetchData = useCallback(async (user: Student) => {
        setIsLoading(true);
        try {
            const db = await getDb();
            const [candidatesSnap, classesSnap, votesSnap] = await Promise.all([
                getDocs(collection(db, "candidates")),
                getDocs(collection(db, "classes")),
                getDocs(query(collection(db, "votes"), where("voterId", "==", user.id)))
            ]);

            setCandidates(candidatesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Candidate)));
            const classesData = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
            setSchoolClasses(classesData.length > 0 ? classesData : defaultClasses);
            setVotedPositions(votesSnap.docs.map(doc => doc.data().position));
        } catch (error) {
            console.error("Error fetching student data:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (currentUser) {
            fetchData(currentUser);
        }
    }, [currentUser, fetchData]);

    const elections = useMemo(() => {
        if (!currentUser || !schoolClasses.length) return { hr: null, cr: null };

        const studentClass = schoolClasses.find(c => c.id === currentUser.classId);
        
        const hrCandidatesCount = candidates.filter(c => c.position === "HR").length;
        const crCandidatesCount = candidates.filter(c => 
            c.position === "CR" && 
            c.classId === currentUser.classId
        ).length;

        const hasVotedHR = votedPositions.includes('HR');
        const hasVotedCR = votedPositions.includes('CR');

        return {
            hr: {
                title: "House Representative (HR) Election",
                position: "HR",
                candidates: hrCandidatesCount,
                hasVoted: hasVotedHR,
            },
            cr: {
                title: `Class Representative (CR) - ${studentClass?.name || 'Your Class'}`,
                position: "CR",
                candidates: crCandidatesCount,
                hasVoted: hasVotedCR,
            }
        };
    }, [currentUser, candidates, schoolClasses, votedPositions]);

    const isVotingComplete = useMemo(() => {
        if (!elections.hr || !elections.cr) return false;
        
        // A position is "done" if either they've voted or there are no candidates for it
        const hrDone = elections.hr.hasVoted || elections.hr.candidates === 0;
        const crDone = elections.cr.hasVoted || elections.cr.candidates === 0;
        
        return hrDone && crDone;
    }, [elections]);

    const handleFinish = useCallback(() => {
        localStorage.removeItem("akhss-evoting-user");
        router.replace('/');
    }, [router]);

    useEffect(() => {
        if (isVotingComplete && !isLoading) {
            const timer = setTimeout(() => {
                handleFinish();
            }, 5000); // 5 second delay to let them see the completion message
            return () => clearTimeout(timer);
        }
    }, [isVotingComplete, isLoading, handleFinish]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                 <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading dashboard...</p>
            </div>
        )
    }

    if (!currentUser || !elections.hr || !elections.cr) {
        return (
             <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <p className="text-muted-foreground mb-4">User not found or could not load election data.</p>
                <Link href="/login">
                    <Button>Please log in again</Button>
                </Link>
            </div>
        )
    }

  return (
    <div className="max-w-4xl mx-auto">
        {isVotingComplete ? (
            <Card className="border-2 border-primary/20 bg-primary/5">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <CheckCircle2 className="h-16 w-16 text-primary animate-bounce" />
                    </div>
                    <CardTitle className="text-3xl font-bold font-headline">Voting Successfully Completed!</CardTitle>
                    <CardDescription className="text-lg">
                        Thank you for participating in the school elections. Your votes have been recorded securely.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <p className="text-muted-foreground">
                        You will be automatically logged out in a few seconds...
                    </p>
                    <Button onClick={handleFinish} size="lg" className="font-bold">
                        <LogOut className="mr-2 h-5 w-5" />
                        Finish & Logout Now
                    </Button>
                </CardContent>
            </Card>
        ) : (
            <>
                <div className="mb-8">
                    <h1 className="text-3xl font-bold">Welcome, Voter {currentUser.id}!</h1>
                    <p className="text-muted-foreground">Please complete your voting by selecting from the available elections below.</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle>{elections.hr.title}</CardTitle>
                            <CardDescription>Vote for the next school house representative.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col justify-end">
                            <div className="flex flex-wrap gap-2 mb-4">
                                {houses.map(house => (
                                    <span key={house.id} className={`text-[10px] font-semibold mr-1 px-2 py-0.5 rounded-full text-white ${house.color}`}>
                                        {house.name}
                                    </span>
                                ))}
                            </div>
                            <Button asChild className="w-full font-bold" disabled={elections.hr.candidates === 0 || elections.hr.hasVoted}>
                                <Link href={`/student/vote?position=${elections.hr.position}`}>
                                    <Vote className="mr-2 h-4 w-4"/> 
                                    {elections.hr.hasVoted ? 'Voted' : (elections.hr.candidates > 0 ? `Start Voting` : 'No Candidates')}
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                    <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle>{elections.cr.title}</CardTitle>
                            <CardDescription>Choose your preferred class representative.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col justify-end">
                             <div className="flex flex-wrap gap-2 mb-4">
                                {houses.map(house => (
                                    <span key={house.id} className={`text-[10px] font-semibold mr-1 px-2 py-0.5 rounded-full text-white ${house.color}`}>
                                        {house.name}
                                    </span>
                                ))}
                            </div>
                            <Button asChild className="w-full font-bold" disabled={elections.cr.candidates === 0 || elections.cr.hasVoted}>
                                <Link href={`/student/vote?position=${elections.cr.position}`}>
                                    <Vote className="mr-2 h-4 w-4"/> 
                                    {elections.cr.hasVoted ? 'Voted' : (elections.cr.candidates > 0 ? `Start Voting` : 'No Candidates')}
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </>
        )}
    </div>
  );
}
