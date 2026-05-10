import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {Page, Recipe, RecipeDTO} from '../models/models';

@Injectable({ providedIn: 'root' })
export class RecipeService {
  private url = '/recipes';

  constructor(private http: HttpClient) {}

  getAll(page = 0, size = 20): Observable<Page<Recipe>> {
    return this.http.get<Page<Recipe>>(
        `${this.url}?page=${page}&size=${size}`
    );
  }

  getByCategories(categoryIds: number[], page = 0, size = 20): Observable<Page<Recipe>> {
    const params = categoryIds.map(id => `categoryIds=${id}`).join('&');
    return this.http.get<Page<Recipe>>(
        `${this.url}/by-categories?${params}&page=${page}&size=${size}`
    );
  }

  getById(id: number): Observable<Recipe> {
    return this.http.get<Recipe>(`${this.url}/${id}`);
  }

  create(dto: RecipeDTO): Observable<Recipe> {
    return this.http.post<Recipe>(this.url, dto);
  }

  update(id: number, dto: RecipeDTO): Observable<Recipe> {
    return this.http.put<Recipe>(`${this.url}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
