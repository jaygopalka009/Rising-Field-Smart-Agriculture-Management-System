package com.risingfield.web;

import com.risingfield.service.TranslationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/translate")
public class TranslationController {

    private final TranslationService translationService;

    public TranslationController(TranslationService translationService) {
        this.translationService = translationService;
    }

    /**
     * Translate text between languages
     * POST /api/translate
     * Body: {"text": "Hello", "sourceLang": "en", "targetLang": "hi"}
     */
    @PostMapping
    public ResponseEntity<Map<String, String>> translate(@RequestBody TranslateRequest request) {
        String translated = translationService.translate(
            request.text(),
            request.sourceLang(),
            request.targetLang()
        );

        return ResponseEntity.ok(Map.of(
            "originalText", request.text(),
            "translatedText", translated,
            "sourceLang", request.sourceLang(),
            "targetLang", request.targetLang()
        ));
    }

    /**
     * Translate to English
     * POST /api/translate/to-english
     */
    @PostMapping("/to-english")
    public ResponseEntity<Map<String, String>> toEnglish(@RequestBody Map<String, String> body) {
        String text = body.get("text");
        String sourceLang = body.getOrDefault("sourceLang", "hi");

        String translated = translationService.toEnglish(text, sourceLang);

        return ResponseEntity.ok(Map.of(
            "originalText", text,
            "translatedText", translated
        ));
    }

    /**
     * Translate to Hindi
     * POST /api/translate/to-hindi
     */
    @PostMapping("/to-hindi")
    public ResponseEntity<Map<String, String>> toHindi(@RequestBody Map<String, String> body) {
        String text = body.get("text");
        String sourceLang = body.getOrDefault("sourceLang", "en");

        String translated = translationService.toHindi(text, sourceLang);

        return ResponseEntity.ok(Map.of(
            "originalText", text,
            "translatedText", translated
        ));
    }

    /**
     * Translate to Gujarati
     * POST /api/translate/to-gujarati
     */
    @PostMapping("/to-gujarati")
    public ResponseEntity<Map<String, String>> toGujarati(@RequestBody Map<String, String> body) {
        String text = body.get("text");
        String sourceLang = body.getOrDefault("sourceLang", "en");

        String translated = translationService.toGujarati(text, sourceLang);

        return ResponseEntity.ok(Map.of(
            "originalText", text,
            "translatedText", translated
        ));
    }

    public record TranslateRequest(
        String text,
        String sourceLang,
        String targetLang
    ) {}
}
