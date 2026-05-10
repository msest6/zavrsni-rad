package fer.hr.zavrsni_rad.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
public class Media {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "media_id", nullable = false)
    private Long id;
    @Column(nullable = false, unique = true)
    private String publicId;
    @Column(nullable = false)
    private String type;
    @Column(nullable = false)
    private String url;
    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "recipe_id")
    private Recipe recipe;
    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "step_id")
    private Step step;
}
