import {
    Component,
    Output,
    EventEmitter,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RecipeImportService, ImportedRecipe } from '../../services/import.service';

@Component({
    selector: 'app-import-recipe-modal',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule],
    templateUrl: './import-recipe-modal.component.html',
})
export class ImportRecipeModalComponent {
    /** Emitira parsiran recept prema parent komponenti */
    @Output() imported = new EventEmitter<ImportedRecipe>();
    /** Emitira kad korisnik zatvori modal bez importa */
    @Output() closed = new EventEmitter<void>();

    /** URL koji korisnik upisuje */
    url = '';
    /** true dok traje HTTP poziv */
    loading = false;
    /** Poruka greške, prazna ako nema greške */
    error = '';

    constructor(
        private importService: RecipeImportService,
        private cdr: ChangeDetectorRef,
    ) {}

    /** Zatvara modal klikom na backdrop (tamnu pozadinu izvan boxića) */
    onBackdropClick(event: any) {
        if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
            this.close();
        }
    }

    /** Zatvara modal */
    close() {
        this.closed.emit();
    }

    /** Vraća true ako URL sadrži coolinarika.com — za highlight badge-a */
    isValidCoolinarika(): boolean {
        return this.url.includes('coolinarika.com');
    }

    /** Pokreće import: validira URL, poziva servis, emitira rezultat */
    import() {
        this.error = '';
        const trimmed = this.url.trim();

        if (!trimmed) {
            this.error = 'Unesite URL recepta.';
            return;
        }
        if (!trimmed.startsWith('http')) {
            this.error = 'URL mora počinjati s http:// ili https://';
            return;
        }

        this.loading = true;
        this.cdr.detectChanges();

        this.importService.importFromUrl(trimmed).subscribe({
            next: (recipe) => {
                this.loading = false;
                this.imported.emit(recipe);
            },
            error: (err) => {
                console.error('Import error:', err);
                this.loading = false;
                this.error = 'Nije moguće dohvatiti recept. Provjerite URL ili pokušajte ponovo.';
                this.cdr.detectChanges();
            },
        });
    }
}