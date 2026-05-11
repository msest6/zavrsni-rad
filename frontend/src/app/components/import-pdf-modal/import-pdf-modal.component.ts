import {
    Component,
    EventEmitter,
    Output,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ImportedRecipe } from '../../services/import.service';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/pdf.worker.min.mjs';

// ── Mjerne jedinice — isti map kao u import.service.ts ────────────────────────
const UNIT_MAP: Record<string, string> = {
    'g': 'g', 'gram': 'g', 'grams': 'g',
    'dag': 'dag', 'dkg': 'dag',
    'kg': 'kg', 'kilogram': 'kg', 'kilograms': 'kg',
    'ml': 'ml', 'milliliter': 'ml', 'milliliters': 'ml', 'millilitre': 'ml',
    'dl': 'dcl', 'dcl': 'dcl', 'deciliter': 'dcl',
    'l': 'l', 'liter': 'l', 'liters': 'l', 'litre': 'l', 'litres': 'l',
    'tsp': 'žč', 'teaspoon': 'žč', 'teaspoons': 'žč',
    'tbsp': 'ž',  'tablespoon': 'ž',  'tablespoons': 'ž',
    'cup': 'š', 'cups': 'š',
    'oz': 'g',   // aproksimacija
    'lb': 'kg',  // aproksimacija
    'piece': 'kom', 'pieces': 'kom', 'pcs': 'kom',
    'clove': 'rež', 'cloves': 'rež',
    'sprig': 'kom', 'sprigs': 'kom',
    'pinch': 'prst', 'pinches': 'prst',
    'package': 'pak', 'packages': 'pak', 'packet': 'pak',
    'slice': 'kom', 'slices': 'kom',
    'leaf': 'list', 'leaves': 'list',
};

const VALID_UNITS = [
    'g','dag','kg','ml','dcl','l','ž','žč','š','kom','prst','pak','koc','rež','list'
];

function normalizeUnit(raw: string): string {
    const t = raw.trim().toLowerCase();
    if (UNIT_MAP[t]) return UNIT_MAP[t];
    if (VALID_UNITS.includes(t)) return t;
    return 'kom';
}

/**
 * Parsira minute iz teksta poput "30m", "1h 30m", "20 minutes"
 */
function parseMinutes(text: string): number | null {
    if (!text) return null;
    const t = text.toLowerCase().trim();
    let total = 0;
    const h = t.match(/(\d+)\s*h/);
    const m = t.match(/(\d+)\s*m/);
    if (h) total += parseInt(h[1]) * 60;
    if (m) total += parseInt(m[1]);
    return total > 0 ? total : null;
}

/**
 * Parsira jedan redak sastojka.
 * Primjeri: "4 medium eggplants", "1/4 cup tahini", "2 tablespoons lemon juice"
 */
function parseIngredientLine(line: string): { name: string; quantity: string; unit: string } {
    const s = line.trim();

    // Razlomak + jedinica + naziv: "1/4 cup tahini"
    const fracUnit = s.match(/^(\d+\/\d+)\s+([a-zA-Zž]+\.?)\s+(.+)$/i);
    if (fracUnit) {
        const unit = normalizeUnit(fracUnit[2]);
        if (unit !== 'kom' || UNIT_MAP[fracUnit[2].toLowerCase()]) {
            return { quantity: fracUnit[1], unit, name: fracUnit[3].toLowerCase() };
        }
    }

    // Broj + jedinica + naziv: "4 tablespoons lemon juice", "200 g flour"
    const numUnit = s.match(/^([\d.,\/]+)\s+([a-zA-Zž]+\.?)\s+(.+)$/i);
    if (numUnit) {
        const maybeUnit = numUnit[2].toLowerCase().replace(/\.$/, '');
        const unit = UNIT_MAP[maybeUnit];
        if (unit) {
            return { quantity: numUnit[1], unit, name: numUnit[3].toLowerCase() };
        }
    }

    // Razlomak + naziv (bez jedinice): "1/4 fresh basil"
    const fracOnly = s.match(/^(\d+\/\d+)\s+(.+)$/);
    if (fracOnly) {
        return { quantity: fracOnly[1], unit: 'kom', name: fracOnly[2].toLowerCase() };
    }

    // Broj + naziv (bez jedinice): "4 medium eggplants"
    const numOnly = s.match(/^([\d.,]+)\s+(.+)$/);
    if (numOnly) {
        return { quantity: numOnly[1], unit: 'kom', name: numOnly[2].toLowerCase() };
    }

    return { name: s.toLowerCase(), quantity: '1', unit: 'kom' };
}

/**
 * Glavni parser — prima sav tekst izvučen iz PDF-a i vraća ImportedRecipe.
 *
 * Strategija: traži ključne odjeljke ("Ingredients", "Directions", metapodatke)
 * i parsira ih redak po redak.
 */
function parsePdfText(rawText: string, fileName: string): ImportedRecipe {
    const lines = rawText
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);

    // ── Naslov: prva neprazna linija koja nije URL ni datum ──────────────────
    const title = lines.find(l =>
        !l.startsWith('http') &&
        !l.match(/^\d{2}\/\d{2}\/\d{4}/) &&
        l.length > 2
    ) ?? fileName.replace(/\.pdf$/i, '');

    // ── Kategorije: redovi neposredno iza naslova (npr. "Other, Side") ───────
    const categories: string[] = [];
    const titleIdx = lines.indexOf(title);
    if (titleIdx >= 0 && titleIdx + 1 < lines.length) {
        const catLine = lines[titleIdx + 1];
        // Kategorijalinija ne smije biti URL ili broj
        if (!catLine.startsWith('http') && !catLine.match(/^\d/)) {
            catLine.split(',').forEach(c => {
                const t = c.trim().toLowerCase();
                if (t && t.length < 40) categories.push(t);
            });
        }
    }

    // ── Opis: redak koji počinje s " ili koji je dugačak opis ─────────────────
    let description = '';
    const descLine = lines.find(l =>
        (l.startsWith('"') || l.startsWith('"')) &&
        l.length > 20
    );
    if (descLine) {
        description = descLine.replace(/^[""]|[""]$/g, '').trim();
    }

    // ── Metapodaci: Preparation time / Cooking time / Yield ──────────────────
    let preparation_time: number | null = null;
    let cooking_time: number | null = null;
    let servings: number | null = null;

    for (let i = 0; i < lines.length; i++) {
        const l = lines[i].toLowerCase();

        if (l.includes('preparation time') || l.includes('prep time')) {
            // Vrijednost može biti isti redak ili sljedeći
            const val = lines[i].replace(/preparation time|prep time/i, '').trim()
                || lines[i + 1] || '';
            preparation_time = parseMinutes(val);
        }

        if (l.includes('cooking time') || l.includes('cook time')) {
            const val = lines[i].replace(/cooking time|cook time/i, '').trim()
                || lines[i + 1] || '';
            cooking_time = parseMinutes(val);
        }

        if (l === 'yield' || l.startsWith('yield')) {
            const val = lines[i].replace(/yield/i, '').trim() || lines[i + 1] || '';
            const m = val.match(/\d+/);
            if (m) servings = parseInt(m[0]);
        }

        // Alternativni format: "Preparation time\n20m" (sljedeći redak je vrijednost)
        if (l === 'preparation time' && lines[i + 1]) {
            preparation_time = parseMinutes(lines[i + 1]);
        }
        if ((l === 'cooking time') && lines[i + 1]) {
            cooking_time = parseMinutes(lines[i + 1]);
        }
        if (l === 'yield' && lines[i + 1]) {
            const m = lines[i + 1].match(/\d+/);
            if (m) servings = parseInt(m[0]);
        }
    }

    // ── Odjeljci: Ingredients i Directions ───────────────────────────────────
    const ingredientsIdx = lines.findIndex(l =>
        /^ingredients$/i.test(l)
    );
    const directionsIdx = lines.findIndex(l =>
        /^directions$|^steps$|^method$/i.test(l)
    );
    const sourcesIdx = lines.findIndex(l =>
        /^sources?$/i.test(l)
    );

    // ── Sastojci ──────────────────────────────────────────────────────────────
    const ingredients: ImportedRecipe['ingredients'] = [];
    if (ingredientsIdx >= 0) {
        const end = directionsIdx > ingredientsIdx ? directionsIdx : lines.length;
        for (let i = ingredientsIdx + 1; i < end; i++) {
            const l = lines[i];
            // Preskoči prazne retke, URL-ove, metapodatke
            if (!l || l.startsWith('http') || /^(preparation|cooking|total|yield)/i.test(l)) continue;
            // Preskoči retke koji izgledaju kao naslovi odjeljaka
            if (/^(directions|steps|method|sources?|nutrition)/i.test(l)) break;
            ingredients.push(parseIngredientLine(l));
        }
    }

    // ── Koraci (Directions) ───────────────────────────────────────────────────
    const steps: ImportedRecipe['steps'] = [];
    if (directionsIdx >= 0) {
        const end = sourcesIdx > directionsIdx ? sourcesIdx : lines.length;
        let stepNum = 1;
        // Koraci mogu biti numerirani (1, 2, 3...) ili plain tekst
        for (let i = directionsIdx + 1; i < end; i++) {
            const l = lines[i];
            if (!l || l.startsWith('http') || /^\d{2}\/\d{2}\/\d{4}/.test(l)) continue;
            if (/^(sources?|nutrition)/i.test(l)) break;

            // Preskoči same redne brojeve "1", "2" koji se pojavljuju odvojeno
            if (/^\d+$/.test(l)) continue;

            // Ukloni vodeći broj ako postoji: "1 Preheat oven..."
            const cleaned = l.replace(/^\d+[\.\)]\s*/, '').trim();
            if (cleaned.length > 5) {
                steps.push({ stepNumber: stepNum++, description: cleaned });
            }
        }
    }

    return {
        title,
        description,
        preparation_time,
        cooking_time,
        servings,
        source_url: '',
        categories,
        ingredients,
        steps,
    };
}

@Component({
    selector: 'app-import-pdf-modal',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule],
    template: `
<div class="modal-backdrop" (click)="onBackdropClick($event)">
  <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="modal-pdf-title">

    <!-- Header -->
    <div class="modal-header">
      <div class="modal-title-row">
        <span class="modal-icon">&#x1F4C4;</span>
        <h2 id="modal-pdf-title">Uvezi recept iz PDF-a</h2>
      </div>
      <button class="modal-close-btn" type="button" (click)="close()" aria-label="Zatvori">
        &#x2715;
      </button>
    </div>

    <!-- Upload zona -->
    <div
      class="pdf-drop-zone"
      [class.pdf-drop-zone--active]="dragging"
      [class.pdf-drop-zone--has-file]="!!selectedFile"
      (dragover)="onDragOver($event)"
      (dragleave)="dragging = false"
      (drop)="onDrop($event)"
      (click)="fileInput.click()"
    >
      <input
        #fileInput
        type="file"
        accept="application/pdf"
        hidden
        (change)="onFileSelected($event)"
      />
      <ng-container *ngIf="!selectedFile">
        <span class="drop-icon">&#x1F4C2;</span>
        <span class="drop-label">Kliknite ili povucite PDF ovdje</span>
        <span class="drop-hint">Podržani format: PDF recepta</span>
      </ng-container>
      <ng-container *ngIf="selectedFile">
        <span class="drop-icon">&#x2705;</span>
        <span class="drop-label">{{ selectedFile.name }}</span>
        <span class="drop-hint">{{ (selectedFile.size / 1024).toFixed(0) }} KB — kliknite za zamjenu</span>
      </ng-container>
    </div>

    <span class="field-error" *ngIf="error">{{ error }}</span>

    <!-- Učitavanje -->
    <div class="modal-loading" *ngIf="loading">
      <div class="spinner-sm"></div>
      <span>Čitam PDF...</span>
    </div>

    <!-- Footer -->
    <div class="modal-footer">
      <button type="button" class="btn btn-outline" (click)="close()" [disabled]="loading">
        Odustani
      </button>
      <button
        type="button"
        class="btn btn-primary"
        (click)="importPdf()"
        [disabled]="loading || !selectedFile"
      >
        {{ loading ? 'Obrada...' : 'Uvezi recept' }}
      </button>
    </div>

  </div>
</div>
  `,
    styles: [`
    .pdf-drop-zone {
      border: 2px dashed var(--border-color, #d1d5db);
      border-radius: 8px;
      padding: 2rem;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
      margin: 1rem 0;
    }
    .pdf-drop-zone--active {
        border-color: var(--green);
        background: var(--green-light);
    }
    .pdf-drop-zone--has-file {
        border-color: var(--green);
        border-style: solid;
    }
    .drop-icon { font-size: 2rem; }
    .drop-label { font-weight: 600; font-size: 0.95rem; }
    .drop-hint  { font-size: 0.8rem; color: var(--text-muted, #6b7280); }
  `],
})
export class ImportPdfModalComponent {
    @Output() imported = new EventEmitter<ImportedRecipe>();
    @Output() closed   = new EventEmitter<void>();

    selectedFile: File | null = null;
    dragging = false;
    loading  = false;
    error    = '';

    constructor(private cdr: ChangeDetectorRef) {}

    close() { this.closed.emit(); }

    onBackdropClick(e: MouseEvent) {
        if ((e.target as HTMLElement).classList.contains('modal-backdrop')) this.close();
    }

    onDragOver(e: DragEvent) {
        e.preventDefault();
        this.dragging = true;
    }

    onDrop(e: DragEvent) {
        e.preventDefault();
        this.dragging = false;
        const file = e.dataTransfer?.files?.[0];
        if (file?.type === 'application/pdf') {
            this.selectedFile = file;
            this.error = '';
            this.cdr.detectChanges();
        } else {
            this.error = 'Molimo odaberite PDF datoteku.';
        }
    }

    onFileSelected(e: Event) {
        const input = e.target as HTMLInputElement;
        const file = input.files?.[0];
        if (file) {
            this.selectedFile = file;
            this.error = '';
            this.cdr.detectChanges();
        }
    }

    async importPdf() {
        if (!this.selectedFile) return;
        this.loading = true;
        this.error   = '';
        this.cdr.detectChanges();

        try {
            const text = await this.extractTextFromPdf(this.selectedFile);
            const recipe = parsePdfText(text, this.selectedFile.name);

            if (!recipe.title || (recipe.ingredients.length === 0 && recipe.steps.length === 0)) {
                this.error = 'Nije moguće prepoznati strukturu recepta u ovom PDF-u.';
                this.loading = false;
                this.cdr.detectChanges();
                return;
            }

            this.loading = false;
            this.cdr.detectChanges();
            this.imported.emit(recipe);
        } catch (err: any) {
            this.error = 'Greška pri čitanju PDF-a. Provjerite je li datoteka ispravna.';
            this.loading = false;
            this.cdr.detectChanges();
        }
    }

    /**
     * Čita sve stranice PDF-a pomoću pdf.js i vraća spojeni tekst.
     * pdf.js mora biti dostupan kao globalni skript (window.pdfjsLib).
     */
    private async extractTextFromPdf(file: File): Promise<string> {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pageTexts: string[] = [];
        for (let p = 1; p <= pdf.numPages; p++) {
            const page = await pdf.getPage(p);
            const content = await page.getTextContent();
            // Spajamo items u redove po y-koordinati
            const lines = this.groupByLine(content.items as any[]);
            pageTexts.push(lines.join('\n'));
        }
        return pageTexts.join('\n');
    }

    /**
     * Grupira tekstualne elemente pdf.js-a u logičke retke po y-koordinati.
     */
    private groupByLine(items: { str: string; transform: number[] }[]): string[] {
        if (!items.length) return [];

        // Sortiraj po y (transform[5]) silazno (PDF koordinate rastu prema gore)
        const sorted = [...items].sort((a, b) => b.transform[5] - a.transform[5]);

        const rows: { y: number; texts: string[] }[] = [];
        const THRESHOLD = 3; // px tolerancija za isti redak

        for (const item of sorted) {
            const y = Math.round(item.transform[5]);
            const last = rows[rows.length - 1];
            if (last && Math.abs(last.y - y) <= THRESHOLD) {
                last.texts.push(item.str);
            } else {
                rows.push({ y, texts: [item.str] });
            }
        }

        return rows.map(r => r.texts.join(' ').trim()).filter(Boolean);
    }
}
