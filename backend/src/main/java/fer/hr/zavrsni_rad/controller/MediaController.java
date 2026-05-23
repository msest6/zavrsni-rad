package fer.hr.zavrsni_rad.controller;

import fer.hr.zavrsni_rad.model.Media;
import fer.hr.zavrsni_rad.service.MediaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/media")
public class MediaController {

    private final MediaService mediaService;

    public MediaController(MediaService mediaService) {
        this.mediaService = mediaService;
    }

    @PostMapping("/upload")
    public ResponseEntity<Media> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam("stepId") Long stepId) throws IOException {
        return ResponseEntity.ok(mediaService.upload(file, stepId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) throws IOException {
        mediaService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/upload/recipe")
    public ResponseEntity<Media> uploadToRecipe(
            @RequestParam("file") MultipartFile file,
            @RequestParam("recipeId") Long recipeId) throws IOException {
        return ResponseEntity.ok(mediaService.uploadToRecipe(file, recipeId));
    }

    @PostMapping("/upload/recipe/from-url")
    public ResponseEntity<Media> uploadToRecipeFromUrl(
            @RequestParam("imageUrl") String imageUrl,
            @RequestParam("recipeId") Long recipeId) throws IOException {
        return ResponseEntity.ok(mediaService.uploadToRecipeFromUrl(imageUrl, recipeId));
    }
}