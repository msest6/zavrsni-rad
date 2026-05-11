import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UnitConversionDto {
    id: number;
    fromUnit: { id: number; name: string; symbol: string };
    toUnit:   { id: number; name: string; symbol: string };
    ratio: number;
}

@Injectable({ providedIn: 'root' })
export class UnitConversionService {
    private base = '/api/unit-conversions';

    constructor(private http: HttpClient) {}

    getConversions(fromUnitId: number, ingredientId?: number): Observable<UnitConversionDto[]> {
        let url = `${this.base}?fromUnitId=${fromUnitId}`;
        if (ingredientId != null) url += `&ingredientId=${ingredientId}`;
        return this.http.get<UnitConversionDto[]>(url);
    }
}