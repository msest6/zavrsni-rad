import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
    UnitConversionService,
    UnitConversionDto,
    UnitConversionCreateDto,
    UnitDto,
    IngredientDto,
} from '../../services/unit-conversion.service';

@Component({
    selector: 'app-unit-conversion-list',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './unit-conversion-list.component.html',
})
export class UnitConversionListComponent implements OnInit {
    conversions: UnitConversionDto[] = [];
    units: UnitDto[] = [];
    ingredients: IngredientDto[] = [];

    loading = true;
    editingId: number | null = null;
    showForm = false;
    form!: FormGroup;
    submitting = false;

    constructor(
        private service: UnitConversionService,
        private fb: FormBuilder,
        private cdr: ChangeDetectorRef,
        private zone: NgZone
    ) {}

    ngOnInit() {
        this.form = this.fb.group({
            fromUnitId: [null, Validators.required],
            toUnitId: [null, Validators.required],
            ratio: [null, [Validators.required, Validators.min(0.000001)]],
            ingredientId: [null],
        });

        this.service.getAllUnits().subscribe(units => (this.units = units));
        this.service.getAllIngredients().subscribe(ingredients => (this.ingredients = ingredients));

        this.service.getAll().subscribe(data => {
            this.zone.run(() => {
                this.conversions = data;
                this.loading = false;
                this.cdr.detectChanges();
            });
        });
    }

    getUnitLabel(unit: UnitDto | null | undefined): string {
        if (!unit) return '—';
        return unit.name ? `${unit.name} (${unit.symbol})` : unit.symbol;
    }

    getIngredientLabel(ingredient: IngredientDto | null | undefined): string {
        return ingredient ? ingredient.name : 'Generička';
    }

    openCreate() {
        this.showForm = true;
        this.editingId = null;
        this.form.reset();
    }

    startEdit(conv: UnitConversionDto) {
        this.editingId = conv.id;
        this.showForm = false;
        this.form.patchValue({
            fromUnitId: conv.fromUnit?.id ?? null,
            toUnitId: conv.toUnit?.id ?? null,
            ratio: conv.ratio,
            ingredientId: conv.ingredient?.id ?? null,
        });
    }

    cancelEdit() {
        this.editingId = null;
        this.form.reset();
    }

    create() {
        if (this.form.invalid) return;
        this.submitting = true;
        this.service.create(this.buildDTO()).subscribe({
            next: (conv) => {
                this.zone.run(() => {
                    this.conversions.push(conv);
                    this.showForm = false;
                    this.form.reset();
                    this.submitting = false;
                    this.cdr.detectChanges();
                });
            },
            error: () => (this.submitting = false),
        });
    }

    save(id: number) {
        if (this.form.invalid) return;
        this.submitting = true;
        this.service.update(id, this.buildDTO()).subscribe({
            next: (updated) => {
                this.zone.run(() => {
                    const idx = this.conversions.findIndex(c => c.id === id);
                    if (idx > -1) this.conversions[idx] = updated;
                    this.editingId = null;
                    this.submitting = false;
                    this.cdr.detectChanges();
                });
            },
            error: () => (this.submitting = false),
        });
    }

    delete(id: number) {
        if (!confirm('Obrisati ovu konverziju?')) return;
        this.service.delete(id).subscribe(() => {
            this.conversions = this.conversions.filter(c => c.id !== id);
        });
    }

    private buildDTO(): UnitConversionCreateDto {
        const v = this.form.value;
        return {
            fromUnitId: v.fromUnitId,
            toUnitId: v.toUnitId,
            ratio: v.ratio,
            ingredientId: v.ingredientId || null,
        };
    }
}