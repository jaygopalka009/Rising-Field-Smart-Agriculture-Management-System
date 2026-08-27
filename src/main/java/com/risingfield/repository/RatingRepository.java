package com.risingfield.repository;

import com.risingfield.model.Rating;
import com.risingfield.model.ResourceType;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface RatingRepository extends MongoRepository<Rating, Integer> {
    Optional<Rating> findByBookingId(Integer bookingId);
    List<Rating> findByTargetIdAndResourceType(Integer targetId, ResourceType resourceType);
    List<Rating> findByFarmerId(Integer farmerId);
    List<Rating> findByTargetId(Integer targetId);
}
