import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Ingredient, IngredientDTO } from '../models/models';

@Injectable({ providedIn: 'root' })
export class IngredientService {
  private url = '/api/ingredients';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Ingredient[]> {
    return this.http.get<Ingredient[]>(this.url);
  }

  getById(id: number): Observable<Ingredient> {
    return this.http.get<Ingredient>(`${this.url}/${id}`);
  }

  create(dto: IngredientDTO): Observable<Ingredient> {
    return this.http.post<Ingredient>(this.url, dto);
  }

  update(id: number, dto: IngredientDTO): Observable<Ingredient> {
    return this.http.put<Ingredient>(`${this.url}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
