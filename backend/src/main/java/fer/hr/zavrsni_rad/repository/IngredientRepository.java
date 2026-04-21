package fer.hr.zavrsni_rad.repository;

import fer.hr.zavrsni_rad.model.Ingredient;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IngredientRepository extends JpaRepository<Ingredient, Long> {}
