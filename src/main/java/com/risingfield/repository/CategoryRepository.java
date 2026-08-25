package com.risingfield.repository;

import com.risingfield.model.Category;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface CategoryRepository extends MongoRepository<Category, Integer> {
    List<Category> findByType(String type);
}
