package com.nextblock.taskblock.dto;

import com.nextblock.taskblock.model.TaskBlock;

import java.util.List;

public class TaskRangeResponse {

    private String view;
    private RangeResponse range;
    private List<TaskBlock> taskBlocks;

    public TaskRangeResponse() {
    }

    public TaskRangeResponse(String view, RangeResponse range, List<TaskBlock> taskBlocks) {
        this.view = view;
        this.range = range;
        this.taskBlocks = taskBlocks;
    }

    public String getView() {
        return view;
    }

    public void setView(String view) {
        this.view = view;
    }

    public RangeResponse getRange() {
        return range;
    }

    public void setRange(RangeResponse range) {
        this.range = range;
    }

    public List<TaskBlock> getTaskBlocks() {
        return taskBlocks;
    }

    public void setTaskBlocks(List<TaskBlock> taskBlocks) {
        this.taskBlocks = taskBlocks;
    }
}
