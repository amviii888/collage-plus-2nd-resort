import type { Teacher, Grade } from './types';

export const grades: string[] = [
  'Year 1 (First Year)',
  'Year 2 (Second Year)',
  'Year 3 (Third Year)',
  'Year 4 (Fourth Year)',
  'Year 5 (Fifth Year)',
  'Year 6 (Sixth Year)',
  'Undergraduate',
  'Postgraduate / Master\'s',
  'PhD / Doctorate',
];

// This can be used as fallback data if a teacher's profile hasn't been filled out yet.
export const mockTeacher: Omit<Teacher, 'id' | 'email'> = {
  name: "New Teacher",
  bio: 'Just getting started!',
  heroImageUrl: 'https://picsum.photos/seed/hero/1200/300',
  profilePictureUrl: 'https://picsum.photos/seed/pfp/400/400',
  subjects: [],
  gradesTaught: [],
  assistantCode: "GENERATING...",
  approved: false,
};
