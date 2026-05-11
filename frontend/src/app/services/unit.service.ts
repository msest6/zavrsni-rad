import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Unit } from '../models/models';

@Injectable({ providedIn: 'root' })
export class UnitService {
    private url = '/api/units';

    constructor(private http: HttpClient) {}

    getAll(): Observable<Unit[]> {
        return this.http.get<Unit[]>(this.url);
    }
}