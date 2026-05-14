package com.nextblock.taskblock.dto;

import com.nextblock.taskblock.model.TaskBlock;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class ArrangeTemplatesResponse {

    private int createdCount;
    private int skippedCount;
    private List<TaskBlock> taskBlocks = new ArrayList<>();
    private List<Map<String, Object>> skipped = new ArrayList<>();

    public int getCreatedCount() {
        return createdCount;
    }

    public void setCreatedCount(int createdCount) {
        this.createdCount = createdCount;
    }

    public int getSkippedCount() {
        return skippedCount;
    }

    public void setSkippedCount(int skippedCount) {
        this.skippedCount = skippedCount;
    }

    public List<TaskBlock> getTaskBlocks() {
        return taskBlocks;
    }

    public void setTaskBlocks(List<TaskBlock> taskBlocks) {
        this.taskBlocks = taskBlocks;
    }

    public List<Map<String, Object>> getSkipped() {
        return skipped;
    }

    public void setSkipped(List<Map<String, Object>> skipped) {
        this.skipped = skipped;
    }
}
