package fer.hr.zavrsni_rad.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter
@Setter
public class IngredientDTO {
    @NotBlank
    private String name;

    @Size(max = 500)
    private String description;
}
