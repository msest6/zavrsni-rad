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

    // Vrati na original
    if (selectedSymbol === state.originalUnit.symbol) {
      state.displayQuantity = state.originalQuantity;
      state.displayUnit = state.originalUnit;
      return;
    }

    // Uvijek traži konverziju iz ORIGINALNE jedinice
    const conversion = state.conversions.find(c => c.toUnit.symbol === selectedSymbol);
    if (!conversion) return;

    state.displayQuantity = Math.round(state.originalQuantity * conversion.ratio * 10000) / 10000;
    state.displayUnit = conversion.toUnit;
    // Nema novog fetcha – konverzije ostaju iste (sve iz originalne jedinice)
  }

  getState(idx: number): IngredientDisplayState | undefined {
    return this.ingredientStates.get(idx);
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
}