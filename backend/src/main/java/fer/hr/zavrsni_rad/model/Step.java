package fer.hr.zavrsni_rad.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import fer.hr.zavrsni_rad.dto.StepDTO;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.Set;

@Getter
@Setter
@Entity
public class Step {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "step_id", nullable = false)
    private Long id;
    @Column(nullable = false)
    private Integer stepNumber;
    @Column(length = 1024, nullable = false)
    private String description;

    public Step() {}

    @JsonBackReference("recipe-steps")
    @ManyToOne
    @JoinColumn(name = "recipe_id",
        foreignKey = @ForeignKey(name = "fk_step_recipe"))
    private Recipe recipe;
    @ManyToMany
    @JoinTable(
            name = "step_ingredients",
            joinColumns = @JoinColumn(name = "step_id"),
            inverseJoinColumns = @JoinColumn(name = "ingredient_id")
    )
    private Set<Ingredient> ingredients;

    @OneToMany(mappedBy = "step", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<Media> mediaList;
}
