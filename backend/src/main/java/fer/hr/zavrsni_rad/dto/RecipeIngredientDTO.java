package fer.hr.zavrsni_rad.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RecipeIngredientDTO {
    @NotNull
    private Long ingredientId;

    @NotNull
    @Positive
    private Double quantity;

    @NotNull
    private String unit;
}
