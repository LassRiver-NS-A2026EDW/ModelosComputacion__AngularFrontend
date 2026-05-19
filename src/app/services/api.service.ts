import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Book, Review, User, Loan, ChatRequest } from '../models/models';
import { environment } from "../../environments/environment"

/**
 * Servicio centralizado para comunicación con el backend Django.
 * Todas las rutas apuntan a /api/ que Nginx redirige al backend.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  // ─── Auth ───────────────────────────────────────────────

  login(username: string, password: string): Observable<{ user: User; token: string }> {
    return this.http.post<{ user: User; token: string }>(
      `${this.baseUrl}/auth/login/`,
      { username, password }
    );
  }

  register(data: {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    password: string;
    password2: string;
    fecha_nacimiento: string;
    genero: string;
    pais: string;
  }): Observable<{ user: User; token: string }> {
    return this.http.post<{ user: User; token: string }>(
      `${this.baseUrl}/auth/registro/`,
      data
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/auth/logout/`, {});
  }

  me(): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/auth/me/`);
  }

  // ─── Libros ─────────────────────────────────────────────

  getBooks(): Observable<Book[]> {
    return this.http.get<Book[]>(`${this.baseUrl}/libros/`);
  }

  getBook(id: number): Observable<Book> {
    return this.http.get<Book>(`${this.baseUrl}/libros/${id}/`);
  }

  createBook(book: Partial<Book> & { autor_id: number }): Observable<Book> {
    return this.http.post<Book>(`${this.baseUrl}/libros/`, book);
  }

  updateBook(id: number, updates: Partial<Book>): Observable<Book> {
    return this.http.patch<Book>(`${this.baseUrl}/libros/${id}/`, updates);
  }

  deleteBook(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/libros/${id}/`);
  }

  // ─── PDF ────────────────────────────────────────────────

  /** Solicita al backend que descargue un PDF desde una URL externa y lo asocie al libro. */
  downloadBookPdf(bookId: number | string, url: string): Observable<{ message: string; filename: string; pdfUrl: string }> {
    return this.http.post<{ message: string; filename: string; pdfUrl: string }>(
      `${this.baseUrl}/libros/${bookId}/download-pdf/`,
      { url }
    );
  }

  /** Retorna la URL del endpoint que sirve el PDF (para usarla en el visor). */
  getBookPdfEndpoint(bookId: number | string): string {
    return `${this.baseUrl}/libros/${bookId}/pdf/`;
  }

  /** Sube un archivo PDF y lo asocia al libro. */
  uploadBookPdf(bookId: number | string, file: File): Observable<{ message: string; pdfUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ message: string; pdfUrl: string }>(
      `${this.baseUrl}/libros/${bookId}/upload-pdf/`,
      formData
    );
  }

  // ─── Chat IA (SSE Streaming) ─────────────────────────────

  /**
   * Envía un mensaje al chat de IA usando SSE streaming.
   * Retorna un ReadableStream que emite chunks de texto de la respuesta.
   */
  async chatStream(
    payload: ChatRequest,
    token: string,
    onChunk: (chunk: string) => void,
    onDone: () => void,
    onError: (err: string) => void
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/chat/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      onError(`Error ${response.status}: ${errText}`);
      return;
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            onDone();
            return;
          }
          if (data.startsWith('[ERROR]')) {
            onError(data.slice(7).trim());
            return;
          }
          // Reemplazar saltos de línea escapados
          onChunk(data.replace(/\\n/g, '\n'));
        }
      }
    }
    onDone();
  }

  // ─── Reseñas ────────────────────────────────────────────

  getReviews(params?: { bookId?: number; userId?: number }): Observable<Review[]> {
    let url = `${this.baseUrl}/resenas/`;
    const queryParts: string[] = [];
    if (params?.bookId) queryParts.push(`bookId=${params.bookId}`);
    if (params?.userId) queryParts.push(`userId=${params.userId}`);
    if (queryParts.length > 0) url += '?' + queryParts.join('&');
    return this.http.get<Review[]>(url);
  }

  createReview(review: { bookId: number; rating: number; comment: string }): Observable<Review> {
    return this.http.post<Review>(`${this.baseUrl}/resenas/`, review);
  }

  deleteReview(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/resenas/${id}/`);
  }

  flagReview(id: number, reason: string): Observable<Review> {
    return this.http.post<Review>(`${this.baseUrl}/resenas/${id}/flag/`, { reason });
  }

  unflagReview(id: number): Observable<Review> {
    return this.http.post<Review>(`${this.baseUrl}/resenas/${id}/unflag/`, {});
  }

  // ─── Favoritos ──────────────────────────────────────────

  getFavorites(): Observable<{ id: number; bookId: number }[]> {
    return this.http.get<{ id: number; bookId: number }[]>(`${this.baseUrl}/favoritos/`);
  }

  addFavorite(bookId: number): Observable<{ id: number; bookId: number }> {
    return this.http.post<{ id: number; bookId: number }>(
      `${this.baseUrl}/favoritos/`,
      { bookId }
    );
  }

  removeFavorite(bookId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/favoritos/${bookId}/`);
  }

  // ─── Préstamos ──────────────────────────────────────────

  getLoans(params?: { status?: string }): Observable<Loan[]> {
    let url = `${this.baseUrl}/prestamos/`;
    if (params?.status) url += `?status=${params.status}`;
    return this.http.get<Loan[]>(url);
  }

  createLoan(data: { bookId: number; dueDate: string }): Observable<Loan> {
    return this.http.post<Loan>(`${this.baseUrl}/prestamos/`, data);
  }

  returnLoan(id: number): Observable<Loan> {
    return this.http.post<Loan>(`${this.baseUrl}/prestamos/${id}/devolver/`, {});
  }

  // ─── Estadísticas ───────────────────────────────────────

  getStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/estadisticas/`);
  }
}
