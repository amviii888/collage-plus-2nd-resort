export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  description: string;
  price: number; // In EGP
  category: string;
  coverUrl?: string;
  pdfUrl?: string; // Cloudinary / Secure PDF URL
  pageCount?: number;
  isAvailable?: boolean;
  edition?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface LibraryRequest {
  id: string;
  bookId: string;
  bookTitle: string;
  bookPrice: number;
  studentId: string;
  studentName: string;
  studentPhone: string;
  studentBarcode: string;
  status: 'pending' | 'granted' | 'rejected';
  note?: string;
  createdAt: any;
  resolvedAt?: any;
  resolvedBy?: string;
}

export interface BookAccess {
  id?: string;
  bookId: string;
  granted: boolean;
  grantedAt: any;
  grantedBy?: string;
  librarianEmail?: string;
}
