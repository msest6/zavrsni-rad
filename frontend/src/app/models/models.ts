export interface Category {
  id: number;
  name: string;
}

export interface Unit {
  id: number;
  name: string;
  symbol: string;
  dimension: string;
}

export interface Ingredient {
  id: number;
  name: string;
  description?: string;
}

export interface Media {
  id: number;
  type: 'image' | 'video' | string;
  url: string;
  publicId?: string;
}

export interface RecipeIngredient {
  id: number;
  quantity: number;
  unit: Unit;
  ingredient: Ingredient;
}

export interface Step {
  id: number;
  stepNumber: number;
  description: string;
  ingredients?: Ingredient[];
  mediaList?: Media[];
}

export interface Recipe {
  id: number;
  title: string;
  description?: string;
  preparation_time?: number;
  servings: number;
  created_at?: string;
  updated_at?: string;
  is_synced?: boolean;
  is_deleted?: boolean;
  ingredients: RecipeIngredient[];
  steps: Step[];
  categories?: Category[];
  source_url?: string;
  cooking_time?: number;
  mediaList?: Media[];
}

// DTOs for requests
export interface RecipeDTO {
  title: string;
  description?: string;
  preparation_time?: number;
  cooking_time?: number;
  servings: number;
  steps: StepDTO[];
  ingredients: RecipeIngredientDTO[];
  categoryIds?: number[];
  source_url?: string;
  mediaList?: Media[];
}

export interface StepDTO {
  stepNumber: number;
  description: string;
  ingredientIds?: number[];
}

export interface RecipeIngredientDTO {
  ingredientId: number;
  quantity: number;
  unit: string;
}

export interface IngredientDTO {
  name: string;
  description?: string;
}

export interface CategoryDTO {
  name: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  last: boolean;
}
