package fer.hr.zavrsni_rad.controller;

import fer.hr.zavrsni_rad.dto.RecipeDTO;
import fer.hr.zavrsni_rad.model.Recipe;
import fer.hr.zavrsni_rad.service.RecipeService;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/recipes")
public class RecipeController {

    private final RecipeService service;

    public RecipeController(RecipeService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<Recipe> createRecipe(@Valid @RequestBody RecipeDTO dto) {
        return ResponseEntity.ok(service.create(dto));
    }
    @Transactional
    @GetMapping
    public ResponseEntity<Page<Recipe>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.getAll(page, size));
    }
    @Transactional
    @GetMapping("/by-categories")
    public ResponseEntity<Page<Recipe>> getByCategories(
            @RequestParam List<Long> categoryIds,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.getByCategories(categoryIds, page, size));
    }
    @Transactional
    @GetMapping("/{id}")
    public Recipe getById(@PathVariable Long id) {
        return service.getById(id);
    }
    @PutMapping("/{id}")
    public Recipe update(@PathVariable Long id, @RequestBody RecipeDTO dto) {
        return service.update(id, dto);
    }
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
    @Transactional
    @GetMapping("/search")
    public ResponseEntity<Page<Recipe>> search(
            @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.search(q, page, size));
    }
}
