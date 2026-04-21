package fer.hr.zavrsni_rad.service;

import fer.hr.zavrsni_rad.dto.RecipeDTO;
import fer.hr.zavrsni_rad.model.*;
import fer.hr.zavrsni_rad.repository.*;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

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

    public RecipeService(RecipeRepository repository,
                         IngredientRepository ingredientRepository,
                         CategoryRepository categoryRepository,
                         UnitRepository unitRepository) {
        this.repository = repository;
        this.ingredientRepository = ingredientRepository;
        this.categoryRepository = categoryRepository;
        this.unitRepository = unitRepository;
    }

    public Recipe create(RecipeDTO dto) {
        Recipe recipe = new Recipe();
        recipe.setTitle(dto.getTitle());
        recipe.setDescription(dto.getDescription());
        recipe.setPreparation_time(dto.getPreparation_time());
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
                    return step;
                })
                .collect(Collectors.toCollection(HashSet::new));
        recipe.setSteps(steps);

        Set<Category> categories = dto.getCategoryIds().stream()
                .map(catId -> categoryRepository.findById(catId)
                        .orElseThrow(() -> new RuntimeException("Category not found: " + catId)))
                .collect(Collectors.toCollection(HashSet::new));
        recipe.setCategories(categories);

        if (dto.getSourceName() != null && !dto.getSourceName().isBlank()) {
            Source source = new Source();
            source.setName(dto.getSourceName());
            source.setUrl(dto.getSourceUrl());
            recipe.setSource(source);
        }

        return repository.save(recipe);
    }

    @Transactional
    public List<Recipe> getAll() {
        return repository.findAllActive();
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
        recipe.setServings(dto.getServings());

        recipe.getIngredients().clear();
        recipe.getIngredients().addAll(
                dto.getIngredients().stream()
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
                        .collect(Collectors.toCollection(HashSet::new))
        );

        recipe.getSteps().forEach(step -> step.getMediaList().clear());
        recipe.getSteps().clear();
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

        if (dto.getSourceName() != null && !dto.getSourceName().isBlank()) {
            Source source = new Source();
            source.setName(dto.getSourceName());
            source.setUrl(dto.getSourceUrl());
            recipe.setSource(source);
        } else {
            recipe.setSource(null);
        }

        return repository.save(recipe);
    }

    public void delete(Long id) {
        Recipe recipe = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Recipe not found"));
        recipe.set_deleted(true);
        repository.save(recipe);
    }
}