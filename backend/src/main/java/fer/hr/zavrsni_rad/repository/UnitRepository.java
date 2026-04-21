package fer.hr.zavrsni_rad.repository;

import fer.hr.zavrsni_rad.model.Unit;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UnitRepository extends JpaRepository<Unit, Long> {
    Optional<Unit> findBySymbol(String symbol);
}