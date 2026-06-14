
'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Vote, Loader2 } from 'lucide-react';
import { houses } from '@/lib/data';
import Image from 'next/image';
import { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import type { Candidate, Student } from '@/lib/types';
import { cn } from '@/lib/utils';
import { getDb } from '@/lib/firebase';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';

const stableHashCode = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
    }
    return Math.abs(hash);
};

type SelectedCandidates = {
  [houseId: string]: string; 
};

function VotePageContent() {
    const router = useRouter();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const position = searchParams.get('position') as 'HR' | 'CR';
    const [selectedCandidates, setSelectedCandidates] = useState<SelectedCandidates>({});
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [currentUser, setCurrentUser] = useState<Student | null>(null);
    const [hasVoted, setHasVoted] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);


    useEffect(() => {
        const storedUser = localStorage.getItem('akhss-evoting-user');
        if(!storedUser) {
            router.replace('/login');
            return;
        }
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
    }, [router]);
    
    const setupPage = useCallback(async () => {
        if (!currentUser || !position) return;
        
        setIsLoading(true);
        try {
            const db = await getDb();
            
            const votesQuery = query(
                collection(db, "votes"),
                where("voterId", "==", currentUser.id),
                where("position", "==", position)
            );

            const [voteSnap, candidatesSnap] = await Promise.all([
                getDocs(votesQuery),
                getDocs(query(collection(db, "candidates"), where("position", "==", position)))
            ]);
            
            if (!voteSnap.empty) {
                setHasVoted(true);
                toast({ title: "Already Voted", description: `You have already voted for this election.` });
                router.replace('/student/dashboard');
                return;
            }
            
            setHasVoted(false);
            setCandidates(candidatesSnap.docs.map(doc => ({id: doc.id, ...doc.data()}) as Candidate));

        } catch (error) {
            console.error("Error setting up vote page:", error);
            toast({ variant: 'destructive', title: "Error", description: "Could not load election data." });
        } finally {
            setIsLoading(false);
        }
    }, [currentUser, position, toast, router]);

    useEffect(() => {
        setupPage();
    }, [setupPage]);

    const { electionTitle, candidatesByHouse } = useMemo(() => {
        if (!currentUser || !candidates.length) {
            return { electionTitle: '', candidatesByHouse: [] };
        }

        const studentClassId = currentUser.classId;
        const electionTitle = position === 'HR' ? 'House Representative' : 'Class Representative';

        const filteredCandidates = candidates.filter(candidate => {
            if (position === 'HR') return true;
            if (position === 'CR') return candidate.classId === studentClassId;
            return false;
        });

        const candidatesByHouse = houses
            .map(house => ({
                ...house,
                candidates: filteredCandidates.filter(c => c.houseId === house.id)
            }))
            .filter(houseGroup => houseGroup.candidates.length > 0);
        
        return { electionTitle, candidatesByHouse };

    }, [currentUser, position, candidates]);
    
    const handleSelectCandidate = useCallback((houseId: string, candidateId: string) => {
        if (!currentUser) return;
        
        setSelectedCandidates(prev => {
            // Both HR and CR now follow the "one selection per house" rule.
            if (prev[houseId] === candidateId) {
                // Deselect if clicking the already selected candidate
                const newState = { ...prev };
                delete newState[houseId];
                return newState;
            } else {
                // Select candidate for this house, replacing any previous choice for THIS house
                // but keeping choices for other houses intact.
                return {
                    ...prev,
                    [houseId]: candidateId
                };
            }
        });
    }, [currentUser]);
    
    const getSelectedCandidateDetails = useCallback(() => {
        return Object.entries(selectedCandidates).map(([houseId, candidateId]) => {
            const candidate = candidates.find(c => c.id === candidateId);
            const house = houses.find(h => h.id === candidate?.houseId);
            return {
                candidateName: candidate?.name || 'Unknown',
                houseName: house?.name || 'Unknown House',
            };
        });
    }, [selectedCandidates, candidates]);

    const handleVote = useCallback(async () => {
        if (!currentUser) return;
        
        const requiredVotes = candidatesByHouse.length;
        
        if (Object.keys(selectedCandidates).length < requiredVotes) {
             toast({
                variant: "destructive",
                title: "Incomplete Vote",
                description: `Please select one candidate from each house.`,
            });
            return;
        }
        
        setIsSubmitting(true);
        try {
            const db = await getDb();
            const batch = writeBatch(db);
            Object.entries(selectedCandidates).forEach(([houseId, candidateId]) => {
                const voteRef = doc(collection(db, "votes")); 
                batch.set(voteRef, {
                    voterId: currentUser.id,
                    voterClassId: currentUser.classId,
                    candidateId,
                    position,
                    houseId: houseId,
                    timestamp: new Date(),
                });
            });
            
            await batch.commit();

            toast({
                title: "Vote Submitted!",
                description: `Your vote for ${electionTitle} has been cast successfully.`,
            });
            
            router.replace('/student/dashboard');
        } catch (error) {
            console.error("Error submitting vote:", error);
            toast({ variant: 'destructive', title: "Error", description: "Could not submit your vote. Please try again." });
            setIsSubmitting(false);
        }
    }, [currentUser, position, candidatesByHouse, selectedCandidates, electionTitle, toast, router]);
    
    if (isLoading || hasVoted === null) {
        return <div className='flex items-center justify-center h-full min-h-[400px]'><Loader2 className="mr-2 h-8 w-8 animate-spin" />Loading election data...</div>;
    }
    
    if (!currentUser) {
         return <div className='flex items-center justify-center h-full min-h-[400px]'><p>Redirecting to login...</p></div>;
    }
    
    if (hasVoted) {
        return (
             <div className="p-4 sm:p-0">
                <Card className="max-w-6xl mx-auto">
                    <CardHeader><CardTitle className="text-3xl text-center font-headline">Thank You For Voting!</CardTitle></CardHeader>
                    <CardContent><p className="text-center text-muted-foreground">You have already voted in this election. Returning to dashboard...</p></CardContent>
                </Card>
            </div>
        );
    }

    if (candidatesByHouse.length === 0) {
        return (
             <div className="p-4 sm:p-0">
                <Card className="max-w-6xl mx-auto">
                    <CardHeader><CardTitle className="text-3xl text-center font-headline">{electionTitle} Election</CardTitle></CardHeader>
                    <CardContent><p className="text-center text-muted-foreground">There are no candidates running in this election for you at this time.</p></CardContent>
                </Card>
            </div>
        );
    }
    
    const requiredVotes = candidatesByHouse.length;
    const isSubmitDisabled = Object.keys(selectedCandidates).length < requiredVotes || isSubmitting;
    const selectedCandidateInfo = getSelectedCandidateDetails();

  return (
    <div className="p-4 sm:p-0">
      <Card className="max-w-6xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl text-center font-headline">
            Cast Your Vote: {electionTitle}
          </CardTitle>
           <p className="text-center text-muted-foreground">
            Select one candidate from each house.
           </p>
        </CardHeader>
        <CardContent>
             <div className={cn("grid gap-8", {
                 "grid-cols-1 md:grid-cols-2 lg:grid-cols-4": candidatesByHouse.length > 2,
                 "grid-cols-1 md:grid-cols-2": candidatesByHouse.length <= 2,
             })}>
                {candidatesByHouse.map((house) => (
                    <div key={house.id} className="w-full">
                        <h3 className={cn("text-xl font-bold mb-4 p-2 rounded-lg text-black text-center shadow-sm", house.color)}>{house.name} House</h3>
                        <div className="grid grid-cols-1 gap-4 justify-items-center">
                            {house.candidates.map(candidate => {
                                // Check if this specific candidate is selected for their house
                                const isSelected = selectedCandidates[house.id] === candidate.id;
                                return (
                                    <Card 
                                        key={candidate.id} 
                                        className={cn('cursor-pointer transition-all transform hover:-translate-y-1 w-full max-w-[200px]', { 'ring-4 ring-primary shadow-lg': isSelected, 'shadow-md': !isSelected })}
                                        onClick={() => handleSelectCandidate(house.id, candidate.id)}
                                    >
                                      <CardHeader className="items-center p-3">
                                        {candidate.photoUrl ? (
                                            <Image
                                                src={candidate.photoUrl}
                                                alt={candidate.name}
                                                width={80}
                                                height={80}
                                                className="rounded-full border-2 border-card object-cover w-20 h-20"
                                            />
                                        ) : (
                                            <div className="w-20 h-20 rounded-full border-2 border-card bg-muted flex items-center justify-center">
                                                <User className="w-10 h-10 text-muted-foreground"/>
                                            </div>
                                        )}
                                      </CardHeader>
                                      <CardContent className="items-center flex flex-col gap-1 p-3 pt-0">
                                         <h4 className="font-bold text-sm text-center line-clamp-1">{candidate.name}</h4>
                                         {candidate.symbolUrl && (
                                            <Image
                                                src={candidate.symbolUrl}
                                                alt="Symbol"
                                                width={30}
                                                height={30}
                                                className="object-contain"
                                            />
                                         )}
                                      </CardContent>
                                       <CardFooter className="p-2">
                                         <Button variant={isSelected ? "default" : "outline"} size="sm" className="w-full text-xs">
                                            {isSelected ? 'Selected' : 'Select'}
                                        </Button>
                                      </CardFooter>
                                    </Card>
                                  )
                              })}
                        </div>
                    </div>
                ))}
            </div>
        </CardContent>
        <CardFooter className="flex-col gap-4 items-center justify-center pt-6 border-t mt-6">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                 <Button size="lg" className="font-bold text-xl py-6 px-10" disabled={isSubmitDisabled}>
                    {isSubmitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Vote className="mr-2 h-6 w-6" />}
                    {isSubmitting ? 'Submitting...' : 'Submit My Votes'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Your Vote</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div>
                        <p>Are you sure you want to cast your votes for these candidates? This action is final.</p>
                        <div className="mt-4 space-y-2 bg-muted/50 p-3 rounded-lg">
                            {selectedCandidateInfo.map((info, idx) => (
                                <div key={idx} className="flex justify-between text-sm">
                                    <span className="font-semibold">{info.candidateName}</span>
                                    <span className="text-muted-foreground">{info.houseName}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleVote} disabled={isSubmitting}>
                      {isSubmitting ? 'Confirming...' : 'Confirm Votes'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <p className="text-xs text-muted-foreground">Review your selections carefully before confirming.</p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function VotePage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <VotePageContent />
        </Suspense>
    )
}
