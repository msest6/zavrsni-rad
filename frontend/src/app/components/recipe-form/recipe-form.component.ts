import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RecipeService } from '../../services/recipe.service';
import { IngredientService } from '../../services/ingredient.service';
import { CategoryService } from '../../services/category.service';
import { MediaService } from '../../services/media.service';
import { Ingredient, Category, Recipe } from '../../models/models';
import { AutocompleteComponent } from '../shared/autocomplete/autocomplete.component';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-recipe-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AutocompleteComponent],
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

  // Pending image files per step index (before save)
  stepImageFiles: (File | null)[] = [];
  stepImagePreviews: (string | null)[] = [];

  loading = false;
  submitting = false;
  error = '';

  units = ['g', 'kg', 'ml', 'l', 'kom', 'žlica', 'žličica', 'šalica', 'prstohvat'];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private recipeService: RecipeService,
    private ingredientService: IngredientService,
    private categoryService: CategoryService,
    private mediaService: MediaService
  ) {}

  ngOnInit() {
    this.buildForm();

    forkJoin({
      ingredients: this.ingredientService.getAll(),
      categories: this.categoryService.getAll(),
    }).subscribe(({ ingredients, categories }) => {
      this.allIngredients = ingredients;
      this.allCategories = categories;
      this.ingredientNames = ingredients.map(i => i.name.toLowerCase());
      this.categoryNames = categories.map(c => c.name.toLowerCase());
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.recipeId = Number(id);
      this.loading = true;
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
      preparation_time: [null, [Validators.min(1)]],
      servings: [1, [Validators.required, Validators.min(1)]],
      sourceName: [''],
      sourceUrl: [''],
      ingredients: this.fb.array([], Validators.required),
      steps: this.fb.array([], Validators.required),
    });
  }

  patchForm(recipe: Recipe) {
    this.form.patchValue({
      title: recipe.title,
      description: recipe.description,
      preparation_time: recipe.preparation_time,
      servings: recipe.servings,
      sourceName: recipe.source?.name ?? '',
      sourceUrl: recipe.source?.url ?? '',
    });

    this.selectedCategoryNames = recipe.categories?.map(c => c.name.toLowerCase()) ?? [];

    recipe.ingredients?.forEach(ri => {
      this.ingredientsArray.push(this.fb.group({
        ingredientName: [ri.ingredient.name.toLowerCase(), Validators.required],
        quantity: [ri.quantity, [Validators.required, Validators.min(0.001)]],
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
      // Show existing image if any
      const existing = s.mediaList && s.mediaList.length > 0 ? s.mediaList[0].url : null;
      this.stepImagePreviews.push(existing);
    });
  }

  get ingredientsArray(): FormArray { return this.form.get('ingredients') as FormArray; }
  get stepsArray(): FormArray { return this.form.get('steps') as FormArray; }
  asGroup(ctrl: AbstractControl): FormGroup { return ctrl as FormGroup; }

  onCategoriesChange(names: string[]) { this.selectedCategoryNames = names; }

  addIngredient() {
    this.ingredientsArray.push(this.fb.group({
      ingredientName: ['', Validators.required],
      quantity: [null, [Validators.required, Validators.min(0.001)]],
      unit: ['g', Validators.required],
    }));
  }

  removeIngredient(i: number) { this.ingredientsArray.removeAt(i); }

  onIngredientNameChange(i: number, name: string) {
    this.ingredientsArray.at(i).get('ingredientName')?.setValue(name.toLowerCase());
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

    // Local preview
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

  async submit() {
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

      const ingredients = this.ingredientsArray.controls.map((ctrl, i) => ({
        ingredientId: resolvedIngredientIds[i],
        quantity: ctrl.get('quantity')?.value,
        unit: ctrl.get('unit')?.value,
      }));

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

      const dto = {
        title: this.form.get('title')?.value,
        description: this.form.get('description')?.value,
        preparation_time: this.form.get('preparation_time')?.value,
        servings: this.form.get('servings')?.value,
        sourceName: this.form.get('sourceName')?.value || null,
        sourceUrl: this.form.get('sourceUrl')?.value || null,
        categoryIds,
        ingredients,
        steps,
      };

      const obs = this.isEdit && this.recipeId
        ? this.recipeService.update(this.recipeId, dto)
        : this.recipeService.create(dto);

      obs.subscribe({
        next: async (savedRecipe) => {
          // Upload slika za korake nakon što su koraci dobili ID-eve
          await this.uploadStepImages(savedRecipe);
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

    console.log('Saved steps:', sortedSteps);
    console.log('Image files:', this.stepImageFiles);

    for (let i = 0; i < this.stepImageFiles.length; i++) {
      const file = this.stepImageFiles[i];
      const step = sortedSteps[i];

      console.log(`Korak ${i + 1}: stepId=${step?.id}, file=${file?.name}`);

      if (file && step) {
        try {
          const result = await this.mediaService.upload(file, step.id).toPromise();
          console.log(`Upload uspješan za korak ${i + 1}:`, result);
        } catch (err: any) {
          console.error(`Greška pri uploadu slike za korak ${i + 1}:`, err);
          console.error('Status:', err?.status);
          console.error('Error body:', err?.error);
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
        const created = await this.ingredientService.create({ name: lower }).toPromise();
        if (created) {
          this.allIngredients.push(created);
          this.ingredientNames.push(lower);
          ids.push(created.id);
        }
      }
    }
    return ids;
  }

  fieldInvalid(name: string): boolean {
    const c = this.form.get(name);
    return !!(c?.invalid && c?.touched);
  }
}