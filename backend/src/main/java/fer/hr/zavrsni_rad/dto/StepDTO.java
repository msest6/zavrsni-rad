package fer.hr.zavrsni_rad.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.util.List;

@Setter
@Getter
public class StepDTO {
    @NotNull
    @Min(1)
    private Integer stepNumber;

    @NotBlank
    private String description;

    private List<Long> ingredientIds;
}
