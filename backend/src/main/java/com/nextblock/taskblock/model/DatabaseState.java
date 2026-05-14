package com.nextblock.taskblock.model;

import java.util.ArrayList;
import java.util.List;

public class DatabaseState {

    private Long nextId = 1L;
    private Long nextTemplateId = 1L;
    private List<TaskBlock> taskBlocks = new ArrayList<>();
    private List<TaskTemplate> taskTemplates = new ArrayList<>();

    public Long getNextId() {
        return nextId;
    }

    public void setNextId(Long nextId) {
        this.nextId = nextId;
    }

    public Long getNextTemplateId() {
        return nextTemplateId;
    }

    public void setNextTemplateId(Long nextTemplateId) {
        this.nextTemplateId = nextTemplateId;
    }

    public List<TaskBlock> getTaskBlocks() {
        return taskBlocks;
    }

    public void setTaskBlocks(List<TaskBlock> taskBlocks) {
        this.taskBlocks = taskBlocks;
    }

    public List<TaskTemplate> getTaskTemplates() {
        return taskTemplates;
    }

    public void setTaskTemplates(List<TaskTemplate> taskTemplates) {
        this.taskTemplates = taskTemplates;
    }
}
