package com.risingfield.web;

import com.risingfield.model.PaymentMethod;
import com.risingfield.model.Payment;
import com.risingfield.security.CurrentUser;
import com.risingfield.service.PaymentService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;
    private final CurrentUser currentUser;

    public PaymentController(PaymentService paymentService, CurrentUser currentUser) {
        this.paymentService = paymentService;
        this.currentUser = currentUser;
    }

    /** Farmer pays for a completed booking. body: {bookingId, method, amount?} */
    @PostMapping
    public Payment pay(@RequestBody Map<String, Object> body) {
        Integer bookingId = Integer.valueOf(body.get("bookingId").toString());
        PaymentMethod method = PaymentMethod.valueOf(((String) body.get("method")).toUpperCase());
        Double amount = body.get("amount") == null ? null : Double.valueOf(body.get("amount").toString());
        return paymentService.pay(currentUser.id(), bookingId, method, amount);
    }

    /**
     * Razorpay step 1: create an order for a completed booking.
     * body: {bookingId}
     * Response: {orderId, amount, currency, key, ...} -> used by frontend checkout
     */
    @PostMapping("/razorpay/order")
    public Map<String, Object> createRazorpayOrder(@RequestBody Map<String, Object> body) {
        Integer bookingId = Integer.valueOf(body.get("bookingId").toString());
        return paymentService.createRazorpayOrder(currentUser.id(), bookingId);
    }

    /**
     * Razorpay step 2: verify checkout response and record the payment.
     * body: {bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature}
     */
    @PostMapping("/razorpay/verify")
    public Payment verifyRazorpayPayment(@RequestBody Map<String, Object> body) {
        return paymentService.verifyAndRecordRazorpayPayment(
                currentUser.id(),
                Integer.valueOf(body.get("bookingId").toString()),
                (String) body.get("razorpayOrderId"),
                (String) body.get("razorpayPaymentId"),
                (String) body.get("razorpaySignature"));
    }

    /** Farmer payment history. */
    @GetMapping("/farmer")
    public List<Payment> farmer() {
        return paymentService.forFarmer(currentUser.id());
    }

    /** Provider earnings / payment history. */
    @GetMapping("/provider")
    public List<Payment> provider() {
        return paymentService.forProvider(currentUser.id());
    }

    @GetMapping("/provider/earnings")
    public Map<String, Object> earnings() {
        return Map.of("totalEarnings", paymentService.totalEarnings(currentUser.id()));
    }

    /** Wallet summary (balance / points + commission settlement) for a provider. */
    @GetMapping("/provider/wallet")
    public Map<String, Object> wallet() {
        return paymentService.wallet(currentUser.id());
    }
}
