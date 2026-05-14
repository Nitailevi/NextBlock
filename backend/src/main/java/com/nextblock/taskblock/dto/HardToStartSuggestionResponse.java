package com.nextblock.taskblock.dto;

import com.nextblock.taskblock.HardToStartMode;

import java.util.ArrayList;
import java.util.List;

public class HardToStartSuggestionResponse {

    private Long taskBlockId;
    private HardToStartMode mode;
    private String headline;
    private String reason;
    private String firstStep;
    private String backupStep;
    private Integer suggestedMinutes;
    private String ctaLabel;
    private List<String> suggestions = new ArrayList<>();
    private String ritualName;
    private String setupStep;
    private String permissionSlip;
    private String momentumLine;
    private List<String> rescueChoices = new ArrayList<>();

    public Long getTaskBlockId() {
        return taskBlockId;
    }

    public void setTaskBlockId(Long taskBlockId) {
        this.taskBlockId = taskBlockId;
    }

    public HardToStartMode getMode() {
        return mode;
    }

    public void setMode(HardToStartMode mode) {
        this.mode = mode;
    }

    public String getHeadline() {
        return headline;
    }

    public void setHeadline(String headline) {
        this.headline = headline;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getFirstStep() {
        return firstStep;
    }

    public void setFirstStep(String firstStep) {
        this.firstStep = firstStep;
    }

    public String getBackupStep() {
        return backupStep;
    }

    public void setBackupStep(String backupStep) {
        this.backupStep = backupStep;
    }

    public Integer getSuggestedMinutes() {
        return suggestedMinutes;
    }

    public void setSuggestedMinutes(Integer suggestedMinutes) {
        this.suggestedMinutes = suggestedMinutes;
    }

    public String getCtaLabel() {
        return ctaLabel;
    }

    public void setCtaLabel(String ctaLabel) {
        this.ctaLabel = ctaLabel;
    }

    public List<String> getSuggestions() {
        return suggestions;
    }

    public void setSuggestions(List<String> suggestions) {
        this.suggestions = suggestions;
    }

    public String getRitualName() {
        return ritualName;
    }

    public void setRitualName(String ritualName) {
        this.ritualName = ritualName;
    }

    public String getSetupStep() {
        return setupStep;
    }

    public void setSetupStep(String setupStep) {
        this.setupStep = setupStep;
    }

    public String getPermissionSlip() {
        return permissionSlip;
    }

    public void setPermissionSlip(String permissionSlip) {
        this.permissionSlip = permissionSlip;
    }

    public String getMomentumLine() {
        return momentumLine;
    }

    public void setMomentumLine(String momentumLine) {
        this.momentumLine = momentumLine;
    }

    public List<String> getRescueChoices() {
        return rescueChoices;
    }

    public void setRescueChoices(List<String> rescueChoices) {
        this.rescueChoices = rescueChoices;
    }
}
