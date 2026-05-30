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

import fer.hr.zavrsni_rad.dto.MediaDTO;
import fer.hr.zavrsni_rad.dto.StepDTO;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
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

        recipe.getIngredients().clear();

        Set<RecipeIngredient> newIngredients = dto.getIngredients().stream()
                .map(i -> {
                    Ingredient ingredient = ingredientRepository.findById(i.getIngredientId())
                            .orElseThrow(() -> new RuntimeException("Ingredient not found: " + i.getIngredientId()));

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

        recipe.getIngredients().addAll(newIngredients);

        // Build lookup of existing steps by stepNumber
        Map<Integer, Step> existingStepsByNumber = new HashMap<>();
        for (Step step : recipe.getSteps()) {
            existingStepsByNumber.put(step.getStepNumber(), step);
        }

        Set<Integer> newStepNumbers = dto.getSteps().stream()
                .map(StepDTO::getStepNumber)
                .collect(Collectors.toSet());

        // Remove steps that are no longer in the DTO and delete their Cloudinary media
        Iterator<Step> stepIt = recipe.getSteps().iterator();
        while (stepIt.hasNext()) {
            Step step = stepIt.next();
            if (!newStepNumbers.contains(step.getStepNumber())) {
                for (Media media : step.getMediaList()) {
                    try {
                        mediaService.deleteFromCloudinaryOnly(media.getPublicId(), media.getType());
                    } catch (IOException e) {
                        System.err.println("Failed to delete step media from Cloudinary: " + media.getPublicId());
                    }
                }
                stepIt.remove();
            }
        }

        // Update existing steps in place (preserves media) or add new ones
        for (StepDTO s : dto.getSteps()) {
            Set<Ingredient> stepIngredients = s.getIngredientIds() == null ? new HashSet<>() :
                    s.getIngredientIds().stream()
                            .map(ingId -> ingredientRepository.findById(ingId)
                                    .orElseThrow(() -> new RuntimeException("Ingredient not found: " + ingId)))
                            .collect(Collectors.toCollection(HashSet::new));

            Step existing = existingStepsByNumber.get(s.getStepNumber());
            if (existing != null) {
                existing.setDescription(s.getDescription());
                existing.setIngredients(stepIngredients);
            } else {
                Step newStep = new Step();
                newStep.setStepNumber(s.getStepNumber());
                newStep.setDescription(s.getDescription());
                newStep.setRecipe(recipe);
                newStep.setIngredients(stepIngredients);
                newStep.setMediaList(new HashSet<>());
                recipe.getSteps().add(newStep);
            }
        }

        recipe.setCategories(
                dto.getCategoryIds().stream()
                        .map(catId -> categoryRepository.findById(catId)
                                .orElseThrow(() -> new RuntimeException("Category not found: " + catId)))
                        .collect(Collectors.toCollection(HashSet::new))
        );
        recipe.setSource_url(dto.getSource_url());
        recipe.setIs_deleted(false);

        Set<Long> keepMediaIds = dto.getMediaList() == null ? new HashSet<>() :
                dto.getMediaList().stream()
                        .map(MediaDTO::getId)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toSet());

        List<Media> mediaToDelete = new ArrayList<>(recipe.getMediaList());
        mediaToDelete.removeIf(m -> keepMediaIds.contains(m.getId()));

        for (Media media : mediaToDelete) {
            try {
                mediaService.deleteFromCloudinaryOnly(media.getPublicId(), media.getType());
            } catch (IOException e) {
                System.err.println("Failed to delete recipe media from Cloudinary: " + media.getPublicId());
            }
            recipe.getMediaList().remove(media);
        }

        return repository.save(recipe);
    }

    public void delete(Long id) {
        Recipe recipe = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Recipe not found"));
        recipe.setIs_deleted(true);
        repository.save(recipe);
    }

    @Transactional
    public Page<Recipe> search(String q, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        return repository.search(q, pageable);
    }
}