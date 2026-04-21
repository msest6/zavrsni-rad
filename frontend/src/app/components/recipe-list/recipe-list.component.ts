import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RecipeService } from '../../services/recipe.service';
import { CategoryService } from '../../services/category.service';
import { Recipe, Category } from '../../models/models';

@Component({
  selector: 'app-recipe-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './recipe-list.component.html',
})
export class RecipeListComponent implements OnInit {
  recipes: Recipe[] = [];
  filtered: Recipe[] = [];
  categories: Category[] = [];
  searchTerm = '';
  selectedCategories: Set<number> = new Set();
  loading = true;
  error = '';

  constructor(
    private recipeService: RecipeService,
    private categoryService: CategoryService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit() {
    this.recipeService.getAll().subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.recipes = data;
          this.filtered = [...this.recipes];
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.zone.run(() => {
          this.error = 'Greška pri učitavanju recepata.';
          this.loading = false;
          this.cdr.detectChanges();
        });
      }
    });
    this.categoryService.getAll().subscribe(cats => {
      this.zone.run(() => {
        this.categories = cats;
        this.cdr.detectChanges();
      });
    });
  }

  applyFilters() {
    this.filtered = this.recipes.filter(r => {
      const matchSearch = r.title.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchCat = this.selectedCategories.size === 0 ||
        r.categories?.some(c => this.selectedCategories.has(c.id));
      return matchSearch && matchCat;
    });
  }

  onSearch() { this.applyFilters(); }
  onCategoryFilter(id: number) {
    if (this.selectedCategories.has(id)) {
      this.selectedCategories.delete(id);
    } else {
      this.selectedCategories.add(id);
    }
    this.applyFilters();
  }

  clearCategories() {
    this.selectedCategories.clear();
    this.applyFilters();
  }

  delete(id: number, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    if (confirm('Obrisati ovaj recept?')) {
      this.recipeService.delete(id).subscribe(() => {
        this.recipes = this.recipes.filter(r => r.id !== id);
        this.filtered = this.filtered.filter(r => r.id !== id);
      });
    }
  }
}