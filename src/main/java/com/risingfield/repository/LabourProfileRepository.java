package com.risingfield.repository;

import com.risingfield.model.LabourProfile;
import com.risingfield.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface LabourProfileRepository extends MongoRepository<LabourProfile, Integer> {
    Optional<LabourProfile> findByUserId(Integer userId);
    Optional<LabourProfile> findByPhone(String phone);
    List<LabourProfile> findByAvailableTrue();
}
