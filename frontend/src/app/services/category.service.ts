import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Category, CategoryDTO } from '../models/models';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private url = '/api/categories';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Category[]> {
    return this.http.get<Category[]>(this.url);
  }

  getById(id: number): Observable<Category> {
    return this.http.get<Category>(`${this.url}/${id}`);
  }

  create(dto: CategoryDTO): Observable<Category> {
    return this.http.post<Category>(this.url, dto);
  }

  update(id: number, dto: CategoryDTO): Observable<Category> {
    return this.http.put<Category>(`${this.url}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
