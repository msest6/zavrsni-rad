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

    private final UnitConversionRepository conversionRepository;
    private final UnitRepository unitRepository;
    private final IngredientRepository ingredientRepository;

    public List<UnitConversion> findAvailableConversions(Long fromUnitId, Long ingredientId) {
        return conversionRepository.findByFromUnit_IdAndIngredientIsNullOrFromUnit_IdAndIngredient_Id(
                fromUnitId, fromUnitId, ingredientId);
    }

    // ── CRUD ──────────────────────────────────────────────────────────────────

    public List<UnitConversion> findAll() {
        return conversionRepository.findAll();
    }

    public UnitConversion getById(Long id) {
        return conversionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("UnitConversion not found: " + id));
    }

    public UnitConversion create(Long fromUnitId, Long toUnitId, Double ratio, Long ingredientId) {
        UnitConversion uc = new UnitConversion();
        uc.setFromUnit(unitRepository.findById(fromUnitId)
                .orElseThrow(() -> new RuntimeException("Unit not found: " + fromUnitId)));
        uc.setToUnit(unitRepository.findById(toUnitId)
                .orElseThrow(() -> new RuntimeException("Unit not found: " + toUnitId)));
        uc.setRatio(ratio);
        if (ingredientId != null) {
            uc.setIngredient(ingredientRepository.findById(ingredientId)
                    .orElseThrow(() -> new RuntimeException("Ingredient not found: " + ingredientId)));
        }
        return conversionRepository.save(uc);
    }

    public UnitConversion update(Long id, Long fromUnitId, Long toUnitId, Double ratio, Long ingredientId) {
        UnitConversion uc = getById(id);
        uc.setFromUnit(unitRepository.findById(fromUnitId)
                .orElseThrow(() -> new RuntimeException("Unit not found: " + fromUnitId)));
        uc.setToUnit(unitRepository.findById(toUnitId)
                .orElseThrow(() -> new RuntimeException("Unit not found: " + toUnitId)));
        uc.setRatio(ratio);
        uc.setIngredient(ingredientId != null
                ? ingredientRepository.findById(ingredientId)
                .orElseThrow(() -> new RuntimeException("Ingredient not found: " + ingredientId))
                : null);
        return conversionRepository.save(uc);
    }

    public void delete(Long id) {
        conversionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("UnitConversion not found: " + id));
        conversionRepository.deleteById(id);
    }
}