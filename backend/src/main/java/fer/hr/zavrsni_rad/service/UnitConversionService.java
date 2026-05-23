package fer.hr.zavrsni_rad.service;

import fer.hr.zavrsni_rad.model.*;
import fer.hr.zavrsni_rad.repository.IngredientRepository;
import fer.hr.zavrsni_rad.repository.UnitConversionRepository;
import fer.hr.zavrsni_rad.repository.UnitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UnitConversionService {

    private final UnitConversionRepository conversionRepo;
    private final UnitRepository unitRepo;
    private final IngredientRepository ingredientRepo;

    // ── Stara logika ──────────────────────────────────────────────────────────

    public Double convert(Ingredient ingredient, Double quantity,
                          Unit fromUnit, Unit toUnit) {

        if (fromUnit.getSymbol().equals(toUnit.getSymbol())) {
            return quantity;
        }

        Optional<UnitConversion> conv = conversionRepo
                .findByIngredientAndFromUnitAndToUnit(ingredient, fromUnit, toUnit);

        if (conv.isEmpty()) {
            conv = conversionRepo
                    .findByIngredientIsNullAndFromUnitAndToUnit(fromUnit, toUnit);
        }

        if (conv.isEmpty()) {
            Optional<UnitConversion> inverse = conversionRepo
                    .findByIngredientAndFromUnitAndToUnit(ingredient, toUnit, fromUnit);
            if (inverse.isEmpty()) {
                inverse = conversionRepo
                        .findByIngredientIsNullAndFromUnitAndToUnit(toUnit, fromUnit);
            }
            if (inverse.isPresent()) {
                double ratio = 1 / inverse.get().getRatio();
                return quantity * ratio;
            }
        }

        if (conv.isPresent()) {
            return quantity * conv.get().getRatio();
        }

        throw new IllegalArgumentException(
                "Nema konverzije: " + fromUnit.getSymbol() + " → " + toUnit.getSymbol()
                        + " za sastojak: " + (ingredient != null ? ingredient.getName() : "generički")
        );
    }

    public List<UnitConversion> findAvailableConversions(Long fromUnitId, Long ingredientId) {
        return conversionRepo.findByFromUnit_IdAndIngredientIsNullOrFromUnit_IdAndIngredient_Id(
                fromUnitId, fromUnitId, ingredientId);
    }

    // ── CRUD ──────────────────────────────────────────────────────────────────

    public List<UnitConversion> findAll() {
        return conversionRepo.findAll();
    }

    public UnitConversion getById(Long id) {
        return conversionRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("UnitConversion not found: " + id));
    }

    public UnitConversion create(Long fromUnitId, Long toUnitId, Double ratio, Long ingredientId) {
        UnitConversion uc = new UnitConversion();
        uc.setFromUnit(unitRepo.findById(fromUnitId)
                .orElseThrow(() -> new RuntimeException("Unit not found: " + fromUnitId)));
        uc.setToUnit(unitRepo.findById(toUnitId)
                .orElseThrow(() -> new RuntimeException("Unit not found: " + toUnitId)));
        uc.setRatio(ratio);
        if (ingredientId != null) {
            uc.setIngredient(ingredientRepo.findById(ingredientId)
                    .orElseThrow(() -> new RuntimeException("Ingredient not found: " + ingredientId)));
        }
        return conversionRepo.save(uc);
    }

    public UnitConversion update(Long id, Long fromUnitId, Long toUnitId, Double ratio, Long ingredientId) {
        UnitConversion uc = getById(id);
        uc.setFromUnit(unitRepo.findById(fromUnitId)
                .orElseThrow(() -> new RuntimeException("Unit not found: " + fromUnitId)));
        uc.setToUnit(unitRepo.findById(toUnitId)
                .orElseThrow(() -> new RuntimeException("Unit not found: " + toUnitId)));
        uc.setRatio(ratio);
        uc.setIngredient(ingredientId != null
                ? ingredientRepo.findById(ingredientId)
                .orElseThrow(() -> new RuntimeException("Ingredient not found: " + ingredientId))
                : null);
        return conversionRepo.save(uc);
    }

    public void delete(Long id) {
        conversionRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("UnitConversion not found: " + id));
        conversionRepo.deleteById(id);
    }
}