package com.risingfield.repository;

import com.risingfield.model.Settings;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface SettingsRepository extends MongoRepository<Settings, Integer> {
}
