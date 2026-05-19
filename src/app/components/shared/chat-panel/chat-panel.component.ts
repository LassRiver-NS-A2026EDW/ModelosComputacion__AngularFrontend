import {
  Component,
  computed,
  effect,
  inject,
  signal,
  ElementRef,
  ViewChild,
  AfterViewChecked,
  Input,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { LucideAngularModule, Send, X, MessageSquare, ChevronDown, Bot, User } from 'lucide-angular';
import { ChatService } from '../../../services/chat.service';
import { ChatMessage } from '../../../models/models';

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, SlicePipe],
  templateUrl: './chat-panel.component.html',
  styleUrl: './chat-panel.component.css',
})
export class ChatPanelComponent implements AfterViewChecked {
  readonly chatService = inject(ChatService);

  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;

  // Icons
  readonly SendIcon = Send;
  readonly XIcon = X;
  readonly MessageSquareIcon = MessageSquare;
  readonly ChevronDownIcon = ChevronDown;
  readonly BotIcon = Bot;
  readonly UserIcon = User;

  /** Texto de la pregunta actual */
  question = signal('');

  /** Texto seleccionado recibido del componente padre */
  selectedText = signal('');

  /** bookId y contexto del libro, pasados como @Input desde el padre */
  @Input() bookId: number | string = 0;
  @Input() bookTitle: string = '';
  @Input() bookDescription: string = '';

  private shouldScrollToBottom = false;

  /** Mensajes del chat */
  readonly messages = computed(() => this.chatService.messages());
  readonly isLoading = computed(() => this.chatService.isLoading());

  constructor() {
    // Scroll automático cuando llegan nuevos mensajes
    effect(() => {
      if (this.chatService.messages().length > 0) {
        this.shouldScrollToBottom = true;
      }
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }

  clearSelection(): void {
    this.selectedText.set('');
  }

  async handleSend(): Promise<void> {
    const q = this.question().trim();
    if (!q || this.isLoading()) return;

    this.question.set('');

    await this.chatService.sendMessage({
      bookId: this.bookId,
      selectedText: this.selectedText(),
      context: this.bookDescription,
      question: q,
    });

    // Limpiar texto seleccionado tras enviar
    this.selectedText.set('');
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.handleSend();
    }
  }

  clearChat(): void {
    this.chatService.clear();
  }

  trackByIndex(index: number): number {
    return index;
  }
}
