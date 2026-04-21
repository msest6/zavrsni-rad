import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IngredientService } from '../../services/ingredient.service';
import { Ingredient } from '../../models/models';

@Component({
  selector: 'app-ingredient-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './ingredient-list.component.html',
})
export class IngredientListComponent implements OnInit {
  ingredients: Ingredient[] = [];
  filtered: Ingredient[] = [];
  searchTerm = '';
  loading = true;
  editingId: number | null = null;
  showForm = false;
  form!: FormGroup;
  submitting = false;

  constructor(
    private service: IngredientService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.maxLength(500)],
    });
    this.load();
  }

  load() {
    this.service.getAll().subscribe(d => {
      this.zone.run(() => {
        this.ingredients = d;
        this.filtered = d;
        this.loading = false;
        this.cdr.detectChanges();
      });
    });
  }

  filter() {
    this.filtered = this.ingredients.filter(i =>
      i.name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  startEdit(ing: Ingredient) {
    this.editingId = ing.id;
    this.showForm = false;
    this.form.patchValue({ name: ing.name, description: ing.description ?? '' });
  }

  cancelEdit() { this.editingId = null; this.form.reset(); }

  save(id: number) {
    if (this.form.invalid) return;
    this.submitting = true;
    this.service.update(id, this.form.value).subscribe({
      next: (updated) => {
        this.zone.run(() => {
          const idx = this.ingredients.findIndex(i => i.id === id);
          if (idx > -1) this.ingredients[idx] = updated;
          this.filter();
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
      next: (ing) => {
        this.ingredients.push(ing);
        this.filter();
        this.showForm = false;
        this.form.reset();
        this.submitting = false;
      },
      error: () => this.submitting = false
    });
  }

  delete(id: number) {
    if (!confirm('Obrisati ovaj sastojak?')) return;
    this.service.delete(id).subscribe(() => {
      this.ingredients = this.ingredients.filter(i => i.id !== id);
      this.filter();
    });
  }

  openCreate() {
    this.showForm = true;
    this.editingId = null;
    this.form.reset();
  }
}