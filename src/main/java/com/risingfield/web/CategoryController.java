package com.risingfield.web;

import com.risingfield.model.Category;
import com.risingfield.repository.CategoryRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Public read of categories (used by farmers/labour/owners during booking & profile). */
@RestController
@RequestMapping("/api/public/categories")
public class CategoryController {

    private final CategoryRepository repo;

    public CategoryController(CategoryRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<Category> all(@RequestParam(required = false) String type) {
        if (type != null) return repo.findByType(type);
        return repo.findAll();
    }
}
