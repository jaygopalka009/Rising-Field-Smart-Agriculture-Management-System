package com.risingfield.repository;

import com.risingfield.model.Booking;
import com.risingfield.model.BookingStatus;
import com.risingfield.model.ResourceType;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface BookingRepository extends MongoRepository<Booking, Integer> {
    List<Booking> findByFarmerIdOrderByCreatedAtDesc(Integer farmerId);
    List<Booking> findByProviderIdOrderByCreatedAtDesc(Integer providerId);
    List<Booking> findByProviderIdAndStatus(Integer providerId, BookingStatus status);

    // Used for overlap detection: all active-ish bookings for a resource.
    List<Booking> findByResourceIdAndStatusIn(Integer resourceId, List<BookingStatus> statuses);
    List<Booking> findByResourceIdAndResourceTypeAndStatusIn(Integer resourceId, ResourceType resourceType, List<BookingStatus> statuses);

    List<Booking> findByResourceType(ResourceType resourceType);
    long countByStatus(BookingStatus status);
}
