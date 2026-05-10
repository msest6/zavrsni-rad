package fer.hr.zavrsni_rad.service;

import fer.hr.zavrsni_rad.dto.RecipeDTO;
import fer.hr.zavrsni_rad.model.*;
import fer.hr.zavrsni_rad.repository.*;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class RecipeService {

    private final RecipeRepository repository;
    private final IngredientRepository ingredientRepository;
    private final CategoryRepository categoryRepository;
    private final UnitRepository unitRepository;
    private final MediaService mediaService;

    public RecipeService(RecipeRepository repository,
                         IngredientRepository ingredientRepository,
                         CategoryRepository categoryRepository,
                         UnitRepository unitRepository,
                         MediaService mediaService) {
        this.repository = repository;
        this.ingredientRepository = ingredientRepository;
        this.categoryRepository = categoryRepository;
        this.unitRepository = unitRepository;
        this.mediaService = mediaService;
    }

    public Recipe create(RecipeDTO dto) {
        Recipe recipe = new Recipe();
        recipe.setTitle(dto.getTitle());
        recipe.setDescription(dto.getDescription());
        recipe.setPreparation_time(dto.getPreparation_time());
        recipe.setCooking_time(dto.getCooking_time());
        recipe.setServings(dto.getServings());

        Set<RecipeIngredient> ingredients = dto.getIngredients().stream()
                .map(i -> {
                    Ingredient ingredient = ingredientRepository.findById(i.getIngredientId())
                            .orElseThrow(() -> new RuntimeException("Ingredient not found"));

                    Unit unit = unitRepository.findBySymbol(i.getUnit())
                            .orElseThrow(() -> new RuntimeException("Unit not found: " + i.getUnit()));

                    RecipeIngredient ri = new RecipeIngredient();
                    ri.setRecipe(recipe);
                    ri.setIngredient(ingredient);
                    ri.setQuantity(i.getQuantity());
                    ri.setUnit(unit);
                    return ri;
                })
                .collect(Collectors.toCollection(HashSet::new));
        recipe.setIngredients(ingredients);

        Set<Step> steps = dto.getSteps().stream()
                .map(s -> {
                    Step step = new Step();
                    step.setStepNumber(s.getStepNumber());
                    step.setDescription(s.getDescription());
                    step.setRecipe(recipe);

                    Set<Ingredient> stepIngredients = s.getIngredientIds().stream()
                            .map(ingId -> ingredientRepository.findById(ingId)
                                    .orElseThrow(() -> new RuntimeException("Ingredient not found: " + ingId)))
                            .collect(Collectors.toCollection(HashSet::new));
                    step.setIngredients(stepIngredients);

                    Set<Media> mediaList = s.getMediaList().stream()
                            .map(m -> {
                                Media media = new Media();
                                media.setPublicId(m.getPublicId());
                                media.setType(m.getType());
                                media.setUrl(m.getUrl());
                                media.setStep(step);
                                return media;
                            })
                            .collect(Collectors.toSet());
                    step.setMediaList(mediaList);

                    return step;
                })
                .collect(Collectors.toCollection(HashSet::new));
        recipe.setSteps(steps);

        Set<Category> categories = dto.getCategoryIds().stream()
                .map(catId -> categoryRepository.findById(catId)
                        .orElseThrow(() -> new RuntimeException("Category not found: " + catId)))
                .collect(Collectors.toCollection(HashSet::new));
        recipe.setCategories(categories);
        recipe.setSource_url(dto.getSource_url());
        recipe.setIs_deleted(false);
        Set<Media> recipeMedia = dto.getMediaList() == null ? new HashSet<>() :
                dto.getMediaList().stream()
                        .map(m -> {
                            Media media = new Media();
                            media.setPublicId(m.getPublicId());
                            media.setType(m.getType());
                            media.setUrl(m.getUrl());
                            media.setRecipe(recipe);   // make sure Media has this field
                            return media;
                        })
                        .collect(Collectors.toSet());
        recipe.setMediaList(recipeMedia);
        return repository.save(recipe);
    }

    @Transactional
    public Page<Recipe> getAll(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        return repository.findAllActive(pageable);
    }

    @Transactional
    public Page<Recipe> getByCategories(List<Long> categoryIds, int page, int size) {
        if (categoryIds == null || categoryIds.isEmpty()) {
            return getAll(page, size);
        }
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        return repository.findByCategoryIds(categoryIds, pageable);
    }

    @Transactional
    public Recipe getById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Recipe not found"));
    }

    @Transactional
    public Recipe update(Long id, RecipeDTO dto) {
        Recipe recipe = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Recipe not found"));

        recipe.setTitle(dto.getTitle());
        recipe.setDescription(dto.getDescription());
        recipe.setPreparation_time(dto.getPreparation_time());
        recipe.setCooking_time(dto.getCooking_time());
        recipe.setServings(dto.getServings());

        // Delete media from Cloudinary for removed steps
        recipe.getSteps().forEach(step -> {
            step.getMediaList().forEach(media -> {
                try {
                    mediaService.delete(media.getId());
                } catch (IOException e) {
                    throw new RuntimeException("Failed to delete media from Cloudinary: " + media.getId(), e);
                }
            });
        });

        // Clear steps and media
        recipe.getSteps().forEach(step -> step.getMediaList().clear());
        recipe.getSteps().clear();

        // Add updated steps and media
        recipe.getSteps().addAll(
                dto.getSteps().stream()
                        .map(s -> {
                            Step step = new Step();
                            step.setStepNumber(s.getStepNumber());
                            step.setDescription(s.getDescription());
                            step.setRecipe(recipe);

                            Set<Ingredient> stepIngredients = s.getIngredientIds().stream()
                                    .map(ingId -> ingredientRepository.findById(ingId)
                                            .orElseThrow(() -> new RuntimeException("Ingredient not found: " + ingId)))
                                    .collect(Collectors.toCollection(HashSet::new));
                            step.setIngredients(stepIngredients);

                            Set<Media> mediaList = s.getMediaList().stream()
                                    .map(m -> {
                                        Media media = new Media();
                                        media.setPublicId(m.getPublicId());
                                        media.setType(m.getType());
                                        media.setUrl(m.getUrl());
                                        media.setStep(step);
                                        return media;
                                    })
                                    .collect(Collectors.toSet());
                            step.setMediaList(mediaList);

                            return step;
                        })
                        .collect(Collectors.toCollection(HashSet::new))
        );

        recipe.setCategories(
                dto.getCategoryIds().stream()
                        .map(catId -> categoryRepository.findById(catId)
                                .orElseThrow(() -> new RuntimeException("Category not found: " + catId)))
                        .collect(Collectors.toCollection(HashSet::new))
        );
        recipe.setSource_url(dto.getSource_url());
        recipe.setIs_deleted(false);
        recipe.getMediaList().forEach(media -> {
            try {
                mediaService.delete(media.getId());
            } catch (IOException e) {
                throw new RuntimeException("Failed to delete recipe media: " + media.getId(), e);
            }
        });
        recipe.getMediaList().clear();

        Set<Media> recipeMedia = dto.getMediaList() == null ? new HashSet<>() :
                dto.getMediaList().stream()
                        .map(m -> {
                            Media media = new Media();
                            media.setPublicId(m.getPublicId());
                            media.setType(m.getType());
                            media.setUrl(m.getUrl());
                            media.setRecipe(recipe);
                            return media;
                        })
                        .collect(Collectors.toSet());
        recipe.getMediaList().addAll(recipeMedia);
        return repository.save(recipe);
    }

    public void delete(Long id) {
        Recipe recipe = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Recipe not found"));
        recipe.setIs_deleted(true);
        repository.save(recipe);
    }
}