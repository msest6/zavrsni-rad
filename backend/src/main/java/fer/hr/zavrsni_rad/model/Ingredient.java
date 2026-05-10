package fer.hr.zavrsni_rad.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.Set;

@Getter
@Setter
@Entity
public class Ingredient {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ingredient_id", nullable = false)
    private Long id;
    @Column(name = "ingredient_name", nullable = false, unique = true)
    private String name;
    @JsonIgnore
    @ManyToMany(mappedBy = "ingredients")
    private Set<Step> steps;
}
