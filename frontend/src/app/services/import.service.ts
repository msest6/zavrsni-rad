import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {Observable, from, firstValueFrom} from 'rxjs';
import { environment } from '../../environments/environment';

export interface ImportedRecipe {
    title: string;
    description: string;
    preparation_time: number | null;
    cooking_time: number | null;
    servings: number | null;
    source_url: string;
    categories: string[];
    ingredients: {
        name: string;
        quantity: string;
        unit: string;
    }[];
    steps: {
        stepNumber: number;
        description: string;
    }[];
    imageUrl?: string | null;
}

// Mapiranje Coolinarika jedinica na vaše simbole
const UNIT_MAP: Record<string, string> = {
    'g': 'g', 'gram': 'g', 'grama': 'g', 'gr': 'g',
    'dag': 'dag', 'dkg': 'dag',
    'kg': 'kg', 'kilogram': 'kg', 'kilograma': 'kg',
    'ml': 'ml', 'mililitar': 'ml', 'mililitara': 'ml',
    'dl': 'dcl', 'dcl': 'dcl', 'decilitar': 'dcl',
    'l': 'l', 'litra': 'l', 'litre': 'l', 'litara': 'l',
    'zlica': 'z', 'zlice': 'z', 'zl': 'z',
    'zlicica': 'zc', 'zlicicice': 'zc',
    'salica': 's', 'salice': 's',
    'komad': 'kom', 'komada': 'kom', 'kom': 'kom', 'kos': 'kom',
    'prst': 'prst', 'prstohvat': 'prst',
    'paket': 'pak', 'pakiranje': 'pak', 'pak': 'pak',
    'kocka': 'koc', 'kocke': 'koc',
    'rezanj': 'rez', 'reznjeva': 'rez', 'cesanj': 'rez', 'cesnja': 'rez',
    'list': 'list', 'lista': 'list',
};

// Mapiranje s dijakriticima (usporedba radimo nakon normalizacije)
const UNIT_MAP_HR: Record<string, string> = {
    'žlica': 'ž', 'žlice': 'ž', 'žl': 'ž', 'žličnih': 'ž',
    'žličica': 'žč', 'žličice': 'žč',
    'šalica': 'š', 'šalice': 'š', 'šalicu': 'š',
    'režanj': 'rež', 'režnjeva': 'rež', 'češanj': 'rež', 'češnja': 'rež',
};

const VALID_UNITS = ['g','dag','kg','ml','dcl','l','ž','žč','š','kom','prst','pak','koc','rež','list'];

function normalizeUnit(raw: string): string {
    const trimmed = raw.trim();
    // Provjeri s dijakriticima
    if (UNIT_MAP_HR[trimmed]) return UNIT_MAP_HR[trimmed];
    const lower = trimmed.toLowerCase();
    if (UNIT_MAP_HR[lower]) return UNIT_MAP_HR[lower];
    if (UNIT_MAP[lower]) return UNIT_MAP[lower];
    if (VALID_UNITS.includes(lower)) return lower;
    return 'kom';
}

/**
 * Parsira minute iz teksta poput "30 min", "1 h 15 min", "1 sat"
 */
function parseMinutes(text: string): number | null {
    if (!text) return null;
    const t = text.toLowerCase().trim();
    let total = 0;

    const hours = t.match(/(\d+)\s*(h|sat|sata|sati)/);
    if (hours) total += parseInt(hours[1]) * 60;

    const mins = t.match(/(\d+)\s*(min|minut|minuta)/);
    if (mins) total += parseInt(mins[1]);

    if (!hours && !mins) {
        const onlyNum = t.match(/^(\d+)$/);
        if (onlyNum) total = parseInt(onlyNum[1]);
    }

    return total > 0 ? total : null;
}

@Injectable({ providedIn: 'root' })
export class RecipeImportService {
    private readonly PROXY = `${environment.apiUrl}/proxy?url=`;

    constructor(private http: HttpClient) {}

    importFromUrl(url: string): Observable<ImportedRecipe> {
        return from(this.scrapeRecipe(url));
    }

    private async scrapeRecipe(url: string): Promise<ImportedRecipe> {
        const proxyUrl = `${this.PROXY}${encodeURIComponent(url)}`;

        const html = await firstValueFrom(
            this.http.get(proxyUrl, { responseType: 'text' })
        );

        if (!html) throw new Error('Nije moguće dohvatiti stranicu.');

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const jsonLd = this.extractJsonLd(doc);
        if (jsonLd) return this.parseJsonLd(jsonLd, url);
        return this.parseHtml(doc, url);
    }

    // ── JSON-LD (schema.org/Recipe) ───────────────────────────────────────────

    private extractJsonLd(doc: Document): any | null {
        const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
        for (const script of Array.from(scripts)) {
            try {
                const data = JSON.parse(script.textContent ?? '');
                const items = Array.isArray(data) ? data : [data];
                for (const item of items) {
                    if (item['@type'] === 'Recipe') return item;
                    // Ponekad ugniježdeno u @graph
                    if (item['@graph']) {
                        const found = item['@graph'].find((g: any) => g['@type'] === 'Recipe');
                        if (found) return found;
                    }
                }
            } catch { /* nije valjan JSON */ }
        }
        return null;
    }

    private parseJsonLd(data: any, url: string): ImportedRecipe {
        const ingredients = (data.recipeIngredient ?? []).map((line: string) =>
            this.parseIngredientLine(line.trim())
        );

        const steps = this.extractSteps(data.recipeInstructions ?? []);
        const categories = this.extractCategories(data);

        return {
            title: this.stripHtml(data.name ?? ''),
            description: this.stripHtml(data.description ?? ''),
            preparation_time: parseMinutes(data.prepTime ? this.isoDurationToText(data.prepTime) : ''),
            cooking_time: parseMinutes(data.cookTime ? this.isoDurationToText(data.cookTime) : ''),
            servings: this.parseServings(data.recipeYield),
            source_url: url,
            categories,
            ingredients,
            steps,
            imageUrl: this.extractImageUrl(data), // NOVO
        };
    }

    private extractImageUrl(data: any): string | null {
        const img = data.image;
        if (!img) return null;

        // image može biti string, objekt ili array
        if (typeof img === 'string') return img;
        if (Array.isArray(img)) {
            const first = img[0];
            if (typeof first === 'string') return first;
            if (first?.url) return first.url;
        }
        if (img.url) return img.url;

        return null;
    }

    /**
     * Parsira jedan redak sastojka iz JSON-LD formata.
     * Primjeri: "200 g brašna", "3 jaja", "1/2 žličice soli", "1,5 dl mlijeka"
     */
    private parseIngredientLine(line: string): { name: string; quantity: string; unit: string } {
        const s = line.trim();

        // Razlomak + jedinica + naziv: "1/2 žličice soli"
        const fractionPattern = /^(\d+\/\d+)\s+([^\s\d]+)\s+(.+)$/;
        const fractionMatch = s.match(fractionPattern);
        if (fractionMatch) {
            return {
                quantity: fractionMatch[1],
                unit: normalizeUnit(fractionMatch[2]),
                name: fractionMatch[3].toLowerCase(),
            };
        }

        // Broj + jedinica + naziv: "200 g brašna", "1,5 dl mlijeka"
        const numPattern = /^([\d.,]+)\s+([^\s\d.,]+)\s+(.+)$/;
        const numMatch = s.match(numPattern);
        if (numMatch) {
            return {
                quantity: numMatch[1].replace('.', ','),
                unit: normalizeUnit(numMatch[2]),
                name: numMatch[3].toLowerCase(),
            };
        }

        // Samo broj + naziv (bez jedinice): "3 jaja"
        const numOnly = s.match(/^([\d.,\/]+)\s+(.+)$/);
        if (numOnly) {
            return {
                quantity: numOnly[1],
                unit: 'kom',
                name: numOnly[2].toLowerCase(),
            };
        }

        // Fallback: cijeli string je naziv
        return { name: s.toLowerCase(), quantity: '1', unit: 'kom' };
    }

    private extractSteps(instructions: any[]): { stepNumber: number; description: string }[] {
        const steps: { stepNumber: number; description: string }[] = [];
        let num = 1;

        for (const item of instructions) {
            if (typeof item === 'string') {
                const text = this.stripHtml(item).trim();
                if (text) steps.push({ stepNumber: num++, description: text });
            } else if (item['@type'] === 'HowToStep') {
                const text = this.stripHtml(item.text ?? item.name ?? '').trim();
                if (text) steps.push({ stepNumber: num++, description: text });
            } else if (item['@type'] === 'HowToSection') {
                for (const sub of (item.itemListElement ?? [])) {
                    const text = this.stripHtml(sub.text ?? sub.name ?? '').trim();
                    if (text) steps.push({ stepNumber: num++, description: text });
                }
            }
        }

        return steps;
    }

    private extractCategories(data: any): string[] {
        const cats: string[] = [];

        if (data.recipeCategory) {
            const raw = Array.isArray(data.recipeCategory) ? data.recipeCategory : [data.recipeCategory];
            cats.push(...raw.map((c: string) => c.toLowerCase().trim()));
        }

        if (data.keywords && cats.length === 0) {
            const kw = typeof data.keywords === 'string'
                ? data.keywords.split(',')
                : data.keywords;
            cats.push(...kw.slice(0, 2).map((k: string) => k.toLowerCase().trim()));
        }

        return [...new Set(cats)].filter(Boolean);
    }

    /** ISO 8601 trajanje u tekst: "PT30M" → "30 min", "PT1H15M" → "1 h 15 min" */
    private isoDurationToText(iso: string): string {
        const h = iso.match(/(\d+)H/)?.[1];
        const m = iso.match(/(\d+)M/)?.[1];
        const parts: string[] = [];
        if (h) parts.push(`${h} h`);
        if (m) parts.push(`${m} min`);
        return parts.join(' ');
    }

    private parseServings(raw: any): number | null {
        if (!raw) return null;
        const num = String(raw).match(/\d+/);
        return num ? parseInt(num[0]) : null;
    }

    // ── HTML fallback (ako nema JSON-LD) ─────────────────────────────────────

    private parseHtml(doc: Document, url: string): ImportedRecipe {
        const title = doc.querySelector('h1')?.textContent?.trim() ?? '';
        const description =
            doc.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
        const imageUrl =
            doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ??
            doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content') ??
            null;
        const ingredients: { name: string; quantity: string; unit: string }[] = [];
        doc.querySelectorAll('[class*="ingredient"]').forEach(el => {
            const text = el.textContent?.trim() ?? '';
            if (text) ingredients.push(this.parseIngredientLine(text));
        });

        const steps: { stepNumber: number; description: string }[] = [];
        let stepNum = 1;
        doc.querySelectorAll('[class*="step"], [class*="instruction"], [class*="direction"]').forEach(el => {
            const text = el.textContent?.trim() ?? '';
            if (text.length > 10) steps.push({ stepNumber: stepNum++, description: text });
        });

        return {
            title, description,
            preparation_time: null, cooking_time: null, servings: null,
            source_url: url, categories: [], ingredients, steps, imageUrl,
        };
    }

    private stripHtml(html: string): string {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent ?? div.innerText ?? '';
    }
}
