package fer.hr.zavrsni_rad.controller;

import fer.hr.zavrsni_rad.dto.RecipeDTO;
import fer.hr.zavrsni_rad.model.Recipe;
import fer.hr.zavrsni_rad.service.RecipeService;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
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
    public List<Recipe> getAll() {
        return service.getAll();
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
}
