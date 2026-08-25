package com.risingfield.web;

import com.risingfield.model.Booking;
import com.risingfield.model.User;
import com.risingfield.security.CurrentUser;
import com.risingfield.service.BookingService;
import com.risingfield.web.dto.BookingRequest;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;
    private final CurrentUser currentUser;

    public BookingController(BookingService bookingService, CurrentUser currentUser) {
        this.bookingService = bookingService;
        this.currentUser = currentUser;
    }

    /** Farmer creates a booking. */
    @PostMapping
    public Booking create(@RequestBody BookingRequest req) {
        User farmer = currentUser.get();
        return bookingService.create(farmer, req);
    }

    /** Farmer updates/reschedules a booking. */
    @PutMapping("/{id}")
    public Booking update(@PathVariable Integer id, @RequestBody BookingRequest req) {
        User farmer = currentUser.get();
        return bookingService.update(farmer, id, req);
    }

    /** Farmer: my bookings (history). */
    @GetMapping("/farmer")
    public List<Booking> myFarmerBookings() {
        return bookingService.forFarmer(currentUser.id());
    }

    /** Provider (labour / owner): bookings for me. */
    @GetMapping("/provider")
    public List<Booking> myProviderBookings() {
        return bookingService.forProvider(currentUser.id());
    }

    @PostMapping("/{id}/accept")
    public Booking accept(@PathVariable Integer id) {
        return bookingService.respond(id, currentUser.id(), true);
    }

    @PostMapping("/{id}/reject")
    public Booking reject(@PathVariable Integer id) {
        return bookingService.respond(id, currentUser.id(), false);
    }

    @PostMapping("/{id}/start")
    public Booking start(@PathVariable Integer id) {
        return bookingService.start(id, currentUser.id());
    }

    @PostMapping("/{id}/complete")
    public Booking complete(@PathVariable Integer id) {
        return bookingService.complete(id, currentUser.id(), LocalDate.now());
    }

    /** Provider uploads a work-completion photo. body: {photo: "data:image/...;base64,..."} */
    @PostMapping("/{id}/submit")
    public Booking submit(@PathVariable Integer id, @RequestBody Map<String, String> body) {
        return bookingService.submitWork(id, currentUser.id(), body.get("photo"));
    }

    /** Farmer approves the submitted work -> COMPLETED. */
    @PostMapping("/{id}/approve")
    public Booking approve(@PathVariable Integer id) {
        return bookingService.approve(id, currentUser.id(), LocalDate.now());
    }

    /** Farmer rejects the submitted work and sends back to ONGOING. */
    @PostMapping("/{id}/reject-work")
    public Booking rejectWork(@PathVariable Integer id, @RequestBody Map<String, String> body) {
        String reason = body != null ? body.get("reason") : "";
        return bookingService.rejectWork(id, currentUser.id(), reason);
    }

    @PostMapping("/{id}/cancel")
    public Booking cancel(@PathVariable Integer id) {
        return bookingService.cancel(id, currentUser.id());
    }

    @PostMapping("/{id}/rate")
    public Booking rate(@PathVariable Integer id, @RequestBody Map<String, Object> body) {
        Integer rating = (Integer) body.get("rating");
        String review = (String) body.get("review");
        return bookingService.rate(id, currentUser.id(), rating, review);
    }
}
