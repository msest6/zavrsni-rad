import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RecipeService } from '../../services/recipe.service';
import { IngredientService } from '../../services/ingredient.service';
import { CategoryService } from '../../services/category.service';
import { MediaService } from '../../services/media.service';
import {Ingredient, Category, Recipe, Media} from '../../models/models';
import { AutocompleteComponent } from '../shared/autocomplete/autocomplete.component';
import { forkJoin } from 'rxjs';
import { UnitService } from '../../services/unit.service';
import { ChangeDetectorRef } from '@angular/core';
import { ImportRecipeModalComponent } from '../import-recipe-modal/import-recipe-modal.component';
import {ImportedRecipe, RecipeImportService} from '../../services/import.service';
import { ImportPdfModalComponent } from '../import-pdf-modal/import-pdf-modal.component';

@Component({
  selector: 'app-recipe-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    AutocompleteComponent,
    ImportRecipeModalComponent,
    ImportPdfModalComponent,
  ],
  templateUrl: './recipe-form.component.html',
})
export class RecipeFormComponent implements OnInit {
  form!: FormGroup;
  isEdit = false;
  recipeId: number | null = null;

  allIngredients: Ingredient[] = [];
  allCategories: Category[] = [];
  ingredientNames: string[] = [];
  categoryNames: string[] = [];
  selectedCategoryNames: string[] = [];

  stepImageFiles: (File | null)[] = [];
  stepImagePreviews: (string | null)[] = [];

  recipeImageFiles: (File | null)[] = [];
  recipeImagePreviews: (string | null)[] = [];

  private originalRecipe: Recipe | null = null;

  loading = false;
  submitting = false;
  error = '';

  showImportModal = false;

  readonly UNITS: string[] = [
    'g', 'dag', 'kg',
    'ml', 'dcl', 'l',
    'ž', 'žč', 'š',
    'kom', 'prst', 'pak', 'koc', 'rež', 'list'
  ];

  unitSymbolNames: { symbol: string; name: string }[] = [];

  readonly CONVERSIONS: { from: string; to: string }[] = [
    { from: '1000 g',  to: '1 kg'  },
    { from: '10 g',    to: '1 dag' },
    { from: '1000 ml', to: '1 l'   },
    { from: '10 dcl',  to: '1 l'   },
    { from: '1 ž',     to: '15 ml' },
    { from: '1 ž',     to: '3 žč'  },
    { from: '1 š',     to: '240 ml'},
  ];

  showUnitTables = false;
  showImportPdfModal = false;
  savingIngredient: Set<number> = new Set();

  constructor(
      private fb: FormBuilder,
      private route: ActivatedRoute,
      private router: Router,
      private recipeService: RecipeService,
      private ingredientService: IngredientService,
      private categoryService: CategoryService,
      private mediaService: MediaService,
      private unitService: UnitService,
      private cdr: ChangeDetectorRef,
      private importService: RecipeImportService
  ) {}

  ngOnInit() {
    this.buildForm();

    forkJoin({
      ingredients: this.ingredientService.getAll(),
      categories: this.categoryService.getAll(),
      units: this.unitService.getAll(),
    }).subscribe(({ ingredients, categories, units }) => {
      this.allIngredients = ingredients;
      this.allCategories = categories;
      this.ingredientNames = ingredients.map(i => i.name.toLowerCase());
      this.categoryNames = categories.map(c => c.name.toLowerCase());

      this.unitSymbolNames = this.UNITS.map(symbol => {
        const found = units.find((u: any) => u.symbol === symbol);
        return { symbol, name: found?.name ?? symbol };
      });

      if (!this.isEdit) {
        this.addIngredient();
        this.addStep();
      }

      this.cdr.detectChanges();
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.recipeId = Number(id);
      this.loading = false;
      this.recipeService.getById(this.recipeId).subscribe({
        next: (r) => { this.patchForm(r); this.loading = false; },
        error: () => { this.error = 'Greška pri učitavanju.'; this.loading = false; }
      });
    }
  }

  buildForm() {
    this.form = this.fb.group({
      title: ['', [Validators.required]],
      description: ['', [Validators.maxLength(1000)]],
      preparation_time: [null, [Validators.required, Validators.min(1)]],
      cooking_time: [null, [Validators.required, Validators.min(1)]],
      servings: [1, [Validators.required, Validators.min(1)]],
      source_url: [''],
      ingredients: this.fb.array([], Validators.required),
      steps: this.fb.array([], Validators.required),
    });
  }

  patchForm(recipe: Recipe) {
    this.originalRecipe = recipe;
    this.form.patchValue({
      title: recipe.title,
      description: recipe.description,
      preparation_time: recipe.preparation_time,
      cooking_time: recipe.cooking_time,
      servings: recipe.servings,
      source_url: recipe.source_url,
    });

    this.selectedCategoryNames = recipe.categories?.map(c => c.name.toLowerCase()) ?? [];
    this.cdr.detectChanges();

    recipe.ingredients?.forEach(ri => {
      this.ingredientsArray.push(this.fb.group({
        ingredientName: [ri.ingredient.name.toLowerCase(), Validators.required],
        quantityRaw: [String(ri.quantity), Validators.required],
        unit: [ri.unit.symbol, Validators.required],
      }));
    });

    const sorted = recipe.steps
        ? [...recipe.steps].sort((a, b) => a.stepNumber - b.stepNumber)
        : [];

    sorted.forEach(s => {
      this.stepsArray.push(this.fb.group({
        stepNumber: [s.stepNumber, Validators.required],
        description: [s.description, Validators.required],
        ingredientNames: [s.ingredients?.map(i => i.name.toLowerCase()) ?? []],
      }));
      this.stepImageFiles.push(null);
      const existing = s.mediaList && s.mediaList.length > 0 ? s.mediaList[0].url : null;
      this.stepImagePreviews.push(existing);
    });
    this.recipeImagePreviews = recipe.mediaList?.map(m => m.url) ?? [];
    this.recipeImageFiles = recipe.mediaList?.map(() => null) ?? [];
  }

  openImportModal() {
    this.showImportModal = true;
    this.cdr.detectChanges();
  }

  closeImportModal() {
    this.showImportModal = false;
    this.cdr.detectChanges();
  }

  onRecipeImported(imported: ImportedRecipe) {
    this.showImportModal = false;
    this._fillFormFromImport(imported);
  }

  /**
   * Prima novi format emita iz ImportPdfModalComponent:
   * { recipe: ImportedRecipe; imageFile: File | null }
   */
  onRecipeImportedFromPdf(payload: { recipe: ImportedRecipe; imageFile: File | null }) {
    this.showImportPdfModal = false;
    this._fillFormFromImport(payload.recipe);

    // FIX 5: Dodaj sliku iz PDF-a u listu slika recepta
    if (payload.imageFile) {
      this.recipeImageFiles.push(payload.imageFile);
      const reader = new FileReader();
      reader.onload = (e) => {
        this.recipeImagePreviews.push(e.target?.result as string);
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(payload.imageFile);
    }

    this.cdr.detectChanges();
  }

  /**
   * Zajednička logika za popunjavanje forme iz ImportedRecipe objekta.
   * Koristi se i za URL import i za PDF import.
   */
  private async _fillFormFromImport(imported: ImportedRecipe) {
    // Resetiraj arrays
    this.ingredientsArray.clear();
    this.stepsArray.clear();
    this.stepImageFiles = [];
    this.stepImagePreviews = [];

    // Popuni osnovna polja
    this.form.patchValue({
      title: imported.title ?? '',
      description: imported.description ?? '',
      preparation_time: imported.preparation_time ?? null,
      cooking_time: imported.cooking_time ?? null,
      servings: imported.servings ?? 1,
      source_url: imported.source_url ?? '',
    });

    // Kategorije
    this.selectedCategoryNames = (imported.categories ?? []).map(c => c.toLowerCase());
    this.selectedCategoryNames.forEach(name => {
      if (!this.categoryNames.includes(name)) {
        this.categoryNames.push(name);
      }
    });

    // Sastojci
    const validUnit = (unit: string): string =>
        this.UNITS.includes(unit) ? unit : 'kom';

    imported.ingredients?.forEach(ing => {
      const nameLower = (ing.name ?? '').toLowerCase();
      this.ingredientsArray.push(this.fb.group({
        ingredientName: [nameLower, Validators.required],
        quantityRaw: [ing.quantity ?? '', Validators.required],
        unit: [validUnit(ing.unit ?? 'kom'), Validators.required],
      }));
      if (nameLower && !this.ingredientNames.includes(nameLower)) {
        this.ingredientNames.push(nameLower);
      }
    });
    this.addIngredient();

    // Koraci
    imported.steps?.forEach((step, i) => {
      this.stepsArray.push(this.fb.group({
        stepNumber: [step.stepNumber ?? (i + 1), Validators.required],
        description: [step.description ?? '', Validators.required],
        ingredientNames: [[]],
      }));
      this.stepImageFiles.push(null);
      this.stepImagePreviews.push(null);
    });
    this.addStep();

    if (imported.imageUrl) {
      this.importService.fetchImageAsFile(imported.imageUrl).subscribe(file => {
        if (!file) return;
        this.recipeImageFiles.push(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          this.recipeImagePreviews.push(e.target?.result as string);
          this.cdr.detectChanges();
        };
        reader.readAsDataURL(file);
      });
    }

    this.cdr.detectChanges();
  }

  // ── Getters & helpers ──────────────────────────────────────────────────────

  get ingredientsArray(): FormArray { return this.form.get('ingredients') as FormArray; }
  get stepsArray(): FormArray { return this.form.get('steps') as FormArray; }
  asGroup(ctrl: AbstractControl): FormGroup { return ctrl as FormGroup; }

  onCategoriesChange(names: string[]) { this.selectedCategoryNames = names; }

  addIngredient() {
    this.ingredientsArray.push(this.fb.group({
      ingredientName: ['', Validators.required],
      quantityRaw: ['', Validators.required],
      unit: ['g', Validators.required],
    }));
  }

  removeIngredient(i: number) { this.ingredientsArray.removeAt(i); }

  onIngredientNameChange(i: number, name: string) {
    this.ingredientsArray.at(i).get('ingredientName')?.setValue(name.toLowerCase());
  }

  parseQuantity(raw: string): number | null {
    if (!raw) return null;
    const s = raw.trim();

    const fractionMatch = s.match(/^(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)$/);
    if (fractionMatch) {
      const num = parseFloat(fractionMatch[1].replace(',', '.'));
      const den = parseFloat(fractionMatch[2].replace(',', '.'));
      if (den === 0) return null;
      return num / den;
    }

    const decimalStr = s.replace(',', '.');
    const num = parseFloat(decimalStr);
    return isNaN(num) ? null : num;
  }

  addStep() {
    this.stepsArray.push(this.fb.group({
      stepNumber: [this.stepsArray.length + 1, Validators.required],
      description: ['', Validators.required],
      ingredientNames: [[]],
    }));
    this.stepImageFiles.push(null);
    this.stepImagePreviews.push(null);
  }

  removeStep(i: number) {
    this.stepsArray.removeAt(i);
    this.stepImageFiles.splice(i, 1);
    this.stepImagePreviews.splice(i, 1);
    this.stepsArray.controls.forEach((ctrl, idx) => {
      ctrl.get('stepNumber')?.setValue(idx + 1);
    });
  }

  onStepImageSelected(i: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.stepImageFiles[i] = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.stepImagePreviews[i] = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  removeStepImage(i: number) {
    this.stepImageFiles[i] = null;
    this.stepImagePreviews[i] = null;
  }

  getStepIngredientNames(i: number): string[] {
    return this.stepsArray.at(i).get('ingredientNames')?.value ?? [];
  }

  getRecipeIngredientNames(): string[] {
    return this.ingredientsArray.controls
        .map(c => c.get('ingredientName')?.value)
        .filter(n => !!n);
  }

  onStepIngredientsChange(i: number, names: string[]) {
    this.stepsArray.at(i).get('ingredientNames')?.setValue(names);
  }

  autoGrow(event: Event) {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  async submit() {
    this.trimEmptyRows();
    if (this.form.invalid || this.ingredientsArray.length === 0 || this.stepsArray.length === 0) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting = true;
    this.error = '';

    try {
      const categoryIds = await this.resolveCategoryIds(this.selectedCategoryNames);

      const recipeIngredientNames = this.ingredientsArray.controls
          .map(c => c.get('ingredientName')?.value as string);
      const resolvedIngredientIds = await this.resolveIngredientIds(recipeIngredientNames);

      const ingredients = this.ingredientsArray.controls.map((ctrl, i) => {
        const raw = ctrl.get('quantityRaw')?.value ?? '';
        const quantity = this.parseQuantity(raw) ?? 0;
        return {
          ingredientId: resolvedIngredientIds[i],
          quantity,
          unit: ctrl.get('unit')?.value,
        };
      });

      const steps = await Promise.all(
          this.stepsArray.controls.map(async (ctrl) => {
            const names: string[] = ctrl.get('ingredientNames')?.value ?? [];
            const ids = await this.resolveIngredientIds(names);
            return {
              stepNumber: ctrl.get('stepNumber')?.value,
              description: ctrl.get('description')?.value,
              ingredientIds: ids,
            };
          })
      );
      const existingMediaList = this.recipeImagePreviews
          .map((preview, i) => {
            if (this.recipeImageFiles[i] === null && preview) {
              const previewUrl: string = preview;
              const found = (this.originalRecipe?.mediaList ?? []).find(
                  (m: Media) => m.url === previewUrl
              );
              return found ?? null;
            }
            return null;
          })
          .filter((m): m is Media => m !== null);
      const dto = {
        title: this.form.get('title')?.value,
        description: this.form.get('description')?.value,
        preparation_time: this.form.get('preparation_time')?.value,
        cooking_time: this.form.get('cooking_time')?.value,
        servings: this.form.get('servings')?.value,
        source_url: this.form.get('source_url')?.value || null,
        categoryIds,
        ingredients,
        steps: steps.map(s => ({ ...s, mediaList: [] })),
        mediaList: existingMediaList,
      };

      const obs = this.isEdit && this.recipeId
          ? this.recipeService.update(this.recipeId, dto)
          : this.recipeService.create(dto);

      obs.subscribe({
        next: async (savedRecipe) => {
          await this.uploadStepImages(savedRecipe);
          await this.uploadRecipeImages(savedRecipe);
          this.router.navigate(['/recipes', savedRecipe.id]);
        },
        error: () => {
          this.error = 'Greška pri spremanju recepta.';
          this.submitting = false;
        }
      });

    } catch {
      this.error = 'Greška pri kreiranju sastojaka ili kategorija.';
      this.submitting = false;
    }
  }

  private async uploadStepImages(savedRecipe: Recipe) {
    const sortedSteps = savedRecipe.steps
        ? [...savedRecipe.steps].sort((a, b) => a.stepNumber - b.stepNumber)
        : [];

    for (let i = 0; i < this.stepImageFiles.length; i++) {
      const file = this.stepImageFiles[i];
      const step = sortedSteps[i];
      if (file && step) {
        try {
          await this.mediaService.upload(file, step.id).toPromise();
        } catch (err: any) {
          console.error(`Greška pri uploadu slike za korak ${i + 1}:`, err);
        }
      }
    }
  }

  private async resolveCategoryIds(names: string[]): Promise<number[]> {
    const ids: number[] = [];
    for (const name of names) {
      const lower = name.toLowerCase().trim();
      const existing = this.allCategories.find(c => c.name.toLowerCase() === lower);
      if (existing) {
        ids.push(existing.id);
      } else {
        const created = await this.categoryService.create({ name: lower }).toPromise();
        if (created) {
          this.allCategories.push(created);
          this.categoryNames.push(lower);
          ids.push(created.id);
        }
      }
    }
    return ids;
  }

  private async resolveIngredientIds(names: string[]): Promise<number[]> {
    const ids: number[] = [];
    for (const name of names) {
      if (!name?.trim()) continue;
      const lower = name.toLowerCase().trim();
      const existing = this.allIngredients.find(i => i.name.toLowerCase() === lower);
      if (existing) {
        ids.push(existing.id);
      } else {
        // Auto-create (za step sastojke koji nemaju UI gumb, i za submit)
        const created = await this.ingredientService.create({ name: lower }).toPromise();
        if (created) {
          this.allIngredients.push(created);
          this.ingredientNames = [...this.ingredientNames, lower];
          ids.push(created.id);
        }
      }
    }
    return ids;
  }

  public fieldInvalid(name: string): boolean {
    const c = this.form.get(name);
    return !!(c?.invalid && c?.['touched']);
  }

  public onIngredientFieldChange(i: number) {
    const isLast = i === this.ingredientsArray.length - 1;
    if (!isLast) return;
    const ctrl = this.ingredientsArray.at(i);
    const hasName = !!String(ctrl.get('ingredientName')?.value ?? '').trim();
    const hasQty  = !!String(ctrl.get('quantityRaw')?.value ?? '').trim();
    if (hasName || hasQty) this.addIngredient();
  }

  public onStepFieldChange(i: number) {
    const isLast = i === this.stepsArray.length - 1;
    if (!isLast) return;
    const ctrl = this.stepsArray.at(i);
    const hasDesc = !!String(ctrl.get('description')?.value ?? '').trim();
    if (hasDesc) this.addStep();
  }

  private trimEmptyRows() {
    while (this.ingredientsArray.length > 0) {
      const last = this.ingredientsArray.at(this.ingredientsArray.length - 1);
      const hasName = !!String(last.get('ingredientName')?.value ?? '').trim();
      const hasQty  = !!String(last.get('quantityRaw')?.value ?? '').trim();
      if (!hasName && !hasQty) {
        this.ingredientsArray.removeAt(this.ingredientsArray.length - 1);
      } else break;
    }

    while (this.stepsArray.length > 0) {
      const last = this.stepsArray.at(this.stepsArray.length - 1);
      const hasDesc = !!String(last.get('description')?.value ?? '').trim();
      if (!hasDesc) {
        this.stepsArray.removeAt(this.stepsArray.length - 1);
        this.stepImageFiles.pop();
        this.stepImagePreviews.pop();
      } else break;
    }
  }

  onRecipeImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.recipeImageFiles.push(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      this.recipeImagePreviews.push(e.target?.result as string);
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  removeRecipeImage(i: number) {
    this.recipeImageFiles.splice(i, 1);
    this.recipeImagePreviews.splice(i, 1);
  }

  private async uploadRecipeImages(savedRecipe: Recipe) {
    for (const file of this.recipeImageFiles) {
      if (!file) continue;
      try {
        await this.mediaService.uploadToRecipe(file, savedRecipe.id).toPromise();
      } catch (err) {
        console.error('Greška pri uploadu slike recepta:', err);
      }
    }
  }

  quantityInvalid(i: number): boolean {
    const ctrl = this.ingredientsArray.at(i);
    if (!ctrl?.['touched']) return false;
    const raw = String(ctrl.get('quantityRaw')?.value ?? '').trim();
    if (!raw) return true;
    return this.parseQuantity(raw) === null;
  }

  openImportPdfModal()  { this.showImportPdfModal = true;  this.cdr.detectChanges(); }
  closeImportPdfModal() { this.showImportPdfModal = false; this.cdr.detectChanges(); }
  isIngredientParseFallback(i: number): boolean {
    const ctrl = this.ingredientsArray.at(i);
    const name = String(ctrl.get('ingredientName')?.value ?? '').trim();
    const qty  = String(ctrl.get('quantityRaw')?.value ?? '').trim();
    const unit = String(ctrl.get('unit')?.value ?? '').trim();
    return !!name && qty === '1' && unit === 'kom';
  }

  isIngredientNew(i: number): boolean {
    const name = String(
        this.ingredientsArray.at(i).get('ingredientName')?.value ?? ''
    ).toLowerCase().trim();
    if (!name) return false;
    return !this.allIngredients.some(ing => ing.name.toLowerCase() === name);
  }

  async saveIngredientToDb(i: number) {
    if (this.savingIngredient.has(i)) return;
    const name = String(
        this.ingredientsArray.at(i).get('ingredientName')?.value ?? ''
    ).toLowerCase().trim();
    if (!name) return;

    this.savingIngredient.add(i);
    this.cdr.detectChanges();

    try {
      const created = await this.ingredientService.create({ name }).toPromise();
      if (created) {
        this.allIngredients.push(created);
        this.ingredientNames = [...this.ingredientNames, name];
      }
    } finally {
      this.savingIngredient.delete(i);
      this.cdr.detectChanges();
    }
  }
}