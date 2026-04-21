package fer.hr.zavrsni_rad.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import fer.hr.zavrsni_rad.model.Media;
import fer.hr.zavrsni_rad.model.Step;
import fer.hr.zavrsni_rad.repository.MediaRepository;
import fer.hr.zavrsni_rad.repository.StepRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
public class MediaService {

    private final Cloudinary cloudinary;
    private final MediaRepository mediaRepository;
    private final StepRepository stepRepository;

    public MediaService(Cloudinary cloudinary,
                        MediaRepository mediaRepository,
                        StepRepository stepRepository) {
        this.cloudinary = cloudinary;
        this.mediaRepository = mediaRepository;
        this.stepRepository = stepRepository;
    }

    public Media upload(MultipartFile file, Long stepId) throws IOException {
        Step step = stepRepository.findById(stepId)
                .orElseThrow(() -> new RuntimeException("Step not found: " + stepId));

        // Odredi tip (image ili video)
        String contentType = file.getContentType() != null ? file.getContentType() : "";
        String mediaType = contentType.startsWith("video") ? "video" : "image";

        // Upload na Cloudinary
        Map uploadResult = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                        "folder", "recepti/koraci",
                        "resource_type", mediaType
                )
        );

        String url = (String) uploadResult.get("secure_url");
        String publicId = (String) uploadResult.get("public_id");

        Media media = new Media();
        media.setType(mediaType);
        media.setUrl(url);
        media.setStep(step);
        media.setPublicId(publicId); // trebaš dodati ovo polje u Media.java

        return mediaRepository.save(media);
    }

    public void delete(Long id) throws IOException {
        Media media = mediaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Media not found"));

        // Obriši s Cloudinaryja
        if (media.getPublicId() != null) {
            cloudinary.uploader().destroy(
                    media.getPublicId(),
                    ObjectUtils.asMap("resource_type", media.getType())
            );
        }

        mediaRepository.deleteById(id);
    }
}