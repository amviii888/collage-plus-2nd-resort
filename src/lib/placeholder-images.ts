
export type ImagePlaceholder = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint: string;
};

const data = {
  "placeholderImages": [
    {
      "id": "teacher-hero",
      "description": "A landscape banner image for the teacher's profile.",
      "imageUrl": "https://images.unsplash.com/photo-1589395937658-0557e7d89fad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxMHx8ZWR1Y2F0aW9uJTIwbGVhcm5pbmd8ZW58MHx8fHwxNzYwNzM0NzQ0fDA&ixlib=rb-4.1.0&q=80&w=1080",
      "imageHint": "education learning"
    },
    {
      "id": "teacher-profile",
      "description": "A circular profile picture for the teacher.",
      "imageUrl": "https://images.unsplash.com/photo-1750924718882-33ee16ddf3a8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw0fHx0ZWFjaGVyJTIwcG9ydHJhaXR8ZW58MHx8fHwxNzYwNzMzNDM0fDA&ixlib=rb-4.1.0&q=80&w=1080",
      "imageHint": "teacher portrait"
    },
    {
      "id": "course-math-1",
      "description": "Thumbnail for a math course.",
      "imageUrl": "https://images.unsplash.com/photo-1588912914017-923900a34710?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw4fHxtYXRoZW1hdGljcyUyMGFsZ2VicmF8ZW58MHx8fHwxNzYwNzM0NzQ0fDA&ixlib=rb-4.1.0&q=80&w=1080",
      "imageHint": "mathematics algebra"
    },
    {
      "id": "course-science-1",
      "description": "Thumbnail for a science course.",
      "imageUrl": "https://images.unsplash.com/photo-1614934273801-0da56c52b081?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw1fHxzY2llbmNlJTIwY2hlbWlzdHJ5fGVufDB8fHx8MTc2MDczNDc0NHww&ixlib=rb-4.1.0&q=80&w=1080",
      "imageHint": "science chemistry"
    },
    {
      "id": "course-history-1",
      "description": "Thumbnail for a history course.",
      "imageUrl": "https://images.unsplash.com/photo-1733602502185-6dc32b1d636e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw1fHxoaXN0b3J5JTIwYW5jaWVudHxlbnwwfHx8fDE3NjA3MzQ3NDR8MA&ixlib=rb-4.1.0&q=80&w=1080",
      "imageHint": "history ancient"
    },
    {
      "id": "course-english-1",
      "description": "Thumbnail for an english course.",
      "imageUrl": "https://images.unsplash.com/photo-1606607299963-ac0d1368072d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxMHx8Ym9va3MlMjB3cml0aW5nfGVufDB8fHx8MTc2MDczNDc0NXww&ixlib=rb-4.1.0&q=80&w=1080",
      "imageHint": "books writing"
    },
    {
      "id": "hero-students",
      "description": "Hero image showing students learning.",
      "imageUrl": "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2070&auto=format&fit=crop",
      "imageHint": "students learning"
    },
    {
      "id": "landing-hero-teacher",
      "description": "Professional teacher for the landing page hero section.",
      "imageUrl": "https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=2069&auto=format&fit=crop",
      "imageHint": "teacher classroom professional"
    }
  ]
}

export const PlaceHolderImages: ImagePlaceholder[] = data.placeholderImages;
