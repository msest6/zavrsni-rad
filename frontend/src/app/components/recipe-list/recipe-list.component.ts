import { Component, OnInit, ChangeDetectorRef, NgZone, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { RecipeService } from '../../services/recipe.service';
import { CategoryService } from '../../services/category.service';
import { Recipe, Category } from '../../models/models';

@Component({
  selector: 'app-recipe-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './recipe-list.component.html',
})
export class RecipeListComponent implements OnInit, OnDestroy {
  recipes: Recipe[] = [];
  filtered: Recipe[] = [];
  categories: Category[] = [];

  searchTerm = '';
  selectedCategories: Set<number> = new Set();

  // Pagination state
  currentPage = 0;
  pageSize = 20;
  hasMore = false;
  isLoadingMore = false;

  loading = true;
  error = '';

  // ── Category popup ────────────────────────────────────────────────────────
  showCategoryPopup = false;
  categorySearch = '';

  /**
   * Hardkodirane "pinned" kategorije koje se uvijek prikazuju kao chipovi.
   * Prva stavka (id: -1) je "Sve" — poseban slučaj koji briše sve filtre.
   * Ostatak mora odgovarati stvarnim imenima kategorija u bazi kako bi
   * onCategoryFilter() ispravno radio po ID-u.
   */
  readonly PINNED_NAMES = ['favorit', 'slatko', 'slano', 'juha'];

  get pinnedCategories(): Category[] {
    return this.PINNED_NAMES
        .map(name => this.categories.find(c => c.name === name))
        .filter((c): c is Category => !!c);
  }

  /** Kategorije vidljive unutar popup-a, filtrirane search termom */
  get popupCategories(): Category[] {
    const term = this.categorySearch.toLowerCase().trim();
    if (!term) return this.categories;
    return this.categories.filter(c =>
        c.name.toLowerCase().includes(term)
    );
  }

  private searchSubject = new Subject<string>();
  private subs = new Subscription();

  constructor(
      private recipeService: RecipeService,
      private categoryService: CategoryService,
      private cdr: ChangeDetectorRef,
      private zone: NgZone,
      private elRef: ElementRef
  ) {}

  ngOnInit() {
    this.loadRecipes(true);

    this.categoryService.getAll().subscribe(cats => {
      this.zone.run(() => {
        this.categories = cats;
        this.cdr.detectChanges();
      });
    });

    // Debounce search — čeka 300ms nakon zadnjeg unosa
    this.subs.add(
        this.searchSubject.pipe(
            debounceTime(300),
            distinctUntilChanged()
        ).subscribe(() => this.applyFilters())
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  // ── Data loading ────────────────────────────────────────────────────────────

  loadRecipes(reset: boolean) {
    if (reset) {
      this.currentPage = 0;
      this.recipes = [];
      this.loading = true;
    } else {
      this.isLoadingMore = true;
    }

    const categoryIds = [...this.selectedCategories];
    const request$ = categoryIds.length > 0
        ? this.recipeService.getByCategories(categoryIds, this.currentPage, this.pageSize)
        : this.recipeService.getAll(this.currentPage, this.pageSize);

    this.subs.add(
        request$.subscribe({
          next: (page) => {
            this.zone.run(() => {
              this.recipes = [...this.recipes, ...page.content];
              this.hasMore = !page.last;
              this.currentPage++;
              this.applyFilters();
              this.loading = false;
              this.isLoadingMore = false;
              this.cdr.detectChanges();
            });
          },
          error: () => {
            this.zone.run(() => {
              this.error = 'Greška pri učitavanju recepata.';
              this.loading = false;
              this.isLoadingMore = false;
              this.cdr.detectChanges();
            });
          }
        })
    );
  }

  loadMore() {
    this.loadRecipes(false);
  }

  // ── Filtering ───────────────────────────────────────────────────────────────

  applyFilters() {
    this.filtered = this.recipes.filter(r => {
      const matchSearch = !this.searchTerm ||
          r.title.toLowerCase().includes(this.searchTerm.toLowerCase());
      return matchSearch;
    });
  }

  onSearch() {
    this.searchSubject.next(this.searchTerm);
  }

  onCategoryFilter(id: number) {
    if (this.selectedCategories.has(id)) {
      this.selectedCategories.delete(id);
    } else {
      this.selectedCategories.add(id);
    }
    this.loadRecipes(true);
  }

  clearCategories() {
    this.selectedCategories.clear();
    this.loadRecipes(true);
  }

  // ── Category popup ──────────────────────────────────────────────────────────

  toggleCategoryPopup() {
    this.showCategoryPopup = !this.showCategoryPopup;
    if (this.showCategoryPopup) {
      this.categorySearch = '';
    }
  }

  closeCategoryPopup() {
    this.showCategoryPopup = false;
  }

  /** Zatvori popup klikom izvan njega */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const popup = this.elRef.nativeElement.querySelector('.category-popup-wrapper');
    if (popup && !popup.contains(target)) {
      this.showCategoryPopup = false;
    }
  }

  onCategoryFilterFromPopup(id: number) {
    this.onCategoryFilter(id);
    // Ne zatvaramo popup — korisnik može odabrati više kategorija
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  delete(id: number, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    if (confirm('Obrisati ovaj recept?')) {
      this.recipeService.delete(id).subscribe(() => {
        this.recipes = this.recipes.filter(r => r.id !== id);
        this.applyFilters();
      });
    }
  }
}