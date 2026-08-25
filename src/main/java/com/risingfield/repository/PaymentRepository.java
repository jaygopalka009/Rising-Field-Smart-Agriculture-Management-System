package com.risingfield.repository;

import com.risingfield.model.Payment;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends MongoRepository<Payment, Integer> {
    List<Payment> findByFarmerIdOrderByCreatedAtDesc(Integer farmerId);
    List<Payment> findByProviderIdOrderByCreatedAtDesc(Integer providerId);
    List<Payment> findByBookingId(Integer bookingId);
    Optional<Payment> findByRazorpayOrderId(String razorpayOrderId);
}
