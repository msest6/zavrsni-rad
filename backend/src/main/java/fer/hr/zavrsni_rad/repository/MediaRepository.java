package fer.hr.zavrsni_rad.repository;

import fer.hr.zavrsni_rad.model.Media;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MediaRepository extends JpaRepository<Media, Long> {
    List<Media> findByStepId(Long stepId);
}