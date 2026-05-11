package fer.hr.zavrsni_rad.controller;

import fer.hr.zavrsni_rad.model.UnitConversion;
import fer.hr.zavrsni_rad.service.UnitConversionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/unit-conversions")
@RequiredArgsConstructor
public class UnitConversionController {

    private final UnitConversionService unitConversionService;

    /**
     * GET /api/unit-conversions?fromUnitId=1&ingredientId=5
     * ingredientId je opcionalan.
     */
    @GetMapping
    public List<UnitConversion> getConversions(
            @RequestParam Long fromUnitId,
            @RequestParam(required = false) Long ingredientId) {
        return unitConversionService.findAvailableConversions(fromUnitId, ingredientId);
    }
}