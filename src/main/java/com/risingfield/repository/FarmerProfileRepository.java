package com.risingfield.repository;

import com.risingfield.model.FarmerProfile;
import com.risingfield.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface FarmerProfileRepository extends MongoRepository<FarmerProfile, Integer> {
    Optional<FarmerProfile> findByUserId(Integer userId);
    Optional<FarmerProfile> findByPhone(String phone);
}
