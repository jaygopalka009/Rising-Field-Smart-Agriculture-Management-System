package com.risingfield.config;

import com.risingfield.model.DbSequence;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.mapping.PersistentPropertyAccessor;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoOperations;
import org.springframework.data.mongodb.core.mapping.MongoPersistentEntity;
import org.springframework.data.mongodb.core.mapping.MongoPersistentProperty;
import org.springframework.data.mongodb.core.mapping.event.BeforeConvertCallback;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Component;

/**
 * Gives every document an auto-incrementing Integer id (1, 2, 3...) instead of an ObjectId,
 * so the REST API and the frontend keep working with plain numeric ids.
 *
 * <p>Runs just before a document is converted for saving. Documents that already carry an id
 * are left alone — that covers updates as well as fixed ids such as
 * {@link com.risingfield.model.Settings#SINGLETON_ID}.
 */
@Component
public class MongoSequenceGenerator implements BeforeConvertCallback<Object> {

    /** Lazy: the Mongo template itself depends on the callbacks, so it can't be injected directly. */
    private final ObjectProvider<MongoOperations> mongoProvider;

    public MongoSequenceGenerator(ObjectProvider<MongoOperations> mongoProvider) {
        this.mongoProvider = mongoProvider;
    }

    @Override
    public Object onBeforeConvert(Object entity, String collection) {
        if (entity instanceof DbSequence) return entity;   // the counters themselves are keyed by name

        MongoOperations mongo = mongoProvider.getObject();
        MongoPersistentEntity<?> persistentEntity = mongo.getConverter()
                .getMappingContext().getPersistentEntity(entity.getClass());
        if (persistentEntity == null) return entity;

        MongoPersistentProperty idProperty = persistentEntity.getIdProperty();
        if (idProperty == null || idProperty.getType() != Integer.class) return entity;

        PersistentPropertyAccessor<?> accessor = persistentEntity.getPropertyAccessor(entity);
        if (accessor.getProperty(idProperty) != null) return entity;   // already has an id

        accessor.setProperty(idProperty, nextId(mongo, collection));
        return entity;
    }

    /** Atomic server-side increment, so two concurrent saves can never get the same id. */
    private int nextId(MongoOperations mongo, String collection) {
        DbSequence counter = mongo.findAndModify(
                Query.query(Criteria.where("_id").is(collection)),
                new Update().inc("seq", 1),
                FindAndModifyOptions.options().returnNew(true).upsert(true),
                DbSequence.class);
        return counter == null ? 1 : (int) counter.getSeq();
    }
}
