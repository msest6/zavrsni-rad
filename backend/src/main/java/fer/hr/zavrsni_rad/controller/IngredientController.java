package fer.hr.zavrsni_rad.controller;

import fer.hr.zavrsni_rad.dto.IngredientDTO;
import fer.hr.zavrsni_rad.model.Ingredient;
import fer.hr.zavrsni_rad.service.IngredientService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/ingredients")
public class IngredientController {

    private final IngredientService ingredientService;

    public IngredientController(IngredientService ingredientService) {
        this.ingredientService = ingredientService;
    }

    @GetMapping
    public ResponseEntity<List<Ingredient>> getAll() {
        return ResponseEntity.ok(ingredientService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Ingredient> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ingredientService.getById(id));
    }

    @PostMapping
    public ResponseEntity<Ingredient> create(@RequestBody @Valid IngredientDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ingredientService.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Ingredient> update(@PathVariable Long id,
                                             @RequestBody @Valid IngredientDTO dto) {
        return ResponseEntity.ok(ingredientService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        ingredientService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
