import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Unit } from '../models/models';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class UnitService {
    private url = `${environment.apiUrl}/units`;

    constructor(private http: HttpClient) {}

    getAll(): Observable<Unit[]> {
        return this.http.get<Unit[]>(this.url);
    }
}