package com.risingfield.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;

@Document(collection = "ratings")
public class Rating {

    @Id
    private Integer id;

    @Indexed(unique = true)
    private Integer bookingId;

    private Integer farmerId;
    private Integer targetId; // labour userId or equipment id
    private ResourceType resourceType; // LABOUR or EQUIPMENT

    private Integer rating; // 1 to 10
    private String review;
    private Instant createdAt = Instant.now();

    public Rating() {}

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public Integer getBookingId() { return bookingId; }
    public void setBookingId(Integer bookingId) { this.bookingId = bookingId; }

    public Integer getFarmerId() { return farmerId; }
    public void setFarmerId(Integer farmerId) { this.farmerId = farmerId; }

    public Integer getTargetId() { return targetId; }
    public void setTargetId(Integer targetId) { this.targetId = targetId; }

    public ResourceType getResourceType() { return resourceType; }
    public void setResourceType(ResourceType resourceType) { this.resourceType = resourceType; }

    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }

    public String getReview() { return review; }
    public void setReview(String review) { this.review = review; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
