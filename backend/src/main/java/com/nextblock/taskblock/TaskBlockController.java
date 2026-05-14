package com.nextblock.taskblock;

import com.nextblock.taskblock.dto.ArrangeTemplatesResponse;
import com.nextblock.taskblock.dto.HardToStartSuggestionResponse;
import com.nextblock.taskblock.dto.TaskRangeResponse;
import com.nextblock.taskblock.dto.WhatNowResponse;
import com.nextblock.taskblock.model.TaskBlock;
import com.nextblock.taskblock.model.TaskTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
public class TaskBlockController {

    private final TaskBlockService taskBlockService;

    public TaskBlockController(TaskBlockService taskBlockService) {
        this.taskBlockService = taskBlockService;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of(
                "status", "ok",
                "service", "nextblock-backend",
                "time", java.time.OffsetDateTime.now().toString()
        );
    }

    @GetMapping("/api/task-blocks")
    public List<TaskBlock> getTaskBlocksByDate(@RequestParam String date) {
        return taskBlockService.getTaskBlocksByDate(date);
    }

    @GetMapping("/api/task-blocks/range")
    public TaskRangeResponse getTaskBlocksByRange(@RequestParam String date,
                                                  @RequestParam(defaultValue = "day") String view) {
        return taskBlockService.getTaskBlocksByRange(date, view);
    }

    @DeleteMapping("/api/task-blocks/range")
    public Map<String, Object> deleteTaskBlocksInRange(@RequestParam String date,
                                                       @RequestParam(defaultValue = "day") String view) {
        return taskBlockService.deleteTaskBlocksInRange(date, view);
    }

    @PostMapping("/api/task-blocks")
    @ResponseStatus(HttpStatus.CREATED)
    public TaskBlock createTaskBlock(@RequestBody TaskBlock payload) {
        return taskBlockService.createTaskBlock(payload);
    }

    @PutMapping("/api/task-blocks/{taskId}")
    public TaskBlock updateTaskBlock(@PathVariable Long taskId, @RequestBody TaskBlock payload) {
        return taskBlockService.updateTaskBlock(taskId, payload);
    }

    @DeleteMapping("/api/task-blocks/{taskId}")
    public ResponseEntity<Void> deleteTaskBlock(@PathVariable Long taskId) {
        taskBlockService.deleteTaskBlock(taskId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/task-blocks/actions/what-now")
    public WhatNowResponse getWhatNow(@RequestParam String date,
                                      @RequestParam(defaultValue = "09:00:00") String time) {
        return taskBlockService.getWhatNow(date, time);
    }

    @PostMapping("/api/task-blocks/{taskId}/{action:start|complete|miss}")
    public TaskBlock updateTaskStatus(@PathVariable Long taskId, @PathVariable String action) {
        return taskBlockService.updateTaskStatus(taskId, action);
    }

    @PostMapping("/api/task-blocks/{taskId}/hard-to-start")
    public HardToStartSuggestionResponse hardToStart(@PathVariable Long taskId) {
        return taskBlockService.getHardToStartResponse(taskId);
    }

    @GetMapping("/api/task-templates")
    public List<TaskTemplate> getTaskTemplates() {
        return taskBlockService.listTaskTemplates();
    }

    @PostMapping("/api/task-templates")
    @ResponseStatus(HttpStatus.CREATED)
    public TaskTemplate createTaskTemplate(@RequestBody TaskTemplate payload) {
        return taskBlockService.createTaskTemplate(payload);
    }

    @PostMapping("/api/task-templates/arrange")
    public ArrangeTemplatesResponse arrangeTemplates(@RequestParam String date,
                                                     @RequestParam(defaultValue = "day") String view) {
        return taskBlockService.arrangeTemplatesIntoRange(date, view);
    }
}
