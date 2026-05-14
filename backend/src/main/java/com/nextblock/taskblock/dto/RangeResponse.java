package com.nextblock.taskblock.dto;

public class RangeResponse {

    private String from;
    private String to;

    public RangeResponse() {
    }

    public RangeResponse(String from, String to) {
        this.from = from;
        this.to = to;
    }

    public String getFrom() {
        return from;
    }

    public void setFrom(String from) {
        this.from = from;
    }

    public String getTo() {
        return to;
    }

    public void setTo(String to) {
        this.to = to;
    }
}
