package com.risingfield.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Auto-increment counter for a single collection.
 * {@code _id} is the collection name (e.g. "users"), {@code seq} the last id handed out.
 * Lets documents keep small Integer ids (1, 2, 3...) instead of ObjectIds.
 */
@Document(collection = "counters")
public class DbSequence {

    @Id
    private String id;
    private long seq;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public long getSeq() { return seq; }
    public void setSeq(long seq) { this.seq = seq; }
}
