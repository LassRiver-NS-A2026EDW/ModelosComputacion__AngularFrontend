export interface Book {
  id: string | number;
  title: string;
  author: string;
  isbn: string;
  category: string;
  language: string;
  publisher: string;
  publishDate: string;
  pages: number;
  description: string;
  coverUrl: string;
  rating: number;
  available: boolean;
  reviewCount: number;
  hasPdf?: boolean;
  pdfUrl?: string | null;
}

export interface Review {
  id: string | number;
  bookId: string | number;
  userId: string | number;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  flagged: boolean;
  flagReason?: string;
}

export interface User {
  id: string | number;
  name: string;
  email: string;
  role: 'user' | 'librarian' | 'admin';
}

export interface Loan {
  id: string | number;
  bookId: string | number;
  bookTitle: string;
  userId: string | number;
  userName: string;
  loanDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'active' | 'overdue' | 'returned';
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export interface ChatRequest {
  bookId: number | string;
  selectedText: string;
  context: string;
  question: string;
  history?: { role: string; content: string }[];
}

export type AppView =
  | 'home'
  | 'login'
  | 'register'
  | 'catalog'
  | 'book-detail'
  | 'book-reader'
  | 'favorites'
  | 'reviews'
  | 'profile'
  | 'admin';
