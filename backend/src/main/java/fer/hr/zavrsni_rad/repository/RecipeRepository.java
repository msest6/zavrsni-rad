package fer.hr.zavrsni_rad.repository;

import fer.hr.zavrsni_rad.model.Recipe;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RecipeRepository extends JpaRepository<Recipe, Long> {
    @Query("SELECT r FROM Recipe r WHERE r.is_deleted = false")
    Page<Recipe> findAllActive(Pageable pageable);

    @Query("SELECT r FROM Recipe r JOIN r.categories c WHERE c.id IN :categoryIds AND r.is_deleted = false")
    Page<Recipe> findByCategoryIds(@Param("categoryIds") List<Long> categoryIds, Pageable pageable);
}