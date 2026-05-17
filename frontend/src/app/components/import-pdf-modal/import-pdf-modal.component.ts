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
    'oz': 'g',
    'lb': 'kg',
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
 * FIX 1: Parsira minute iz teksta — case-insensitive za M/H.
 * Podržava: "30m", "30M", "1h 30m", "20 minutes", "60M"
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
 */
function parseIngredientLine(line: string): { name: string; quantity: string; unit: string } {
    const s = line.trim();

    const fracUnit = s.match(/^(\d+\/\d+)\s+([a-zA-Zž]+\.?)\s+(.+)$/i);
    if (fracUnit) {
        const unit = normalizeUnit(fracUnit[2]);
        if (unit !== 'kom' || UNIT_MAP[fracUnit[2].toLowerCase()]) {
            return { quantity: fracUnit[1], unit, name: fracUnit[3].toLowerCase() };
        }
    }

    const numUnit = s.match(/^([\d.,\/]+)\s+([a-zA-Zž]+\.?)\s+(.+)$/i);
    if (numUnit) {
        const maybeUnit = numUnit[2].toLowerCase().replace(/\.$/, '');
        const unit = UNIT_MAP[maybeUnit];
        if (unit) {
            return { quantity: numUnit[1], unit, name: numUnit[3].toLowerCase() };
        }
    }

    const fracOnly = s.match(/^(\d+\/\d+)\s+(.+)$/);
    if (fracOnly) {
        return { quantity: fracOnly[1], unit: 'kom', name: fracOnly[2].toLowerCase() };
    }

    const numOnly = s.match(/^([\d.,]+)\s+(.+)$/);
    if (numOnly) {
        return { quantity: numOnly[1], unit: 'kom', name: numOnly[2].toLowerCase() };
    }

    return { name: s.toLowerCase(), quantity: '1', unit: 'kom' };
}

/**
 * Glavni parser — prima sav tekst izvučen iz PDF-a i vraća ImportedRecipe.
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

    const titleIdx = lines.indexOf(title);

    // ── FIX 4: Kategorije — sve između naslova i prvog retka koji izgleda
    //    kao ocjena ("★", "* * *"), URL, datum ili poznati odjeljak ──────────
    const categories: string[] = [];
    if (titleIdx >= 0) {
        for (let i = titleIdx + 1; i < lines.length; i++) {
            const l = lines[i];
            // Zaustavi se na ocjeni, URL-u, datumu, ili poznatim odjeljcima
            if (
                l.match(/^[★✩\*]/) ||
                l.startsWith('http') ||
                l.match(/^\d{2}\/\d{2}\/\d{4}/) ||
                /^(ingredients|directions|steps|method|description|nutrition|preparation|cooking|total|yield)/i.test(l)
            ) break;

            // Svaki redak može biti jedna kategorija ili više odvojenih zarezom
            l.split(',').forEach(c => {
                const t = c.trim().toLowerCase();
                if (t && t.length < 40 && !t.match(/^\d/)) {
                    categories.push(t);
                }
            });
        }
    }

    // ── FIX 2: Opis — provjeri sve uobičajene varijante navodnika ─────────
    // Podržani znakovi: " " « » \u201C \u201D \u00AB \u00BB i obični "
    let description = '';
    const descLine = lines.find(l =>
            l.length > 20 && (
                l.startsWith('\u201C') || // "
                l.startsWith('\u201E') || // „
                l.startsWith('\u00AB') || // «
                l.startsWith('"')         // ASCII "
            )
    );
    if (descLine) {
        description = descLine.replace(/^[\u201C\u201E\u00AB"]|[\u201D\u00BB"]$/g, '').trim();
    } else {
        // Fallback: redak iza "Description" labele ako postoji
        const descIdx = lines.findIndex(l => /^description$/i.test(l));
        if (descIdx >= 0 && descIdx + 1 < lines.length) {
            description = lines[descIdx + 1];
        }
    }

    // ── Metapodaci: Preparation time / Cooking time / Yield ──────────────────
    let preparation_time: number | null = null;
    let cooking_time: number | null = null;
    let servings: number | null = null;

    for (let i = 0; i < lines.length; i++) {
        const l = lines[i].toLowerCase();

        // FIX 1: Ako postoji samo "total time" bez prep/cook, koristi ga kao cooking_time
        if (l.includes('preparation time') || l.includes('prep time')) {
            const val = lines[i].replace(/preparation time|prep time/i, '').trim()
                || lines[i + 1] || '';
            preparation_time = parseMinutes(val);
            // Ako vrijednost nije na istom retku, uzmi sljedeći
            if (!preparation_time && lines[i + 1]) {
                preparation_time = parseMinutes(lines[i + 1]);
            }
        }

        if (l.includes('cooking time') || l.includes('cook time')) {
            const val = lines[i].replace(/cooking time|cook time/i, '').trim()
                || lines[i + 1] || '';
            cooking_time = parseMinutes(val);
            if (!cooking_time && lines[i + 1]) {
                cooking_time = parseMinutes(lines[i + 1]);
            }
        }

        // FIX 1: "Total time" → spremi kao cooking_time ako prep/cook nisu pronađeni
        if (l.includes('total time')) {
            const val = lines[i].replace(/total time/i, '').trim()
                || lines[i + 1] || '';
            const totalParsed = parseMinutes(val);
            if (!totalParsed && lines[i + 1]) {
                const fromNext = parseMinutes(lines[i + 1]);
                if (fromNext) {
                    // Pohrani privremeno; primijeni poslije ako nema prep/cook
                    if (!cooking_time) cooking_time = fromNext;
                }
            } else if (totalParsed && !cooking_time) {
                cooking_time = totalParsed;
            }
        }

        if (l === 'yield' || l.startsWith('yield')) {
            const val = lines[i].replace(/yield/i, '').trim() || lines[i + 1] || '';
            const m = val.match(/\d+/);
            if (m) servings = parseInt(m[0]);
        }
    }

    // ── Odjeljci: Ingredients i Directions ───────────────────────────────────
    const ingredientsIdx = lines.findIndex(l => /^ingredients$/i.test(l));
    const directionsIdx  = lines.findIndex(l => /^directions$|^steps$|^method$/i.test(l));
    const sourcesIdx     = lines.findIndex(l => /^sources?$/i.test(l));

    // ── Sastojci ──────────────────────────────────────────────────────────────
    const ingredients: ImportedRecipe['ingredients'] = [];
    if (ingredientsIdx >= 0) {
        const end = directionsIdx > ingredientsIdx ? directionsIdx : lines.length;
        for (let i = ingredientsIdx + 1; i < end; i++) {
            const l = lines[i];
            if (!l || l.startsWith('http') || /^(preparation|cooking|total|yield)/i.test(l)) continue;
            if (/^(directions|steps|method|sources?|nutrition)/i.test(l)) break;
            ingredients.push(parseIngredientLine(l));
        }
    }

    // ── Koraci (Directions) ───────────────────────────────────────────────────
    const steps: ImportedRecipe['steps'] = [];
    if (directionsIdx >= 0) {
        const end = sourcesIdx > directionsIdx ? sourcesIdx : lines.length;
        let stepNum = 1;
        for (let i = directionsIdx + 1; i < end; i++) {
            const l = lines[i];
            if (!l || l.startsWith('http') || /^\d{2}\/\d{2}\/\d{4}/.test(l)) continue;
            if (/^(sources?|nutrition)/i.test(l)) break;
            if (/^\d+$/.test(l)) continue;
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
    @Output() imported = new EventEmitter<{ recipe: ImportedRecipe; imageFile: File | null }>();
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
            const arrayBuffer = await this.selectedFile.arrayBuffer();

            // Paralelno: tekst + slika
            const [text, imageFile] = await Promise.all([
                this.extractTextFromPdf(arrayBuffer.slice(0)),
                this.extractFirstImageFromPdf(arrayBuffer.slice(0)),
            ]);

            const recipe = parsePdfText(text, this.selectedFile.name);

            if (!recipe.title || (recipe.ingredients.length === 0 && recipe.steps.length === 0)) {
                this.error = 'Nije moguće prepoznati strukturu recepta u ovom PDF-u.';
                this.loading = false;
                this.cdr.detectChanges();
                return;
            }

            this.loading = false;
            this.cdr.detectChanges();

            // FIX 5: Emitiramo i recept i sliku
            this.imported.emit({ recipe, imageFile });
        } catch (err: any) {
            this.error = 'Greška pri čitanju PDF-a. Provjerite je li datoteka ispravna.';
            this.loading = false;
            this.cdr.detectChanges();
        }
    }

    private async extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pageTexts: string[] = [];
        for (let p = 1; p <= pdf.numPages; p++) {
            const page = await pdf.getPage(p);
            const content = await page.getTextContent();
            const lines = this.groupByLine(content.items as any[]);
            pageTexts.push(lines.join('\n'));
        }
        return pageTexts.join('\n');
    }

    /**
     * FIX 5: Izvlači prvu dovoljno veliku rastersku sliku iz PDF-a
     * koristeći pdf.js operatore stranice. Vraća File objekt ili null.
     */
    private async extractFirstImageFromPdf(arrayBuffer: ArrayBuffer): Promise<File | null> {
        try {
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            for (let p = 1; p <= pdf.numPages; p++) {
                const page = await pdf.getPage(p);
                // Dohvati sve resurse stranice
                const ops = await page.getOperatorList();
                const commonObjs = (page as any).commonObjs;
                const objs       = (page as any).objs;

                // Traži OPS za prikaz slike (paintImageXObject = 85)
                for (let i = 0; i < ops.fnArray.length; i++) {
                    if (ops.fnArray[i] !== pdfjsLib.OPS.paintImageXObject) continue;

                    const imgName = ops.argsArray[i][0] as string;

                    // Pokušaj dohvatiti iz commonObjs ili objs
                    let imgData: any = null;
                    try {
                        imgData = commonObjs.get(imgName);
                    } catch {
                        try { imgData = objs.get(imgName); } catch { /* nema */ }
                    }

                    if (!imgData || !imgData.data) continue;

                    const { width, height, data, kind } = imgData;

                    // Preskoči sličice (manje od 100×100)
                    if (!width || !height || width < 100 || height < 100) continue;

                    // Pretvori u PNG putem OffscreenCanvas
                    const file = await this.imageDataToFile(data, width, height, kind, imgName);
                    if (file) return file;
                }
            }
        } catch (err) {
            console.warn('Ekstrakcija slike iz PDF-a nije uspjela:', err);
        }
        return null;
    }

    /**
     * Pretvara sirove piksele iz pdf.js u PNG File objekt.
     * kind: 1 = grayscale, 2 = RGB, 3 = RGBA
     */
    private async imageDataToFile(
        data: Uint8ClampedArray | Uint8Array,
        width: number,
        height: number,
        kind: number,
        name: string
    ): Promise<File | null> {
        try {
            // Uvijek radimo s čistim ArrayBuffer kako bi ImageData konstruktor bio zadovoljan
            const rgbaBuffer = new ArrayBuffer(width * height * 4);
            const rgba = new Uint8ClampedArray(rgbaBuffer);

            if (kind === 3) {
                // Već RGBA — kopiraj
                rgba.set(data.subarray(0, width * height * 4));
            } else if (kind === 2) {
                // RGB → RGBA
                for (let i = 0; i < width * height; i++) {
                    rgba[i * 4]     = data[i * 3];
                    rgba[i * 4 + 1] = data[i * 3 + 1];
                    rgba[i * 4 + 2] = data[i * 3 + 2];
                    rgba[i * 4 + 3] = 255;
                }
            } else if (kind === 1) {
                // Grayscale → RGBA
                for (let i = 0; i < width * height; i++) {
                    const v = data[i];
                    rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = v;
                    rgba[i * 4 + 3] = 255;
                }
            } else {
                return null;
            }

            const canvas = new OffscreenCanvas(width, height);
            const ctx = canvas.getContext('2d')!;
            // Eksplicitni cast na Uint8ClampedArray<ArrayBuffer> koji TypeScript zahtijeva
            ctx.putImageData(new ImageData(rgba as unknown as Uint8ClampedArray<ArrayBuffer>, width, height), 0, 0);

            const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
            return new File([blob], `${name}.jpg`, { type: 'image/jpeg' });
        } catch (err) {
            console.warn('Pretvorba piksela u File nije uspjela:', err);
            return null;
        }
    }

    private groupByLine(items: { str: string; transform: number[] }[]): string[] {
        if (!items.length) return [];
        const sorted = [...items].sort((a, b) => b.transform[5] - a.transform[5]);
        const rows: { y: number; texts: string[] }[] = [];
        const THRESHOLD = 3;
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