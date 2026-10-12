export interface BookUnitFile {
  id: string;
  title: string;
  fileUrl: string; // PDF, image or document URL
  fileType: 'pdf' | 'image' | 'file';
  pageCount?: number;
  pages?: string[]; // Multiple images or page scans
  allowDownload?: boolean;
}

export interface BookUnit {
  id: string;
  title: string;
  description?: string;
  files: BookUnitFile[];
}

export interface LibrarySettings {
  accessCode: string; // Universal library access code (e.g. library123)
  iconPath?: string; // Custom icon path for library in header
  isLocked?: boolean;
  updatedAt?: any;
  updatedBy?: string;
}

export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  description: string;
  price: number; // In EGP
  category: string;
  coverUrl?: string;
  pdfUrl?: string; // Cloudinary / Secure PDF URL
  pages?: string[]; // Cloudinary URLs of multiple pages
  units?: BookUnit[]; // Units / collections system
  allowDownload?: boolean; // True: students can download, False: preview/read-only protected
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
