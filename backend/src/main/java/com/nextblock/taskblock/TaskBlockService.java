package com.nextblock.taskblock;

import com.nextblock.common.ResourceNotFoundException;
import com.nextblock.taskblock.dto.ArrangeTemplatesResponse;
import com.nextblock.taskblock.dto.HardToStartSuggestionResponse;
import com.nextblock.taskblock.dto.RangeResponse;
import com.nextblock.taskblock.dto.TaskRangeResponse;
import com.nextblock.taskblock.dto.WhatNowResponse;
import com.nextblock.taskblock.model.DatabaseState;
import com.nextblock.taskblock.model.TaskBlock;
import com.nextblock.taskblock.model.TaskTemplate;
import com.nextblock.taskblock.store.FileDatabaseStore;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

@Service
public class TaskBlockService {

    private static final List<String> DAY_NAMES = List.of(
            "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"
    );
    private static final int DAY_START = 8 * 60;
    private static final int DAY_END = 22 * 60;
    private static final DateTimeFormatter ISO_TIME = DateTimeFormatter.ofPattern("HH:mm:ss");
    private static final DateTimeFormatter ISO_TIMESTAMP = DateTimeFormatter.ISO_DATE_TIME;

    private final FileDatabaseStore store;

    public TaskBlockService(FileDatabaseStore store) {
        this.store = store;
    }

    public List<TaskBlock> getTaskBlocksByDate(String date) {
        return sortTasks(store.load().getTaskBlocks().stream()
                .filter(task -> Objects.equals(task.getDate(), date))
                .toList());
    }

    public TaskRangeResponse getTaskBlocksByRange(String date, String view) {
        RangeResponse range = getDateRange(date, view);
        List<TaskBlock> tasks = sortTasks(store.load().getTaskBlocks().stream()
                .filter(task -> task.getDate().compareTo(range.getFrom()) >= 0 && task.getDate().compareTo(range.getTo()) <= 0)
                .toList());
        return new TaskRangeResponse(view, range, tasks);
    }

    public TaskBlock createTaskBlock(TaskBlock payload) {
        validateTaskPayload(payload);
        return store.mutate(database -> {
            TaskBlock task = sanitizeTaskPayload(payload, null);
            task.setId(database.getNextId());
            database.setNextId(database.getNextId() + 1);
            database.getTaskBlocks().add(task);
            return task;
        });
    }

    public TaskBlock updateTaskBlock(Long taskId, TaskBlock payload) {
        validateTaskPayload(payload);
        return store.mutate(database -> {
            TaskBlock existing = findTask(database, taskId);
            if (existing == null) {
                throw new ResourceNotFoundException("Task block not found.");
            }
            TaskBlock updated = sanitizeTaskPayload(payload, existing);
            updated.setId(taskId);
            updated.setTemplateId(existing.getTemplateId());
            replaceTask(database, taskId, updated);
            return updated;
        });
    }

    public void deleteTaskBlock(Long taskId) {
        store.mutate(database -> {
            boolean removed = database.getTaskBlocks().removeIf(task -> Objects.equals(task.getId(), taskId));
            if (!removed) {
                throw new ResourceNotFoundException("Task block not found.");
            }
            return null;
        });
    }

    public Map<String, Object> deleteTaskBlocksInRange(String date, String view) {
        return store.mutate(database -> {
            RangeResponse range = getDateRange(date, view);
            int before = database.getTaskBlocks().size();
            database.getTaskBlocks().removeIf(task ->
                    task.getDate().compareTo(range.getFrom()) >= 0 && task.getDate().compareTo(range.getTo()) <= 0);
            int deletedCount = before - database.getTaskBlocks().size();
            Map<String, Object> response = new HashMap<>();
            response.put("deletedCount", deletedCount);
            response.put("range", range);
            response.put("view", view);
            return response;
        });
    }

    public WhatNowResponse getWhatNow(String date, String time) {
        List<TaskBlock> tasks = getTaskBlocksByDate(date);
        TaskBlock activeTask = tasks.stream().filter(task -> "ACTIVE".equals(task.getStatus())).findFirst().orElse(null);
        TaskBlock currentTask = activeTask != null ? activeTask : tasks.stream()
                .filter(task -> !"DONE".equals(task.getStatus()) && !"MISSED".equals(task.getStatus()))
                .filter(task -> task.getStartTime().compareTo(time) <= 0 && task.getEndTime().compareTo(time) >= 0)
                .findFirst()
                .orElse(null);

        TaskBlock nextTask = tasks.stream()
                .filter(task -> currentTask == null || !Objects.equals(task.getId(), currentTask.getId()))
                .filter(task -> !"DONE".equals(task.getStatus()) && !"MISSED".equals(task.getStatus()))
                .filter(task -> task.getStartTime().compareTo(time) >= 0)
                .findFirst()
                .orElse(null);

        String message = "No guidance yet. Add a block to get started.";
        if (currentTask != null && "ACTIVE".equals(currentTask.getStatus())) {
            message = "Stay with \"" + currentTask.getTitle() + "\" until this block is done.";
        } else if (currentTask != null) {
            message = "This looks like the right block to start: \"" + currentTask.getTitle() + "\".";
        } else if (nextTask != null) {
            message = "Your next realistic block is \"" + nextTask.getTitle() + "\".";
        } else if (!tasks.isEmpty()) {
            message = "The visible blocks for this day are complete or skipped.";
        }

        return new WhatNowResponse(message, currentTask, nextTask);
    }

    public TaskBlock updateTaskStatus(Long taskId, String action) {
        return store.mutate(database -> {
            TaskBlock task = findTask(database, taskId);
            if (task == null) {
                throw new ResourceNotFoundException("Task block not found.");
            }

            if ("start".equals(action)) {
                database.getTaskBlocks().stream()
                        .filter(other -> "ACTIVE".equals(other.getStatus()) && !Objects.equals(other.getId(), taskId))
                        .forEach(other -> {
                            other.setStatus("PLANNED");
                            other.setUpdatedAt(nowIso());
                        });
                task.setStatus("ACTIVE");
            } else if ("complete".equals(action)) {
                task.setStatus("DONE");
                if (task.getActualMinutes() == null) {
                    task.setActualMinutes(durationMinutes(task));
                }
            } else if ("miss".equals(action)) {
                task.setStatus("MISSED");
            } else {
                throw new IllegalArgumentException("Unknown task action.");
            }

            task.setUpdatedAt(nowIso());
            return task;
        });
    }

    public List<TaskTemplate> listTaskTemplates() {
        return store.load().getTaskTemplates();
    }

    public TaskTemplate createTaskTemplate(TaskTemplate payload) {
        if (payload.getTitle() == null || payload.getTitle().isBlank()) {
            throw new IllegalArgumentException("Template title is required.");
        }

        return store.mutate(database -> {
            TaskTemplate template = sanitizeTemplate(payload);
            template.setId(database.getNextTemplateId());
            database.setNextTemplateId(database.getNextTemplateId() + 1);
            database.getTaskTemplates().add(template);
            return template;
        });
    }

    public ArrangeTemplatesResponse arrangeTemplatesIntoRange(String date, String view) {
        return store.mutate(database -> {
            List<TaskTemplate> templates = sortTemplatesForPlanning(database.getTaskTemplates());
            List<TaskBlock> created = new ArrayList<>();
            List<Map<String, Object>> skipped = new ArrayList<>();

            for (String dateString : planningDates(date, view)) {
                List<TaskBlock> existingForDate = sortTasks(database.getTaskBlocks().stream()
                        .filter(task -> Objects.equals(task.getDate(), dateString))
                        .toList());

                for (TaskTemplate template : templates) {
                    if (!isTemplateDueOnDate(template, dateString)) {
                        continue;
                    }

                    boolean alreadyScheduled = database.getTaskBlocks().stream()
                            .anyMatch(task -> Objects.equals(task.getTemplateId(), template.getId()) && Objects.equals(task.getDate(), dateString));
                    if (alreadyScheduled) {
                        continue;
                    }

                    int capacity = getDailyCapacity(dateString);
                    int scheduledMinutes = existingForDate.stream().mapToInt(this::scheduledMinutes).sum();
                    int templateMinutes = safeInt(template.getEstimatedMinutes(), 25);
                    if (scheduledMinutes + templateMinutes > capacity) {
                        skipped.add(skippedItem(template, dateString, "Skipped to protect a softer daily load cap of " + capacity + " minutes."));
                        continue;
                    }

                    long highFocusCount = existingForDate.stream().filter(this::isHighFocusTask).count();
                    if (isHighFocusTemplate(template) && highFocusCount >= 2) {
                        skipped.add(skippedItem(template, dateString, "Skipped because that day already has two heavier focus blocks."));
                        continue;
                    }

                    Slot slot = findBestSlot(existingForDate, template, dateString);
                    if (slot == null) {
                        skipped.add(skippedItem(template, dateString, "No clean open slot fit this block without crowding the day."));
                        continue;
                    }

                    TaskBlock task = new TaskBlock();
                    task.setId(database.getNextId());
                    database.setNextId(database.getNextId() + 1);
                    task.setTemplateId(template.getId());
                    task.setTitle(template.getTitle());
                    task.setDescription("");
                    task.setDate(dateString);
                    task.setStartTime(minutesToTime(slot.startMinutes()));
                    task.setEndTime(minutesToTime(slot.endMinutes()));
                    task.setStatus("PLANNED");
                    task.setDifficulty(valueOrDefault(template.getDifficulty(), "MEDIUM"));
                    task.setCategory(valueOrDefault(template.getCategory(), ""));
                    task.setEstimatedMinutes(safeInt(template.getEstimatedMinutes(), 25));
                    task.setActualMinutes(null);
                    task.setImportance(template.getImportance());
                    task.setEnergy(template.getEnergy());
                    task.setMotivation(template.getMotivation());
                    task.setArrangementReason(buildArrangementReason(template, slot));
                    task.setCreatedAt(nowIso());
                    task.setUpdatedAt(nowIso());

                    database.getTaskBlocks().add(task);
                    existingForDate.add(task);
                    existingForDate = sortTasks(existingForDate);
                    created.add(task);
                }
            }

            ArrangeTemplatesResponse response = new ArrangeTemplatesResponse();
            response.setCreatedCount(created.size());
            response.setSkippedCount(skipped.size());
            response.setTaskBlocks(created);
            response.setSkipped(skipped);
            return response;
        });
    }

    public HardToStartSuggestionResponse getHardToStartResponse(Long taskId) {
        TaskBlock task = findTask(store.load(), taskId);
        if (task == null) {
            throw new ResourceNotFoundException("Task block not found.");
        }

        HardToStartMode mode = diagnoseHardToStartMode(task);
        HardToStartSuggestionResponse response = new HardToStartSuggestionResponse();
        response.setTaskBlockId(task.getId());
        response.setMode(mode);

        switch (mode) {
            case TOO_BIG -> {
                response.setHeadline("This block is probably too big to start whole.");
                response.setReason("Long blocks feel heavier to enter, even when the work itself is fine.");
                response.setFirstStep("Do only the setup or first visible slice.");
                response.setBackupStep("Shrink it into a 15-minute starter block.");
                response.setSuggestedMinutes(15);
                response.setCtaLabel("Start small");
                response.setRitualName("Shrink the beast");
                response.setSetupStep("Open only the exact tab, document, or object needed for the first slice.");
                response.setPermissionSlip("You are not starting the whole task. You are only opening the door.");
                response.setMomentumLine("A smaller target gives your brain a safer on-ramp.");
                response.setRescueChoices(List.of(
                        "Rename this block as only the first slice.",
                        "Cut the block down to 15 minutes and stop on purpose."
                ));
                response.setSuggestions(List.of(
                        "Open the materials you need and stop there if needed.",
                        "Judge success by starting the first slice, not finishing the whole block."
                ));
            }
            case TOO_HARD -> {
                response.setHeadline("Lower the bar for the first pass.");
                response.setReason("Hard tasks often need an easier doorway, not more pressure.");
                response.setFirstStep("Make a rough version with no quality standard.");
                response.setBackupStep("Give it five messy minutes and allow that to count.");
                response.setSuggestedMinutes(5);
                response.setCtaLabel("Do a rough first pass");
                response.setRitualName("Bad first draft");
                response.setSetupStep("Create a throwaway version or scratchpad where quality does not matter.");
                response.setPermissionSlip("You are allowed to do this badly and still call it progress.");
                response.setMomentumLine("Perfection pressure is often the real blocker, not the task.");
                response.setRescueChoices(List.of(
                        "Make the ugliest version possible first.",
                        "Do one sentence, one bullet, or one tiny example."
                ));
                response.setSuggestions(List.of(
                        "Aim for motion, not polish.",
                        "Start badly on purpose to break the freeze."
                ));
            }
            case BLOCKED -> {
                response.setHeadline("You may be blocked, not lazy.");
                response.setReason("This task sounds like it depends on missing input, someone else, or a prep step.");
                response.setFirstStep("Do the unblock step first: send the message, gather the missing thing, or clarify the dependency.");
                response.setBackupStep("Turn it into a shorter prep block instead of forcing the full task.");
                response.setSuggestedMinutes(10);
                response.setCtaLabel("Unblock it");
                response.setRitualName("Unblock before effort");
                response.setSetupStep("Write the missing ingredient in one line before you do anything else.");
                response.setPermissionSlip("Prep counts. Clarifying counts. Sending the unblock message counts.");
                response.setMomentumLine("Being blocked is different from being avoidant.");
                response.setRescueChoices(List.of(
                        "Send the message now and stop there.",
                        "Convert this into a prep block instead of pretending it is execution."
                ));
                response.setSuggestions(List.of(
                        "List what is missing in one sentence.",
                        "Finish the unblock step, not the whole original block."
                ));
            }
            case TOO_VAGUE -> {
                response.setHeadline("The next visible action is still fuzzy.");
                response.setReason("Vague task wording makes your brain keep re-deciding where to start.");
                response.setFirstStep("Rewrite this as one concrete action you can see yourself doing.");
                response.setBackupStep("Name the first file, tab, room, or person involved.");
                response.setSuggestedMinutes(10);
                response.setCtaLabel("Make it concrete");
                response.setRitualName("Name the next visible move");
                response.setSetupStep("Turn the title into a verb plus object you can picture.");
                response.setPermissionSlip("You do not need a full plan. You need one visible next move.");
                response.setMomentumLine("Your brain starts faster when the opening scene is obvious.");
                response.setRescueChoices(List.of(
                        "Rename the block to the first action only.",
                        "Write: open ___ and do ___."
                ));
                response.setSuggestions(List.of(
                        "Use a verb plus object in the title.",
                        "Choose the first visible move only."
                ));
            }
            case FRICTION -> {
                response.setHeadline("This looks less hard than annoying.");
                response.setReason("Friction tasks often fail because they feel tedious, ambiguous, or interruptive.");
                response.setFirstStep("Set up the environment so the task is already half-started.");
                response.setBackupStep("Do a two-minute ugly version just to break resistance.");
                response.setSuggestedMinutes(10);
                response.setCtaLabel("Break friction");
                response.setRitualName("Grease the slide");
                response.setSetupStep("Put the thing in front of your face: inbox open, number dialed, form loaded, bag by the door.");
                response.setPermissionSlip("This only needs to become easier, not impressive.");
                response.setMomentumLine("Annoying tasks get easier when the setup is already done.");
                response.setRescueChoices(List.of(
                        "Do only the opening admin move.",
                        "Race the task for two minutes and stop if needed."
                ));
                response.setSuggestions(List.of(
                        "Reduce clicks, tabs, and setup before asking for focus.",
                        "Treat this like a friction problem, not a character flaw."
                ));
            }
            case LOW_ENERGY -> {
                response.setHeadline("Start tiny and borrow momentum.");
                response.setReason("The task looks reasonable, so the blocker is probably activation energy.");
                response.setFirstStep("Work on it for five minutes only.");
                response.setBackupStep("Open the work and do one visible action.");
                response.setSuggestedMinutes(5);
                response.setCtaLabel("Start for 5 minutes");
                response.setRitualName("Tiny launch");
                response.setSetupStep("Put the work in view and begin before your brain starts negotiating.");
                response.setPermissionSlip("You do not need to feel ready to begin.");
                response.setMomentumLine("Starting changes the feeling faster than thinking about starting.");
                response.setRescueChoices(List.of(
                        "Promise only five minutes.",
                        "Do one visible move and let that be enough for now."
                ));
                response.setSuggestions(List.of(
                        "Make the opening step almost too small to resist.",
                        "You are allowed to stop after the first five minutes."
                ));
            }
        }

        return response;
    }

    public HardToStartMode diagnoseHardToStartMode(TaskBlock task) {
        String title = safeLower(task.getTitle());
        String description = safeLower(task.getDescription());
        String category = safeLower(task.getCategory());

        if (safeInt(task.getEstimatedMinutes(), 0) >= 75) {
            return HardToStartMode.TOO_BIG;
        }
        if ("HARD".equals(task.getDifficulty())) {
            return HardToStartMode.TOO_HARD;
        }
        if (List.of("wait", "reply", "email", "call", "ask", "follow up", "research").stream()
                .anyMatch(keyword -> title.contains(keyword) || description.contains(keyword))) {
            return HardToStartMode.BLOCKED;
        }
        if (safeText(task.getTitle()).trim().length() < 8 || safeText(task.getDescription()).trim().isEmpty()) {
            return HardToStartMode.TOO_VAGUE;
        }
        if (List.of("admin", "chores", "email", "calls", "errands").stream()
                .anyMatch(keyword -> category.contains(keyword) || title.contains(keyword))) {
            return HardToStartMode.FRICTION;
        }
        return HardToStartMode.LOW_ENERGY;
    }

    public RangeResponse getDateRange(String date, String view) {
        LocalDate localDate = LocalDate.parse(date);
        if ("week".equalsIgnoreCase(view)) {
            LocalDate from = localDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.SUNDAY));
            LocalDate to = from.plusDays(6);
            return new RangeResponse(from.toString(), to.toString());
        }
        if ("month".equalsIgnoreCase(view)) {
            YearMonth yearMonth = YearMonth.from(localDate);
            return new RangeResponse(yearMonth.atDay(1).toString(), yearMonth.atEndOfMonth().toString());
        }
        return new RangeResponse(date, date);
    }

    private void validateTaskPayload(TaskBlock payload) {
        if (isBlank(payload.getTitle()) || isBlank(payload.getDate()) || isBlank(payload.getStartTime()) || isBlank(payload.getEndTime())) {
            throw new IllegalArgumentException("Title, date, start time, and end time are required.");
        }
        if (withSeconds(payload.getStartTime()).compareTo(withSeconds(payload.getEndTime())) >= 0) {
            throw new IllegalArgumentException("Start time must be before end time.");
        }
    }

    private TaskBlock sanitizeTaskPayload(TaskBlock payload, TaskBlock existing) {
        String timestamp = nowIso();
        TaskBlock task = new TaskBlock();
        task.setId(existing != null ? existing.getId() : null);
        task.setTemplateId(existing != null ? existing.getTemplateId() : payload.getTemplateId());
        task.setTitle(safeText(payload.getTitle()).trim());
        task.setDescription(safeText(payload.getDescription()).trim());
        task.setDate(safeText(payload.getDate()));
        task.setStartTime(withSeconds(payload.getStartTime()));
        task.setEndTime(withSeconds(payload.getEndTime()));
        task.setStatus(existing != null ? valueOrDefault(existing.getStatus(), "PLANNED") : valueOrDefault(payload.getStatus(), "PLANNED"));
        task.setDifficulty(valueOrDefault(payload.getDifficulty(), existing != null ? existing.getDifficulty() : "MEDIUM"));
        task.setCategory(safeText(payload.getCategory()).trim());
        task.setEstimatedMinutes(safeInt(payload.getEstimatedMinutes(), existing != null ? safeInt(existing.getEstimatedMinutes(), 30) : 30));
        task.setActualMinutes(existing != null ? existing.getActualMinutes() : payload.getActualMinutes());
        task.setImportance(valueOrDefault(payload.getImportance(), existing != null ? existing.getImportance() : "MEDIUM"));
        task.setEnergy(valueOrDefault(payload.getEnergy(), existing != null ? existing.getEnergy() : "MEDIUM"));
        task.setMotivation(valueOrDefault(payload.getMotivation(), existing != null ? existing.getMotivation() : "MEDIUM"));
        task.setArrangementReason(existing != null ? valueOrDefault(existing.getArrangementReason(), safeText(payload.getArrangementReason())) : safeText(payload.getArrangementReason()));
        task.setCreatedAt(existing != null ? existing.getCreatedAt() : timestamp);
        task.setUpdatedAt(timestamp);
        return task;
    }

    private TaskTemplate sanitizeTemplate(TaskTemplate payload) {
        String timestamp = nowIso();
        TaskTemplate template = new TaskTemplate();
        template.setTitle(safeText(payload.getTitle()).trim());
        template.setCadence(valueOrDefault(payload.getCadence(), "DAILY"));
        template.setPreferredWindow(valueOrDefault(payload.getPreferredWindow(), "ANYTIME"));
        template.setEstimatedMinutes(safeInt(payload.getEstimatedMinutes(), 25));
        template.setMotivation(valueOrDefault(payload.getMotivation(), "MEDIUM"));
        template.setEnergy(valueOrDefault(payload.getEnergy(), "MEDIUM"));
        template.setDifficulty(valueOrDefault(payload.getDifficulty(), "MEDIUM"));
        template.setImportance(valueOrDefault(payload.getImportance(), "MEDIUM"));
        template.setCategory(safeText(payload.getCategory()).trim());
        template.setDaysOfWeek(payload.getDaysOfWeek() == null ? new ArrayList<>() : new ArrayList<>(payload.getDaysOfWeek()));
        template.setDayOfMonth(safeInt(payload.getDayOfMonth(), 1));
        template.setCreatedAt(timestamp);
        template.setUpdatedAt(timestamp);
        return template;
    }

    private TaskBlock findTask(DatabaseState database, Long taskId) {
        return database.getTaskBlocks().stream()
                .filter(task -> Objects.equals(task.getId(), taskId))
                .findFirst()
                .orElse(null);
    }

    private void replaceTask(DatabaseState database, Long taskId, TaskBlock replacement) {
        for (int index = 0; index < database.getTaskBlocks().size(); index++) {
            if (Objects.equals(database.getTaskBlocks().get(index).getId(), taskId)) {
                database.getTaskBlocks().set(index, replacement);
                return;
            }
        }
    }

    private List<TaskBlock> sortTasks(List<TaskBlock> tasks) {
        return tasks.stream()
                .sorted(Comparator.comparing(TaskBlock::getDate).thenComparing(TaskBlock::getStartTime).thenComparing(TaskBlock::getId))
                .toList();
    }

    private List<TaskTemplate> sortTemplatesForPlanning(List<TaskTemplate> templates) {
        return templates.stream()
                .sorted((left, right) -> {
                    int importanceDiff = Integer.compare(rankValue(right.getImportance()), rankValue(left.getImportance()));
                    if (importanceDiff != 0) {
                        return importanceDiff;
                    }
                    int energyDiff = Integer.compare(rankValue(right.getEnergy()), rankValue(left.getEnergy()));
                    if (energyDiff != 0) {
                        return energyDiff;
                    }
                    int difficultyDiff = Integer.compare(rankDifficulty(right.getDifficulty()), rankDifficulty(left.getDifficulty()));
                    if (difficultyDiff != 0) {
                        return difficultyDiff;
                    }
                    return Integer.compare(safeInt(right.getEstimatedMinutes(), 0), safeInt(left.getEstimatedMinutes(), 0));
                })
                .toList();
    }

    private List<String> planningDates(String date, String view) {
        RangeResponse range = getDateRange(date, view);
        List<String> dates = new ArrayList<>();
        LocalDate cursor = LocalDate.parse(range.getFrom());
        LocalDate end = LocalDate.parse(range.getTo());
        while (!cursor.isAfter(end)) {
            dates.add(cursor.toString());
            cursor = cursor.plusDays(1);
        }
        return dates;
    }

    private boolean isTemplateDueOnDate(TaskTemplate template, String dateString) {
        LocalDate date = LocalDate.parse(dateString);
        String cadence = valueOrDefault(template.getCadence(), "DAILY");
        if ("DAILY".equals(cadence)) {
            return true;
        }
        if ("WEEKLY".equals(cadence)) {
            return template.getDaysOfWeek() != null && template.getDaysOfWeek().contains(dayName(date.getDayOfWeek()));
        }
        if ("MONTHLY".equals(cadence)) {
            return date.getDayOfMonth() == safeInt(template.getDayOfMonth(), 1);
        }
        return false;
    }

    private String dayName(DayOfWeek dayOfWeek) {
        return switch (dayOfWeek) {
            case SUNDAY -> "SUNDAY";
            case MONDAY -> "MONDAY";
            case TUESDAY -> "TUESDAY";
            case WEDNESDAY -> "WEDNESDAY";
            case THURSDAY -> "THURSDAY";
            case FRIDAY -> "FRIDAY";
            case SATURDAY -> "SATURDAY";
        };
    }

    private int getDailyCapacity(String dateString) {
        String weekday = dayName(LocalDate.parse(dateString).getDayOfWeek());
        if ("FRIDAY".equals(weekday) || "SATURDAY".equals(weekday)) {
            return 240;
        }
        if ("SUNDAY".equals(weekday)) {
            return 300;
        }
        return 360;
    }

    private boolean isHighFocusTemplate(TaskTemplate template) {
        return rankValue(template.getEnergy()) == 3 || rankDifficulty(template.getDifficulty()) == 3;
    }

    private boolean isHighFocusTask(TaskBlock task) {
        return "HARD".equals(task.getDifficulty()) || safeInt(task.getEstimatedMinutes(), 0) >= 45;
    }

    private int scheduledMinutes(TaskBlock task) {
        return safeInt(task.getEstimatedMinutes(), durationMinutes(task));
    }

    private Slot findBestSlot(List<TaskBlock> existingTasks, TaskTemplate template, String dateString) {
        List<Slot> occupied = existingTasks.stream()
                .map(task -> new Slot(toMinutes(task.getStartTime()), toMinutes(task.getEndTime())))
                .sorted(Comparator.comparingInt(Slot::startMinutes))
                .toList();
        int duration = Math.max(15, roundToQuarter(safeInt(template.getEstimatedMinutes(), 25)));
        Integer bestStart = null;
        double bestScore = Double.POSITIVE_INFINITY;

        for (int start = DAY_START; start + duration <= DAY_END; start += 15) {
            int end = start + duration;
            final int slotStart = start;
            final int slotEnd = end;
            boolean overlaps = occupied.stream().anyMatch(slot -> slotStart < slot.endMinutes() && slotEnd > slot.startMinutes());
            if (overlaps) {
                continue;
            }

            double score = scoreSlot(template, start, dateString);
            if (score < bestScore) {
                bestScore = score;
                bestStart = start;
            }
        }

        return bestStart == null ? null : new Slot(bestStart, bestStart + duration);
    }

    private double scoreSlot(TaskTemplate template, int startMinutes, String dateString) {
        int preferredPenalty = Math.abs(startMinutes - preferredAnchor(template, dateString));
        int energyPenalty = Math.abs(startMinutes - energyAnchor(template, dateString));
        int motivationPenalty = Math.abs(startMinutes - motivationAnchor(template));
        int importanceBoost = rankValue(template.getImportance()) * 26;
        int easyTaskPenalty = rankDifficulty(template.getDifficulty()) == 1 ? 30 : 0;
        int lowEnergyBoost = rankValue(template.getEnergy()) == 1 && startMinutes >= 16 * 60 ? 24 : 0;
        int morningProtectionPenalty = !isHighFocusTemplate(template) && startMinutes < 11 * 60 ? 85 : 0;
        int lateHighFocusPenalty = isHighFocusTemplate(template) && startMinutes >= 14 * 60 ? 95 : 0;
        return preferredPenalty * 1.4
                + energyPenalty * 1.1
                + motivationPenalty * 0.8
                + (startMinutes - DAY_START) * 0.25
                + easyTaskPenalty
                - importanceBoost
                - lowEnergyBoost
                + morningProtectionPenalty
                + lateHighFocusPenalty;
    }

    private int preferredAnchor(TaskTemplate template, String dateString) {
        String preferredWindow = valueOrDefault(template.getPreferredWindow(), "ANYTIME");
        return switch (preferredWindow) {
            case "MORNING" -> "SUNDAY".equals(dayName(LocalDate.parse(dateString).getDayOfWeek())) ? 9 * 60 + 30 : 10 * 60;
            case "MIDDAY" -> 13 * 60;
            case "AFTERNOON" -> 16 * 60;
            case "EVENING" -> "FRIDAY".equals(dayName(LocalDate.parse(dateString).getDayOfWeek())) ? 17 * 60 : 19 * 60;
            default -> 14 * 60;
        };
    }

    private int motivationAnchor(TaskTemplate template) {
        int motivation = rankValue(template.getMotivation());
        if (motivation == 1) {
            return 10 * 60;
        }
        if (motivation == 3) {
            return 16 * 60;
        }
        return 13 * 60;
    }

    private int energyAnchor(TaskTemplate template, String dateString) {
        int energy = rankValue(template.getEnergy());
        if (energy == 3 || rankDifficulty(template.getDifficulty()) == 3) {
            return preferredAnchor(templateWithWindow("MORNING"), dateString);
        }
        if (energy == 1) {
            return 16 * 60;
        }
        return 13 * 60;
    }

    private TaskTemplate templateWithWindow(String window) {
        TaskTemplate template = new TaskTemplate();
        template.setPreferredWindow(window);
        return template;
    }

    private String buildArrangementReason(TaskTemplate template, Slot slot) {
        List<String> parts = new ArrayList<>();
        int hour = slot.startMinutes() / 60;

        if (isHighFocusTemplate(template)) {
            parts.add("Protected an earlier slot for a higher-energy block");
        } else if (rankValue(template.getEnergy()) == 1 && slot.startMinutes() >= 16 * 60) {
            parts.add("Placed later to match lower-energy work");
        }
        if (!"ANYTIME".equals(valueOrDefault(template.getPreferredWindow(), "ANYTIME"))) {
            parts.add("Respected your " + template.getPreferredWindow().toLowerCase(Locale.ROOT) + " preference");
        }
        if (rankValue(template.getImportance()) == 3) {
            parts.add("Kept a higher-importance commitment visible");
        }
        if (rankValue(template.getMotivation()) == 1) {
            parts.add("Put it earlier to reduce motivation friction");
        }
        if (parts.isEmpty()) {
            parts.add("Placed it where " + (hour < 12 ? "morning" : hour < 17 ? "midday energy" : "late-day space") + " was open");
        }
        return String.join(". ", parts) + ".";
    }

    private Map<String, Object> skippedItem(TaskTemplate template, String dateString, String reason) {
        Map<String, Object> item = new HashMap<>();
        item.put("templateId", template.getId());
        item.put("title", template.getTitle());
        item.put("date", dateString);
        item.put("reason", reason);
        return item;
    }

    private int rankValue(String value) {
        return "HIGH".equals(value) ? 3 : "MEDIUM".equals(value) ? 2 : 1;
    }

    private int rankDifficulty(String value) {
        return "HARD".equals(value) ? 3 : "MEDIUM".equals(value) ? 2 : 1;
    }

    private int toMinutes(String time) {
        LocalTime localTime = LocalTime.parse(withSeconds(time), ISO_TIME);
        return localTime.getHour() * 60 + localTime.getMinute();
    }

    private String minutesToTime(int totalMinutes) {
        int hours = totalMinutes / 60;
        int minutes = totalMinutes % 60;
        return String.format("%02d:%02d:00", hours, minutes);
    }

    private int roundToQuarter(int minutes) {
        return Math.max(15, ((minutes + 14) / 15) * 15);
    }

    private int durationMinutes(TaskBlock task) {
        return Math.max(0, toMinutes(task.getEndTime()) - toMinutes(task.getStartTime()));
    }

    private String withSeconds(String time) {
        if (time == null || time.isBlank()) {
            return "09:00:00";
        }
        return time.length() == 5 ? time + ":00" : time;
    }

    private String nowIso() {
        return LocalDateTime.now().format(ISO_TIMESTAMP);
    }

    private String safeText(String value) {
        return value == null ? "" : value;
    }

    private String safeLower(String value) {
        return safeText(value).toLowerCase(Locale.ROOT);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private int safeInt(Integer value, int fallback) {
        return value == null ? fallback : value;
    }

    private String valueOrDefault(String value, String fallback) {
        return isBlank(value) ? fallback : value;
    }

    private record Slot(int startMinutes, int endMinutes) {
    }
}
