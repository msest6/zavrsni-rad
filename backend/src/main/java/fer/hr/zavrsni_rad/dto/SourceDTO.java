package fer.hr.zavrsni_rad.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import org.hibernate.validator.constraints.URL;

@Getter
@Setter
public class SourceDTO {
    @NotBlank
    private String name;

    @URL
    private String url;
}
