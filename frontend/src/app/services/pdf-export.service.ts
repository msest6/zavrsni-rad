import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { Recipe } from '../models/models';

@Injectable({ providedIn: 'root' })
export class PdfExportService {
    private readonly UNITS_INFO = [
        { symbol: 'g',    name: 'gram' },
        { symbol: 'dag',  name: 'dekagram' },
        { symbol: 'kg',   name: 'kilogram' },
        { symbol: 'ml',   name: 'mililitar' },
        { symbol: 'dcl',  name: 'decilitar' },
        { symbol: 'l',    name: 'litar' },
        { symbol: 'ž',    name: 'žlica' },
        { symbol: 'žč',   name: 'žličica' },
        { symbol: 'š',    name: 'šalica' },
        { symbol: 'kom',  name: 'komad' },
        { symbol: 'prst', name: 'prst' },
        { symbol: 'pak',  name: 'pakiranje' },
        { symbol: 'koc',  name: 'kocka' },
        { symbol: 'rež',  name: 'režanj' },
        { symbol: 'list', name: 'list' },
    ];

    private readonly CONVERSIONS_INFO = [
        { from: '1000 g',  to: '1 kg'   },
        { from: '10 g',    to: '1 dag'  },
        { from: '1000 ml', to: '1 l'    },
        { from: '10 dcl',  to: '1 l'    },
        { from: '1 ž',     to: '15 ml'  },
        { from: '1 ž',     to: '3 žč'   },
        { from: '1 š',     to: '240 ml' },
    ];

    private fontCache: { regular: string; bold: string; italic: string } | null = null;

    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
        }
        return btoa(binary);
    }

    private async loadFont(doc: jsPDF): Promise<void> {
        if (!this.fontCache) {
            const fetchBase64 = async (url: string) => {
                const buf = await (await fetch(url)).arrayBuffer();
                return this.arrayBufferToBase64(buf);
            };
            this.fontCache = {
                regular: await fetchBase64('https://fonts.gstatic.com/s/roboto/v32/KFOmCnqEu92Fr1Me5Q.ttf'),
                bold:    await fetchBase64('https://fonts.gstatic.com/s/roboto/v32/KFOlCnqEu92Fr1MmWUlvAx05IsDqlA.ttf'),
                italic:  await fetchBase64('https://fonts.gstatic.com/s/roboto/v32/KFOkCnqEu92Fr1Mu52xP.ttf'),
            };
        }
        doc.addFileToVFS('Roboto-Regular.ttf', this.fontCache.regular);
        doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
        doc.addFileToVFS('Roboto-Bold.ttf', this.fontCache.bold);
        doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
        doc.addFileToVFS('Roboto-Italic.ttf', this.fontCache.italic);
        doc.addFont('Roboto-Italic.ttf', 'Roboto', 'italic');
    }

    async exportRecipe(recipe: Recipe): Promise<void> {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        await this.loadFont(doc);

        const pageW = 210;
        const pageH = 297;
        const margin = 16;
        const contentW = pageW - margin * 2;
        let y = margin;

        const checkPage = (neededHeight: number) => {
            if (y + neededHeight > pageH - margin) {
                doc.addPage();
                // Re-apply background on new page
                doc.setFillColor(252, 250, 247);
                doc.rect(0, 0, pageW, pageH, 'F');
                y = margin;
            }
        };

        // Background
        doc.setFillColor(252, 250, 247);
        doc.rect(0, 0, pageW, pageH, 'F');

        // Title
        doc.setFont('Roboto', 'bold');
        doc.setFontSize(26);
        doc.setTextColor(30, 30, 30);
        const titleLines = doc.splitTextToSize(recipe.title, contentW);
        doc.text(titleLines, margin, y + 8);
        y += titleLines.length * 10 + 6;

        // Categories
        if (recipe.categories?.length) {
            doc.setFont('Roboto', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(180, 120, 60);
            const cats = recipe.categories.map(c => c.name.toUpperCase()).join('  ·  ');
            doc.text(cats, margin, y);
            y += 7;
        }

        // Divider
        doc.setDrawColor(180, 120, 60);
        doc.setLineWidth(0.8);
        doc.line(margin, y, pageW - margin, y);
        y += 6;

        // Meta
        doc.setFont('Roboto', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        const metaParts: string[] = [];
        if (recipe.preparation_time) metaParts.push(`Priprema: ${recipe.preparation_time} min`);
        if (recipe.cooking_time) metaParts.push(`Kuhanje: ${recipe.cooking_time} min`);
        if (recipe.servings) metaParts.push(`Obroci: ${recipe.servings}`);
        if (metaParts.length) {
            doc.text(metaParts.join('    '), margin, y);
            y += 8;
        }

        // Description
        if (recipe.description) {
            doc.setFont('Roboto', 'italic');
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            const descLines = doc.splitTextToSize(recipe.description, contentW);
            checkPage(descLines.length * 5 + 6);
            doc.text(descLines, margin, y);
            y += descLines.length * 5 + 8;
        }

        // Ingredients heading
        checkPage(20);
        doc.setFont('Roboto', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(30, 30, 30);
        doc.text('Sastojci', margin, y);
        y += 5;
        doc.setDrawColor(220, 215, 205);
        doc.setLineWidth(0.3);
        doc.line(margin, y, pageW - margin, y);
        y += 5;

        if (recipe.ingredients?.length) {
            recipe.ingredients.forEach((ri, i) => {
                checkPage(7);
                if (i % 2 === 0) {
                    doc.setFillColor(245, 242, 237);
                    doc.rect(margin, y - 4, contentW, 6.5, 'F');
                }
                doc.setFont('Roboto', 'normal');
                doc.setFontSize(10);
                doc.setTextColor(30, 30, 30);
                doc.text(ri.ingredient?.name ?? '', margin + 3, y);
                doc.setTextColor(100, 100, 100);
                doc.text(`${this.formatQuantity(ri.quantity)} ${ri.unit?.symbol ?? ''}`, pageW - margin - 3, y, { align: 'right' });
                y += 6.5;
            });
        }
        y += 6;
        // Unit tables heading
        checkPage(20);
        doc.setFont('Roboto', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 30, 30);
        doc.text('Mjerne jedinice i konverzije', margin, y);
        y += 4;
        doc.setDrawColor(220, 215, 205);
        doc.setLineWidth(0.3);
        doc.line(margin, y, pageW - margin, y);
        y += 5;

// Dvije tablice jedna pokraj druge
        const colMid = margin + contentW / 2 + 4;

// — lijevo: konverzije —
        doc.setFont('Roboto', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(120, 100, 80);
        doc.text('KONVERZIJE', margin, y);

// — desno: mjerne jedinice —
        doc.text('MJERNE JEDINICE', colMid, y);
        y += 4;

        const rowH = 5.5;
        const maxRows = Math.max(this.CONVERSIONS_INFO.length, this.UNITS_INFO.length);
        checkPage(maxRows * rowH + 8);

        this.CONVERSIONS_INFO.forEach((c, i) => {
            const rowY = y + i * rowH;
            if (i % 2 === 0) {
                doc.setFillColor(245, 242, 237);
                doc.rect(margin, rowY - 3.5, contentW / 2 - 4, rowH, 'F');
            }
            doc.setFont('Roboto', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(30, 30, 30);
            doc.text(c.from, margin + 2, rowY);
            doc.setFont('Roboto', 'normal');
            doc.setTextColor(120, 100, 80);
            doc.text('→', margin + 22, rowY);
            doc.setTextColor(30, 30, 30);
            doc.text(c.to, margin + 28, rowY);
        });

        this.UNITS_INFO.forEach((u, i) => {
            const rowY = y + i * rowH;
            if (i % 2 === 0) {
                doc.setFillColor(245, 242, 237);
                doc.rect(colMid, rowY - 3.5, contentW / 2 - 4, rowH, 'F');
            }
            doc.setFont('Roboto', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(60, 150, 100);
            doc.text(u.symbol, colMid + 2, rowY);
            doc.setFont('Roboto', 'normal');
            doc.setTextColor(30, 30, 30);
            doc.text(u.name, colMid + 14, rowY);
        });

        y += maxRows * rowH + 8;

        // Steps heading
        checkPage(20);
        doc.setFont('Roboto', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(30, 30, 30);
        doc.text('Priprema', margin, y);
        y += 5;
        doc.setDrawColor(220, 215, 205);
        doc.setLineWidth(0.3);
        doc.line(margin, y, pageW - margin, y);
        y += 7;

        const sorted = recipe.steps
            ? [...recipe.steps].sort((a, b) => a.stepNumber - b.stepNumber)
            : [];

        sorted.forEach((step) => {
            const descLines = doc.splitTextToSize(step.description, contentW - 14);
            checkPage(descLines.length * 5.5 + 14);

            // Step circle badge
            doc.setFillColor(180, 120, 60);
            doc.circle(margin + 4, y - 1, 4, 'F');
            doc.setFont('Roboto', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(255, 255, 255);
            doc.text(String(step.stepNumber), margin + 4, y - 0.5, { align: 'center' });

            // Step text
            doc.setFont('Roboto', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(30, 30, 30);
            doc.text(descLines, margin + 12, y);
            y += descLines.length * 5.5 + 8;

            // Step ingredients
            if (step.ingredients?.length) {
                doc.setFont('Roboto', 'italic');
                doc.setFontSize(9);
                doc.setTextColor(100, 100, 100);
                const ingNames = step.ingredients.map(i => i.name).join(', ');
                const ingLines = doc.splitTextToSize(`Koristi: ${ingNames}`, contentW - 14);
                checkPage(ingLines.length * 4.5 + 4);
                doc.text(ingLines, margin + 12, y);
                y += ingLines.length * 4.5 + 4;
            }
        });

        // Footer
        if (recipe.source_url) {
            checkPage(12);
            doc.setDrawColor(220, 215, 205);
            doc.setLineWidth(0.3);
            doc.line(margin, y, pageW - margin, y);
            y += 5;
            doc.setFont('Roboto', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text(`Izvor: ${recipe.source_url}`, margin, y);
        }

        const filename = recipe.title.toLowerCase().replace(/\s+/g, '-') + '.pdf';
        doc.save(filename);
    }
    private formatQuantity(value: number): string {
        const fractions: { decimal: number; label: string }[] = [
            { decimal: 1/8,  label: '1/8' },
            { decimal: 1/4,  label: '1/4' },
            { decimal: 1/3,  label: '1/3' },
            { decimal: 3/8,  label: '3/8' },
            { decimal: 1/2,  label: '1/2' },
            { decimal: 5/8,  label: '5/8' },
            { decimal: 2/3,  label: '2/3' },
            { decimal: 3/4,  label: '3/4' },
            { decimal: 7/8,  label: '7/8' },
        ];

        const tolerance = 0.005;
        const whole = Math.floor(value);
        const remainder = value - whole;

        if (remainder < tolerance) return whole.toString();

        const match = fractions.find(f => Math.abs(f.decimal - remainder) < tolerance);
        if (match) return whole > 0 ? `${whole} ${match.label}` : match.label;

        return parseFloat(value.toFixed(3)).toString();
    }
}