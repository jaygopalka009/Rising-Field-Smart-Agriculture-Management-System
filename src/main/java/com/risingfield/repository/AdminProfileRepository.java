package com.risingfield.repository;

import com.risingfield.model.AdminProfile;
import com.risingfield.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface AdminProfileRepository extends MongoRepository<AdminProfile, Integer> {
    Optional<AdminProfile> findByUserId(Integer userId);
    Optional<AdminProfile> findByPhone(String phone);
}
