

export const subjects = [
    'Arabic',
    'English',
    'French',
    'German',
    'Italian',
    'Spanish',
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'Geology',
    'History',
    'Geography',
    'Philosophy',
    'Psychology',
    'Computer Science',
    'Business',
    'Art',
    'Music',
];

const subjectGlows: Record<string, string> = {
  'Mathematics': 'shadow-[0_0_15px_hsl(var(--glow-math))] border-purple-400/80',
  'Physics': 'shadow-[0_0_15px_hsl(var(--glow-react))] border-sky-400/80',
  'Chemistry': 'shadow-[0_0_15px_hsl(var(--glow-science))] border-green-400/80',
  'Biology': 'shadow-[0_0_15px_hsl(var(--glow-science))] border-green-500/80',
  'History': 'shadow-[0_0_15px_hsl(var(--glow-history))] border-orange-400/80',
  'English': 'shadow-[0_0_15px_hsl(var(--glow-english))] border-blue-400/80',
  'Arabic': 'shadow-[0_0_15px_hsl(var(--glow-english))] border-blue-300/80',
  'French': 'shadow-[0_0_15px_hsl(var(--glow-english))] border-indigo-400/80',
  'Art': 'shadow-[0_0_15px_hsl(var(--glow-art))] border-pink-400/80',
  'Computer Science': 'shadow-[0_0_15px_hsl(var(--glow-react))] border-cyan-400/80',
  'Psychology': 'shadow-[0_0_15px_hsl(var(--glow-math))] border-fuchsia-400/80',
  'Default': 'shadow-[0_0_15px_hsl(var(--primary)/0.5)] border-primary/80',
};

export const getGlowClass = (subject: string) => subjectGlows[subject] || subjectGlows['Default'];

    