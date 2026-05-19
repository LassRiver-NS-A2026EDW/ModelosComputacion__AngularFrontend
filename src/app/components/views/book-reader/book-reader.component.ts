import {
  Component,
  computed,
  effect,
  inject,
  signal,
  ViewChild,
  ElementRef,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  MessageSquare,
  X,
  Download,
  RotateCw,
  Maximize2,
} from 'lucide-angular';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { AppStore } from '../../../services/app-store.service';
import { AuthStore } from '../../../services/auth.store';
import { ApiService } from '../../../services/api.service';
import { ChatService } from '../../../services/chat.service';
import { ChatPanelComponent } from '../../shared/chat-panel/chat-panel.component';

@Component({
  selector: 'app-book-reader',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, PdfViewerModule, ChatPanelComponent],
  templateUrl: './book-reader.component.html',
  styleUrl: './book-reader.component.css',
})
export class BookReaderComponent implements OnInit, OnDestroy {
  readonly store = inject(AppStore);
  readonly auth = inject(AuthStore);
  readonly api = inject(ApiService);
  readonly chatService = inject(ChatService);
  readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);

  @ViewChild('chatPanelRef') chatPanelRef!: ChatPanelComponent;
  @ViewChild('pdfContainer') pdfContainer!: ElementRef<HTMLDivElement>;

  // Icons
  readonly ArrowLeftIcon = ArrowLeft;
  readonly ChevronLeftIcon = ChevronLeft;
  readonly ChevronRightIcon = ChevronRight;
  readonly ZoomInIcon = ZoomIn;
  readonly ZoomOutIcon = ZoomOut;
  readonly MessageSquareIcon = MessageSquare;
  readonly XIcon = X;
  readonly DownloadIcon = Download;
  readonly RotateCwIcon = RotateCw;
  readonly Maximize2Icon = Maximize2;

  readonly bookId = signal(this.route.snapshot.paramMap.get('id') ?? '');

  readonly book = computed(() => {
    const id = this.bookId();
    return this.store.books().find(b => String(b.id) === String(id)) ?? null;
  });

  // PDF state
  pdfSrc = signal<string>('');
  pdfPage = signal(1);
  pdfTotalPages = signal(0);
  pdfZoom = signal(1.0);
  pdfLoading = signal(true);
  pdfError = signal<string | null>(null);

  // Chat panel visibility
  chatOpen = signal(true);

  // Texto seleccionado del PDF
  selectedText = signal('');

  // Admin: modal para cargar PDF
  showLoadPdfModal = signal(false);
  pdfUrlInput = signal('');
  loadingPdf = signal(false);
  loadPdfError = signal<string | null>(null);
  loadPdfSuccess = signal<string | null>(null);

  private selectionHandler = () => this.captureSelection();

  constructor() {
    effect(() => {
      const b = this.book();
      if (b?.pdfUrl) {
        this.pdfSrc.set(this.api.getBookPdfEndpoint(b.id));
      } else if (b && !b.hasPdf) {
        this.pdfError.set('Este libro no tiene PDF disponible aún.');
        this.pdfLoading.set(false);
      }
    });
  }

  ngOnInit(): void {
    document.addEventListener('mouseup', this.selectionHandler);
    this.chatService.clear();
  }

  ngOnDestroy(): void {
    document.removeEventListener('mouseup', this.selectionHandler);
  }

  // ─── Selección de texto ──────────────────────────────

  private captureSelection(): void {
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? '';
    if (text && text.length > 5) {
      this.selectedText.set(text);
      if (this.chatPanelRef) {
        this.chatPanelRef.selectedText.set(text);
      }
    }
  }

  // ─── Navegación PDF ──────────────────────────────────

  prevPage(): void {
    if (this.pdfPage() > 1) this.pdfPage.update(p => p - 1);
  }

  nextPage(): void {
    if (this.pdfPage() < this.pdfTotalPages()) this.pdfPage.update(p => p + 1);
  }

  onPageChange(page: number): void {
    this.pdfPage.set(page);
  }

  onLoadComplete(pdf: any): void {
    this.pdfTotalPages.set(pdf.numPages);
    this.pdfLoading.set(false);
    this.pdfError.set(null);
  }

  onError(err: any): void {
    this.pdfLoading.set(false);
    const msg = err?.message ?? String(err);
    if (msg.includes('403') || msg.includes('Forbidden')) {
      this.pdfError.set('Acceso denegado. Necesitas un préstamo activo para leer este libro.');
    } else if (msg.includes('404')) {
      this.pdfError.set('PDF no encontrado en el servidor.');
    } else {
      this.pdfError.set('Error al cargar el PDF. Inténtalo más tarde.');
    }
  }

  zoomIn(): void {
    this.pdfZoom.update(z => Math.min(z + 0.2, 3.0));
  }

  zoomOut(): void {
    this.pdfZoom.update(z => Math.max(z - 0.2, 0.4));
  }

  resetZoom(): void {
    this.pdfZoom.set(1.0);
  }

  // ─── Carga de PDF (admin) ────────────────────────────

  get isAdmin(): boolean {
    return this.auth.currentUser()?.role === 'admin' || this.auth.currentUser()?.role === 'librarian';
  }

  openLoadPdfModal(): void {
    this.showLoadPdfModal.set(true);
    this.pdfUrlInput.set('');
    this.loadPdfError.set(null);
    this.loadPdfSuccess.set(null);
  }

  closeLoadPdfModal(): void {
    this.showLoadPdfModal.set(false);
  }

  handleLoadPdf(): void {
    const url = this.pdfUrlInput().trim();
    const book = this.book();
    if (!url || !book || this.loadingPdf()) return;

    this.loadingPdf.set(true);
    this.loadPdfError.set(null);
    this.loadPdfSuccess.set(null);

    this.api.downloadBookPdf(book.id, url).subscribe({
      next: (res) => {
        this.loadPdfSuccess.set('✅ PDF cargado exitosamente. Recargando visor...');
        this.loadingPdf.set(false);
        // Recargar el src del PDF tras 1.5s
        setTimeout(() => {
          this.pdfSrc.set(this.api.getBookPdfEndpoint(book.id) + '?t=' + Date.now());
          this.pdfLoading.set(true);
          this.pdfError.set(null);
          this.closeLoadPdfModal();
        }, 1500);
      },
      error: (err) => {
        this.loadingPdf.set(false);
        this.loadPdfError.set(err?.error?.error ?? 'Error al cargar el PDF.');
      },
    });
  }

  goBack(): void {
    const id = this.bookId();
    this.router.navigate(['/books', id]);
  }

  toggleChat(): void {
    this.chatOpen.update(v => !v);
  }
}
