package com.risingfield.repository;

import com.risingfield.model.EquipmentOwnerProfile;
import com.risingfield.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface EquipmentOwnerProfileRepository extends MongoRepository<EquipmentOwnerProfile, Integer> {
    Optional<EquipmentOwnerProfile> findByUserId(Integer userId);
    Optional<EquipmentOwnerProfile> findByPhone(String phone);
}
