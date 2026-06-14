
import type { SchoolClass, Student, Candidate, House } from './types';

// The color classes are safelisted in tailwind.config.ts to ensure they are generated.
export const houses: House[] = [
  { id: 'h1', name: 'Tolerance', color: 'bg-orange-500' },
  { id: 'h2', name: 'Discipline', color: 'bg-blue-500' },
  { id: 'h3', name: 'Generosity', color: 'bg-yellow-500' },
  { id: 'h4', name: 'Unity', color: 'bg-red-700' },
];

export const schoolClasses: SchoolClass[] = [
  { id: 'c1', name: 'Class 6' },
  { id: 'c2', name: 'Class 7' },
  { id: 'c3', name: 'Class 8' },
  { id: 'c4', name: 'Class 9' },
  { id: 'c5', name: 'Class 10' },
];

export const students: Student[] = [
  // Admin user is needed for login.
  { id: 'A001', name: 'Admin User', classId: 'admin', password: 'password123' },
  // Student users are now created via the admin settings page.
];

export const candidates: Candidate[] = [
  // Candidates will now be added via the admin settings page.
];
