package com.risingfield.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;


@Document(collection = "farms")
public class Farm {

    @Id
    private Integer id;

    @JsonIgnore
    private Integer farmerProfileId;

    /** Owner's user id — what every farm lookup filters on. */
    @Indexed
    @JsonIgnore
    private Integer farmerUserId;

    private String name;
    private Double sizeVigha;
    private Double latitude;
    private Double longitude;


    public Farm() {}

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public Integer getFarmerProfileId() { return farmerProfileId; }
    public void setFarmerProfileId(Integer farmerProfileId) { this.farmerProfileId = farmerProfileId; }

    public Integer getFarmerUserId() { return farmerUserId; }
    public void setFarmerUserId(Integer farmerUserId) { this.farmerUserId = farmerUserId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Double getSizeVigha() { return sizeVigha; }
    public void setSizeVigha(Double sizeVigha) { this.sizeVigha = sizeVigha; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
}
