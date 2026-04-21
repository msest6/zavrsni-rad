import {
  Component, Input, Output, EventEmitter,
  OnInit, OnChanges, SimpleChanges, HostListener, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './autocomplete.component.html',
  styleUrls: ['./autocomplete.component.scss'],
})
export class AutocompleteComponent implements OnInit, OnChanges {
  // All available options from backend
  @Input() options: string[] = [];
  // Currently selected values (for multi-select mode)
  @Input() selected: string[] = [];
  // Single value (for single-select mode)
  @Input() value: string = '';
  // Placeholder text
  @Input() placeholder: string = 'Pretraži ili unesi novi...';
  // Allow multiple selections
  @Input() multi: boolean = false;

  @Output() selectedChange = new EventEmitter<string[]>();
  @Output() valueChange = new EventEmitter<string>();

  inputText = '';
  filtered: string[] = [];
  open = false;

  constructor(private elRef: ElementRef) {}

  ngOnInit() {
    this.filtered = [...this.options];
    if (!this.multi && this.value) {
      this.inputText = this.value;
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['options']) {
      this.filtered = this.filterOptions(this.inputText);
    }
    if (changes['value'] && !this.multi) {
      this.inputText = this.value || '';
    }
  }

  filterOptions(term: string): string[] {
    const lower = term.toLowerCase().trim();
    return this.options.filter(o =>
      o.toLowerCase().includes(lower) && !this.selected.includes(o)
    );
  }

  onInput() {
    const lower = this.inputText.toLowerCase();
    this.inputText = lower;
    this.filtered = this.filterOptions(lower);
    this.open = true;

    if (!this.multi) {
      this.valueChange.emit(lower);
    }
  }

  onFocus() {
    this.filtered = this.filterOptions(this.inputText);
    this.open = true;
  }

  select(option: string) {
    if (this.multi) {
      if (!this.selected.includes(option)) {
        this.selectedChange.emit([...this.selected, option]);
      }
      this.inputText = '';
      this.filtered = this.filterOptions('');
    } else {
      this.inputText = option;
      this.valueChange.emit(option);
      this.open = false;
    }
  }

  addNew() {
    const val = this.inputText.toLowerCase().trim();
    if (!val) return;

    if (this.multi) {
      if (!this.selected.includes(val)) {
        this.selectedChange.emit([...this.selected, val]);
      }
      this.inputText = '';
      this.filtered = this.filterOptions('');
    } else {
      this.valueChange.emit(val);
      this.inputText = val;
      this.open = false;
    }
    if (!this.options.includes(val)) {
      this.options = [...this.options, val];
    }
    this.filtered = this.filterOptions('');
  }

  removeSelected(item: string) {
    this.selectedChange.emit(this.selected.filter(s => s !== item));
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (this.filtered.length > 0) {
        this.select(this.filtered[0]);
      } else if (this.inputText.trim()) {
        this.addNew();
      }
    }
    if (event.key === 'Escape') {
      this.open = false;
    }
  }

  isNew(): boolean {
    const val = this.inputText.toLowerCase().trim();
    return !!val && !this.options.some(o => o.toLowerCase() === val);
  }

  @HostListener('document:click', ['$event'])
  onOutsideClick(event: Event) {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.open = false;
    }
  }
}
