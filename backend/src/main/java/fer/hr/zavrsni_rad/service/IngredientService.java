package fer.hr.zavrsni_rad.service;

import fer.hr.zavrsni_rad.dto.IngredientDTO;
import fer.hr.zavrsni_rad.model.Ingredient;
import fer.hr.zavrsni_rad.repository.IngredientRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class IngredientService {

    private final IngredientRepository ingredientRepository;

    public IngredientService(IngredientRepository ingredientRepository) {
        this.ingredientRepository = ingredientRepository;
    }

    public List<Ingredient> getAll() {
        return ingredientRepository.findAll();
    }

    public Ingredient getById(Long id) {
        return ingredientRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ingredient not found"));
    }

    public Ingredient create(IngredientDTO dto) {
        Ingredient ingredient = new Ingredient();
        ingredient.setName(dto.getName());
        return ingredientRepository.save(ingredient);
    }

    public Ingredient update(Long id, IngredientDTO dto) {
        Ingredient ingredient = ingredientRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ingredient not found"));
        ingredient.setName(dto.getName());
        return ingredientRepository.save(ingredient);
    }

    public void delete(Long id) {
        ingredientRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ingredient not found"));
        ingredientRepository.deleteById(id);
    }
}
