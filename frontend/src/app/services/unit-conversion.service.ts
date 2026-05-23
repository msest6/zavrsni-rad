import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface UnitDto {
    id: number;
    name: string;
    symbol: string;
}

export interface IngredientDto {
    id: number;
    name: string;
}

export interface UnitConversionDto {
    id: number;
    fromUnit: UnitDto;
    toUnit: UnitDto;
    ratio: number;
    ingredient?: IngredientDto | null;
}

export interface UnitConversionCreateDto {
    fromUnitId: number;
    toUnitId: number;
    ratio: number;
    ingredientId?: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class UnitConversionService {
    private base = `${environment.apiUrl}/unit-conversions`;
    private unitsUrl = `${environment.apiUrl}/units`;
    private ingredientsUrl = `${environment.apiUrl}/ingredients`;

    constructor(private http: HttpClient) {}

    // ── Stara metoda — koristi se pri odabiru jedinice u receptu ──────────────

    getConversions(fromUnitId: number, ingredientId?: number): Observable<UnitConversionDto[]> {
        let url = `${this.base}?fromUnitId=${fromUnitId}`;
        if (ingredientId != null) url += `&ingredientId=${ingredientId}`;
        return this.http.get<UnitConversionDto[]>(url);
    }

    // ── CRUD za stranicu upravljanja konverzijama ─────────────────────────────

    getAll(): Observable<UnitConversionDto[]> {
        return this.http.get<UnitConversionDto[]>(this.base);
    }

    getById(id: number): Observable<UnitConversionDto> {
        return this.http.get<UnitConversionDto>(`${this.base}/${id}`);
    }

    create(dto: UnitConversionCreateDto): Observable<UnitConversionDto> {
        return this.http.post<UnitConversionDto>(this.base, dto);
    }

    update(id: number, dto: UnitConversionCreateDto): Observable<UnitConversionDto> {
        return this.http.put<UnitConversionDto>(`${this.base}/${id}`, dto);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.base}/${id}`);
    }

    // ── Pomoćne metode ────────────────────────────────────────────────────────

    getAllUnits(): Observable<UnitDto[]> {
        return this.http.get<UnitDto[]>(this.unitsUrl);
    }

    getAllIngredients(): Observable<IngredientDto[]> {
        return this.http.get<IngredientDto[]>(this.ingredientsUrl);
    }
}