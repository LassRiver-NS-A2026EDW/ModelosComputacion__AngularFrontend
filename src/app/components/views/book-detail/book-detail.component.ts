import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AppStore } from '../../../services/app-store.service';
import { UiStore } from '../../../services/ui.store';
import { AuthStore } from '../../../services/auth.store';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ArrowLeft, Heart, Star, Calendar, BookOpen, Globe, Building2, LogIn, FileText, Download } from 'lucide-angular';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { RatingStarsComponent } from '../../shared/rating-stars/rating-stars.component';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { Book } from '../../../models/models';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-book-detail',
  imports: [FormsModule, LucideAngularModule, EmptyStateComponent, RatingStarsComponent, StatusBadgeComponent],
  templateUrl: './book-detail.html',
  styleUrl: './book-detail.css',
})
export class BookDetailComponent {
  readonly store = inject(AppStore);
  readonly ui = inject(UiStore);
  readonly auth = inject(AuthStore);
  readonly api = inject(ApiService);
  readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);

  readonly ArrowLeftIcon = ArrowLeft;
  readonly HeartIcon = Heart;
  readonly StarIcon = Star;
  readonly CalendarIcon = Calendar;
  readonly BookOpenIcon = BookOpen;
  readonly GlobeIcon = Globe;
  readonly Building2Icon = Building2;
  readonly LogInIcon = LogIn;
  readonly FileTextIcon = FileText;
  readonly DownloadIcon = Download;

  rating = signal(5);
  comment = signal('');
  readonly bookId = signal(this.route.snapshot.paramMap.get('id'));

  get currentUser() { return this.auth.currentUser(); }

  readonly book = computed(() => {
    const id = this.bookId();
    if (!id) return null;
    return this.store.books().find((book) => String(book.id) === String(id)) ?? null;
  });

  readonly bookReviews = computed(() => {
    return this.store.reviews().filter((r) => String(r.bookId) === String(this.book()?.id));
  });

  readonly userReview = computed(() => {
    return this.bookReviews().find(r => String(r.userId) === String(this.currentUser?.id));
  });

  readonly activeLoan = computed(() => {
    const book = this.book();
    const user = this.currentUser;
    if (!book || !user) return null;
    return this.store.loans().find(
      (l) => String(l.bookId) === String(book.id) && String(l.userId) === String(user.id) && (l.status === 'active' || l.status === 'overdue')
    ) ?? null;
  });

  goBack(): void {
    this.router.navigate(['/catalog']);
  }

  handleSubmitReview(): void {
    const book = this.book();
    const user = this.currentUser;
    if (!user || !book) return;
    if (!this.comment().trim()) return;
    
    this.store.addReview({
      bookId: book.id,
      userId: user.id,
      userName: user.name,
      rating: this.rating(),
      comment: this.comment(),
      flagged: false,
    });
    this.comment.set('');
    this.rating.set(5);
  }

  handleDeleteReview(): void {
    const review = this.userReview();
    if (review) {
      this.ui.confirmAction({
        title: 'Eliminar reseña',
        description: '¿Estás seguro que deseas eliminar esta reseña? Esta acción no se puede deshacer.',
        confirmText: 'Eliminar',
        isDestructive: true,
        onConfirm: () => {
          this.store.deleteReview(String(review.id));
        }
      });
    }
  }

  handleFavoriteToggle(): void {
    const book = this.book();
    if (book) {
      this.store.toggleFavorite(String(book.id));
    }
  }

  handleReserve(): void {
    const book = this.book();
    if (book) {
      if (this.auth.isAuthenticated()) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14); // 14 days loan
        this.store.addLoan({
          bookId: book.id,
          bookTitle: book.title,
          userId: this.currentUser!.id,
          userName: this.currentUser!.name,
          loanDate: new Date().toISOString().split('T')[0],
          dueDate: dueDate.toISOString().split('T')[0],
          status: 'active'
        });
        return;
      }
      this.ui.openAuthModal('Debes iniciar sesión para reservar un libro.');
    }
  }

  handleReturn(): void {
    const loan = this.activeLoan();
    if (loan) {
      this.store.updateLoan(String(loan.id), { status: 'returned' });
    }
  }

  handleReadPdf(): void {
    const book = this.book();
    if (!book) return;
    if (!this.auth.isAuthenticated()) {
      this.ui.openAuthModal('Debes iniciar sesión para leer el libro.');
      return;
    }
    this.router.navigate(['/books', book.id, 'read']);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
