package fer.hr.zavrsni_rad.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
public class Unit {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "unit_id", nullable = false)
    private Long id;
    @Column(name = "unit_name", length = 64, nullable = false, unique = true)
    private String name;
    @Column(length = 16, nullable = false, unique = true)
    private String symbol;
    @Column(length = 32, nullable = false)
    private String dimension;
}