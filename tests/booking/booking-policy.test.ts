import { describe, expect, it } from "vitest"

import {
    BOOKING_STATUSES,
    canAcceptBookingRequest,
    canCancelMyBooking,
    canHandleBookingRequest,
    formatBookingDecisionMessage,
    formatBookingVisitorCancellationMessage,
    getBookingStatusLabel,
    isBookingStatus,
    validateBookingRequestFields,
} from "../../lib/booking/booking-policy"

describe("booking policy", () => {
    it("allows only known booking statuses", () => {
        expect(BOOKING_STATUSES).toEqual(["pending", "confirmed", "cancelled", "completed"])
        expect(isBookingStatus("pending")).toBe(true)
        expect(isBookingStatus("rejected")).toBe(false)
        expect(isBookingStatus("")).toBe(false)
    })

    it("rejects missing required ids", () => {
        const result = validateBookingRequestFields({
            date: "2099-01-01",
            time: "10:00",
            userId: "user-1",
            salonId: "",
            serviceId: "service-1",
        })

        expect(result.allowed).toBe(false)
        expect(result.error).toBeTruthy()
    })

    it("rejects invalid booking dates", () => {
        const result = validateBookingRequestFields({
            date: "not-a-date",
            time: "10:00",
            userId: "user-1",
            salonId: "salon-1",
            serviceId: "service-1",
        })

        expect(result.allowed).toBe(false)
        expect(result.error).toBeTruthy()
    })

    it("rejects past booking dates", () => {
        const result = validateBookingRequestFields({
            date: "2000-01-01",
            time: "10:00",
            userId: "user-1",
            salonId: "salon-1",
            serviceId: "service-1",
        })

        expect(result.allowed).toBe(false)
        expect(result.error).toBeTruthy()
    })

    it("rejects invalid booking time format", () => {
        const result = validateBookingRequestFields({
            date: "2099-01-01",
            time: "25:99",
            userId: "user-1",
            salonId: "salon-1",
            serviceId: "service-1",
        })

        expect(result.allowed).toBe(false)
        expect(result.error).toBeTruthy()
    })

    it("allows pending booking requests to be accepted", () => {
        const result = canHandleBookingRequest("pending")

        expect(result.allowed).toBe(true)
    })

    it("allows pending booking requests to be rejected", () => {
        const result = canHandleBookingRequest("pending")

        expect(result.allowed).toBe(true)
    })

    it("blocks already handled booking requests", () => {
        expect(canHandleBookingRequest("confirmed").allowed).toBe(false)
        expect(canHandleBookingRequest("cancelled").allowed).toBe(false)
        expect(canHandleBookingRequest("completed").allowed).toBe(false)
    })

    it("rejects invalid booking statuses before handling", () => {
        const result = canHandleBookingRequest("rejected")

        expect(result.allowed).toBe(false)
        expect(result.error).toBeTruthy()
    })

    it("blocks accepting a booking when the slot already has a confirmed booking", () => {
        const result = canAcceptBookingRequest({
            status: "pending",
            hasConfirmedConflict: true,
        })

        expect(result.allowed).toBe(false)
        expect(result.error).toBe("Erre az időpontra már van elfogadott foglalás.")
    })

    it("allows accepting a pending booking when the slot has no confirmed conflict", () => {
        const result = canAcceptBookingRequest({
            status: "pending",
            hasConfirmedConflict: false,
        })

        expect(result.allowed).toBe(true)
    })

    it("formats accepted booking decision messages", () => {
        const message = formatBookingDecisionMessage({
            decision: "accepted",
            salonName: "Anna Szalon",
            serviceName: "Manikűr",
            date: new Date("2099-01-02T00:00:00.000Z"),
            time: "10:30",
        })

        expect(message.subject).toBe("Időpontkérés elfogadva")
        expect(message.content).toContain("Anna Szalon elfogadta")
        expect(message.content).toContain("Manikűr")
        expect(message.content).toContain("10:30")
    })

    it("formats rejected booking decision messages", () => {
        const message = formatBookingDecisionMessage({
            decision: "rejected",
            salonName: "Anna Szalon",
            serviceName: "Manikűr",
            date: new Date("2099-01-02T00:00:00.000Z"),
            time: "10:30",
        })

        expect(message.subject).toBe("Időpontkérés elutasítva")
        expect(message.content).toContain("Anna Szalon elutasította")
        expect(message.content).toContain("Manikűr")
        expect(message.content).toContain("10:30")
    })

    it("returns Hungarian booking status labels", () => {
        expect(getBookingStatusLabel("pending")).toBe("Függőben")
        expect(getBookingStatusLabel("confirmed")).toBe("Elfogadva")
        expect(getBookingStatusLabel("cancelled")).toBe("Elutasítva")
        expect(getBookingStatusLabel("completed")).toBe("Teljesítve")
        expect(getBookingStatusLabel("unknown")).toBe("Ismeretlen")
    })

    it("allows visitors to cancel pending booking requests", () => {
        const result = canCancelMyBooking("pending")

        expect(result.allowed).toBe(true)
    })

    it("blocks visitors from cancelling non-pending booking requests", () => {
        expect(canCancelMyBooking("confirmed").allowed).toBe(false)
        expect(canCancelMyBooking("completed").allowed).toBe(false)
        expect(canCancelMyBooking("cancelled").allowed).toBe(false)
    })

    it("formats provider messages when visitors cancel booking requests", () => {
        const message = formatBookingVisitorCancellationMessage({
            serviceName: "Manikűr",
            date: new Date("2099-01-02T00:00:00.000Z"),
            time: "10:30",
        })

        expect(message.subject).toBe("Időpontkérés visszavonva")
        expect(message.content).toContain("A vendég visszavonta")
        expect(message.content).toContain("Manikűr")
        expect(message.content).toContain("10:30")
    })
})
