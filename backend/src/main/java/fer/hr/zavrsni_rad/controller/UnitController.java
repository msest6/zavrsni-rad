package fer.hr.zavrsni_rad.controller;

import fer.hr.zavrsni_rad.model.Unit;
import fer.hr.zavrsni_rad.service.UnitService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/units")
@RequiredArgsConstructor
public class UnitController {

    private final UnitService unitService;

    @GetMapping
    public List<Unit> getAll() {
        return unitService.getAll();
    }
}