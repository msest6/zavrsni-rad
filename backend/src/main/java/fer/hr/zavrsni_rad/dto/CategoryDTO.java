package fer.hr.zavrsni_rad.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
public class CategoryDTO {
    @NotBlank
    private String name;
}
