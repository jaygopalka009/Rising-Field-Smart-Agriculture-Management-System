package com.risingfield.web.dto;

import com.risingfield.model.RateUnit;
import com.risingfield.model.ResourceType;

import java.time.LocalDate;

/** Payload a farmer sends to create a booking. */
public class BookingRequest {
    public ResourceType resourceType;   // LABOUR or EQUIPMENT
    public Integer resourceId;           // labour userId or equipment id
    public String bookingType;          // ONE_DAY / MULTIPLE_DAYS / MONTHLY
    public LocalDate startDate;
    public LocalDate endDate;           // optional (defaults to startDate)
    public String startTime;            // optional
    public String endTime;              // optional
    public String workType;             // optional work/equipment category name
    public RateUnit rateUnit;           // HOUR / DAY / VIGHA — which price the farmer books at
    public Double quantity;             // units (hours/days/vigha); optional

    // farmer's live/current location for this job (optional)
    public Double farmerLat;
    public Double farmerLng;
    public Integer farmId;
}
