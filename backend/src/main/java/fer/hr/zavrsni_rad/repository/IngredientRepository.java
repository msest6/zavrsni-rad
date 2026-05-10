package fer.hr.zavrsni_rad.repository;

import fer.hr.zavrsni_rad.model.Ingredient;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface IngredientRepository extends JpaRepository<Ingredient, Long> {
    Optional<Ingredient> findIdByName(String name);
}
