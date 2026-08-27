package com.risingfield.model;

public enum BookingStatus {
    PENDING,
    ACCEPTED,
    REJECTED,
    ONGOING,
    SUBMITTED,   // provider uploaded work-completion photo, waiting for farmer approval
    COMPLETED,
    CANCELLED
}
