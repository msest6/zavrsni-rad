package fer.hr.zavrsni_rad.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(
        uniqueConstraints = @UniqueConstraint(
                columnNames = {"ingredient_id", "from_unit_id", "to_unit_id"}
        )
)
public class UnitConversion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "unitConversion_id", nullable = false)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "ingredient_id")
    private Ingredient ingredient;

    @ManyToOne
    @JoinColumn(name = "from_unit_id", nullable = false)
    private Unit fromUnit;

    @ManyToOne
    @JoinColumn(name = "to_unit_id", nullable = false)
    private Unit toUnit;

    @Column(nullable = false)
    private Double ratio;
}