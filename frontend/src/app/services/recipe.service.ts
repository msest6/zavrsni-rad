import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Recipe, RecipeDTO } from '../models/models';

@Injectable({ providedIn: 'root' })
export class RecipeService {
  private url = '/recipes';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Recipe[]> {
    return this.http.get<Recipe[]>(this.url);
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
