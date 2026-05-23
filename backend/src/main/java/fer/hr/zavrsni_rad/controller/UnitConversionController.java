package fer.hr.zavrsni_rad.controller;

import fer.hr.zavrsni_rad.model.UnitConversion;
import fer.hr.zavrsni_rad.service.UnitConversionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/unit-conversions")
@RequiredArgsConstructor
public class UnitConversionController {

    private final UnitConversionService unitConversionService;

    /**
     * GET /api/unit-conversions
     *   - bez parametara → vraća sve konverzije (za stranicu upravljanja)
     *   - ?fromUnitId=1&ingredientId=5 → filtrira (stara logika za recept)
     */
    @GetMapping
    public List<UnitConversion> getConversions(
            @RequestParam(required = false) Long fromUnitId,
            @RequestParam(required = false) Long ingredientId) {

        if (fromUnitId != null) {
            return unitConversionService.findAvailableConversions(fromUnitId, ingredientId);
        }
        return unitConversionService.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<UnitConversion> getById(@PathVariable Long id) {
        return ResponseEntity.ok(unitConversionService.getById(id));
    }

    @PostMapping
    public ResponseEntity<UnitConversion> create(@RequestBody Map<String, Object> body) {
        Long fromUnitId = Long.valueOf(body.get("fromUnitId").toString());
        Long toUnitId   = Long.valueOf(body.get("toUnitId").toString());
        Double ratio    = Double.valueOf(body.get("ratio").toString());
        Long ingredientId = body.get("ingredientId") != null
                ? Long.valueOf(body.get("ingredientId").toString())
                : null;

        return ResponseEntity.ok(unitConversionService.create(fromUnitId, toUnitId, ratio, ingredientId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UnitConversion> update(@PathVariable Long id,
                                                 @RequestBody Map<String, Object> body) {
        Long fromUnitId = Long.valueOf(body.get("fromUnitId").toString());
        Long toUnitId   = Long.valueOf(body.get("toUnitId").toString());
        Double ratio    = Double.valueOf(body.get("ratio").toString());
        Long ingredientId = body.get("ingredientId") != null
                ? Long.valueOf(body.get("ingredientId").toString())
                : null;

        return ResponseEntity.ok(unitConversionService.update(id, fromUnitId, toUnitId, ratio, ingredientId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        unitConversionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}