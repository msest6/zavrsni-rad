package fer.hr.zavrsni_rad.config;

import fer.hr.zavrsni_rad.model.Category;
import fer.hr.zavrsni_rad.model.Ingredient;
import fer.hr.zavrsni_rad.model.Unit;
import fer.hr.zavrsni_rad.model.UnitConversion;
import fer.hr.zavrsni_rad.repository.CategoryRepository;
import fer.hr.zavrsni_rad.repository.IngredientRepository;
import fer.hr.zavrsni_rad.repository.UnitConversionRepository;
import fer.hr.zavrsni_rad.repository.UnitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final UnitRepository unitRepository;
    private final IngredientRepository ingredientRepository;
    private final UnitConversionRepository conversionRepository;
    private final CategoryRepository categoryRepository;

    @Override
    public void run(String... args) {
        seedUnits();
        seedIngredients();
        seedConversions();
        seedCategories();
    }
    private void seedUnits() {
        if (unitRepository.count() > 0) return;
        List<Unit> units = List.of(
                unit("gram",        "g",    "masa"),
                unit("kilogram",    "kg",   "masa"),
                unit("dekagram",     "dag",  "masa"),
                unit("mililitar",   "ml",   "volumen"),
                unit("litra",       "l",    "volumen"),
                unit("decilitar",    "dcl",   "volumen"),
                unit("žlica",       "ž","volumen"),
                unit("žličica",     "žč","volumen"),
                unit("šalica",      "š","volumen"),
                unit("komad",       "kom",  "količina"),
                unit("prstohvat",   "prst","količina"),
                unit("pakiranje",   "pak",  "količina"),
                unit("kockica", "koc", "količina"),
                unit("režanj", "rež", "količina"),
                unit("list", "list", "količina")
        );
        unitRepository.saveAll(units);
        System.out.println("✅ Units seeded.");
    }

    private void seedIngredients() {
        if (ingredientRepository.count() > 0) return;

        List<String> names = List.of(
                "brašno", "šećer", "sol", "ulje", "maslac", "voda",
                "mlijeko", "jaje", "vrhnje", "jogurt", "sir", "margarin",
                "piletina", "govedina", "svinjetina", "tuna",
                "luk", "češnjak", "rajčica", "paprika", "mrkva", "krumpir",
                "tikvica", "brokula", "špinat", "patlidžan",
                "limun", "jabuka", "banana", "jagoda", "višnja", "naranča",
                "papar", "origano", "bosiljak", "peršin", "ružmarin", "timijan",
                "kurkuma", "paprika u prahu", "cimet", "vegeta",
                "maslinovo ulje", "ocat", "med", "senf", "ketchup",
                "tjestenina", "riža", "kruh", "kvasac", "prašak za pecivo"
        );

        List<Ingredient> ingredients = names.stream()
                .distinct()
                .map(name -> {
                    Ingredient ing = new Ingredient();
                    ing.setName(name);
                    return ing;
                })
                .toList();

        ingredientRepository.saveAll(ingredients);
        System.out.println("✅ Ingredients seeded.");
    }

    private Unit unit(String name, String symbol, String dimension) {
        Unit u = new Unit();
        u.setName(name);
        u.setSymbol(symbol);
        u.setDimension(dimension);
        return u;
    }

    private void seedConversions() {
        if (conversionRepository.count() > 0) return;

        Unit g        = unitRepository.findBySymbol("g").orElseThrow();
        Unit kg       = unitRepository.findBySymbol("kg").orElseThrow();
        Unit dag       = unitRepository.findBySymbol("dag").orElseThrow();
        Unit ml       = unitRepository.findBySymbol("ml").orElseThrow();
        Unit l        = unitRepository.findBySymbol("l").orElseThrow();
        Unit dl       = unitRepository.findBySymbol("dcl").orElseThrow();
        Unit zlica    = unitRepository.findBySymbol("ž").orElseThrow();
        Unit zlicicica = unitRepository.findBySymbol("žč").orElseThrow();
        Unit salica   = unitRepository.findBySymbol("š").orElseThrow();

        List<UnitConversion> conversions = List.of(
                //masa
                conversion(null, g,        kg,        0.001),
                conversion(null, g,        dag,        0.1),
                conversion(null, dag,       g,         10.0),
                conversion(null, dag,       kg,        0.01),
                conversion(null, kg,       g,         1000.0),
                conversion(null, kg,       dag,        100.0),

                // volumen
                conversion(null, ml,       l,         0.001),
                conversion(null, ml,       dl,        0.01),
                conversion(null, dl,       ml,        100.0),
                conversion(null, dl,       l,         0.1),
                conversion(null, l,        ml,        1000.0),
                conversion(null, l,        dl,        10.0),

                // žlica ↔ ml (1 žlica = 15 ml)
                conversion(null, zlica,    ml,        15.0),
                conversion(null, zlica,    dl,        0.15),
                conversion(null, zlica,    l,         0.015),
                conversion(null, ml,       zlica,     1.0 / 15.0),
                conversion(null, dl,       zlica,     1.0 / 0.15),
                conversion(null, l,        zlica,     1.0 / 0.015),

                // žličica ↔ ml (1 žličica = 5 ml)
                conversion(null, zlicicica, ml,       5.0),
                conversion(null, zlicicica, dl,       0.05),
                conversion(null, zlicicica, l,        0.005),
                conversion(null, ml,       zlicicica, 1.0 / 5.0),
                conversion(null, dl,       zlicicica, 1.0 / 0.05),
                conversion(null, l,        zlicicica, 1.0 / 0.005),

                // šalica ↔ ml (1 šalica = 240 ml)
                conversion(null, salica,   ml,        240.0),
                conversion(null, salica,   dl,        2.4),
                conversion(null, salica,   l,         0.24),
                conversion(null, ml,       salica,    1.0 / 240.0),
                conversion(null, dl,       salica,    1.0 / 2.4),
                conversion(null, l,        salica,    1.0 / 0.24),

                // žlica ↔ žličica
                conversion(null, zlica,    zlicicica, 3.0),
                conversion(null, zlicicica, zlica,    1.0 / 3.0),

                // šalica ↔ žlica (1 šalica = 16 žlica)
                conversion(null, salica,   zlica,     16.0),
                conversion(null, zlica,    salica,    1.0 / 16.0),

                //šalica ↔ žličica (1 šalica = 48 žličica)
                conversion(null, salica,   zlicicica, 48.0),
                conversion(null, zlicicica, salica,    1.0 / 48.0),

                // dodatne konverzije specifične za sastojke mogu se dodati ovdje, npr. za brašno: 1 šalica = 120 g, itd.
                conversion(ingredientRepository.findIdByName("brašno").orElseThrow(), salica, g, 120.0),
                conversion(ingredientRepository.findIdByName("brašno").orElseThrow(), g, salica, 1.0 / 120.0),
                conversion(ingredientRepository.findIdByName("šećer").orElseThrow(), salica, g, 200.0),
                conversion(ingredientRepository.findIdByName("šećer").orElseThrow(), g, salica, 1 / 200.0)
        );

        conversionRepository.saveAll(conversions);
        System.out.println("✅ Unit conversions seeded.");
    }

    private UnitConversion conversion(Ingredient ingredient, Unit from, Unit to, Double ratio) {
        UnitConversion uc = new UnitConversion();
        uc.setIngredient(ingredient);
        uc.setFromUnit(from);
        uc.setToUnit(to);
        uc.setRatio(ratio);
        return uc;
    }

    private void seedCategories() {
        if (categoryRepository.count() > 0) return;

        List<String> names = List.of(
                "favorit", "doručak", "ručak", "večera", "desert", "predjelo", "glavno jelo",
                "salata", "juha", "smoothie", "pečenje", "roštilj", "vegetarijansko", "vegansko",
                "bezglutensko", "brzo i jednostavno", "tradicionalno", "međunarodno", "slatko", "slano",
                "meso", "riba", "povrće", "voće", "morski plodovi", "dijetalno", "niskokalorično", "visokoproteinsko"
        );

        List<Category> categories = names.stream()
                .distinct()
                .map(name -> {
                    Category cat = new Category();
                    cat.setName(name);
                    return cat;
                })
                .toList();

        categoryRepository.saveAll(categories);
        System.out.println("✅ Categories seeded.");
    }

}