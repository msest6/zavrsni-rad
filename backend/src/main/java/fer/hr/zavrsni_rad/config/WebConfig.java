package fer.hr.zavrsni_rad.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/proxy")
                .allowedOrigins("http://localhost:4200") // ← tvoj Angular dev URL
                .allowedMethods("GET");
    }
}
