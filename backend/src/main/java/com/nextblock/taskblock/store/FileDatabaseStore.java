package com.nextblock.taskblock.store;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.nextblock.taskblock.model.DatabaseState;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.function.Function;

@Component
public class FileDatabaseStore {

    private final Path dataFile;
    private final ObjectMapper objectMapper;

    public FileDatabaseStore(@Value("${nextblock.data-file}") String dataFile) {
        this.dataFile = Path.of(dataFile);
        this.objectMapper = new ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT);
    }

    public synchronized DatabaseState load() {
        ensureFile();
        try {
            DatabaseState state = objectMapper.readValue(Files.readString(dataFile), DatabaseState.class);
            if (state.getTaskBlocks() == null) {
                state.setTaskBlocks(new java.util.ArrayList<>());
            }
            if (state.getTaskTemplates() == null) {
                state.setTaskTemplates(new java.util.ArrayList<>());
            }
            if (state.getNextId() == null) {
                state.setNextId(1L);
            }
            if (state.getNextTemplateId() == null) {
                state.setNextTemplateId(1L);
            }
            return state;
        } catch (IOException exception) {
            throw new IllegalStateException("Could not read backend data file.", exception);
        }
    }

    public synchronized void save(DatabaseState state) {
        ensureFile();
        try {
            objectMapper.writeValue(dataFile.toFile(), state);
        } catch (IOException exception) {
            throw new IllegalStateException("Could not save backend data file.", exception);
        }
    }

    public synchronized <T> T mutate(Function<DatabaseState, T> mutation) {
        DatabaseState state = load();
        T result = mutation.apply(state);
        save(state);
        return result;
    }

    private void ensureFile() {
        try {
            Files.createDirectories(dataFile.getParent());
            if (!Files.exists(dataFile)) {
                save(new DatabaseState());
            }
        } catch (IOException exception) {
            throw new IllegalStateException("Could not initialize backend data file.", exception);
        }
    }
}
