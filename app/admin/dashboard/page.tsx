'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { UserNav } from '@/components/user-nav';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, BarChart, Users, Settings, Search, Vote, Download, RefreshCw, Loader2, Trash2, Pencil, Save, Trophy, Medal, Home } from 'lucide-react';
import { BackButton } from '@/components/back-button';
import { LiveResultsChart } from '@/components/live-results-chart';
import { TurnoutByHouseChart } from '@/components/turnout-by-house-chart';
import { Input } from '@/components/ui/input';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  houses,
  schoolClasses as defaultClasses,
} from '@/lib/data';
import type { Candidate, Student, SchoolClass, VoteRecord } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Image from 'next/image';
import { getDb } from '@/lib/firebase';
import { collection, getDocs, query, where, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';

const editCandidateSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters." }),
  position: z.enum(['HR', 'CR'], {
    message: "Position is required.",
  }),
  houseId: z.string({
    message: "House is required.",
  }),
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

export default function AdminDashboardPage() {
  const { toast } = useToast();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]);
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [activeAccordions, setActiveAccordions] = useState<string[]>(["results"]);
  
  const editForm = useForm<z.infer<typeof editCandidateSchema>>({
    resolver: zodResolver(editCandidateSchema),
  });

  const stableHashCode = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = (hash << 5) - hash + char;
          hash |= 0;
      }
      return Math.abs(hash);
  };

  const fetchData = useCallback(async (refresh = false) => {
    if(refresh) setIsRefreshing(true); else setIsLoading(true);
    
    try {
      const db = await getDb();
      const [candidatesSnap, studentsSnap, classesSnap, votesSnap] = await Promise.all([
        getDocs(collection(db, "candidates")),
        getDocs(query(collection(db, "students"), where("id", "!=", "A001"))),
        getDocs(collection(db, "classes")),
        getDocs(collection(db, "votes"))
      ]);

      setCandidates(candidatesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Candidate)));
      setStudents(studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
      const classesData = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
      setSchoolClasses(classesData.length > 0 ? classesData : defaultClasses);
      setVotes(votesSnap.docs.map(doc => doc.data() as VoteRecord));
    } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
    } finally {
        if(refresh) setIsRefreshing(false); else setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const electionData = useMemo(() => {
      const totalVoters = students.length;
      const uniqueVoterIds = new Set(votes.map(v => v.voterId));
      const votesCast = uniqueVoterIds.size;
      const turnout = totalVoters > 0 ? ((votesCast / totalVoters) * 100).toFixed(1) : '0.0';
      const hrCandidatesCount = candidates.filter((c: Candidate) => c.position === 'HR').length;
      const crCandidatesCount = candidates.filter((c: Candidate) => c.position === 'CR').length;
      
      return {
          totalVoters,
          votesCast,
          turnout,
          hrCandidates: hrCandidatesCount,
          crCandidates: crCandidatesCount,
      };
  }, [students, votes, candidates]);

  const winnersData = useMemo(() => {
    const hrWinners: any[] = [];
    const crWinners: any[] = [];

    houses.forEach(house => {
        const houseCandidates = candidates.filter(c => c.position === 'HR' && c.houseId === house.id);
        if (houseCandidates.length === 0) return;

        const results = houseCandidates.map(cand => ({
            ...cand,
            votes: votes.filter(v => v.candidateId === cand.id).length
        })).sort((a, b) => b.votes - a.votes);

        hrWinners.push({
            houseName: house.name,
            winner: results[0] || null,
            runnerUp: results[1] || null
        });
    });

    schoolClasses.forEach(sc => {
        const classHouseResults: any[] = [];
        houses.forEach(house => {
            const houseCandidates = candidates.filter(c => c.position === 'CR' && c.classId === sc.id && c.houseId === house.id);
            if (houseCandidates.length === 0) return;

            const results = houseCandidates.map(cand => ({
                ...cand,
                votes: votes.filter(v => v.candidateId === cand.id).length
            })).sort((a, b) => b.votes - a.votes);

            classHouseResults.push({
                houseName: house.name,
                winner: results[0] || null,
                runnerUp: results[1] || null
            });
        });
        if (classHouseResults.length > 0) {
            crWinners.push({
                className: sc.name,
                classId: sc.id,
                results: classHouseResults
            });
        }
    });

    return { hrWinners, crWinners };
  }, [candidates, votes, schoolClasses]);

  const processedResults = useMemo(() => {
      const hrCandidates = candidates.filter(c => c.position === 'HR');
      const hrVotes = votes.filter(v => v.position === 'HR');

      const hrVoteCounts = hrCandidates.reduce((acc, cand) => ({ ...acc, [cand.id]: 0 }), {} as Record<string, number>);
      hrVotes.forEach(vote => { if (hrVoteCounts.hasOwnProperty(vote.candidateId)) hrVoteCounts[vote.candidateId]++; });
      const liveHrResults = hrCandidates.map((cand, index) => ({ name: cand.name, votes: hrVoteCounts[cand.id] || 0, fill: `hsl(var(--chart-${(index % 5) + 1}))` }));
      
      const studentHouseMap = new Map(students.map(s => [s.id, houses[stableHashCode(s.id) % houses.length].id]));
      const turnoutByHouseCounts = houses.reduce((acc, house) => ({ ...acc, [house.id]: 0 }), {} as Record<string, number>);
      const countedVotersForHouseTurnout = new Set<string>();
      votes.forEach(vote => {
          if (!countedVotersForHouseTurnout.has(vote.voterId)) {
            const studentHouseId = studentHouseMap.get(vote.voterId);
            if (studentHouseId && turnoutByHouseCounts.hasOwnProperty(studentHouseId)) {
               turnoutByHouseCounts[studentHouseId]++;
            }
            countedVotersForHouseTurnout.add(vote.voterId);
          }
      });

      // Official house color mapping
      const houseColors: Record<string, string> = {
          'Tolerance': '#f97316', // Orange 500
          'Discipline': '#3b82f6', // Blue 500
          'Generosity': '#eab308', // Yellow 500
          'Unity': '#b91c1c', // Red 700
      };

      const turnoutByHouse = houses.map(house => ({ 
          house: house.name, 
          votes: turnoutByHouseCounts[house.id] || 0,
          fill: houseColors[house.name] || '#cccccc'
      }));

      const hrResultsByClass = schoolClasses.map(sc => {
          const classVotes = hrVotes.filter(v => v.voterClassId === sc.id);
          const houseVoteCounts = houses.reduce((acc, house) => ({ ...acc, [house.name]: 0 }), {} as Record<string, number>);
          classVotes.forEach(vote => {
              const candidate = hrCandidates.find(c => c.id === vote.candidateId);
              if (candidate) {
                  const house = houses.find(h => h.id === candidate.houseId);
                  if (house) houseVoteCounts[house.name]++;
              }
          });
          const chartData = Object.entries(houseVoteCounts).map(([houseName, votes]) => ({ house: houseName, votes }));
          return { classId: sc.id, className: sc.name, chartData: chartData.filter(d => d.votes > 0), totalVotes: classVotes.length };
      }).filter(r => r.totalVotes > 0);

      return { liveHrResults, turnoutByHouse, hrResultsByClass };
  }, [candidates, votes, students, schoolClasses]);

  const filteredCandidates = useMemo(() => {
    if (!searchQuery.trim()) return candidates;
    const lowerCaseQuery = searchQuery.toLowerCase();
    const houseMap = new Map(houses.map(h => [h.id, h.name]));
    const classMap = new Map(schoolClasses.map(sc => [sc.id, sc.name]));

    return candidates.filter((c) => {
      const houseName = c.houseId ? houseMap.get(c.houseId)?.toLowerCase() : '';
      const className = c.classId ? classMap.get(c.classId)?.toLowerCase() : '';
      return (
        c.name.toLowerCase().includes(lowerCaseQuery) ||
        c.position.toLowerCase().includes(lowerCaseQuery) ||
        (houseName && houseName.includes(lowerCaseQuery)) ||
        (className && className.includes(lowerCaseQuery))
      );
    });
  }, [searchQuery, candidates, schoolClasses]);

  const groupedCandidates = useMemo(() => {
      const grouped: { [key: string]: Candidate[] } = {};
      
      houses.forEach(house => {
          const houseCandidates = filteredCandidates.filter(c => c.houseId === house.id);
          if (houseCandidates.length > 0) {
              const sorted = [...houseCandidates].sort((a, b) => {
                if (a.position === 'HR' && b.position === 'CR') return -1;
                if (a.position === 'CR' && b.position === 'HR') return 1;
                const classA = schoolClasses.find(sc => sc.id === a.classId)?.name || '';
                const classB = schoolClasses.find(sc => sc.id === b.classId)?.name || '';
                return classA.localeCompare(classB);
              });
              grouped[`${house.name} House`] = sorted;
          }
      });
      
      return grouped;
  }, [filteredCandidates, schoolClasses]);

  const handleDeleteCandidate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this candidate? This will remove all their data.")) return;
    setIsDeleting(id);
    try {
      const db = await getDb();
      await deleteDoc(doc(db, "candidates", id));
      toast({ title: "Candidate Deleted", description: "The candidate record has been removed." });
      await fetchData(true);
    } catch (error) {
      console.error("Error deleting candidate:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to delete candidate." });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEditCandidate = (candidate: Candidate) => {
    setEditingCandidate(candidate);
    editForm.reset({
        name: candidate.name,
        position: candidate.position as "HR" | "CR",
        houseId: candidate.houseId,
        classId: candidate.classId,
        photoUrl: candidate.photoUrl,
        symbolUrl: candidate.symbolUrl,
    });
  };

  const onEditSubmit = async (values: z.infer<typeof editCandidateSchema>) => {
    if (!editingCandidate) return;
    setIsEditLoading(true);
    try {
        const db = await getDb();
        const candRef = doc(db, "candidates", editingCandidate.id);
        const updateData: any = {
            name: values.name,
            position: values.position,
            houseId: values.houseId,
            photoUrl: values.photoUrl || '',
            symbolUrl: values.symbolUrl || '',
        };
        if (values.position === 'CR') {
            updateData.classId = values.classId;
        } else {
            updateData.classId = null;
        }

        await updateDoc(candRef, updateData);
        toast({ title: "Candidate Updated", description: "Changes have been saved successfully." });
        setEditingCandidate(null);
        await fetchData(true);
    } catch (error) {
        console.error("Error updating candidate:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to update candidate." });
    } finally {
        setIsEditLoading(false);
    }
  };

  const handleDownloadResults = useCallback(async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(22);
    doc.text("AKHSS E-Voting Official Election Report", pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, 26, { align: 'center' });

    let yPos = 40;

    doc.setFontSize(16);
    doc.text("1. Election Summary", 14, yPos);
    yPos += 8;
    autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value']],
        body: [
            ['Total Voters', electionData.totalVoters],
            ['Total Votes Cast', electionData.votesCast],
            ['Voter Turnout', `${electionData.turnout}%`],
            ['Total Candidates', candidates.length],
            ['HR Candidates', electionData.hrCandidates],
            ['CR Candidates', electionData.crCandidates],
        ],
        theme: 'striped',
        headStyles: { fillColor: [22, 160, 133] }
    });
    yPos = (doc as any).lastAutoTable.finalY + 15;

    doc.setFontSize(16);
    doc.text("2. House Representative (HR) - Winners & Runners-up", 14, yPos);
    yPos += 8;

    const hrTableBody = winnersData.hrWinners.map(hw => [
        hw.houseName,
        hw.winner ? hw.winner.name : 'N/A',
        hw.winner ? hw.winner.votes : '0',
        hw.runnerUp ? hw.runnerUp.name : 'N/A',
        hw.runnerUp ? hw.runnerUp.votes : '0'
    ]);

    autoTable(doc, {
        startY: yPos,
        head: [['House', 'Winner', 'Votes', '2nd Position', 'Votes']],
        body: hrTableBody,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] }
    });
    yPos = (doc as any).lastAutoTable.finalY + 15;

    doc.addPage();
    yPos = 20;
    doc.setFontSize(16);
    doc.text("3. Class Representative (CR) - Results by Class", 14, yPos);
    yPos += 10;

    winnersData.crWinners.forEach((classResult) => {
        if (yPos > 240) {
            doc.addPage();
            yPos = 20;
        }
        
        doc.setFontSize(12);
        doc.text(`Class: ${classResult.className}`, 14, yPos);
        yPos += 5;

        const crBody = classResult.results.map((r: any) => [
            r.houseName,
            r.winner ? r.winner.name : 'N/A',
            r.winner ? r.winner.votes : '0',
            r.runnerUp ? r.runnerUp.name : 'N/A',
            r.runnerUp ? r.runnerUp.votes : '0'
        ]);

        autoTable(doc, {
            startY: yPos,
            head: [['House', 'Winner', 'Votes', '2nd Position', 'Votes']],
            body: crBody,
            theme: 'striped',
            headStyles: { fillColor: [142, 68, 173] }
        });
        yPos = (doc as any).lastAutoTable.finalY + 15;
    });

    doc.save(`election_results_${new Date().toISOString().split('T')[0]}.pdf`);

}, [electionData, winnersData, candidates.length]);

  if (isLoading) {
      return (
        <div className="flex-1 space-y-8 p-4 sm:p-8 pt-6">
            <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground text-lg">Loading Dashboard Data...</p>
            </div>
        </div>
      );
  }

  return (
    <div className="flex-1 space-y-8 p-4 sm:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of your school's elections.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <BackButton fallback='/login' />
          <UserNav />
        </div>
      </div>

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Voters</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{electionData.totalVoters}</div>
            <p className="text-xs text-muted-foreground">Registered students</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vote Turnout</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{electionData.turnout}%</div>
            <p className="text-xs text-muted-foreground">{electionData.votesCast} votes cast</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Candidates</CardTitle>
            <Vote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{candidates.length}</div>
            <p className="text-xs text-muted-foreground">{electionData.hrCandidates} HR, {electionData.crCandidates} CR</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actions</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
             <Button className="w-full" onClick={handleDownloadResults}>
                <Download className="mr-2 h-4 w-4" />
                Download Report
              </Button>
            <Link href="/admin/settings" className='w-full'>
              <Button className="w-full" variant="outline">
                Settings
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
         <Card className='flex flex-col items-center justify-center p-4'>
            <CardContent className='flex flex-col gap-3 w-full pt-0'>
                 <Button className="w-full" onClick={() => fetchData(true)} disabled={isRefreshing} variant="secondary">
                    {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Refresh Data
                </Button>
            </CardContent>
        </Card>
      </div>

      <Accordion type="multiple" value={activeAccordions} onValueChange={setActiveAccordions} className="w-full space-y-4">
        <AccordionItem value="winners" id="winners-section" className="border-none">
            <AccordionTrigger className="bg-primary text-primary-foreground p-4 rounded-t-lg hover:no-underline shadow-sm">
                <span className="text-xl font-bold flex items-center gap-2">
                    <Trophy className="h-6 w-6" />
                    Winners & Runners-up
                </span>
            </AccordionTrigger>
            <AccordionContent className="bg-card border p-6 rounded-b-lg shadow-sm space-y-8">
                <div className="space-y-6">
                    <h3 className="text-lg font-bold border-b pb-2 flex items-center gap-2">
                        House Representatives (HR)
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {winnersData.hrWinners.map((hw, i) => (
                            <Card key={i} className="bg-muted/30 border-2">
                                <CardHeader className="p-4 border-b bg-muted/50">
                                    <CardTitle className="text-base text-center font-headline">{hw.houseName} House</CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 space-y-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                                            <Trophy className="h-3 w-3" /> Winner
                                        </div>
                                        <div className="flex justify-between items-center bg-card p-3 rounded-md border shadow-sm">
                                            <span className="font-bold text-sm line-clamp-1">{hw.winner?.name || 'N/A'}</span>
                                            <Badge className="bg-primary">{hw.winner?.votes || 0}</Badge>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 text-muted-foreground font-bold text-xs uppercase tracking-wider">
                                            <Medal className="h-3 w-3" /> 2nd Position
                                        </div>
                                        <div className="flex justify-between items-center bg-card p-3 rounded-md border shadow-sm">
                                            <span className="text-sm font-semibold text-muted-foreground line-clamp-1">{hw.runnerUp?.name || 'N/A'}</span>
                                            <Badge variant="outline" className="border-muted-foreground/30">{hw.runnerUp?.votes || 0}</Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <h3 className="text-lg font-bold border-b pb-2 flex items-center gap-2 mt-8">
                        Class Representatives (CR)
                    </h3>
                    <div className="space-y-8">
                        {winnersData.crWinners.map((cw, i) => (
                            <div key={i} className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <h4 className="font-bold text-xl text-primary font-headline">{cw.className}</h4>
                                    <div className="h-px flex-1 bg-border"></div>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                    {cw.results.map((r: any, j: number) => (
                                        <Card key={j} className="bg-muted/10 border shadow-sm">
                                            <CardHeader className="p-3 border-b bg-muted/20">
                                                <CardTitle className="text-sm text-center font-semibold">{r.houseName}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-3 space-y-3">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] uppercase tracking-widest font-bold text-primary opacity-80">1st Place</span>
                                                    <div className="flex justify-between items-center text-xs bg-card p-2 rounded border border-primary/20">
                                                        <span className="font-bold line-clamp-1">{r.winner?.name || 'N/A'}</span>
                                                        <span className="font-mono bg-primary/10 px-1.5 py-0.5 rounded text-primary">{r.winner?.votes || 0}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground opacity-80">2nd Place</span>
                                                    <div className="flex justify-between items-center text-xs bg-card p-2 rounded border">
                                                        <span className="line-clamp-1 text-muted-foreground font-medium">{r.runnerUp?.name || 'N/A'}</span>
                                                        <span className="font-mono text-muted-foreground">{r.runnerUp?.votes || 0}</span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </AccordionContent>
        </AccordionItem>

        <AccordionItem value="results" className="border-none">
          <AccordionTrigger className="bg-card p-4 rounded-t-lg hover:no-underline shadow-sm border">
             <span className="text-xl font-bold flex items-center gap-2">
                <BarChart className="h-6 w-6 text-primary" />
                Analytics & Graphs
             </span>
          </AccordionTrigger>
          <AccordionContent className="bg-card p-4 rounded-b-lg space-y-8 shadow-sm border border-t-0">
            <div className="grid gap-8 md:grid-cols-2">
               <Card>
                <CardHeader>
                  <CardTitle>Live HR Election Results</CardTitle>
                  <CardDescription>
                    Real-time House Representative (HR) overall vote counts.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <LiveResultsChart chartData={processedResults.liveHrResults} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Voter Turnout by House</CardTitle>
                  <CardDescription>
                    Distribution of total votes across houses for all elections.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TurnoutByHouseChart chartData={processedResults.turnoutByHouse} />
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="management" className="border-none">
          <AccordionTrigger className="bg-card p-4 rounded-t-lg hover:no-underline shadow-sm border">
             <span className="text-xl font-bold flex items-center gap-2">
                <Settings className="h-6 w-6 text-primary" />
                Candidate Management
             </span>
          </AccordionTrigger>
          <AccordionContent className="bg-card p-4 rounded-b-lg shadow-sm border border-t-0">
             <Card className="border-none shadow-none">
              <CardContent className="p-0">
                <div className="flex items-center gap-4 mb-6 pt-4">
                  <div className="relative w-full max-w-lg">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Filter by name, position, or class..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                  <div className="space-y-8">
                    <div>
                      <h3 className="text-xl font-semibold mb-4 border-b pb-2 flex items-center gap-2">
                         <Vote className="h-5 w-5 text-primary" />
                         Candidates ({filteredCandidates.length})
                      </h3>
                      
                      {Object.keys(groupedCandidates).length > 0 ? (
                        <div className="space-y-8">
                          {Object.entries(groupedCandidates).map(([houseName, houseCandidates]) => (
                            <div key={houseName} className="space-y-3">
                              <h4 className="font-bold text-lg text-primary/80 px-2 flex items-center gap-2">
                                <Home className="h-5 w-5" />
                                {houseName}
                              </h4>
                              <div className="border rounded-lg overflow-hidden shadow-sm">
                                <Table>
                                  <TableHeader className="bg-muted/50">
                                    <TableRow>
                                      <TableHead>Photo</TableHead>
                                      <TableHead>Name</TableHead>
                                      <TableHead>Position</TableHead>
                                      <TableHead>Class</TableHead>
                                      <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {houseCandidates.map((c) => (
                                      <TableRow key={c.id}>
                                        <TableCell>
                                          {c.photoUrl ? (
                                            <Image
                                              src={c.photoUrl}
                                              alt={c.name}
                                              width={40}
                                              height={40}
                                              className="rounded-full object-cover w-10 h-10 border shadow-sm"
                                            />
                                          ) : (
                                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border border-dashed">
                                              <Users className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                          )}
                                        </TableCell>
                                        <TableCell className="font-bold">
                                          {c.name}
                                        </TableCell>
                                        <TableCell>
                                          <Badge variant={c.position === 'HR' ? "default" : "outline"}>{c.position}</Badge>
                                        </TableCell>
                                        <TableCell>
                                          {c.position === 'CR' ? (schoolClasses.find((sc) => sc.id === c.classId)?.name || 'N/A') : 'All Classes'}
                                        </TableCell>
                                        <TableCell className="text-right flex justify-end gap-2">
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="text-primary hover:text-primary hover:bg-primary/10"
                                            onClick={() => handleEditCandidate(c)}
                                          >
                                            <Pencil className="h-4 w-4" />
                                          </Button>
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => handleDeleteCandidate(c.id)}
                                            disabled={isDeleting === c.id}
                                          >
                                            {isDeleting === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-8">No candidates found.</p>
                      )}
                    </div>
                  </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Dialog open={!!editingCandidate} onOpenChange={(open) => !open && setEditingCandidate(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Candidate</DialogTitle>
            <DialogDescription>
              Update details for {editingCandidate?.name}.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="HR">HR</SelectItem>
                          <SelectItem value="CR">CR</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="houseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>House</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {houses.map(h => (
                            <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {editForm.watch('position') === 'CR' && (
                <FormField
                  control={editForm.control}
                  name="classId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Class" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {schoolClasses.map(sc => (
                            <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingCandidate(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isEditLoading}>
                   {isEditLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                   Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}