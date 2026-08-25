package com.risingfield.service;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.Utils;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR;

/**
 * Razorpay payment gateway integration.
 * Test mode: use rzp_test_* keys from https://dashboard.razorpay.com
 */
@Service
public class RazorpayService {

    private final String keyId;
    private final String keySecret;

    public RazorpayService(@Value("${razorpay.key.id}") String keyId,
                           @Value("${razorpay.key.secret}") String keySecret) {
        this.keyId = keyId;
        this.keySecret = keySecret;
    }

    public String getKeyId() {
        return keyId;
    }

    /**
     * Create a Razorpay order for the given amount (in rupees).
     * Returns the razorpay order id which the frontend uses to open checkout.
     */
    public String createOrder(double amountRupees, String receiptId) {
        try {
            RazorpayClient client = new RazorpayClient(keyId, keySecret);

            JSONObject options = new JSONObject();
            options.put("amount", Math.round(amountRupees * 100)); // amount in paise
            options.put("currency", "INR");
            options.put("receipt", receiptId);

            Order order = client.orders.create(options);
            return order.get("id");
        } catch (Exception e) {
            throw new ResponseStatusException(INTERNAL_SERVER_ERROR,
                    "Failed to create Razorpay order: " + e.getMessage());
        }
    }

    /**
     * Verify the payment signature returned by Razorpay checkout.
     * This proves the payment is genuine and not tampered.
     */
    public boolean verifySignature(String orderId, String paymentId, String signature) {
        try {
            JSONObject attributes = new JSONObject();
            attributes.put("razorpay_order_id", orderId);
            attributes.put("razorpay_payment_id", paymentId);
            attributes.put("razorpay_signature", signature);
            return Utils.verifyPaymentSignature(attributes, keySecret);
        } catch (Exception e) {
            return false;
        }
    }
}
