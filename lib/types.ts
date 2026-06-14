
export interface House {
  id: string;
  name: string;
  color: string; // e.g., 'bg-red-500'
}

export interface SchoolClass {
  id: string;
  name: string;
}

export interface Student {
  id: string; // Unique Voter ID, used as username
  name?: string;
  classId: string;
}

export interface Candidate {
  id:string;
  name: string;
  photoUrl: string;
  symbolUrl: string;
  position: 'CR' | 'HR';
  classId?: string; // Only for CRs
  houseId: string;
}

export interface VoteRecord {
    voterId: string;
    voterClassId: string;
    candidateId: string;
    position: 'CR' | 'HR';
    houseId: string;
}
