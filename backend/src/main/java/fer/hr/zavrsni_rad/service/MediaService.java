package fer.hr.zavrsni_rad.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import fer.hr.zavrsni_rad.model.Media;
import fer.hr.zavrsni_rad.model.Recipe;
import fer.hr.zavrsni_rad.model.Step;
import fer.hr.zavrsni_rad.repository.MediaRepository;
import fer.hr.zavrsni_rad.repository.RecipeRepository;
import fer.hr.zavrsni_rad.repository.StepRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@Service
public class MediaService {

    private final Cloudinary cloudinary;
    private final MediaRepository mediaRepository;
    private final StepRepository stepRepository;
    private final RecipeRepository recipeRepository;

    public MediaService(Cloudinary cloudinary,
                        MediaRepository mediaRepository,
                        StepRepository stepRepository,
                        RecipeRepository recipeRepository) {
        this.cloudinary = cloudinary;
        this.mediaRepository = mediaRepository;
        this.stepRepository = stepRepository;
        this.recipeRepository = recipeRepository;
    }

    public Media upload(MultipartFile file, Long stepId) throws IOException {
        Step step = stepRepository.findById(stepId)
                .orElseThrow(() -> new RuntimeException("Step not found: " + stepId));

        // Delete existing step media before uploading replacement
        List<Media> existing = mediaRepository.findByStepId(stepId);
        for (Media old : existing) {
            try {
                deleteFromCloudinaryOnly(old.getPublicId(), old.getType());
            } catch (IOException e) {
                System.err.println("Cloudinary delete failed for old step media: " + old.getPublicId());
            }
            mediaRepository.delete(old);
        }

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
        media.setPublicId(publicId);

        return mediaRepository.save(media);
    }

    public void deleteFromCloudinaryOnly(String publicId, String type) throws IOException {
        if (publicId == null || publicId.isBlank()) return;
        cloudinary.uploader().destroy(
                publicId,
                ObjectUtils.asMap("resource_type",
                        type != null && type.startsWith("video") ? "video" : "image")
        );
    }

    public void delete(Long id) throws IOException {
        Media media = mediaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Media not found"));

        if (media.getPublicId() != null && !media.getPublicId().isBlank()) {
            try {
                cloudinary.uploader().destroy(
                        media.getPublicId(),
                        ObjectUtils.asMap("resource_type",
                                media.getType() != null && media.getType().startsWith("video")
                                        ? "video" : "image")
                );
            } catch (Exception e) {
                System.err.println("Cloudinary destroy failed for: " + media.getPublicId());
            }
        }

        mediaRepository.deleteById(id);
    }

    public Media uploadToRecipe(MultipartFile file, Long recipeId) throws IOException {
        Recipe recipe = recipeRepository.findById(recipeId)
                .orElseThrow(() -> new RuntimeException("Recipe not found: " + recipeId));

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
        media.setUrl((String) uploadResult.get("secure_url"));
        media.setPublicId((String) uploadResult.get("public_id"));
        media.setType(file.getContentType());
        media.setRecipe(recipe);

        return mediaRepository.save(media);
    }
}