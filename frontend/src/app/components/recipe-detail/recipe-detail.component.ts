import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RecipeService } from '../../services/recipe.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { UnitConversionService, UnitConversionDto } from '../../services/unit-conversion.service';
import { Recipe } from '../../models/models';
import { UnitService } from '../../services/unit.service';

interface IngredientDisplayState {
  // Originalne vrijednosti – nikad se ne mijenjaju
  originalQuantity: number;
  originalUnit: { id: number; name: string; symbol: string };
  // Trenutni prikaz
  displayQuantity: number;
  displayUnit: { id: number; name: string; symbol: string };
  // Konverzije su uvijek iz ORIGINALNE jedinice
  conversions: UnitConversionDto[];
  loadingConversions: boolean;
}

@Component({
  selector: 'app-recipe-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './recipe-detail.component.html',
})
export class RecipeDetailComponent implements OnInit {
  recipe: Recipe | null = null;
  loading = true;
  error = '';

  // Mapa: index sastojka → trenutno stanje prikaza
  ingredientStates: Map<number, IngredientDisplayState> = new Map();

  // ── Skaliranje porcija ────────────────────────────────────────────────────
  /** Originalni broj porcija iz recepta – nikad se ne mijenja */
  originalServings = 1;
  /** Trenutni korisnički unos porcija */
  customServings = 1;

  /** Oznaka za mjernu jedinicu koja se ne skalira ispod 1x */
  readonly PINCH_SYMBOL = 'prst';

  // ── NOVO: kontrola vidljivosti import modala ───────────────────────────────
  showImportModal = false;

  // ── Mjerne jedinice — hardkodirani redoslijed ──────────────────────────────
  readonly UNITS: string[] = [
    'g', 'dag', 'kg',
    'ml', 'dcl', 'l',
    'ž', 'žč', 'š',
    'kom', 'prst', 'pak', 'koc', 'rež', 'list'
  ];

  // Redoslijed mora odgovarati UNITS; imena se popunjavaju iz baze
  unitSymbolNames: { symbol: string; name: string }[] = [];

  // ── Tablica konverzija — hardkodirana ─────────────────────────────────────
  readonly CONVERSIONS: { from: string; to: string }[] = [
    { from: '1000 g',  to: '1 kg'  },
    { from: '10 g',    to: '1 dag' },
    { from: '1000 ml', to: '1 l'   },
    { from: '10 dcl',  to: '1 l'   },
    { from: '1 ž',     to: '15 ml' },
    { from: '1 ž',     to: '3 žč'  },
    { from: '1 š',     to: '240 ml'},
  ];

  // Prikaz tablice konverzija (može se togglati)
  showUnitTables = false;

  constructor(
      private route: ActivatedRoute,
      private router: Router,
      private recipeService: RecipeService,
      private cdr: ChangeDetectorRef,
      private zone: NgZone,
      private pdfExportService: PdfExportService,
      private unitConversionService: UnitConversionService,
      private unitService: UnitService
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    setTimeout(() => {
      this.recipeService.getById(id).subscribe({
        next: (r) => {
          this.zone.run(() => {
            this.recipe = r;
            this.loading = false;

            // Spremi originalni broj porcija i postavi customServings na isti
            this.originalServings = r.servings ?? 1;
            this.customServings = this.originalServings;

            r.ingredients?.forEach((ri, idx) => {
              this.ingredientStates.set(idx, {
                originalQuantity: ri.quantity,
                originalUnit: ri.unit,
                displayQuantity: ri.quantity,
                displayUnit: ri.unit,
                conversions: [],
                loadingConversions: false,
              });
              // Fetch samo jednom – iz originalne jedinice
              this.loadConversions(idx, ri.unit.id, ri.ingredient.id);
            });
            this.cdr.detectChanges();
          });
          this.unitService.getAll().subscribe(units => {
            this.unitSymbolNames = this.UNITS.map(symbol => {
              const found = units.find((u: any) => u.symbol === symbol);
              return {symbol, name: found?.name ?? symbol};
            });
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.error = 'Recept nije pronađen.';
            this.loading = false;
            this.cdr.detectChanges();
          });
        }
      });
    }, 500);
  }

  /** Dohvaća konverzije za sastojak (generičke + specifične) */
  loadConversions(idx: number, fromUnitId: number, ingredientId: number) {
    const state = this.ingredientStates.get(idx)!;
    state.loadingConversions = true;
    this.unitConversionService.getConversions(fromUnitId, ingredientId).subscribe({
      next: (conversions) => {
        this.zone.run(() => {
          state.conversions = conversions;
          state.loadingConversions = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.zone.run(() => {
          state.loadingConversions = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  /** Poziva se kada korisnik odabere novu mjernu jedinicu */
  onUnitChange(idx: number, selectedSymbol: string) {
    const state = this.ingredientStates.get(idx)!;
    const multiplier = this.servingsMultiplier;

    // Vrati na original (uz skaliranje)
    if (selectedSymbol === state.originalUnit.symbol) {
      state.displayQuantity = this.scaleQuantity(state.originalQuantity, multiplier, state.originalUnit.symbol);
      state.displayUnit = state.originalUnit;
      return;
    }

    // Uvijek traži konverziju iz ORIGINALNE jedinice
    const conversion = state.conversions.find(c => c.toUnit.symbol === selectedSymbol);
    if (!conversion) return;

    const scaledOriginal = state.originalQuantity * multiplier;
    state.displayQuantity = Math.round(scaledOriginal * conversion.ratio * 10000) / 10000;
    state.displayUnit = conversion.toUnit;
  }

  getState(idx: number): IngredientDisplayState | undefined {
    return this.ingredientStates.get(idx);
  }

  // ── Skaliranje porcija ────────────────────────────────────────────────────

  /** Omjer skaliranja na temelju korisnikova unosa */
  get servingsMultiplier(): number {
    if (!this.originalServings || this.originalServings === 0) return 1;
    return this.customServings / this.originalServings;
  }

  /**
   * Vraća skaliranu količinu za prikaz.
   * Ako je jedinica "prst" i faktor < 1, vraća null (ne prikazuje se skaliranje).
   */
  scaledQuantity(idx: number): number | null {
    const state = this.ingredientStates.get(idx);
    if (!state) return null;

    const multiplier = this.servingsMultiplier;
    const symbol = state.displayUnit.symbol;

    // Prstohvat se ne skalira ispod 1x
    if (symbol === this.PINCH_SYMBOL && multiplier < 1) {
      return null;
    }

    // Ako je odabrana ne-originalna jedinica, konvertiraj iz originalnog pa skaliraj
    if (state.displayUnit.symbol !== state.originalUnit.symbol) {
      const conversion = state.conversions.find(c => c.toUnit.symbol === state.displayUnit.symbol);
      if (conversion) {
        return Math.round(state.originalQuantity * multiplier * conversion.ratio * 10000) / 10000;
      }
    }

    return this.scaleQuantity(state.originalQuantity, multiplier, symbol);
  }

  /**
   * Provjerava treba li prikazati napomenu za prstohvat
   * (originalna jedinica je prst, a množimo s < 1)
   */
  isPinchSkipped(idx: number): boolean {
    const state = this.ingredientStates.get(idx);
    if (!state) return false;
    return state.displayUnit.symbol === this.PINCH_SYMBOL && this.servingsMultiplier < 1;
  }

  /** Skalira količinu i zaokružuje */
  private scaleQuantity(original: number, multiplier: number, _unitSymbol: string): number {
    return Math.round(original * multiplier * 10000) / 10000;
  }

  /**
   * Validacija unosa porcija – dozvoljeni su samo prirodni brojevi (≥ 1).
   * Poziva se na svaku promjenu u inputu.
   */
  onServingsInput(event: Event) {
    const input = event.target as HTMLInputElement;
    // Ukloni sve što nije znamenka
    let raw = input.value.replace(/[^0-9]/g, '');
    // Ukloni vodeće nule
    raw = raw.replace(/^0+/, '') || '';

    const parsed = parseInt(raw, 10);

    if (!raw || isNaN(parsed) || parsed < 1) {
      // Ostavi prazan string dok korisnik tipka, ali multiplier koristimo 1
      this.customServings = this.originalServings; // fallback za računanje
      input.value = raw; // prikaz (može biti '')
    } else {
      this.customServings = parsed;
      input.value = String(parsed);
    }
    this.cdr.detectChanges();
  }

  /**
   * Kad korisnik napusti polje (blur) i ono je prazno, resetiraj na original
   */
  onServingsBlur(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.value || parseInt(input.value, 10) < 1) {
      this.customServings = this.originalServings;
      input.value = String(this.originalServings);
      this.cdr.detectChanges();
    }
  }

  /** Resetiraj porcije na original */
  resetServings() {
    this.customServings = this.originalServings;
  }

  delete() {
    if (!this.recipe) return;
    if (confirm('Obrisati ovaj recept?')) {
      this.recipeService.delete(this.recipe.id).subscribe(() => {
        this.router.navigate(['/recipes']);
      });
    }
  }

  sortedSteps() {
    return this.recipe?.steps
        ? [...this.recipe.steps].sort((a, b) => a.stepNumber - b.stepNumber)
        : [];
  }

  exportPdf() {
    if (this.recipe) {
      this.pdfExportService.exportRecipe(this.recipe);
    }
  }

  /** Pretvara decimalni broj u razlomak (ako postoji), inače zaokružuje na 3 decimale */
  formatQuantity(value: number): string {
    // Poznati razlomci – od najpreciznijeg prema manje preciznom
    const fractions: { decimal: number; label: string }[] = [
      { decimal: 1/8,  label: '⅛' },
      { decimal: 1/4,  label: '¼' },
      { decimal: 1/3,  label: '⅓' },
      { decimal: 3/8,  label: '⅜' },
      { decimal: 1/2,  label: '½' },
      { decimal: 5/8,  label: '⅝' },
      { decimal: 2/3,  label: '⅔' },
      { decimal: 3/4,  label: '¾' },
      { decimal: 7/8,  label: '⅞' },
    ];

    const tolerance = 0.005;
    const whole = Math.floor(value);
    const remainder = value - whole;

    if (remainder < tolerance) {
      return whole.toString();
    }

    const match = fractions.find(f => Math.abs(f.decimal - remainder) < tolerance);

    if (match) {
      return whole > 0 ? `${whole} ${match.label}` : match.label;
    }

    // Fallback: zaokruži na 3 decimale, ukloni nepotrebne nule
    return parseFloat(value.toFixed(3)).toString();
  }

  protected readonly String = String;
  decrementServings() {
    if (this.customServings > 1) {
      this.customServings -= 1;
      this.cdr.detectChanges();
    }
  }
}