package com.risingfield.repository;

import com.risingfield.model.Equipment;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface EquipmentRepository extends MongoRepository<Equipment, Integer> {
    List<Equipment> findByOwnerId(Integer ownerId);
    List<Equipment> findByAvailableTrue();
    List<Equipment> findByCategoryId(Integer categoryId);
}
