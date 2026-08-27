package com.risingfield.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "equipment")
public class Equipment {

    @Id
    private Integer id;

    @Indexed
    private Integer ownerId;
    private String name;
    private Integer categoryId;
    
    @org.springframework.data.annotation.Transient
    private String categoryName;

    @org.springframework.data.annotation.Transient
    private Double avgRating;

    @org.springframework.data.annotation.Transient
    private Integer ratingCount;

    private String description;

    private Double ratePerHour;
    private Double ratePerDay;
    private Double ratePerVigha;

    private boolean available = true;

    /** base64 data-URIs */
    private List<String> photos = new ArrayList<>();

    private Instant createdAt = Instant.now();

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public Integer getOwnerId() { return ownerId; }
    public void setOwnerId(Integer ownerId) { this.ownerId = ownerId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Integer getCategoryId() { return categoryId; }
    public void setCategoryId(Integer categoryId) { this.categoryId = categoryId; }

    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }

    public Double getAvgRating() { return avgRating; }
    public void setAvgRating(Double avgRating) { this.avgRating = avgRating; }

    public Integer getRatingCount() { return ratingCount; }
    public void setRatingCount(Integer ratingCount) { this.ratingCount = ratingCount; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Double getRatePerHour() { return ratePerHour; }
    public void setRatePerHour(Double ratePerHour) { this.ratePerHour = ratePerHour; }

    public Double getRatePerDay() { return ratePerDay; }
    public void setRatePerDay(Double ratePerDay) { this.ratePerDay = ratePerDay; }

    public Double getRatePerVigha() { return ratePerVigha; }
    public void setRatePerVigha(Double ratePerVigha) { this.ratePerVigha = ratePerVigha; }

    public boolean isAvailable() { return available; }
    public void setAvailable(boolean available) { this.available = available; }

    public List<String> getPhotos() { return photos; }
    public void setPhotos(List<String> photos) { this.photos = photos; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
