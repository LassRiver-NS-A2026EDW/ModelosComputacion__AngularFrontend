import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { Book, Review, Loan, AppView } from '../models/models';
import { ApiService } from './api.service';
import { UiStore } from './ui.store';
import { AuthStore } from './auth.store';

@Injectable({ providedIn: 'root' })
export class AppStore {
  private api = inject(ApiService);
  private ui = inject(UiStore);
  private auth = inject(AuthStore);

  readonly books = signal<Book[]>([]);
  readonly reviews = signal<Review[]>([]);
  readonly loans = signal<Loan[]>([]);
  readonly favorites = signal<number[]>([]);
  readonly searchQuery = signal('');
  readonly categoryFilter = signal('all');
  readonly languageFilter = signal('all');
  readonly ratingFilter = signal('all');
  readonly availabilityFilter = signal('all');
  readonly currentView = signal<AppView>('home');

  readonly currentUser = this.auth.currentUser;
  readonly isAuthenticated = this.auth.isAuthenticated;
  readonly isAdmin = this.auth.isAdmin;
  readonly isLibrarian = this.auth.isLibrarian;
  readonly isAdminOrLibrarian = this.auth.isAdminOrLibrarian;

  readonly filteredBooks = computed(() => {
    let list = this.books();
    const search = this.searchQuery().toLowerCase();
    const category = this.categoryFilter();
    const language = this.languageFilter();
    const rating = this.ratingFilter();
    const availability = this.availabilityFilter();

    if (search) {
      list = list.filter(
        (b) => b.title.toLowerCase().includes(search) || b.author.toLowerCase().includes(search),
      );
    }
    if (category !== 'all') list = list.filter((b) => b.category === category);
    if (language !== 'all') list = list.filter((b) => b.language === language);
    if (rating !== 'all') list = list.filter((b) => b.rating >= Number(rating));
    if (availability !== 'all') {
      list = list.filter((b) => (availability === 'available' ? b.available : !b.available));
    }
    return list;
  });

  readonly favoriteBooks = computed(() => {
    const favIds = this.favorites();
    return this.books().filter((b) => favIds.includes(Number(b.id)));
  });

  readonly userReviews = computed(() => {
    const user = this.currentUser();
    if (!user) return [];
    return this.reviews().filter((r) => String(r.userId) === String(user.id));
  });

  readonly flaggedReviews = computed(() => this.reviews().filter((r) => r.flagged));

  readonly stats = computed(() => {
    const allBooks = this.books();
    const allLoans = this.loans();
    return {
      totalBooks: allBooks.length,
      availableBooks: allBooks.filter((b) => b.available).length,
      categories: new Set(allBooks.map((b) => b.category)).size,
      avgRating:
        allBooks.length > 0
          ? (allBooks.reduce((acc, b) => acc + b.rating, 0) / allBooks.length).toFixed(1)
          : '0.0',
      totalUsers: 0,
      totalLoans: allLoans.length,
      activeLoans: allLoans.filter((l) => l.status === 'active').length,
      overdueLoans: allLoans.filter((l) => l.status === 'overdue').length,
    };
  });

  constructor() {
    this.loadBooks();
    this.loadReviews();

    effect(() => {
      if (this.isAuthenticated()) {
        this.loadLoans();
        this.loadFavorites();
      } else {
        this.loans.set([]);
        this.favorites.set([]);
      }
    });
  }

  loadBooks(): void {
    this.api.getBooks().subscribe({
      next: (books) => this.books.set(books),
      error: (err) => console.error('Error cargando libros:', err),
    });
  }

  loadReviews(): void {
    this.api.getReviews().subscribe({
      next: (reviews) => this.reviews.set(reviews),
      error: (err) => console.error('Error cargando reseñas:', err),
    });
  }

  loadLoans(): void {
    this.api.getLoans().subscribe({
      next: (loans) => this.loans.set(loans),
      error: (err) => console.error('Error cargando préstamos:', err),
    });
  }

  loadFavorites(): void {
    this.api.getFavorites().subscribe({
      next: (favs) => this.favorites.set(favs.map((f) => f.bookId)),
      error: (err) => console.error('Error cargando favoritos:', err),
    });
  }

  navigate(view: AppView): void {
    this.currentView.set(view);
  }

  setSearchQuery(query: string): void {
    this.searchQuery.set(query);
  }

  setCategoryFilter(category: string): void {
    this.categoryFilter.set(category);
  }

  setLanguageFilter(language: string): void {
    this.languageFilter.set(language);
  }

  setRatingFilter(rating: string): void {
    this.ratingFilter.set(rating);
  }

  setAvailabilityFilter(availability: string): void {
    this.availabilityFilter.set(availability);
  }

  toggleFavorite(bookId: string | number): void {
    if (!this.isAuthenticated()) {
      this.ui.openAuthModal('Inicia sesión para agregar libros a tus favoritos.');
      return;
    }
    const numId = Number(bookId);
    if (this.favorites().includes(numId)) {
      this.api.removeFavorite(numId).subscribe({
        next: () => this.favorites.update((favs) => favs.filter((id) => id !== numId)),
      });
    } else {
      this.api.addFavorite(numId).subscribe({
        next: () => this.favorites.update((favs) => [...favs, numId]),
      });
    }
  }

  isFavorite(bookId: string | number): boolean {
    return this.favorites().includes(Number(bookId));
  }

  addReview(review: Omit<Review, 'id' | 'date'>): void {
    this.api.createReview({
      bookId: Number(review.bookId),
      rating: review.rating,
      comment: review.comment,
    }).subscribe({
      next: (newReview) => {
        this.reviews.update((r) => [...r, newReview]);
        this.loadBooks();
      },
      error: (err) => console.error('Error creando reseña:', err),
    });
  }

  deleteReview(reviewId: string | number): void {
    this.api.deleteReview(Number(reviewId)).subscribe({
      next: () => {
        this.reviews.update((r) => r.filter((rev) => String(rev.id) !== String(reviewId)));
        this.loadBooks();
      },
    });
  }

  flagReview(reviewId: string | number, reason: string): void {
    this.api.flagReview(Number(reviewId), reason).subscribe({
      next: (updated) => {
        this.reviews.update((r) =>
          r.map((rev) => (String(rev.id) === String(reviewId) ? updated : rev)),
        );
      },
    });
  }

  unflagReview(reviewId: string | number): void {
    this.api.unflagReview(Number(reviewId)).subscribe({
      next: (updated) => {
        this.reviews.update((r) =>
          r.map((rev) => (String(rev.id) === String(reviewId) ? updated : rev)),
        );
      },
    });
  }

  addBook(book: Omit<Book, 'id'>) {
    // Si no tenemos autor_id, enviamos un default (ej: 1) o lo extraemos si existe
    const bookData = { ...book, autor_id: 1 };
    return this.api.createBook(bookData);
  }

  updateBook(bookId: string | number, updates: Partial<Book>): void {
    this.api.updateBook(Number(bookId), updates).subscribe({
      next: () => this.loadBooks(),
      error: (err) => console.error('Error actualizando libro:', err),
    });
  }

  uploadPdf(bookId: string | number, file: File): void {
    this.api.uploadBookPdf(bookId, file).subscribe({
      next: () => this.loadBooks(),
      error: (err) => console.error('Error subiendo PDF:', err),
    });
  }

  deleteBook(bookId: string | number): void {
    this.api.deleteBook(Number(bookId)).subscribe({
      next: () => this.books.update((b) => b.filter((book) => String(book.id) !== String(bookId))),
    });
  }

  addLoan(loan: Omit<Loan, 'id'>): void {
    this.api.createLoan({
      bookId: Number(loan.bookId),
      dueDate: loan.dueDate,
    }).subscribe({
      next: () => {
        this.loadLoans();
        this.loadBooks();
      },
    });
  }

  updateLoan(loanId: string, updates: Partial<Loan>): void {
    if (updates.status === 'returned') {
      this.api.returnLoan(Number(loanId)).subscribe({
        next: () => {
          this.loadLoans();
          this.loadBooks();
        },
      });
    }
  }
}
