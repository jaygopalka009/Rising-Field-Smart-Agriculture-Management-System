package com.risingfield.repository;

import com.risingfield.model.Farm;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface FarmRepository extends MongoRepository<Farm, Integer> {
    List<Farm> findByFarmerUserId(Integer userId);
}
