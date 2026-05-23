import { Routes } from '@angular/router';
import { RecipeListComponent } from './components/recipe-list/recipe-list.component';
import { RecipeDetailComponent } from './components/recipe-detail/recipe-detail.component';
import { RecipeFormComponent } from './components/recipe-form/recipe-form.component';
import { IngredientListComponent } from './components/ingredient-list/ingredient-list.component';
import { CategoryListComponent } from './components/category-list/category-list.component';
import {UnitConversionListComponent} from "./components/unit-conversion-list/unit-conversion-list.component";

export const routes: Routes = [
  { path: '', redirectTo: 'recipes', pathMatch: 'full' },
  { path: 'recipes', component: RecipeListComponent },
  { path: 'recipes/new', component: RecipeFormComponent },
  { path: 'recipes/:id', component: RecipeDetailComponent },
  { path: 'recipes/:id/edit', component: RecipeFormComponent },
  { path: 'ingredients', component: IngredientListComponent },
  { path: 'categories', component: CategoryListComponent },
  { path: 'unit-conversions', component: UnitConversionListComponent },
];
