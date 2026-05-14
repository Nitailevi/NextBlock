package com.nextblock.taskblock.dto;

import com.nextblock.taskblock.model.TaskBlock;

public class WhatNowResponse {

    private String message;
    private TaskBlock currentTask;
    private TaskBlock nextTask;

    public WhatNowResponse() {
    }

    public WhatNowResponse(String message, TaskBlock currentTask, TaskBlock nextTask) {
        this.message = message;
        this.currentTask = currentTask;
        this.nextTask = nextTask;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public TaskBlock getCurrentTask() {
        return currentTask;
    }

    public void setCurrentTask(TaskBlock currentTask) {
        this.currentTask = currentTask;
    }

    public TaskBlock getNextTask() {
        return nextTask;
    }

    public void setNextTask(TaskBlock nextTask) {
        this.nextTask = nextTask;
    }
}
