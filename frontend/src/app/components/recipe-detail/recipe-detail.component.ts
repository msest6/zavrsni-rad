import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RecipeService } from '../../services/recipe.service';
import { Recipe } from '../../models/models';

@Component({
  selector: 'app-recipe-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './recipe-detail.component.html',
})
export class RecipeDetailComponent implements OnInit {
  recipe: Recipe | null = null;
  loading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recipeService: RecipeService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.recipeService.getById(id).subscribe({
      next: (r) => {
        this.zone.run(() => {
          this.recipe = r;
          this.loading = false;
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
}