import { Injectable, signal, computed, inject } from '@angular/core';
import { ChatMessage, ChatRequest } from '../models/models';
import { ApiService } from './api.service';
import { AuthStore } from './auth.store';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private api = inject(ApiService);
  private auth = inject(AuthStore);

  /** Historial de mensajes del chat actual */
  readonly messages = signal<ChatMessage[]>([]);
  /** Si está generando respuesta ahora mismo */
  readonly isLoading = signal(false);
  /** Texto de error si hubo problema */
  readonly errorMessage = signal<string | null>(null);

  /** Limpia el chat (al cambiar de libro, por ejemplo) */
  clear(): void {
    this.messages.set([]);
    this.isLoading.set(false);
    this.errorMessage.set(null);
  }

  /**
   * Envía un mensaje al backend y procesa la respuesta en streaming.
   */
  async sendMessage(payload: ChatRequest): Promise<void> {
    const question = payload.question.trim();
    if (!question || this.isLoading()) return;

    const token = this.auth.getToken();
    if (!token) {
      this.errorMessage.set('Debes iniciar sesión para usar el chat.');
      return;
    }

    // Añadir mensaje del usuario al historial
    this.messages.update(msgs => [
      ...msgs,
      { role: 'user', content: question },
    ]);

    // Añadir placeholder de respuesta del asistente
    this.messages.update(msgs => [
      ...msgs,
      { role: 'assistant', content: '', isStreaming: true },
    ]);

    this.isLoading.set(true);
    this.errorMessage.set(null);

    // Construir historial para enviar al backend (sin el último placeholder)
    const history = this.messages()
      .slice(0, -1)
      .filter(m => !m.isStreaming)
      .map(m => ({ role: m.role, content: m.content }));

    const fullPayload: ChatRequest = { ...payload, history };

    await this.api.chatStream(
      fullPayload,
      token,
      // onChunk: ir acumulando texto en el último mensaje
      (chunk: string) => {
        this.messages.update(msgs => {
          const updated = [...msgs];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') {
            updated[updated.length - 1] = {
              ...last,
              content: last.content + chunk,
            };
          }
          return updated;
        });
      },
      // onDone: quitar isStreaming
      () => {
        this.messages.update(msgs => {
          const updated = [...msgs];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') {
            updated[updated.length - 1] = { ...last, isStreaming: false };
          }
          return updated;
        });
        this.isLoading.set(false);
      },
      // onError
      (err: string) => {
        this.messages.update(msgs => {
          const updated = [...msgs];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') {
            updated[updated.length - 1] = {
              ...last,
              content: `⚠️ Error al contactar la IA: ${err}`,
              isStreaming: false,
            };
          }
          return updated;
        });
        this.isLoading.set(false);
        this.errorMessage.set(err);
      }
    );
  }
}
