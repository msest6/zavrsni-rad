package fer.hr.zavrsni_rad.service;

import fer.hr.zavrsni_rad.model.*;
import fer.hr.zavrsni_rad.repository.UnitConversionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UnitConversionService {

    private final UnitConversionRepository conversionRepo;

    /**
     * Pretvara količinu iz jedne mjerne jedinice u drugu za zadani sastojak.
     * Npr. convert(ingredient, 0.75, šalica, gram) → 150.0
     *
     * Redoslijed traženja:
     *   1. Specifična konverzija za taj sastojak (brašno: žlica→g)
     *   2. Generička konverzija (ml→l, bez sastojka)
     *   3. Obrnuta konverzija × -1 (ako postoji samo g→žlica, koristimo inverz)
     */
    public Double convert(Ingredient ingredient, Double quantity,
                          Unit fromUnit, Unit toUnit) {

        if (fromUnit.getSymbol().equals(toUnit.getSymbol())) {
            return quantity; // ista jedinica, nema konverzije
        }

        // 1. Specifična konverzija za sastojak
        Optional<UnitConversion> conv = conversionRepo
                .findByIngredientAndFromUnitAndToUnit(ingredient, fromUnit, toUnit);

        // 2. Generička konverzija (ingredient = null)
        if (conv.isEmpty()) {
            conv = conversionRepo
                    .findByIngredientIsNullAndFromUnitAndToUnit(fromUnit, toUnit);
        }

        // 3. Obrnuta konverzija — npr. tražimo žlica→g, imamo g→žlica
        if (conv.isEmpty()) {
            Optional<UnitConversion> inverse = conversionRepo
                    .findByIngredientAndFromUnitAndToUnit(ingredient, toUnit, fromUnit);
            if (inverse.isEmpty()) {
                inverse = conversionRepo
                        .findByIngredientIsNullAndFromUnitAndToUnit(toUnit, fromUnit);
            }
            if (inverse.isPresent()) {
                UnitConversion inv = inverse.get();
                // inverz: ako je 1 g = 0.1 žlice, onda 1 žlica = 10 g
                double ratio = 1 / inv.getRatio();
                return quantity * ratio;
            }
        }

        if (conv.isPresent()) {
            UnitConversion c = conv.get();
            // ratio: npr. fromQty=1, toQty=10 → 1 žlica = 10 g
            double ratio = c.getRatio();
            return quantity * ratio;
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
}