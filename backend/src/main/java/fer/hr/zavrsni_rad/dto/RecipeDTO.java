package fer.hr.zavrsni_rad.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Setter
@Getter
public class RecipeDTO {

    @NotBlank
    private String title;

    @Size(max = 1000)
    private String description;

    @Min(1)
    private Long preparation_time;

    @Min(1)
    private Long cooking_time;

    @Min(1)
    private int servings;

    @NotEmpty
    private List<StepDTO> steps;

    @NotEmpty
    private List<RecipeIngredientDTO> ingredients;

    private List<Long> categoryIds;

    private String source_url;

    private Boolean is_deleted;

    private List<MediaDTO> mediaList;
}
