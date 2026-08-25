package com.risingfield.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.time.LocalDate;

@Document(collection = "bookings")
public class Booking {

    @Id
    private Integer id;

    // who booked
    @Indexed
    private Integer farmerId;
    
    @Indexed
    private Integer farmId;
    
    @org.springframework.data.annotation.Transient
    private String farmerName;

    // what is booked
    private ResourceType resourceType;   // LABOUR or EQUIPMENT

    @Indexed
    private Integer resourceId;           // labour userId or equipment id
    
    @org.springframework.data.annotation.Transient
    private String resourceName;         // labour name or equipment name

    @Indexed
    private Integer providerId;           // labour userId or equipment owner userId
    
    @org.springframework.data.annotation.Transient
    private String providerName;

    // period
    private String bookingType;
    private LocalDate startDate;
    private LocalDate endDate;
    private String startTime;
    private String endTime;
    private String workType;

    // pricing
    private Double rate;

    private RateUnit rateUnit;
    private Double quantity;             // number of units (days/hours/acres)
    private Double amount;               // rate * quantity (estimate)

    private BookingStatus status = BookingStatus.PENDING;

    // contact + location
    @org.springframework.data.annotation.Transient
    private String providerPhone;
    
    @org.springframework.data.annotation.Transient
    private String farmerPhone;
    
    @org.springframework.data.annotation.Transient
    private Double farmerLat;
    
    @org.springframework.data.annotation.Transient
    private Double farmerLng;

    @org.springframework.data.annotation.Transient
    private Integer rating;

    // work-completion proof uploaded by the provider (base64 data-URI)
    private String completionPhoto;

    private String rejectionReason;

    // true once the farmer has paid for this booking (hides "Pay Now")
    private boolean paid = false;

    private Instant createdAt = Instant.now();

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public Integer getFarmerId() { return farmerId; }
    public void setFarmerId(Integer farmerId) { this.farmerId = farmerId; }

    public Integer getFarmId() { return farmId; }
    public void setFarmId(Integer farmId) { this.farmId = farmId; }

    public String getFarmerName() { return farmerName; }
    public void setFarmerName(String farmerName) { this.farmerName = farmerName; }

    public ResourceType getResourceType() { return resourceType; }
    public void setResourceType(ResourceType resourceType) { this.resourceType = resourceType; }

    public Integer getResourceId() { return resourceId; }
    public void setResourceId(Integer resourceId) { this.resourceId = resourceId; }

    public String getResourceName() { return resourceName; }
    public void setResourceName(String resourceName) { this.resourceName = resourceName; }

    public Integer getProviderId() { return providerId; }
    public void setProviderId(Integer providerId) { this.providerId = providerId; }

    public String getProviderName() { return providerName; }
    public void setProviderName(String providerName) { this.providerName = providerName; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }



    public Double getRate() { return rate; }
    public void setRate(Double rate) { this.rate = rate; }

    public RateUnit getRateUnit() { return rateUnit; }
    public void setRateUnit(RateUnit rateUnit) { this.rateUnit = rateUnit; }

    public Double getQuantity() { return quantity; }
    public void setQuantity(Double quantity) { this.quantity = quantity; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }

    public BookingStatus getStatus() { return status; }
    public void setStatus(BookingStatus status) { this.status = status; }



    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }



    public String getProviderPhone() { return providerPhone; }
    public void setProviderPhone(String providerPhone) { this.providerPhone = providerPhone; }

    public String getFarmerPhone() { return farmerPhone; }
    public void setFarmerPhone(String farmerPhone) { this.farmerPhone = farmerPhone; }

    public Double getFarmerLat() { return farmerLat; }
    public void setFarmerLat(Double farmerLat) { this.farmerLat = farmerLat; }

    public Double getFarmerLng() { return farmerLng; }
    public void setFarmerLng(Double farmerLng) { this.farmerLng = farmerLng; }

    public String getCompletionPhoto() { return completionPhoto; }
    public void setCompletionPhoto(String completionPhoto) { this.completionPhoto = completionPhoto; }

    public boolean isPaid() { return paid; }
    public void setPaid(boolean paid) { this.paid = paid; }

    public String getBookingType() { return bookingType; }
    public void setBookingType(String bookingType) { this.bookingType = bookingType; }

    public String getStartTime() { return startTime; }
    public void setStartTime(String startTime) { this.startTime = startTime; }

    public String getEndTime() { return endTime; }
    public void setEndTime(String endTime) { this.endTime = endTime; }

    public String getWorkType() { return workType; }
    public void setWorkType(String workType) { this.workType = workType; }

    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }

    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }
}
