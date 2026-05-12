package fer.hr.zavrsni_rad.controller;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.net.URI;

@RestController
@RequestMapping("/proxy")
public class ProxyController {

    private final RestTemplate restTemplate;

    public ProxyController() {
        this.restTemplate = new RestTemplate();
    }

    @GetMapping
    public ResponseEntity<String> proxy(@RequestParam String url) {
        // Osnovna validacija — dopusti samo http/https
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            return ResponseEntity.badRequest().body("Nevažeći URL.");
        }

        HttpHeaders headers = new HttpHeaders();
        // Browser-like User-Agent — važno, Coolinarika blokira bots
        headers.set("User-Agent",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
                        "AppleWebKit/537.36 (KHTML, like Gecko) " +
                        "Chrome/124.0.0.0 Safari/537.36");
        headers.set("Accept",
                "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
        headers.set("Accept-Language", "hr,en;q=0.9");

        try {
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(
                    URI.create(url),
                    HttpMethod.GET,
                    entity,
                    String.class
            );
            return ResponseEntity.ok()
                    .contentType(MediaType.TEXT_HTML)
                    .body(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body("Nije moguće dohvatiti stranicu: " + e.getMessage());
        }
    }
}