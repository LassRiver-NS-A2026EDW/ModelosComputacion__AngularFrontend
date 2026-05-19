import { Component, computed, signal } from '@angular/core';
import { AppStore } from '../../../services/app-store.service';
import { AuthStore } from '../../../services/auth.store';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Book } from '../../../models/models';
import { LucideAngularModule, BookOpen, Users, TrendingUp, AlertCircle, Plus, CheckCircle, XCircle, Home } from 'lucide-angular';

@Component({
  selector: 'app-admin',
  imports: [FormsModule, LucideAngularModule, RouterModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class AdminComponent {
  activeTab = signal<'dashboard' | 'books' | 'loans' | 'reviews'>('dashboard');

  readonly BookOpenIcon = BookOpen;
  readonly UsersIcon = Users;
  readonly TrendingUpIcon = TrendingUp;
  readonly AlertCircleIcon = AlertCircle;
  readonly PlusIcon = Plus;
  readonly CheckCircleIcon = CheckCircle;
  readonly XCircleIcon = XCircle;
  readonly HomeIcon = Home;

  // Book form
  showBookForm = signal(false);
  editBook: any = signal(null);
  bookForm = signal({
    title: '',
    author: '',
    isbn: '',
    category: '',
    language: '',
    publisher: '',
    publishDate: '',
    pages: 0,
    description: '',
    coverUrl: '',
    rating: 0,
    available: true,
    reviewCount: 0,
  });
  selectedFile: File | null = null;

  // Loan form
  showLoanForm = signal(false);
  loanForm = signal({ bookId: '', userId: '', userName: '', dueDate: '' });

  constructor(public store: AppStore, public auth: AuthStore) {}

  get stats() {
    return this.store.stats();
  }
  get loans() {
    return this.store.loans();
  }
  get flaggedReviews() {
    return this.store.flaggedReviews();
  }

  readonly categories = [
    'Ficción',
    'Romance',
    'Clásicos',
    'Misterio',
    'Cuentos',
    'Ficción Psicológica',
  ];

  // ─── Books CRUD ─────────────────────────────────
  setActiveTab(tab: string): void {
    this.activeTab.set(tab as 'dashboard' | 'books' | 'loans' | 'reviews');
  }

  openNewBook(): void {
    this.editBook.set(null);
    this.bookForm.set({
      title: '',
      author: '',
      isbn: '',
      category: '',
      language: 'Español',
      publisher: '',
      publishDate: '',
      pages: 0,
      description: '',
      coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=450&fit=crop',
      rating: 0,
      available: true,
      reviewCount: 0,
    });
    this.selectedFile = null;
    this.showBookForm.set(true);
  }

  openEditBook(book: Book): void {
    this.editBook.set(book);
    this.bookForm.set({ ...book });
    this.selectedFile = null;
    this.showBookForm.set(true);
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  saveBook(): void {
    const form = this.bookForm();
    if (this.editBook()) {
      this.store.updateBook(this.editBook().id, form);
      if (this.selectedFile) {
        this.store.uploadPdf(this.editBook().id, this.selectedFile);
      }
      this.showBookForm.set(false);
    } else {
      this.store.addBook(form).subscribe({
        next: (newBook) => {
          if (this.selectedFile) {
            this.store.uploadPdf(newBook.id, this.selectedFile);
          } else {
            this.store.loadBooks();
          }
        },
        error: (err) => {
          console.error('Error creando libro:', err);
        }
      });
      this.showBookForm.set(false);
    }
  }

  deleteBook(bookId: string | number): void {
    if (confirm('¿Eliminar este libro?')) {
      this.store.deleteBook(bookId);
    }
  }

  // ─── Loans CRUD ─────────────────────────────────
  openNewLoan(): void {
    this.loanForm.set({ bookId: '', userId: '', userName: '', dueDate: '' });
    this.showLoanForm.set(true);
  }

  saveLoan(): void {
    const form = this.loanForm();
    const book = this.store.books().find((b) => b.id === form.bookId);
    if (book && form.userId && form.dueDate) {
      this.store.addLoan({
        bookId: form.bookId,
        bookTitle: book.title,
        userId: form.userId,
        userName: form.userName || 'Usuario',
        loanDate: new Date().toISOString().split('T')[0],
        dueDate: form.dueDate,
        status: 'active',
      });
      this.showLoanForm.set(false);
    }
  }

  returnLoan(loanId: string | number): void {
    this.store.updateLoan(String(loanId), {
      status: 'returned',
      returnDate: new Date().toISOString().split('T')[0],
    });
  }

  // ─── Reviews ────────────────────────────────────
  unflagReview(reviewId: string | number): void {
    this.store.unflagReview(reviewId);
  }
}
