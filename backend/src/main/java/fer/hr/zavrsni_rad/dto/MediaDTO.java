package fer.hr.zavrsni_rad.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MediaDTO {
    private Long id;
    private String publicId;
    private String type;
    private String url;
}