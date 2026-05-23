import { Injectable } from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import { Observable } from 'rxjs';
import { Media } from '../models/models';
import {environment} from "../../environments/environment";

@Injectable({ providedIn: 'root' })
export class MediaService {
  private url = `${environment.apiUrl}/media`;

  constructor(private http: HttpClient) {}

  upload(file: File, stepId: number): Observable<Media> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('stepId', stepId.toString());
    return this.http.post<Media>(`${this.url}/upload`, formData);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  uploadToRecipe(file: File, recipeId: number): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('recipeId', recipeId.toString());
    return this.http.post(`${this.url}/upload/recipe`, formData);
  }

  uploadToRecipeFromUrl(imageUrl: string, recipeId: number): Observable<any> {
    const query = `imageUrl=${encodeURIComponent(imageUrl)}&recipeId=${recipeId}`;
    return this.http.post<any>(
        `${this.url}/media/upload/recipe/from-url?${query}`,
        {}
    );
  }
}