package fer.hr.zavrsni_rad.repository;

import fer.hr.zavrsni_rad.model.Category;
import fer.hr.zavrsni_rad.model.Ingredient;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    Optional<Category> findIdByName(String name);
}
