package fer.hr.zavrsni_rad.service;

import fer.hr.zavrsni_rad.model.Unit;
import fer.hr.zavrsni_rad.repository.UnitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UnitService {

    private final UnitRepository unitRepository;

    public List<Unit> getAll() {
        return unitRepository.findAll();
    }
}