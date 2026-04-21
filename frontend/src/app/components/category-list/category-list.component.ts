import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CategoryService } from '../../services/category.service';
import { Category } from '../../models/models';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './category-list.component.html',
})
export class CategoryListComponent implements OnInit {
  categories: Category[] = [];
  loading = true;
  editingId: number | null = null;
  showForm = false;
  form!: FormGroup;
  submitting = false;

  constructor(
    private service: CategoryService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit() {
    this.form = this.fb.group({ name: ['', Validators.required] });
    this.service.getAll().subscribe(d => {
      this.zone.run(() => {
        this.categories = d;
        this.loading = false;
        this.cdr.detectChanges();
      });
    });
  }

  startEdit(cat: Category) {
    this.editingId = cat.id;
    this.showForm = false;
    this.form.patchValue({ name: cat.name });
  }

  cancelEdit() { this.editingId = null; this.form.reset(); }

  save(id: number) {
    if (this.form.invalid) return;
    this.submitting = true;
    this.service.update(id, this.form.value).subscribe({
      next: (updated) => {
        this.zone.run(() => {
          const idx = this.categories.findIndex(c => c.id === id);
          if (idx > -1) this.categories[idx] = updated;
          this.editingId = null;
          this.submitting = false;
          this.cdr.detectChanges();
        });
      },
      error: () => this.submitting = false
    });
  }

  create() {
    if (this.form.invalid) return;
    this.submitting = true;
    this.service.create(this.form.value).subscribe({
      next: (cat) => {
        this.categories.push(cat);
        this.showForm = false;
        this.form.reset();
        this.submitting = false;
      },
      error: () => this.submitting = false
    });
  }

  delete(id: number) {
    if (!confirm('Obrisati ovu kategoriju?')) return;
    this.service.delete(id).subscribe(() => {
      this.categories = this.categories.filter(c => c.id !== id);
    });
  }

  openCreate() { this.showForm = true; this.editingId = null; this.form.reset(); }
}