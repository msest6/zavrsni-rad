import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    FormsModule, ReactiveFormsModule, FormBuilder, FormGroup,
    Validators, AbstractControl, ValidationErrors
} from '@angular/forms';
import {
    UnitConversionService,
    UnitConversionDto,
    UnitConversionCreateDto,
    UnitDto,
    IngredientDto,
} from '../../services/unit-conversion.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parsira "1/2", "0,5" ili "0.5" → number. Vraća NaN ako ne može. */
function parseRatio(raw: string): number {
    if (!raw) return NaN;
    const s = raw.trim().replace(',', '.');
    if (s.includes('/')) {
        const [num, den] = s.split('/').map(Number);
        if (!den) return NaN;
        return num / den;
    }
    return parseFloat(s);
}

function gcd(a: number, b: number): number {
    a = Math.abs(a); b = Math.abs(b);
    while (b > 0.0001) { [a, b] = [b, a % b]; }
    return a;
}

/** Prikazuje double kao razlomak ako je "ljepše", inače kao decimal. */
export function toFraction(value: number, maxDen = 64): string {
    if (!isFinite(value) || value === 0) return String(value);

    const sign = value < 0 ? '-' : '';
    const abs = Math.abs(value);
    const whole = Math.floor(abs);
    const frac = abs - whole;

    if (frac < 0.0001) return sign + whole;

    let bestNum = 1, bestDen = 1, bestErr = Infinity;
    for (let d = 2; d <= maxDen; d++) {
        const n = Math.round(frac * d);
        const err = Math.abs(frac - n / d);
        if (err < bestErr) { bestErr = err; bestNum = n; bestDen = d; }
    }

    // prihvatamo razlomak samo ako je greška mala (< 0.0005)
    if (bestErr > 0.0005) {
        return sign + (whole ? `${whole} ${bestNum}/${bestDen}` : `${parseFloat(value.toFixed(4))}`);
    }

    const g = gcd(bestNum, bestDen);
    bestNum /= g; bestDen /= g;

    if (whole) return `${sign}${whole} ${bestNum}/${bestDen}`;
    return `${sign}${bestNum}/${bestDen}`;
}

// ── Validator ─────────────────────────────────────────────────────────────────

function ratioValidator(control: AbstractControl): ValidationErrors | null {
    const val = parseRatio(control.value ?? '');
    if (isNaN(val) || val <= 0) return { invalidRatio: true };
    return null;
}

// ─────────────────────────────────────────────────────────────────────────────

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

    // izloži helper templatu
    toFraction = toFraction;

    constructor(
        private service: UnitConversionService,
        private fb: FormBuilder,
        private cdr: ChangeDetectorRef,
        private zone: NgZone
    ) {}

    ngOnInit() {
        this.form = this.fb.group({
            fromUnitId:   [null, Validators.required],
            toUnitId:     [null, Validators.required],
            ratioRaw:     ['',   [Validators.required, ratioValidator]],
            ingredientId: [null],
        });

        this.service.getAllUnits().subscribe(u => (this.units = u));
        this.service.getAllIngredients().subscribe(i => (this.ingredients = i));

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
            fromUnitId:   conv.fromUnit?.id ?? null,
            toUnitId:     conv.toUnit?.id ?? null,
            ratioRaw:     toFraction(conv.ratio),   // prikaži kao razlomak pri uređivanju
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
            fromUnitId:   v.fromUnitId,
            toUnitId:     v.toUnitId,
            ratio:        parseRatio(v.ratioRaw),   // uvijek šaljemo broj backendu
            ingredientId: v.ingredientId || null,
        };
    }
}