package fer.hr.zavrsni_rad.repository;

import fer.hr.zavrsni_rad.model.*;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UnitConversionRepository extends JpaRepository<UnitConversion, Long> {

    Optional<UnitConversion> findByIngredientAndFromUnitAndToUnit(
            Ingredient ingredient, Unit fromUnit, Unit toUnit);

    Optional<UnitConversion> findByIngredientIsNullAndFromUnitAndToUnit(
            Unit fromUnit, Unit toUnit);
}